// Express 관련 타입들
export * from './express';
export * from './models';

// 백엔드 전용 타입들만 여기에 유지

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface LoggerContext {
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  service?: string;
  details?: any;
}

export interface ErrorContext {
  url?: string;
  method?: string;
  service?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  timestamp?: Date;
  category?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {message: string;
  statusCode: number;
  userMessage?: string;
  isOperational?: boolean;
  stack?: string | undefined;
  details?: any;
  state?: any;
  field?: string | undefined;
  resource?: string | undefined;
  value?: any;
}

export interface QueueRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (_error: any) => void;
  timestamp: number;
}

export interface MemoryStats {
  totalIPs: number;
  totalRequests: number;
  queueSize: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// 기본 TFT 타입들 (간단하게 재정의)
export interface Champion {
  character_id: string;
  display_name: string;
  name: string;
  apiName: string;
  cost: number;
  traits: string[];
  tileIcon?: string;
}

export interface Item {
  id?: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface Trait {
  key: string;
  name: string;
  apiName: string;
  description?: string;
  type?: string;
  icon?: string;
  effects?: TraitEffect[];
}

export interface TraitEffect {
  minUnits: number;
  maxUnits?: number;
  style: number;
  variables?: Record<string, any>;
}

export interface Augment {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

// 매치 분석 관련 타입들
export interface ActiveTrait {
  name: string;
  tier_current: number;
  style: string;
  apiName?: string;
}

export interface Unit {
  character_id: string;
  tier: number;
  itemNames: string[];
  chosen?: string;
}