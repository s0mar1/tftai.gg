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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

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
  console.log('fetchApi 모드:', import.meta.env.MODE);
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, baseURL = '', ...fetchOptions } = {
    ...defaultOptions,
    ...options,
  };

  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

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
      
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
        if (response.status === 404) {
          errorMessage = 'Resource not found';
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
    const rawData = await response.json();
    return extractData<T>(rawData);
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
    const rawData = await response.json();
    return extractData<T>(rawData);
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
    const rawData = await response.json();
    return extractData<T>(rawData);
  },

  delete: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'DELETE',
    });
    const rawData = await response.json();
    return extractData<T>(rawData);
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