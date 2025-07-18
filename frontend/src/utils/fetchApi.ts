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

// 강제로 올바른 포트 사용 (환경변수 캐싱 문제 해결)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// 잘못된 포트 4002 사용 방지
const CORRECTED_API_URL = API_BASE_URL.replace('4002', '4001');

const defaultOptions: FetchOptions = {
  timeout: 30000,
  baseURL: CORRECTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// 환경 변수 디버깅
console.log('fetchApi 환경 변수:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL: API_BASE_URL,
  CORRECTED_API_URL: CORRECTED_API_URL,
  baseURL: defaultOptions.baseURL,
  mode: import.meta.env.MODE,
  allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, baseURL = '', ...fetchOptions } = {
    ...defaultOptions,
    ...options,
  };

  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  // URL 디버깅
  console.log('fetchWithTimeout:', {
    originalUrl: url,
    baseURL: baseURL,
    fullUrl: fullUrl,
    timeout: timeout
  });

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
function extractData<T>(responseData: any): T {
  console.log('extractData: 원본 응답 데이터:', {
    data: responseData,
    type: typeof responseData,
    isArray: Array.isArray(responseData),
    hasSuccess: responseData && typeof responseData === 'object' && 'success' in responseData,
    keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'not an object'
  });
  
  // 백엔드의 표준화된 응답 구조: { success: boolean, data: T, message?: string }
  if (responseData && typeof responseData === 'object' && 'success' in responseData) {
    // QnA API는 data 대신 answer 필드를 사용
    if (responseData.answer !== undefined) {
      console.log('extractData: QnA API 응답 처리');
      return responseData;
    }
    // AI Analysis API는 data 대신 analysis 필드를 사용
    if (responseData.analysis !== undefined) {
      console.log('extractData: AI Analysis API 응답 처리');
      return responseData;
    }
    
    console.log('extractData: 표준 응답 구조에서 data 추출:', {
      dataExists: 'data' in responseData,
      dataType: typeof responseData.data,
      dataIsArray: Array.isArray(responseData.data),
      dataKeys: responseData.data && typeof responseData.data === 'object' ? Object.keys(responseData.data) : 'not an object',
      dataValue: responseData.data
    });
    
    // 성공 응답이지만 data가 없는 경우 처리
    if (responseData.data === undefined) {
      console.warn('extractData: 표준 응답에 data 필드가 없음');
      return responseData as T;
    }
    
    return responseData.data;
  }
  
  // 기존 형태 또는 이미 추출된 데이터
  console.log('extractData: 원본 데이터 그대로 반환');
  return responseData;
}

export const api = {
  get: async <T = any>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'GET',
    });
    const rawData = await response.json();
    return extractData<T>(rawData);
  },

  post: async <T = any>(
    url: string,
    data?: any,
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

  put: async <T = any>(
    url: string,
    data?: any,
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

  delete: async <T = any>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithTimeout(url, {
      ...options,
      method: 'DELETE',
    });
    const rawData = await response.json();
    return extractData<T>(rawData);
  },
};

export { FetchError };