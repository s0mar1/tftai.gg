// Rate limiter middleware for AI API calls
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { CACHE_TTL } from '../config/cacheTTL';
import { QueueRequest, MemoryStats } from '../types/index';


export class AIRequestQueue {
    public queue: QueueRequest[] = [];
    public processing: boolean = false;
    public requestCounts: Map<string, number[]> = new Map();
    public lastRequestTime: number = 0;
    public minInterval: number = 2000;
    
    private readonly CLEANUP_INTERVAL: number;
    private readonly REQUEST_RETENTION_TIME: number;
    private readonly MAX_REQUESTS_PER_IP: number;
    private readonly MAX_MEMORY_USAGE: number;

    constructor() {
        // 메모리 정리 설정 (최적화)
        this.CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리 (기존 1시간 -> 10분)
        this.REQUEST_RETENTION_TIME = CACHE_TTL.AI_ANALYSIS * 1000; // 2시간 데이터 보관
        this.MAX_REQUESTS_PER_IP = 100; // IP별 최대 요청 기록 수 (기존 1000 -> 100)
        this.MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB 메모리 사용량 제한
        
        // 주기적 메모리 정리 시작
        this.startMemoryCleanup();
    }

    // 메모리 정리 시작
    private startMemoryCleanup(): void {
        // Feature flag로 AI Queue 메모리 정리 제어
        if (process.env.ENABLE_AI_QUEUE_CLEANUP !== 'true') {
            logger.info('AIRequestQueue 정리 스케줄러가 비활성화되어 있습니다 (ENABLE_AI_QUEUE_CLEANUP=false)');
            return;
        }

        setInterval(() => {
            this.cleanupMemory();
        }, this.CLEANUP_INTERVAL);
        
        logger.info('AIRequestQueue memory cleanup scheduler started');
    }

    // 메모리 정리 실행 (최적화)
    public cleanupMemory(): void {
        const now = Date.now();
        const cutoffTime = now - this.REQUEST_RETENTION_TIME;
        let totalRequestsRemoved = 0;
        let ipsRemoved = 0;
        
        // 메모리 사용량 체크
        const memoryUsage = process.memoryUsage();
        const forceCleanup = memoryUsage.heapUsed > this.MAX_MEMORY_USAGE;
        
        // 오래된 요청 기록 정리
        for (const [ip, requests] of this.requestCounts.entries()) {
            const filteredRequests = requests.filter(time => time > cutoffTime);
            
            if (filteredRequests.length === 0) {
                // 모든 요청이 오래되었으면 IP 자체를 삭제
                this.requestCounts.delete(ip);
                ipsRemoved++;
                totalRequestsRemoved += requests.length;
            } else if (filteredRequests.length !== requests.length) {
                // 일부 요청만 정리
                totalRequestsRemoved += (requests.length - filteredRequests.length);
                
                // 메모리 압박 상황에서는 더 엄격하게 정리
                const maxRequests = forceCleanup ? 
                    Math.min(this.MAX_REQUESTS_PER_IP, 50) : 
                    this.MAX_REQUESTS_PER_IP;
                
                // 요청 수가 너무 많으면 최근 요청만 유지
                if (filteredRequests.length > maxRequests) {
                    const trimmedRequests = filteredRequests.slice(-maxRequests);
                    totalRequestsRemoved += (filteredRequests.length - trimmedRequests.length);
                    this.requestCounts.set(ip, trimmedRequests);
                } else {
                    this.requestCounts.set(ip, filteredRequests);
                }
            }
        }
        
        // 큐에서 오래된 요청 제거
        const originalQueueLength = this.queue.length;
        this.queue = this.queue.filter(request => (now - request.timestamp) < 300000); // 5분 이상 된 요청 제거
        const queueRequestsRemoved = originalQueueLength - this.queue.length;
        
        logger.info('AIRequestQueue memory cleanup completed', {
            ipsRemoved,
            totalRequestsRemoved,
            queueRequestsRemoved,
            currentIpCount: this.requestCounts.size,
            currentQueueSize: this.queue.length,
            forceCleanup,
            memoryUsage: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
                external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
            }
        });
    }

    // IP별 rate limiting 체크 (보안 강화)
    public checkRateLimit(clientIP: string, userAgent?: string): boolean {
        const now = Date.now();
        const windowStart = now - 60000; // 1분 윈도우
        
        // IP 정규화 및 검증
        const normalizedIP = this.normalizeIP(clientIP);
        if (!normalizedIP) {
            logger.warn('Invalid IP address detected', { clientIP, userAgent });
            return false;
        }
        
        // User-Agent 기반 추가 식별
        const clientKey = this.generateClientKey(normalizedIP, userAgent);
        
        if (!this.requestCounts.has(clientKey)) {
            this.requestCounts.set(clientKey, []);
        }
        
        const requests = this.requestCounts.get(clientKey)!;
        
        // 1분 이전 요청들 제거
        const recentRequests = requests.filter(time => time > windowStart);
        this.requestCounts.set(clientKey, recentRequests);
        
        // 분당 최대 3회 요청 허용 (기존 5회 -> 3회)
        const maxRequests = 3;
        const isAllowed = recentRequests.length < maxRequests;
        
        // 의심스러운 활동 감지
        if (!isAllowed) {
            this.detectSuspiciousActivity(clientKey, recentRequests, userAgent);
        }
        
        return isAllowed;
    }
    
    // IP 정규화 및 검증
    private normalizeIP(ip: string): string {
        if (!ip || typeof ip !== 'string') return 'unknown';
        
        // IPv4 검증
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // IPv6 검증 (간단한 버전)
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        
        // X-Forwarded-For 헤더에서 첫 번째 IP 추출
        const firstIP = ip.split(',')[0]?.trim();
        
        if (firstIP && (ipv4Regex.test(firstIP) || ipv6Regex.test(firstIP))) {
            return firstIP;
        }
        
        return 'unknown';
    }
    
    // 클라이언트 식별 키 생성
    public generateClientKey(ip: string, userAgent?: string | null): string {
        if (!userAgent) return ip;
        
        // User-Agent의 해시를 추가하여 더 정밀한 식별
        const crypto = require('crypto');
        const uaHash = crypto.createHash('md5').update(userAgent || '').digest('hex').substring(0, 8);
        
        return `${ip}:${uaHash}`;
    }
    
    // 의심스러운 활동 감지
    private detectSuspiciousActivity(clientKey: string, recentRequests: number[], userAgent?: string): void {
        const now = Date.now();
        const shortWindowStart = now - 10000; // 10초 윈도우
        const veryRecentRequests = recentRequests.filter(time => time > shortWindowStart);
        
        // 10초 내에 3회 이상 요청시 경고
        if (veryRecentRequests.length >= 3) {
            logger.warn('Potential brute force attack detected', {
                clientKey,
                userAgent,
                recentRequestCount: veryRecentRequests.length,
                requestTimes: veryRecentRequests.map(t => new Date(t).toISOString())
            });
        }
        
        // 정규적이지 않은 요청 패턴 감지
        if (recentRequests.length >= 5) {
            const intervals = [];
            for (let i = 1; i < recentRequests.length; i++) {
                const current = recentRequests[i];
                const previous = recentRequests[i-1];
                if (current && previous) {
                    intervals.push(current - previous);
                }
            }
            
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            
            // 너무 규칙적인 요청 패턴 (봇 의심)
            if (variance < 1000) { // 1초 이하의 분산
                logger.warn('Bot-like request pattern detected', {
                    clientKey,
                    userAgent,
                    avgInterval,
                    variance,
                    intervals
                });
            }
        }
    }

    // 메모리 상태 조회
    public getMemoryStats(): MemoryStats {
        const totalRequests = Array.from(this.requestCounts.values())
            .reduce((sum, requests) => sum + requests.length, 0);
        
        return {
            totalIPs: this.requestCounts.size,
            totalRequests,
            queueSize: this.queue.length,
            memoryUsage: process.memoryUsage()
        };
    }

    // 요청을 큐에 추가
    public async addRequest(requestData: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const request: QueueRequest = {
                ...requestData,
                resolve,
                reject,
                timestamp: Date.now()
            };
            
            this.queue.push(request);
            this.processQueue();
        });
    }

    // 큐 처리
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift();
            if (!request) break;
            
            try {
                // 최소 간격 보장
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                
                if (timeSinceLastRequest < this.minInterval) {
                    const waitTime = this.minInterval - timeSinceLastRequest;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                
                this.lastRequestTime = Date.now();
                
                // 실제 AI API 호출
                const result = await request.execute();
                request.resolve(result);
                
            } catch (_error) {
                request.reject(_error);
            }
        }

        this.processing = false;
    }
}

const aiQueue = new AIRequestQueue();

// Rate limiting middleware (보안 강화)
export const aiRateLimiter = (_req: Request, _res: Response, _next: NextFunction): void => {
    try {
        // 다양한 소스에서 IP 추출
        const clientIP = extractClientIP(_req);
        const userAgent = _req.get('User-Agent') || 'unknown';
        
        // IP 유효성 검증
        if (!clientIP || clientIP === 'unknown') {
            logger.warn('Request without valid IP address', { 
                headers: _req.headers,
                userAgent
            });
            _res.status(400).json({
                _error: '잘못된 요청입니다.',
                message: 'Invalid request source'
            });
            return;
        }
        
        // User-Agent 검증
        if (!userAgent || userAgent === 'unknown' || isBlockedUserAgent(userAgent)) {
            logger.warn('Blocked or suspicious user agent', { 
                clientIP,
                userAgent
            });
            _res.status(403).json({
                _error: '접근이 거부되었습니다.',
                message: 'Access denied'
            });
            return;
        }
        
        // IP별 rate limit 체크
        if (!aiQueue.checkRateLimit(clientIP, userAgent)) {
            // 제한 위반 기록
            logger.warn('Rate limit exceeded', {
                clientIP,
                userAgent,
                url: _req.originalUrl,
                method: _req.method
            });
            
            _res.status(429).json({
                _error: '너무 많은 요청입니다. 1분 후 다시 시도해주세요.',
                retryAfter: 60,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // 요청 기록
        const clientKey = aiQueue.generateClientKey ? 
            aiQueue.generateClientKey(clientIP, userAgent) : clientIP;
        const requests = aiQueue.requestCounts.get(clientKey) || [];
        requests.push(Date.now());
        aiQueue.requestCounts.set(clientKey, requests);
        
        // aiQueue와 clientIP를 req 객체에 추가하지 않고 다른 방식으로 처리
        _next();
    } catch (_error) {
        logger.error('Rate limiter _error:', _error);
        // 오류 발생시 보안상 요청 차단
        _res.status(500).json({
            _error: '서버에서 문제가 발생했습니다.',
            message: 'Internal server error'
        });
        return;
    }
};

// 클라이언트 IP 추출 (다양한 헤더 지원)
function extractClientIP(_req: any): string | null {
    // 우선순위에 따른 IP 추출
    const ipSources = [
        _req.headers['cf-connecting-ip'], // Cloudflare
        _req.headers['x-real-ip'], // Nginx
        _req.headers['x-forwarded-for'], // 일반적인 프록시
        _req.headers['x-client-ip'],
        _req.headers['x-forwarded'],
        _req.headers['forwarded-for'],
        _req.headers['forwarded'],
        _req.connection?.remoteAddress,
        _req.socket?.remoteAddress,
        _req.connection?.socket?.remoteAddress,
        _req.ip
    ];
    
    for (const source of ipSources) {
        if (source && typeof source === 'string') {
            // 여러 IP가 있을 경우 첫 번째 사용
            const ip = source.split(',')[0]?.trim();
            if (ip && ip !== 'unknown' && isValidIP(ip)) {
                return ip;
            }
        }
    }
    
    return null;
}

// IP 주소 유효성 검증
function isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// 차단된 User-Agent 검사
function isBlockedUserAgent(userAgent: string): boolean {
    const blockedPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /go-http-client/i,
        /postman/i,
        /insomnia/i,
        /^$/,
        /^-$/,
        /null/i,
        /undefined/i
    ];
    
    return blockedPatterns.some(pattern => pattern.test(userAgent));
}

export default aiQueue;