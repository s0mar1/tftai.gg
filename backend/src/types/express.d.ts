import { Request as ExpressRequest } from 'express';

export interface TypedRequestBody<T> extends ExpressRequest {
  body: T;
}

export interface TypedRequestQuery<T> extends ExpressRequest {
  query: T;
}

export interface TypedRequestParams<T> extends ExpressRequest {
  params: T;
}

export interface TypedRequest<T = any, U = any, V = any> extends ExpressRequest {
  body: T;
  query: U;
  params: V;
}

// Error response 타입
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  stack?: string;
}

// Success response 타입
export interface SuccessResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// Pagination 타입
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}