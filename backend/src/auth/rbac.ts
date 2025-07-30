/**
 * Role-Based Access Control (RBAC) 시스템
 * 사용자 역할과 권한을 기반으로 하는 세밀한 접근 제어
 */

import { GraphQLError } from 'graphql';
import type { AuthenticatedUser } from '../middlewares/auth';
import { Permission, UserRole } from '../models/User';
import logger from '../config/logger';

// RBAC 에러 타입
export enum RBACErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED'
}

// 리소스 타입 정의
export enum ResourceType {
  CHAMPION = 'champion',
  TIERLIST = 'tierlist',
  SUMMONER = 'summoner',
  ANALYSIS = 'analysis',
  USER = 'user',
  SYSTEM = 'system',
  ADMIN_PANEL = 'admin_panel'
}

// 작업 타입 정의
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  MODERATE = 'moderate',
  EXPORT = 'export',
  IMPORT = 'import'
}

// 접근 컨텍스트
export interface AccessContext {
  user: AuthenticatedUser;
  resource: ResourceType;
  action: ActionType;
  resourceId?: string;
  targetUserId?: string; // 다른 사용자의 리소스 접근 시
  metadata?: Record<string, any>;
}

// RBAC 결과
export interface RBACResult {
  allowed: boolean;
  reason?: string;
  errorCode?: RBACErrorCode;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
}

/**
 * 핵심 RBAC 클래스
 */
export class RoleBasedAccessControl {
  // 역할 계층 구조 (높은 숫자 = 높은 권한)
  private static readonly ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.MODERATOR]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4
  };

  // 리소스별 필요 권한 매핑
  private static readonly RESOURCE_PERMISSIONS: Record<string, Permission[]> = {
    // 챔피언 데이터
    [`${ResourceType.CHAMPION}:${ActionType.READ}`]: [Permission.READ_CHAMPIONS],
    [`${ResourceType.CHAMPION}:${ActionType.MANAGE}`]: [Permission.MANAGE_SYSTEM],

    // 티어리스트 데이터
    [`${ResourceType.TIERLIST}:${ActionType.READ}`]: [Permission.READ_TIERLIST],
    [`${ResourceType.TIERLIST}:${ActionType.MANAGE}`]: [Permission.MANAGE_SYSTEM],

    // 소환사 데이터
    [`${ResourceType.SUMMONER}:${ActionType.READ}`]: [Permission.READ_SUMMONER],
    [`${ResourceType.SUMMONER}:${ActionType.MANAGE}`]: [Permission.MANAGE_SYSTEM],

    // 분석 데이터
    [`${ResourceType.ANALYSIS}:${ActionType.CREATE}`]: [Permission.CREATE_ANALYSIS],
    [`${ResourceType.ANALYSIS}:${ActionType.READ}`]: [Permission.READ_OWN_ANALYSIS, Permission.READ_ALL_ANALYSIS],
    [`${ResourceType.ANALYSIS}:${ActionType.UPDATE}`]: [Permission.READ_OWN_ANALYSIS],
    [`${ResourceType.ANALYSIS}:${ActionType.DELETE}`]: [Permission.READ_OWN_ANALYSIS],
    [`${ResourceType.ANALYSIS}:${ActionType.MODERATE}`]: [Permission.MODERATE_CONTENT],

    // 사용자 관리
    [`${ResourceType.USER}:${ActionType.READ}`]: [Permission.UPDATE_OWN_PROFILE, Permission.MANAGE_USERS],
    [`${ResourceType.USER}:${ActionType.UPDATE}`]: [Permission.UPDATE_OWN_PROFILE, Permission.MANAGE_USERS],
    [`${ResourceType.USER}:${ActionType.DELETE}`]: [Permission.MANAGE_USERS],
    [`${ResourceType.USER}:${ActionType.MANAGE}`]: [Permission.MANAGE_USERS],

    // 시스템 관리
    [`${ResourceType.SYSTEM}:${ActionType.READ}`]: [Permission.VIEW_ANALYTICS],
    [`${ResourceType.SYSTEM}:${ActionType.MANAGE}`]: [Permission.MANAGE_SYSTEM],
    [`${ResourceType.ADMIN_PANEL}:${ActionType.READ}`]: [Permission.VIEW_ANALYTICS],
    [`${ResourceType.ADMIN_PANEL}:${ActionType.MANAGE}`]: [Permission.MANAGE_SYSTEM]
  };

  /**
   * 역할 기반 접근 권한 확인
   */
  static checkRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
    return this.ROLE_HIERARCHY[userRole] >= this.ROLE_HIERARCHY[requiredRole];
  }

  /**
   * 권한 기반 접근 권한 확인
   */
  static checkPermissionAccess(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    // FULL_ACCESS 권한이 있으면 모든 접근 허용
    if (userPermissions.includes(Permission.FULL_ACCESS)) {
      return true;
    }

    // 필요한 권한 중 하나라도 있으면 접근 허용 (OR 조건)
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * 소유권 기반 접근 권한 확인
   */
  static checkOwnershipAccess(context: AccessContext): boolean {
    const { user, targetUserId, resource, action } = context;

    // 본인의 리소스에 대한 접근인지 확인
    if (targetUserId && targetUserId !== user.id) {
      // 다른 사용자의 리소스에 접근하려는 경우
      // 관리자급 권한이 있는지 확인
      if (resource === ResourceType.USER && action === ActionType.READ) {
        return user.permissions.includes(Permission.MANAGE_USERS);
      }
      if (resource === ResourceType.ANALYSIS && action === ActionType.READ) {
        return user.permissions.includes(Permission.READ_ALL_ANALYSIS);
      }
      return false;
    }

    return true;
  }

  /**
   * 종합적인 접근 권한 확인
   */
  static checkAccess(context: AccessContext): RBACResult {
    const { user, resource, action } = context;

    try {
      // 1. 기본 인증 확인
      if (!user) {
        return {
          allowed: false,
          reason: '인증이 필요합니다',
          errorCode: RBACErrorCode.UNAUTHENTICATED
        };
      }

      // 2. 계정 상태 확인
      if (user.status !== 'active') {
        return {
          allowed: false,
          reason: '계정이 비활성화 상태입니다',
          errorCode: RBACErrorCode.FORBIDDEN
        };
      }

      // 3. 슈퍼 관리자는 모든 접근 허용
      if (user.role === UserRole.SUPER_ADMIN || user.permissions.includes(Permission.FULL_ACCESS)) {
        return {
          allowed: true,
          reason: '슈퍼 관리자 권한으로 접근 허용'
        };
      }

      // 4. 소유권 기반 접근 확인
      if (!this.checkOwnershipAccess(context)) {
        return {
          allowed: false,
          reason: '리소스에 대한 소유권이 없습니다',
          errorCode: RBACErrorCode.RESOURCE_ACCESS_DENIED
        };
      }

      // 5. 권한 기반 접근 확인
      const permissionKey = `${resource}:${action}`;
      const requiredPermissions = this.RESOURCE_PERMISSIONS[permissionKey];

      if (requiredPermissions) {
        const hasPermission = this.checkPermissionAccess(user.permissions, requiredPermissions);
        
        if (!hasPermission) {
          return {
            allowed: false,
            reason: '필요한 권한이 없습니다',
            errorCode: RBACErrorCode.INSUFFICIENT_PERMISSION,
            requiredPermissions
          };
        }
      }

      // 6. 특별한 비즈니스 규칙 확인
      const businessRuleCheck = this.checkBusinessRules(context);
      if (!businessRuleCheck.allowed) {
        return businessRuleCheck;
      }

      return {
        allowed: true,
        reason: '접근 권한이 확인되었습니다'
      };

    } catch (error: any) {
      logger.error('RBAC 접근 권한 확인 중 오류:', error);
      
      return {
        allowed: false,
        reason: '권한 확인 중 오류가 발생했습니다',
        errorCode: RBACErrorCode.FORBIDDEN
      };
    }
  }

  /**
   * 비즈니스 규칙 기반 접근 확인
   */
  private static checkBusinessRules(context: AccessContext): RBACResult {
    const { user, resource, action, metadata } = context;

    // 분석 생성 제한 (예: 일일 분석 횟수 제한)
    if (resource === ResourceType.ANALYSIS && action === ActionType.CREATE) {
      const dailyLimit = metadata?.dailyAnalysisCount || 0;
      const maxDailyAnalysis = user.role === UserRole.USER ? 10 : 50;
      
      if (dailyLimit >= maxDailyAnalysis) {
        return {
          allowed: false,
          reason: `일일 분석 생성 한도(${maxDailyAnalysis}회)를 초과했습니다`,
          errorCode: RBACErrorCode.OPERATION_NOT_ALLOWED
        };
      }
    }

    // 시스템 관리 작업 시간 제한 (예: 업무시간에만 허용)
    if (resource === ResourceType.SYSTEM && action === ActionType.MANAGE) {
      const now = new Date();
      const hour = now.getHours();
      
      // 오전 9시 ~ 오후 6시만 시스템 관리 허용
      if (hour < 9 || hour > 18) {
        return {
          allowed: false,
          reason: '시스템 관리는 업무시간(09:00-18:00)에만 가능합니다',
          errorCode: RBACErrorCode.OPERATION_NOT_ALLOWED
        };
      }
    }

    return {
      allowed: true
    };
  }

  /**
   * GraphQL 리졸버용 접근 권한 확인 데코레이터
   */
  static requireAccess(resource: ResourceType, action: ActionType) {
    return function<T extends any[]>(
      resolver: (parent: any, args: any, context: any, ...rest: T) => any
    ) {
      return async (parent: any, args: any, context: any, ...rest: T) => {
        // 인증된 사용자 확인
        if (!context.user) {
          throw new GraphQLError('인증이 필요합니다', {
            extensions: {
              code: RBACErrorCode.UNAUTHENTICATED,
              http: { status: 401 }
            }
          });
        }

        // 접근 권한 확인
        const accessContext: AccessContext = {
          user: context.user,
          resource,
          action,
          resourceId: args.id || args.input?.id,
          targetUserId: args.userId || args.input?.userId,
          metadata: {
            ...context,
            args
          }
        };

        const rbacResult = RoleBasedAccessControl.checkAccess(accessContext);

        if (!rbacResult.allowed) {
          logger.warn(`RBAC 접근 거부:`, {
            userId: context.user.id,
            username: context.user.username,
            resource,
            action,
            reason: rbacResult.reason,
            errorCode: rbacResult.errorCode
          });

          throw new GraphQLError(rbacResult.reason || '접근이 거부되었습니다', {
            extensions: {
              code: rbacResult.errorCode || RBACErrorCode.FORBIDDEN,
              resource,
              action,
              requiredPermissions: rbacResult.requiredPermissions,
              requiredRole: rbacResult.requiredRole,
              http: { status: 403 }
            }
          });
        }

        // 접근 로그
        logger.info(`RBAC 접근 허용:`, {
          userId: context.user.id,
          username: context.user.username,
          resource,
          action,
          reason: rbacResult.reason
        });

        return resolver(parent, args, context, ...rest);
      };
    };
  }

  /**
   * Express 미들웨어용 접근 권한 확인
   */
  static requireAccessMiddleware(resource: ResourceType, action: ActionType) {
    return (req: any, res: any, next: any): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: RBACErrorCode.UNAUTHENTICATED,
            message: '인증이 필요합니다'
          }
        });
        return;
      }

      const accessContext: AccessContext = {
        user: req.user,
        resource,
        action,
        resourceId: req.params.id,
        targetUserId: req.params.userId || req.body.userId,
        metadata: {
          body: req.body,
          params: req.params,
          query: req.query
        }
      };

      const rbacResult = this.checkAccess(accessContext);

      if (!rbacResult.allowed) {
        logger.warn(`RBAC REST 접근 거부:`, {
          userId: req.user.id,
          username: req.user.username,
          resource,
          action,
          reason: rbacResult.reason,
          path: req.path,
          method: req.method
        });

        res.status(403).json({
          success: false,
          error: {
            code: rbacResult.errorCode || RBACErrorCode.FORBIDDEN,
            message: rbacResult.reason || '접근이 거부되었습니다',
            resource,
            action,
            requiredPermissions: rbacResult.requiredPermissions,
            requiredRole: rbacResult.requiredRole
          }
        });
        return;
      }

      logger.info(`RBAC REST 접근 허용:`, {
        userId: req.user.id,
        username: req.user.username,
        resource,
        action,
        path: req.path,
        method: req.method
      });

      next();
    };
  }
}

// 편의를 위한 별칭 export
export const requireAccess = RoleBasedAccessControl.requireAccess;
export const requireAccessMiddleware = RoleBasedAccessControl.requireAccessMiddleware;
export const checkAccess = RoleBasedAccessControl.checkAccess.bind(RoleBasedAccessControl);

export default RoleBasedAccessControl;