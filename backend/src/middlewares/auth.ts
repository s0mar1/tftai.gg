/**
 * JWT 기반 인증 미들웨어
 * GraphQL Context와 REST API에서 모두 사용 가능한 인증 시스템
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser, UserStatus, Permission } from '../models/User';
import logger from '../config/logger';
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../graphql/types';

// JWT 토큰 페이로드 인터페이스
export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  permissions: Permission[];
  status: UserStatus;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// 인증된 사용자 정보 (Context에 추가될 데이터)
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
  status: UserStatus;
  riotPuuid?: string;
  preferences: any;
}

// 인증 결과 타입
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  errorCode?: string;
}

/**
 * JWT 토큰에서 사용자 정보 추출
 */
export async function extractUserFromToken(token: string): Promise<AuthResult> {
  try {
    // 1. 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // 2. 사용자 조회
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return {
        success: false,
        error: '사용자를 찾을 수 없습니다',
        errorCode: 'USER_NOT_FOUND'
      };
    }
    
    // 3. 사용자 상태 확인
    if (user.status !== UserStatus.ACTIVE) {
      return {
        success: false,
        error: '계정이 비활성화되었습니다',
        errorCode: 'ACCOUNT_INACTIVE'
      };
    }
    
    // 4. 토큰 정보와 DB 정보 일치 확인
    if (decoded.username !== user.username || decoded.role !== user.role) {
      return {
        success: false,
        error: '토큰 정보가 일치하지 않습니다',
        errorCode: 'TOKEN_MISMATCH'
      };
    }
    
    // 5. 인증된 사용자 정보 구성
    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      riotPuuid: user.riotPuuid,
      preferences: user.preferences
    };
    
    return {
      success: true,
      user: authenticatedUser
    };
    
  } catch (error: any) {
    let errorMessage = '토큰 검증 실패';
    let errorCode = 'TOKEN_INVALID';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = '토큰이 만료되었습니다';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = '유효하지 않은 토큰입니다';
      errorCode = 'TOKEN_MALFORMED';
    }
    
    return {
      success: false,
      error: errorMessage,
      errorCode
    };
  }
}

/**
 * HTTP 요청에서 토큰 추출
 */
export function extractTokenFromRequest(req: Request): string | null {
  // 1. Authorization 헤더에서 추출
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. 쿠키에서 추출 (선택적)
  const cookieToken = req.cookies?.authToken;
  if (cookieToken) {
    return cookieToken;
  }
  
  // 3. 쿼리 파라미터에서 추출 (WebSocket 연결용)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }
  
  return null;
}

/**
 * Express 미들웨어: JWT 인증
 */
export const authenticate = async (
  req: Request & { user?: AuthenticatedUser },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: '인증 토큰이 필요합니다'
        }
      });
      return;
    }
    
    const authResult = await extractUserFromToken(token);
    
    if (!authResult.success) {
      res.status(401).json({
        success: false,
        error: {
          code: authResult.errorCode,
          message: authResult.error
        }
      });
      return;
    }
    
    // 인증된 사용자 정보를 요청 객체에 추가
    req.user = authResult.user!;
    
    // 마지막 활동 시간 업데이트 (비동기, 성능을 위해 await하지 않음)
    User.findByIdAndUpdate(
      authResult.user!.id, 
      { lastActiveAt: new Date() },
      { new: false }
    ).catch(error => {
      logger.warn('사용자 활동 시간 업데이트 실패:', error);
    });
    
    next();
  } catch (error: any) {
    logger.error('인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: '인증 처리 중 오류가 발생했습니다'
      }
    });
  }
};

/**
 * Express 미들웨어: 선택적 JWT 인증 (토큰이 있으면 인증, 없으면 통과)
 */
export const optionalAuthenticate = async (
  req: Request & { user?: AuthenticatedUser },
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      // 토큰이 없어도 통과
      next();
      return;
    }
    
    const authResult = await extractUserFromToken(token);
    
    if (authResult.success) {
      req.user = authResult.user!;
      
      // 마지막 활동 시간 업데이트
      User.findByIdAndUpdate(
        authResult.user!.id,
        { lastActiveAt: new Date() },
        { new: false }
      ).catch(error => {
        logger.warn('사용자 활동 시간 업데이트 실패:', error);
      });
    }
    
    // 인증 실패해도 통과 (선택적 인증)
    next();
  } catch (error: any) {
    logger.error('선택적 인증 미들웨어 오류:', error);
    // 에러가 있어도 통과
    next();
  }
};

/**
 * GraphQL Context용 인증 함수
 */
export async function authenticateGraphQLContext(context: GraphQLContext): Promise<AuthenticatedUser | null> {
  try {
    const token = extractTokenFromRequest(context.req);
    
    if (!token) {
      return null;
    }
    
    const authResult = await extractUserFromToken(token);
    
    if (!authResult.success) {
      logger.debug('GraphQL 인증 실패:', authResult.error);
      return null;
    }
    
    return authResult.user!;
  } catch (error: any) {
    logger.error('GraphQL 인증 오류:', error);
    return null;
  }
}

/**
 * GraphQL 리졸버용 인증 데코레이터
 */
export function requireAuth<T extends any[]>(
  resolver: (parent: any, args: any, context: GraphQLContext & { user: AuthenticatedUser }, ...rest: T) => any
) {
  return async (parent: any, args: any, context: GraphQLContext, ...rest: T) => {
    const user = await authenticateGraphQLContext(context);
    
    if (!user) {
      throw new GraphQLError('인증이 필요합니다', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 }
        }
      });
    }
    
    // 인증된 사용자 정보를 컨텍스트에 추가
    const authenticatedContext = { ...context, user };
    
    return resolver(parent, args, authenticatedContext, ...rest);
  };
}

/**
 * GraphQL 리졸버용 선택적 인증 데코레이터
 */
export function optionalAuth<T extends any[]>(
  resolver: (parent: any, args: any, context: GraphQLContext & { user?: AuthenticatedUser }, ...rest: T) => any
) {
  return async (parent: any, args: any, context: GraphQLContext, ...rest: T) => {
    const user = await authenticateGraphQLContext(context);
    
    const contextWithOptionalUser = { ...context, user: user || undefined };
    
    return resolver(parent, args, contextWithOptionalUser, ...rest);
  };
}

/**
 * 권한 확인 헬퍼
 */
export function hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
  return user.permissions.includes(permission) || user.permissions.includes(Permission.FULL_ACCESS);
}

/**
 * 권한 확인 데코레이터
 */
export function requirePermission<T extends any[]>(
  permission: Permission,
  resolver: (parent: any, args: any, context: GraphQLContext & { user: AuthenticatedUser }, ...rest: T) => any
) {
  return requireAuth(async (parent: any, args: any, context: GraphQLContext & { user: AuthenticatedUser }, ...rest: T) => {
    if (!hasPermission(context.user, permission)) {
      throw new GraphQLError('권한이 부족합니다', {
        extensions: {
          code: 'FORBIDDEN',
          requiredPermission: permission,
          http: { status: 403 }
        }
      });
    }
    
    return resolver(parent, args, context, ...rest);
  });
}

/**
 * Express 미들웨어: 권한 확인
 */
export const requirePermissionMiddleware = (permission: Permission) => {
  return (req: Request & { user?: AuthenticatedUser }, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: '인증이 필요합니다'
        }
      });
      return;
    }
    
    if (!hasPermission(req.user, permission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '권한이 부족합니다',
          requiredPermission: permission
        }
      });
      return;
    }
    
    next();
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  requireAuth,
  optionalAuth,
  requirePermission,
  requirePermissionMiddleware,
  extractUserFromToken,
  extractTokenFromRequest,
  authenticateGraphQLContext,
  hasPermission
};