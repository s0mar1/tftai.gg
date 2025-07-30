/**
 * 순환 참조와 민감한 정보를 안전하게 처리하는 JSON 직렬화 유틸리티
 */

interface SafeStringifyOptions {
  space?: number;
  maxDepth?: number;
  includeCircularRefs?: boolean;
  sensitiveFields?: string[];
}

/**
 * 순환 참조를 처리하는 안전한 JSON.stringify
 */
export function safeStringify(
  obj: any, 
  options: SafeStringifyOptions = {}
): string {
  const {
    space = 0,
    maxDepth = 10,
    includeCircularRefs = false,
    sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'cookie', 'session', 'req', 'res', 'request', 'response',
      'rawHeaders', 'headers', 'socket', 'connection', '_headers',
      '_headerNames', 'client', 'server', 'agent'
    ]
  } = options;

  const seen = new WeakSet();
  let currentDepth = 0;

  const replacer = (key: string, value: any): any => {
    // 깊이 제한 확인
    if (currentDepth > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    // 민감한 필드 필터링
    if (sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      return '[Sensitive Data]';
    }

    // null, undefined, 원시값은 그대로 반환
    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    // 순환 참조 감지
    if (seen.has(value)) {
      if (includeCircularRefs) {
        return '[Circular Reference]';
      }
      return undefined; // 순환 참조 제거
    }

    // 함수는 문자열로 변환하거나 제거
    if (typeof value === 'function') {
      return '[Function]';
    }

    // Buffer 처리
    if (Buffer.isBuffer(value)) {
      return `[Buffer ${value.length} bytes]`;
    }

    // Date 처리
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Error 객체 처리
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.split('\n').slice(0, 5).join('\n') // 스택 트레이스 축약
      };
    }

    // 객체나 배열인 경우 seen에 추가
    seen.add(value);
    currentDepth++;

    // HTTP 요청/응답 객체 처리
    if (isHttpRequestLike(value)) {
      const result = extractHttpRequestInfo(value);
      currentDepth--;
      return result;
    }

    if (isHttpResponseLike(value)) {
      const result = extractHttpResponseInfo(value);
      currentDepth--;
      return result;
    }

    // 일반 객체나 배열 처리
    const result = value;
    currentDepth--;
    return result;
  };

  try {
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    // 최후의 수단: 에러가 발생하면 간단한 정보만 반환
    return JSON.stringify({
      error: 'Failed to stringify object',
      type: typeof obj,
      constructor: obj?.constructor?.name,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, null, space);
  }
}

/**
 * HTTP 요청 객체 여부 확인
 */
function isHttpRequestLike(obj: any): boolean {
  return obj && (
    obj.method !== undefined ||
    obj.url !== undefined ||
    obj.headers !== undefined ||
    obj.constructor?.name === 'IncomingMessage' ||
    obj.constructor?.name === 'ClientRequest'
  );
}

/**
 * HTTP 응답 객체 여부 확인
 */
function isHttpResponseLike(obj: any): boolean {
  return obj && (
    obj.statusCode !== undefined ||
    obj.statusMessage !== undefined ||
    obj.constructor?.name === 'ServerResponse' ||
    obj.constructor?.name === 'IncomingMessage'
  );
}

/**
 * HTTP 요청 객체에서 유용한 정보만 추출
 */
function extractHttpRequestInfo(req: any): any {
  return {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get?.('user-agent') || req.headers?.['user-agent'],
    contentType: req.get?.('content-type') || req.headers?.['content-type'],
    contentLength: req.get?.('content-length') || req.headers?.['content-length'],
    timestamp: new Date().toISOString()
  };
}

/**
 * HTTP 응답 객체에서 유용한 정보만 추출
 */
function extractHttpResponseInfo(res: any): any {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headersSent: res.headersSent,
    timestamp: new Date().toISOString()
  };
}

/**
 * 로깅용 간소화된 stringify (성능 최적화)
 */
export function safeStringifyForLogging(obj: any): string {
  return safeStringify(obj, {
    space: 2,
    maxDepth: 5,
    includeCircularRefs: false,
    sensitiveFields: [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'cookie', 'session', 'req', 'res', 'request', 'response',
      'rawHeaders', 'socket', 'connection', '_headers', '_headerNames'
    ]
  });
}

/**
 * API 응답용 안전한 stringify
 */
export function safeStringifyForAPI(obj: any): string {
  return safeStringify(obj, {
    space: 0,
    maxDepth: 8,
    includeCircularRefs: false
  });
}

/**
 * 디버그용 상세한 stringify
 */
export function safeStringifyForDebug(obj: any): string {
  return safeStringify(obj, {
    space: 2,
    maxDepth: 15,
    includeCircularRefs: true
  });
}