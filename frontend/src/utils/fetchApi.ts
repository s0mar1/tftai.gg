// src/utils/fetchApi.ts
// fetch API 기반 HTTP 클라이언트

interface FetchOptions extends RequestInit {
  timeout?: number;
  baseURL?: string;
}

class FetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

// API Base URL 환경변수 사용
// 배포 환경에서는 상대 경로를 사용하여 _redirects가 처리하도록 함
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:4001');

const defaultOptions: FetchOptions = {
  timeout: 30000,
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// 환경 변수 디버깅 (개발 환경에서만)
if (import.meta.env.DEV) {
  console.log('fetchApi 설정:', {
    mode: import.meta.env.MODE,
    baseURL: API_BASE_URL,
    isProd: import.meta.env.PROD
  });
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, baseURL = '', ...fetchOptions } = {
    ...defaultOptions,
    ...options,
  };

  // URL 처리 로직 개선
  let fullUrl: string;
  if (url.startsWith('http')) {
    // 절대 URL은 그대로 사용
    fullUrl = url;
  } else if (url.startsWith('/')) {
    // 배포 환경에서 특정 API는 api.tftai.gg 서브도메인으로 라우팅
    if (import.meta.env.PROD && !baseURL) {
      // static-data와 tierlist API는 api 서브도메인 사용
      if (url.includes('/api/tierlist') || url.includes('/api/static-data')) {
        fullUrl = `https://api.tftai.gg${url}`;
      } else {
        // 나머지 API는 그대로
        fullUrl = url;
      }
    } else {
      // 개발 환경 또는 baseURL이 설정된 경우
      fullUrl = baseURL ? `${baseURL}${url}` : url;
    }
  } else {
    // 상대 경로는 baseURL과 슬래시를 포함하여 결합
    fullUrl = baseURL ? `${baseURL}/${url}` : `/${url}`;
  }

  // URL 디버깅 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('fetchWithTimeout:', {
      originalUrl: url,
      fullUrl: fullUrl,
      timeout: timeout
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      let errorData: any = {};
      
      // Content-Type 헤더 확인
      const contentType = response.headers.get('content-type');
      const isJsonResponse = contentType && contentType.includes('application/json');
      
      try {
        // JSON 응답인 경우만 파싱 시도
        if (isJsonResponse) {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          // HTML이나 다른 형태의 응답 처리
          const responseText = await response.text();
          
          // HTML 응답 감지
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            if (import.meta.env.DEV) {
              console.error('HTML 응답 수신:', {
                url: fullUrl,
                status: response.status,
                contentType,
                responsePreview: responseText.substring(0, 200) + '...'
              });
            }
            
            // 더 구체적인 에러 메시지 제공
            if (response.status === 404) {
              errorMessage = `API 엔드포인트를 찾을 수 없습니다: ${url}`;
            } else {
              errorMessage = `서버에서 예상치 못한 응답을 받았습니다 (HTML 페이지)`;
            }
          } else {
            // 다른 텍스트 응답
            errorMessage = responseText || errorMessage;
          }
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 기본 메시지 사용
        if (import.meta.env.DEV) {
          console.error('응답 파싱 실패:', parseError);
        }
        
        if (response.status === 404) {
          errorMessage = `API 엔드포인트를 찾을 수 없습니다: ${url}`;
        } else if (response.status === 500) {
          errorMessage = 'Internal server error';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests';
        }
      }
      
      throw new FetchError(errorMessage, response.status, response);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof FetchError) {
      throw error;
    }
    
    if (error.name === 'AbortError') {
      throw new FetchError('Request timeout');
    }
    
    throw new FetchError(
      error.message || 'Network error',
      undefined,
      undefined
    );
  }
}

// 응답 검증 및 JSON 파싱을 위한 공통 함수
async function parseJsonResponse<T>(response: Response, url: string): Promise<T> {
  // Content-Type 검증
  const contentType = response.headers.get('content-type');
  const isJsonResponse = contentType && contentType.includes('application/json');
  
  if (!isJsonResponse) {
    const responseText = await response.text();
    
    // HTML 응답 감지 및 에러 처리
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      if (import.meta.env.DEV) {
        console.error('예상치 못한 HTML 응답:', {
          url,
          contentType,
          responsePreview: responseText.substring(0, 200) + '...'
        });
      }
      throw new FetchError(`API가 HTML 페이지를 반환했습니다. 엔드포인트를 확인해주세요: ${url}`);
    }
    
    // JSON이 아닌 다른 응답 타입
    throw new FetchError(`예상된 JSON 응답이 아닙니다. Content-Type: ${contentType || 'unknown'}`);
  }
  
  try {
    const rawData = await response.json();
    return extractData<T>(rawData);
  } catch (parseError) {
    if (import.meta.env.DEV) {
      console.error('JSON 파싱 실패:', parseError);
    }
    throw new FetchError('서버 응답을 파싱할 수 없습니다. JSON 형식이 올바르지 않습니다.');
  }
}

// 표준화된 API 응답 구조 처리
function extractData<T>(responseData: unknown): T {
  if (import.meta.env.DEV) {
    console.log('extractData: 응답 데이터 처리:', {
      type: typeof responseData,
      hasSuccess: responseData && typeof responseData === 'object' && 'success' in responseData
    });
  }
  
  // 백엔드의 표준화된 응답 구조: { success: boolean, data: T, message?: string }
  if (responseData && typeof responseData === 'object' && 'success' in responseData) {
    // QnA API는 data 대신 answer 필드를 사용
    if (responseData.answer !== undefined) {
      return responseData;
    }
    // AI Analysis API는 data 대신 analysis 필드를 사용
    if (responseData.analysis !== undefined) {
      return responseData;
    }
    
    // 성공 응답이지만 data가 없는 경우 처리
    if (responseData.data === undefined) {
      if (import.meta.env.DEV) {
        console.warn('extractData: 표준 응답에 data 필드가 없음');
      }
      return responseData as T;
    }
    
    return responseData.data;
  }
  
  // 기존 형태 또는 이미 추출된 데이터
  return responseData;
}

export const api = {
  get: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'GET',
    });
    
    return parseJsonResponse<T>(response, url);
  },

  post: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,  // options를 나중에 spread하여 timeout 등의 설정을 덮어쓸 수 있게 함
    });
    
    return parseJsonResponse<T>(response, url);
  },

  put: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return parseJsonResponse<T>(response, url);
  },

  delete: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'DELETE',
    });
    
    return parseJsonResponse<T>(response, url);
  },
};

export { FetchError };

// 에러 처리가 강화된 API 함수들
import { handleError, retryOperation } from './errorHandler';

export const apiWithErrorHandling = {
  get: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    return retryOperation(async () => {
      try {
        return await api.get<T>(url, options);
      } catch (error) {
        const errorInfo = handleError(error, {
          method: 'GET',
          url,
          options,
        });
        throw error;
      }
    });
  },

  post: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<T> => {
    return retryOperation(async () => {
      try {
        return await api.post<T>(url, data, options);
      } catch (error) {
        const errorInfo = handleError(error, {
          method: 'POST',
          url,
          data,
          options,
        });
        throw error;
      }
    });
  },

  put: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: FetchOptions
  ): Promise<T> => {
    return retryOperation(async () => {
      try {
        return await api.put<T>(url, data, options);
      } catch (error) {
        const errorInfo = handleError(error, {
          method: 'PUT',
          url,
          data,
          options,
        });
        throw error;
      }
    });
  },

  delete: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    return retryOperation(async () => {
      try {
        return await api.delete<T>(url, options);
      } catch (error) {
        const errorInfo = handleError(error, {
          method: 'DELETE',
          url,
          options,
        });
        throw error;
      }
    });
  },
};