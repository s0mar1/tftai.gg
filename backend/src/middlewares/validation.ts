// 입력 검증 미들웨어 (보안 강화)
import logger from '../config/logger';
import { ValidationError } from '../utils/errors';
import { ValidationOptions, MiddlewareHandler } from '../types/express';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

// 보안 패턴 정의
const SECURITY_PATTERNS = {
  // SQL 인젝션 패턴
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';"\-\-]|\bOR\b.*=|\bAND\b.*=)/i,
  // XSS 패턴
  XSS: /(<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed|<\s*form)/i,
  // 경로 순회 패턴
  PATH_TRAVERSAL: /(\.\.[\/\\]|\.\.[\r\n]|\%2e\%2e|\%252e\%252e)/i,
  // 명령 인젝션 패턴
  COMMAND_INJECTION: /(\||&|;|\$|`|\(|\)|\{|\}|\[|\]|>|<)/,
  // NoSQL 인젝션 패턴
  NOSQL_INJECTION: /(\$where|\$ne|\$in|\$nin|\$or|\$and|\$not|\$nor|\$exists|\$type|\$mod|\$regex|\$text|\$search)/i
};

// 보안 검증 함수
function validateSecurity(value: string, fieldName: string): void {
  if (!value) return;
  
  // SQL 인젝션 검사
  if (SECURITY_PATTERNS.SQL_INJECTION.test(value)) {
    logger.warn('SQL injection attempt detected', { fieldName, value, pattern: 'SQL_INJECTION' });
    throw new ValidationError(`${fieldName}에 허용되지 않는 문자가 포함되어 있습니다.`);
  }
  
  // XSS 검사
  if (SECURITY_PATTERNS.XSS.test(value)) {
    logger.warn('XSS attempt detected', { fieldName, value, pattern: 'XSS' });
    throw new ValidationError(`${fieldName}에 허용되지 않는 스크립트가 포함되어 있습니다.`);
  }
  
  // 경로 순회 검사
  if (SECURITY_PATTERNS.PATH_TRAVERSAL.test(value)) {
    logger.warn('Path traversal attempt detected', { fieldName, value, pattern: 'PATH_TRAVERSAL' });
    throw new ValidationError(`${fieldName}에 허용되지 않는 경로가 포함되어 있습니다.`);
  }
  
  // 명령 인젝션 검사 (특정 필드만)
  if (fieldName.includes('command') || fieldName.includes('exec')) {
    if (SECURITY_PATTERNS.COMMAND_INJECTION.test(value)) {
      logger.warn('Command injection attempt detected', { fieldName, value, pattern: 'COMMAND_INJECTION' });
      throw new ValidationError(`${fieldName}에 허용되지 않는 명령어가 포함되어 있습니다.`);
    }
  }
  
  // NoSQL 인젝션 검사
  if (SECURITY_PATTERNS.NOSQL_INJECTION.test(value)) {
    logger.warn('NoSQL injection attempt detected', { fieldName, value, pattern: 'NOSQL_INJECTION' });
    throw new ValidationError(`${fieldName}에 허용되지 않는 쿼리가 포함되어 있습니다.`);
  }
}

// 문자열 정제 함수
function sanitizeString(value: string): string {
  if (!value) return value;
  
  // HTML 태그 제거
  let sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // 특수 문자 이스케이프
  sanitized = validator.escape(sanitized);
  
  // 여러 공백을 단일 공백으로 변환
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

// 기본 문자열 검증 (보안 강화)
export const validateString = (value: unknown, fieldName: string, options: ValidationOptions = {}): string => {
  const { minLength = 1, maxLength = 100, pattern = null, required = true, sanitize = true } = options;
  
  if (required && (!value || typeof value !== 'string')) {
    throw new ValidationError(`${fieldName}은(는) 필수 문자열 필드입니다.`);
  }
  
  if (value && typeof value === 'string') {
    // PUUID와 매치 ID는 보안 검증 제외 (Riot API 형식)
    const skipSecurityFields = ['PUUID', '사용자 PUUID', '매치 ID'];
    if (!skipSecurityFields.includes(fieldName)) {
      // 보안 검증 수행
      validateSecurity(value, fieldName);
    }
    
    // 문자열 정제 (옵션)
    let processedValue = sanitize ? sanitizeString(value) : value;
    
    // 길이 검증 (정제 후)
    if (processedValue.length < minLength || processedValue.length > maxLength) {
      throw new ValidationError(`${fieldName}은(는) ${minLength}자 이상 ${maxLength}자 이하여야 합니다.`);
    }
    
    // 패턴 검증 (정제 후)
    if (pattern && !pattern.test(processedValue)) {
      throw new ValidationError(`${fieldName}의 형식이 올바르지 않습니다.`);
    }
    
    // 빈 문자열 체크 (정제 후)
    if (required && processedValue.trim().length === 0) {
      throw new ValidationError(`${fieldName}은(는) 빈 값일 수 없습니다.`);
    }
    
    return processedValue;
  }
  
  return typeof value === 'string' ? value : '';
};

// 숫자 검증 (보안 강화)
export const validateNumber = (value: unknown, fieldName: string, options: ValidationOptions = {}): number => {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, required = true } = options;
  
  if (required && (value === undefined || value === null)) {
    throw new ValidationError(`${fieldName}은(는) 필수 숫자 필드입니다.`);
  }
  
  if (value !== undefined && value !== null) {
    // 문자열인 경우 보안 검증
    if (typeof value === 'string') {
      validateSecurity(value, fieldName);
      
      // 숫자가 아닌 문자 체크
      if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
        throw new ValidationError(`${fieldName}은(는) 유효한 숫자 형식이어야 합니다.`);
      }
    }
    
    const numValue = Number(value);
    
    // NaN, Infinity 체크
    if (isNaN(numValue) || !isFinite(numValue)) {
      throw new ValidationError(`${fieldName}은(는) 유효한 숫자여야 합니다.`);
    }
    
    // 안전한 정수 범위 체크
    if (!Number.isSafeInteger(numValue) && Number.isInteger(numValue)) {
      throw new ValidationError(`${fieldName}은(는) 안전한 정수 범위를 벗어났습니다.`);
    }
    
    // 범위 체크
    if (numValue < min || numValue > max) {
      throw new ValidationError(`${fieldName}은(는) ${min} 이상 ${max} 이하여야 합니다.`);
    }
    
    return numValue;
  }
  
  return typeof value === 'number' ? value : 0;
};

// 소환사 이름 검증 (보안 강화)
export const validateSummonerName: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { summonerName } = _req.params;
    
    // 기본 검증
    const validatedName = validateString(summonerName, '소환사 이름', {
      minLength: 1,
      maxLength: 16,
      pattern: /^[a-zA-Z0-9가-힣\s]+$/,
      sanitize: true
    });
    
    // 연속된 공백 체크
    if (/\s{2,}/.test(validatedName)) {
      throw new ValidationError('소환사 이름에 연속된 공백은 허용되지 않습니다.');
    }
    
    // 시작과 끝 공백 체크
    if (validatedName !== validatedName.trim()) {
      throw new ValidationError('소환사 이름의 시작과 끝에 공백은 허용되지 않습니다.');
    }
    
    // 특수 문자 조합 체크
    if (/[^a-zA-Z0-9가-힣\s]/.test(validatedName)) {
      throw new ValidationError('소환사 이름에 허용되지 않는 특수 문자가 포함되어 있습니다.');
    }
    
    // 정제된 값으로 대체
    _req.params.summonerName = validatedName;
    
    _next();
  } catch (_error: any) {
    logger.warn('소환사 이름 검증 실패', { 
      originalName: _req.params.summonerName,
      ip: _req.ip,
      userAgent: _req.get('User-Agent'),
      _error: _error.message 
    });
    _next(_error);
  }
};

// 매치 ID 검증
export const validateMatchId: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { matchId } = _req.params;
    
    validateString(matchId, '매치 ID', {
      minLength: 10,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/
    });
    
    _next();
  } catch (_error: any) {
    logger.warn('매치 ID 검증 실패', { 
      matchId: _req.params.matchId,
      ip: _req.ip,
      _error: _error.message 
    });
    _next(_error);
  }
};

// PUUID 검증
export const validatePuuid: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { puuid } = _req.query as { puuid: string };
    
    validateString(puuid, 'PUUID', {
      minLength: 78,
      maxLength: 78,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: false // PUUID는 정제하지 않음
    });
    
    _next();
  } catch (_error: any) {
    logger.warn('PUUID 검증 실패', { 
      puuid: _req.query.puuid,
      ip: _req.ip,
      _error: _error.message 
    });
    _next(_error);
  }
};

// AI 요청 검증
export const validateAIRequest: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { matchId, userPuuid } = _req.body;
    
    validateString(matchId, '매치 ID', {
      minLength: 10,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/
    });
    
    validateString(userPuuid, '사용자 PUUID', {
      minLength: 78,
      maxLength: 78,
      pattern: /^[a-zA-Z0-9_-]+$/,
      sanitize: false // PUUID는 정제하지 않음
    });
    
    _next();
  } catch (_error: any) {
    logger.warn('AI 요청 검증 실패', { 
      body: _req.body,
      ip: _req.ip,
      _error: _error.message 
    });
    _next(_error);
  }
};

// 페이지네이션 검증
export const validatePagination: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { page = 1, limit = 10 } = _req.query;
    
    validateNumber(page, '페이지 번호', { min: 1, max: 1000, required: false });
    validateNumber(limit, '페이지 크기', { min: 1, max: 100, required: false });
    
    _req.query.page = parseInt(page as string) as any;
    _req.query.limit = parseInt(limit as string) as any;
    
    _next();
  } catch (_error: any) {
    logger.warn('페이지네이션 검증 실패', { 
      query: _req.query,
      ip: _req.ip,
      _error: _error.message 
    });
    _next(_error);
  }
};

// 지역 검증
export const validateRegion: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { region = 'kr' } = _req.params;
    const validRegions = ['kr', 'na', 'euw', 'eune', 'jp', 'br', 'la1', 'la2', 'tr', 'ru'];
    
    if (!validRegions.includes(region.toLowerCase())) {
      throw new ValidationError(`지원되지 않는 지역입니다: ${region}`);
    }
    
    _req.params.region = region.toLowerCase();
    _next();
  } catch (_error: any) {
    logger.warn('지역 검증 실패', { 
      region: _req.params.region,
      ip: _req.ip,
      _error: _error.message 
    });
    _next(_error);
  }
};

// QnA 요청 검증 (보안 강화)
export const validateQnARequest: MiddlewareHandler = (_req, _res, _next) => {
  try {
    const { question, history } = _req.body;
    
    // 질문 내용 검증 및 정제
    const validatedQuestion = validateString(question, '질문 내용', {
      minLength: 1,
      maxLength: 1000,
      sanitize: true
    });
    
    // 채팅 히스토리 검증
    if (history !== undefined) {
      if (!Array.isArray(history)) {
        throw new ValidationError('history는 배열 형식이어야 합니다.');
      }
      
      if (history.length > 20) { // 제한 강화: 50 -> 20
        throw new ValidationError('채팅 히스토리는 20개까지만 허용됩니다.');
      }
      
      // 각 히스토리 항목 검증
      const validatedHistory = history.map((item, index) => {
        if (typeof item !== 'object' || item === null) {
          throw new ValidationError(`채팅 히스토리 ${index}번째 항목이 올바르지 않습니다.`);
        }
        
        const { role, content } = item;
        
        // 역할 검증
        if (!['user', 'assistant'].includes(role)) {
          throw new ValidationError(`채팅 히스토리 ${index}번째 항목의 역할이 올바르지 않습니다.`);
        }
        
        // 내용 검증
        const validatedContent = validateString(content, `채팅 히스토리 ${index}번째 내용`, {
          minLength: 1,
          maxLength: 2000,
          sanitize: true
        });
        
        return { role, content: validatedContent };
      });
      
      _req.body.history = validatedHistory;
    }
    
    _req.body.question = validatedQuestion;
    
    _next();
  } catch (_error: any) {
    logger.warn('QnA 요청 검증 실패', { 
      questionLength: _req.body.question?.length || 0,
      historyLength: _req.body.history?.length || 0,
      ip: _req.ip,
      userAgent: _req.get('User-Agent'),
      _error: _error.message 
    });
    _next(_error);
  }
};

export default {
  validateString,
  validateNumber,
  validateSummonerName,
  validateMatchId,
  validateAIRequest,
  validatePagination,
  validateRegion,
  validateQnARequest
};