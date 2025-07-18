import { Request, Response, NextFunction } from 'express';

// Forward declarations to avoid circular imports
interface QueueRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (_error: any) => void;
  timestamp: number;
}

interface MemoryStats {
  totalIPs: number;
  totalRequests: number;
  queueSize: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// 기본 API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
}

// 에러 응답 타입
export interface ErrorResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  retryAfter?: string;
  userMessage?: string;
  details?: any;
  errorId?: string; // Added for error tracking
}

// 확장된 Request 인터페이스
export interface ExtendedRequest extends Request {
  aiQueue?: AIRequestQueue;
}

// AIRequestQueue 클래스 (여기서는 기본적인 타입만 정의)
export interface AIRequestQueue {
  queue: QueueRequest[];
  requestCounts: Map<string, number[]>;
  processing: boolean;
  lastRequestTime: number;
  minInterval: number;
  checkRateLimit(clientIP: string): boolean;
  addRequest(requestData: any): Promise<any>;
  getMemoryStats(): MemoryStats;
  cleanupMemory(): void;
}

// 컨트롤러 타입
export type ControllerHandler = (
  _req: ExtendedRequest,
  _res: Response,
  _next: NextFunction
) => Promise<void> | void;

// 미들웨어 타입
export type MiddlewareHandler = (
  _req: ExtendedRequest,
  _res: Response,
  _next: NextFunction
) => Promise<void> | void;

// 에러 핸들러 타입
export type ErrorHandler = (
  _err: any,
  _req: ExtendedRequest,
  _res: Response,
  _next: NextFunction
) => void;

// 페이지네이션 쿼리 타입
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// 소환사 쿼리 타입
export interface SummonerQuery {
  region?: string;
  gameName?: string;
  tagLine?: string;
  forceRefresh?: string;
}

// 매치 분석 요청 타입
export interface AIAnalysisRequest {
  matchId: string;
  userPuuid: string;
}

// QnA 요청 타입
export interface QnARequest {
  question: string;
  chatHistory?: Array<{
    role: string;
    content: string;
  }>;
}

// 소환사 데이터 응답 타입
export interface SummonerResponse {
  account: {
    puuid: string;
    gameName: string;
    tagLine: string;
  };
  league: any[];
  matches: Array<{
    matchId: string;
    gameCreation: number;
    gameLength: number;
    myParticipant: any;
    participants: any[];
  }>;
}


// 검증 옵션 타입
export interface ValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
  min?: number;
  max?: number;
  sanitize?: boolean;
}