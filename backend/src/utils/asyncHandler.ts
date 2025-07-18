// backend/src/utils/asyncHandler.ts
// 비동기 라우터 핸들러를 중앙 에러 핸들러로 연결하는 유틸리티

import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// 타입 정의
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export type SyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Response;

/**
 * 비동기 라우터 핸들러를 래핑하여 에러를 자동으로 next()로 전달
 * 
 * @example
 * // 기존 방식 (계속 사용 가능)
 * router.get('/old-way', async (req, res, next) => {
 *   try {
 *     // 로직
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 * 
 * // 새로운 방식 (권장)
 * router.get('/new-way', asyncHandler(async (req, res) => {
 *   // 로직 - 에러 시 자동으로 next(error) 호출됨
 * }));
 */
export const asyncHandler = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 프라미스 실행 및 에러 자동 처리
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      // 에러 로깅 (상세 에러는 중앙 핸들러에서 처리)
      logger.warn('AsyncHandler caught error:', {
        url: req.originalUrl,
        method: req.method,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 중앙 에러 핸들러로 전달
      next(error);
    });
  };
};

/**
 * 동기 라우터 핸들러를 래핑하여 에러를 자동으로 next()로 전달
 * 
 * @example
 * router.get('/sync-route', syncHandler((req, res) => {
 *   // 동기 로직 - 에러 시 자동으로 next(error) 호출됨
 * }));
 */
export const syncHandler = (fn: SyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req, res, next);
      return result;
    } catch (error: unknown) {
      // 에러 로깅
      logger.warn('SyncHandler caught error:', {
        url: req.originalUrl,
        method: req.method,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 중앙 에러 핸들러로 전달
      next(error);
    }
  };
};

/**
 * 미들웨어용 비동기 핸들러
 * 
 * @example
 * app.use(asyncMiddleware(async (req, res, next) => {
 *   // 비동기 미들웨어 로직
 *   next(); // 성공 시 다음 미들웨어로
 * }));
 */
export const asyncMiddleware = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 여러 비동기 핸들러를 체이닝하는 헬퍼
 * 
 * @example
 * router.get('/complex', chainAsync([
 *   async (req, res, next) => { next(); },
 *   async (req, res, next) => { next(); },
 *   async (req, res) => { res.json({}); }
 * ]));
 */
export const chainAsync = (handlers: AsyncRouteHandler[]) => {
  return handlers.map(handler => asyncHandler(handler));
};

// 기본 export
export default asyncHandler;