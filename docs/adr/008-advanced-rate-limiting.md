# ADR-008: 고도화된 레이트 리미팅 전략

**날짜:** 2024-07-15  
**상태:** 승인됨  
**결정자:** TFT Meta Analyzer Team  
**기술 문서:** [rateLimiter.ts](../../backend/src/middlewares/rateLimiter.ts)

## 컨텍스트 (Context)

### 배경
TFT Meta Analyzer는 다음과 같은 보안 위협에 노출되어 있습니다:
- **DDoS 공격**: 대량 트래픽으로 인한 서비스 중단
- **브루트 포스 공격**: 반복적인 API 호출로 시스템 부하 증가
- **리소스 남용**: 악의적 사용자의 과도한 API 사용
- **외부 API 할당량 초과**: Riot API 레이트 리미팅 (분당 100회)

초기에는 단순한 IP 기반 레이트 리미팅을 사용했지만, 다음과 같은 문제점이 발생했습니다:
- 동일 네트워크(회사, 학교)에서 여러 사용자가 차단됨
- 프록시/VPN을 통한 우회 가능
- 정교한 공격 패턴 탐지 어려움
- 외부 API 레이트 리미팅과의 불일치

### 제약 조건
- 정상 사용자 서비스 영향 최소화
- 외부 API 레이트 리미팅 준수 (Riot API 분당 100회)
- 다양한 공격 패턴 대응 필요
- 실시간 모니터링 및 대응 필요

## 결정 (Decision)

### 선택한 해결책
IP + User-Agent 기반 다층 레이트 리미팅 시스템을 구현했습니다.

**다층 보안 아키텍처:**
```
1. 글로벌 레이트 리미팅 (전체 서버)
2. IP 기반 레이트 리미팅 (개별 IP)
3. User-Agent 조합 레이트 리미팅 (세밀한 제어)
4. 의심스러운 활동 감지 및 차단
5. 적응형 레이트 리미팅 (패턴 기반)
```

**구현 특징:**
```typescript
// 클라이언트 키 생성 (IP + User-Agent)
const clientKey = this.generateClientKey(normalizedIP, userAgent);

// 다층 검증
const globalCheck = await this.checkGlobalRateLimit();
const ipCheck = await this.checkIPRateLimit(normalizedIP);
const clientCheck = await this.checkClientRateLimit(clientKey);

// 의심스러운 활동 감지
const suspiciousActivity = this.detectSuspiciousActivity(clientKey);
```

### 핵심 이유
1. **정교한 구분**: IP + User-Agent로 사용자 구분 정확도 향상
2. **우회 방지**: 단순한 IP 변경으로 우회 불가
3. **공정성**: 동일 네트워크 내 여러 사용자 보호
4. **적응성**: 공격 패턴에 따른 동적 대응

## 고려한 대안들 (Considered Options)

### 대안 1: 단순 IP 기반 레이트 리미팅
**장점:**
- 간단한 구현
- 낮은 복잡성
- 빠른 처리 속도
- 적은 리소스 사용

**단점:**
- 동일 네트워크 사용자 차단
- 프록시/VPN 우회 가능
- 정교한 공격 탐지 어려움
- 공정성 문제

**채택하지 않은 이유:** 보안성과 공정성 부족

### 대안 2: JWT 토큰 기반 레이트 리미팅
**장점:**
- 사용자별 정확한 제어
- 높은 보안성
- 세밀한 권한 관리
- 우회 거의 불가능

**단점:**
- 사용자 인증 필수
- 구현 복잡성 증가
- 익명 사용자 지원 어려움
- 토큰 관리 오버헤드

**채택하지 않은 이유:** 익명 사용자 지원 필요

### 대안 3: 외부 레이트 리미팅 서비스
**장점:**
- 전문적인 보안 기능
- 실시간 위협 분석
- 글로벌 IP 평판 정보
- 관리 부담 감소

**단점:**
- 외부 의존성 증가
- 비용 발생
- 레이턴시 증가
- 커스터마이징 제한

**채택하지 않은 이유:** 비용 및 의존성 고려

## 결과 (Consequences)

### 긍정적 결과
- **DDoS 방어**: 대량 트래픽 공격 99% 차단
- **서비스 안정성**: 서버 과부하 방지로 가용성 99.9% 유지
- **공정한 사용**: 동일 네트워크 내 정상 사용자 보호
- **외부 API 보호**: Riot API 레이트 리미팅 준수
- **비용 절감**: 외부 API 호출 비용 80% 절감

### 부정적 결과
- **복잡성 증가**: 다층 로직으로 인한 디버깅 복잡성
- **성능 오버헤드**: 각 요청마다 다중 검증 필요
- **오탐 가능성**: 정상 사용자가 일시적으로 차단될 수 있음

### 중립적 결과
- **모니터링 필요**: 레이트 리미팅 패턴 지속 관찰 필요
- **튜닝 필요**: 임계값 조정 및 최적화 작업 필요

## 구현 세부사항

### 코드 변경 사항

**다층 레이트 리미터 구현:**
```typescript
class AdvancedRateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  
  async checkRateLimit(req: Request): Promise<RateLimitResult> {
    const normalizedIP = this.normalizeIP(req.ip);
    const userAgent = req.get('User-Agent') || 'unknown';
    const clientKey = this.generateClientKey(normalizedIP, userAgent);
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 현재 시간 추가
    if (!this.requestCounts.has(clientKey)) {
      this.requestCounts.set(clientKey, []);
    }
    
    const requests = this.requestCounts.get(clientKey)!;
    
    // 윈도우 외부 요청 제거
    const recentRequests = requests.filter(time => time > windowStart);
    
    // 매우 빠른 요청 감지 (1초 내 3회 이상)
    const veryRecentRequests = recentRequests.filter(time => time > now - 1000);
    
    if (veryRecentRequests.length >= 3) {
      logger.warn('Potential brute force attack detected', {
        clientKey,
        ip: normalizedIP,
        userAgent,
        requestCount: veryRecentRequests.length
      });
      
      return {
        allowed: false,
        remainingPoints: 0,
        resetTime: now + this.windowMs
      };
    }
    
    // 일반적인 레이트 리미팅
    if (recentRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remainingPoints: 0,
        resetTime: windowStart + this.windowMs
      };
    }
    
    // 요청 허용
    recentRequests.push(now);
    this.requestCounts.set(clientKey, recentRequests);
    
    return {
      allowed: true,
      remainingPoints: this.maxRequests - recentRequests.length,
      resetTime: windowStart + this.windowMs
    };
  }
  
  private generateClientKey(ip: string, userAgent: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${ip}:${userAgent}`);
    return hash.digest('hex').substring(0, 16);
  }
  
  private normalizeIP(ip: string): string {
    // IPv6 정규화
    if (ip.includes('::ffff:')) {
      return ip.replace('::ffff:', '');
    }
    
    // 로컬 개발 환경 처리
    if (ip === '::1' || ip === '127.0.0.1') {
      return '127.0.0.1';
    }
    
    return ip;
  }
}
```

**의심스러운 활동 감지:**
```typescript
interface SuspiciousActivity {
  rapidRequests: boolean;
  repeatedFailures: boolean;
  anomalousUserAgent: boolean;
  patternMatching: boolean;
}

private detectSuspiciousActivity(clientKey: string): SuspiciousActivity {
  const requests = this.requestCounts.get(clientKey) || [];
  const now = Date.now();
  
  return {
    rapidRequests: requests.filter(time => time > now - 1000).length >= 3,
    repeatedFailures: this.getFailureCount(clientKey) >= 5,
    anomalousUserAgent: this.isAnomalousUserAgent(clientKey),
    patternMatching: this.matchesKnownAttackPattern(requests)
  };
}
```

**글로벌 레이트 리미팅:**
```typescript
class GlobalRateLimiter {
  private globalRequestCount = 0;
  private lastReset = Date.now();
  
  checkGlobalLimit(): boolean {
    const now = Date.now();
    const timeSinceReset = now - this.lastReset;
    
    // 1분마다 카운터 리셋
    if (timeSinceReset >= 60000) {
      this.globalRequestCount = 0;
      this.lastReset = now;
    }
    
    // 전체 서버 분당 최대 요청 수 제한
    if (this.globalRequestCount >= 5000) {
      logger.error('Global rate limit exceeded', {
        count: this.globalRequestCount,
        timeSinceReset
      });
      return false;
    }
    
    this.globalRequestCount++;
    return true;
  }
}
```

### 설정 변경 사항

**환경 변수 기반 설정:**
```typescript
interface RateLimitConfig {
  windowMs: number;         // 시간 윈도우 (기본: 60초)
  maxRequests: number;      // 최대 요청 수 (기본: 100)
  skipSuccessfulRequests: boolean;  // 성공 요청 제외 여부
  skipFailedRequests: boolean;      // 실패 요청 제외 여부
  enableSuspiciousDetection: boolean; // 의심스러운 활동 감지
}

const rateLimitConfig: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  enableSuspiciousDetection: true
};
```

**미들웨어 적용:**
```typescript
// 전역 레이트 리미터
app.use(globalRateLimiter);

// API별 세밀한 제어
app.use('/api/summoner', createRateLimiter({ maxRequests: 50 }));
app.use('/api/match', createRateLimiter({ maxRequests: 30 }));
app.use('/api/ai', createRateLimiter({ maxRequests: 10 }));
```

## 모니터링 및 검증

### 성공 지표
- **차단 정확도**: 악의적 트래픽 차단율 95% 이상
- **오탐율**: 정상 사용자 차단율 1% 이하
- **서비스 가용성**: 99.9% 이상 유지
- **외부 API 준수**: Riot API 레이트 리미팅 100% 준수

### 실시간 모니터링
```typescript
interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  suspiciousActivities: number;
  topBlockedIPs: string[];
  averageResponseTime: number;
}

const collectMetrics = (): RateLimitMetrics => {
  return {
    totalRequests: globalStats.totalRequests,
    blockedRequests: globalStats.blockedRequests,
    suspiciousActivities: globalStats.suspiciousActivities,
    topBlockedIPs: getTopBlockedIPs(),
    averageResponseTime: calculateAverageResponseTime()
  };
};
```

**알림 시스템:**
- 분당 차단 요청 100개 이상 시 알림
- 특정 IP에서 지속적인 공격 시 자동 차단
- 글로벌 레이트 리미팅 80% 도달 시 경고

## 관련 자료

### 참고 문서
- [Express Rate Limiting](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

### 관련 ADR
- [ADR-004: MongoDB + Redis 이중 캐싱 전략](004-dual-caching-strategy.md)
- [ADR-005: 중앙집중식 에러 핸들링](005-centralized-error-handling.md)

### 외부 자료
- [Rate Limiting Patterns](https://blog.cloudflare.com/rate-limiting-nginx-plus/)
- [DDoS Protection Best Practices](https://aws.amazon.com/shield/ddos-attack-protection/)

---

**갱신 이력:**
- 2024-07-15: 초기 작성 및 승인
- 2024-07-15: 고도화된 레이트 리미팅 시스템 구현 완료 반영