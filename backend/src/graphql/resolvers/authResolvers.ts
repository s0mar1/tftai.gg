/**
 * GraphQL 인증 리졸버
 * 사용자 인증, 권한 관리 관련 GraphQL 리졸버
 */

import { GraphQLError } from 'graphql';
import User, { IUser, UserRole, UserStatus } from '../../models/User';
import { requireAuth, requirePermission, hasPermission } from '../../middlewares/auth';
import { requireAccess, ResourceType, ActionType } from '../../auth/rbac';
import { Permission } from '../../models/User';
import type { GraphQLContext } from '../types';
import logger from '../../config/logger';

// 입력 타입 정의
interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface UpdateProfileInput {
  displayName?: string;
  avatar?: string;
  riotGameName?: string;
  riotTagLine?: string;
  linkedRegions?: string[];
}

interface UpdatePreferencesInput {
  language?: 'KO' | 'EN' | 'JA' | 'ZH';
  theme?: 'LIGHT' | 'DARK' | 'AUTO';
  notifications?: {
    email?: boolean;
    push?: boolean;
    tierlistUpdates?: boolean;
    patchNotes?: boolean;
  };
}

/**
 * 사용자 정보 포맷팅 헬퍼
 */
function formatUser(user: IUser): any {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    role: user.role.toUpperCase(),
    status: user.status.toUpperCase(),
    riotPuuid: user.riotPuuid,
    riotGameName: user.riotGameName,
    riotTagLine: user.riotTagLine,
    linkedRegions: user.linkedRegions,
    preferences: {
      language: user.preferences.language.toUpperCase(),
      theme: user.preferences.theme.toUpperCase(),
      notifications: user.preferences.notifications
    },
    stats: user.stats,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    lastActiveAt: user.lastActiveAt?.toISOString()
  };
}

/**
 * 인증 GraphQL 쿼리 리졸버
 */
export const authQueryResolvers = {
  /**
   * 현재 로그인한 사용자 정보 조회
   */
  me: requireAuth(async (parent: any, args: any, context: GraphQLContext & { user: any }) => {
    try {
      const userId = context.user.id;
      
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new GraphQLError('사용자를 찾을 수 없습니다', {
          extensions: {
            code: 'USER_NOT_FOUND',
            http: { status: 404 }
          }
        });
      }

      logger.info(`사용자 정보 조회: ${user.username} (${userId})`);
      
      return formatUser(user);
    } catch (error: any) {
      logger.error('사용자 정보 조회 실패:', error);
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('사용자 정보 조회 중 오류가 발생했습니다', {
        extensions: {
          code: 'INTERNAL_ERROR',
          http: { status: 500 }
        }
      });
    }
  }),

  /**
   * 사용자 목록 조회 (관리자 권한 필요)
   */
  users: requireAccess(ResourceType.USER, ActionType.MANAGE)(
    async (parent: any, args: { limit?: number; offset?: number }, context: GraphQLContext) => {
      try {
        const { limit = 10, offset = 0 } = args;
        
        const users = await User.find({ status: { $ne: UserStatus.BANNED } })
          .limit(Math.min(limit, 100))
          .skip(offset)
          .sort({ createdAt: -1 })
          .lean();

        logger.info(`사용자 목록 조회: ${users.length}명 (관리자: ${context.user?.username})`);

        return users.map(formatUser);
      } catch (error: any) {
        logger.error('사용자 목록 조회 실패:', error);
        
        throw new GraphQLError('사용자 목록 조회 중 오류가 발생했습니다', {
          extensions: {
            code: 'INTERNAL_ERROR',
            http: { status: 500 }
          }
        });
      }
    }
  )
};

/**
 * 인증 GraphQL 뮤테이션 리졸버
 */
export const authMutationResolvers = {
  /**
   * 회원가입
   */
  register: async (parent: any, args: { input: RegisterInput }, context: GraphQLContext) => {
    try {
      const { email, username, password, displayName } = args.input;

      // 중복 검사
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username }
        ]
      });

      if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        throw new GraphQLError(`이미 사용 중인 ${field === 'email' ? '이메일' : '사용자명'}입니다`, {
          extensions: {
            code: 'DUPLICATE_FIELD',
            field,
            http: { status: 400 }
          }
        });
      }

      // 사용자 생성
      const user = new User({
        email: email.toLowerCase(),
        username,
        password,
        displayName,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        preferences: {
          language: 'ko',
          theme: 'auto',
          notifications: {
            email: true,
            push: false,
            tierlistUpdates: true,
            patchNotes: true
          }
        },
        stats: {
          analysisCount: 0,
          guideCount: 0,
          favoriteChampions: []
        }
      });

      await user.save();

      // 토큰 생성
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(`회원가입 성공: ${username} (${user._id})`);

      return {
        success: true,
        user: formatUser(user),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60 // 24시간
        },
        message: '회원가입이 완료되었습니다'
      };

    } catch (error: any) {
      logger.error('회원가입 실패:', error);
      
      if (error instanceof GraphQLError) {
        throw error;
      }

      // Mongoose 검증 오류
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        throw new GraphQLError(messages.join(', '), {
          extensions: {
            code: 'VALIDATION_ERROR',
            http: { status: 400 }
          }
        });
      }

      throw new GraphQLError('회원가입 중 오류가 발생했습니다', {
        extensions: {
          code: 'INTERNAL_ERROR',
          http: { status: 500 }
        }
      });
    }
  },

  /**
   * 로그인
   */
  login: async (parent: any, args: { input: LoginInput }, context: GraphQLContext) => {
    try {
      const { email, password } = args.input;

      // 사용자 조회
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new GraphQLError('이메일 또는 비밀번호가 올바르지 않습니다', {
          extensions: {
            code: 'INVALID_CREDENTIALS',
            http: { status: 401 }
          }
        });
      }

      // 계정 상태 확인
      if (user.status !== UserStatus.ACTIVE) {
        throw new GraphQLError('계정이 비활성화 상태입니다', {
          extensions: {
            code: 'ACCOUNT_INACTIVE',
            http: { status: 403 }
          }
        });
      }

      // 비밀번호 확인
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new GraphQLError('이메일 또는 비밀번호가 올바르지 않습니다', {
          extensions: {
            code: 'INVALID_CREDENTIALS',
            http: { status: 401 }
          }
        });
      }

      // 로그인 정보 업데이트
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // 토큰 생성
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(`로그인 성공: ${user.username} (${user._id})`);

      return {
        success: true,
        user: formatUser(user),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60 // 24시간
        },
        message: '로그인이 완료되었습니다'
      };

    } catch (error: any) {
      logger.error('로그인 실패:', error);
      
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError('로그인 중 오류가 발생했습니다', {
        extensions: {
          code: 'INTERNAL_ERROR',
          http: { status: 500 }
        }
      });
    }
  },

  /**
   * 토큰 갱신
   */
  refreshToken: async (parent: any, args: { refreshToken: string }, context: GraphQLContext) => {
    try {
      // 리프레시 토큰은 별도 검증 로직이 필요하므로 추후 구현
      throw new GraphQLError('토큰 갱신 기능은 추후 구현 예정입니다', {
        extensions: {
          code: 'NOT_IMPLEMENTED',
          http: { status: 501 }
        }
      });
    } catch (error: any) {
      logger.error('토큰 갱신 실패:', error);
      throw error;
    }
  },

  /**
   * 로그아웃
   */
  logout: requireAuth(async (parent: any, args: any, context: GraphQLContext & { user: any }) => {
    try {
      // JWT는 stateless하므로 클라이언트에서 토큰 삭제
      // 추후 토큰 블랙리스트 기능 추가 가능
      
      logger.info(`로그아웃: ${context.user.username} (${context.user.id})`);
      
      return true;
    } catch (error: any) {
      logger.error('로그아웃 실패:', error);
      return false;
    }
  }),

  /**
   * 프로필 업데이트
   */
  updateProfile: requireAccess(ResourceType.USER, ActionType.UPDATE)(
    async (parent: any, args: { input: UpdateProfileInput }, context: GraphQLContext & { user: any }) => {
      try {
        const userId = context.user.id;
        const updateData = args.input;

        const user = await User.findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (!user) {
          throw new GraphQLError('사용자를 찾을 수 없습니다', {
            extensions: {
              code: 'USER_NOT_FOUND',
              http: { status: 404 }
            }
          });
        }

        logger.info(`프로필 업데이트: ${user.username} (${userId})`);

        return formatUser(user);
      } catch (error: any) {
        logger.error('프로필 업데이트 실패:', error);
        
        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError('프로필 업데이트 중 오류가 발생했습니다', {
          extensions: {
            code: 'INTERNAL_ERROR',
            http: { status: 500 }
          }
        });
      }
    }
  ),

  /**
   * 환경설정 업데이트
   */
  updatePreferences: requireAccess(ResourceType.USER, ActionType.UPDATE)(
    async (parent: any, args: { input: UpdatePreferencesInput }, context: GraphQLContext & { user: any }) => {
      try {
        const userId = context.user.id;
        const { language, theme, notifications } = args.input;

        const updateData: any = {};
        
        if (language) {
          updateData['preferences.language'] = language.toLowerCase();
        }
        
        if (theme) {
          updateData['preferences.theme'] = theme.toLowerCase();
        }
        
        if (notifications) {
          Object.keys(notifications).forEach(key => {
            if (notifications[key as keyof typeof notifications] !== undefined) {
              updateData[`preferences.notifications.${key}`] = notifications[key as keyof typeof notifications];
            }
          });
        }

        const user = await User.findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (!user) {
          throw new GraphQLError('사용자를 찾을 수 없습니다', {
            extensions: {
              code: 'USER_NOT_FOUND',
              http: { status: 404 }
            }
          });
        }

        logger.info(`환경설정 업데이트: ${user.username} (${userId})`);

        return formatUser(user);
      } catch (error: any) {
        logger.error('환경설정 업데이트 실패:', error);
        
        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError('환경설정 업데이트 중 오류가 발생했습니다', {
          extensions: {
            code: 'INTERNAL_ERROR',
            http: { status: 500 }
          }
        });
      }
    }
  ),

  /**
   * 비밀번호 변경
   */
  changePassword: requireAuth(async (parent: any, args: { currentPassword: string; newPassword: string }, context: GraphQLContext & { user: any }) => {
    try {
      const userId = context.user.id;
      const { currentPassword, newPassword } = args;

      const user = await User.findById(userId);
      if (!user) {
        throw new GraphQLError('사용자를 찾을 수 없습니다', {
          extensions: {
            code: 'USER_NOT_FOUND',
            http: { status: 404 }
          }
        });
      }

      // 현재 비밀번호 확인
      const isValidCurrentPassword = await user.comparePassword(currentPassword);
      if (!isValidCurrentPassword) {
        throw new GraphQLError('현재 비밀번호가 올바르지 않습니다', {
          extensions: {
            code: 'INVALID_PASSWORD',
            http: { status: 400 }
          }
        });
      }

      // 새 비밀번호 설정
      user.password = newPassword;
      await user.save();

      logger.info(`비밀번호 변경: ${user.username} (${userId})`);

      return true;
    } catch (error: any) {
      logger.error('비밀번호 변경 실패:', error);
      
      if (error instanceof GraphQLError) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        throw new GraphQLError(messages.join(', '), {
          extensions: {
            code: 'VALIDATION_ERROR',
            http: { status: 400 }
          }
        });
      }

      throw new GraphQLError('비밀번호 변경 중 오류가 발생했습니다', {
        extensions: {
          code: 'INTERNAL_ERROR',
          http: { status: 500 }
        }
      });
    }
  }),

  /**
   * 사용자 삭제 (관리자 권한 필요)
   */
  deleteUser: requireAccess(ResourceType.USER, ActionType.DELETE)(
    async (parent: any, args: { userId: string }, context: GraphQLContext & { user: any }) => {
      try {
        const { userId } = args;
        const adminUser = context.user;

        // 본인 삭제 방지
        if (userId === adminUser.id) {
          throw new GraphQLError('본인 계정은 삭제할 수 없습니다', {
            extensions: {
              code: 'SELF_DELETE_NOT_ALLOWED',
              http: { status: 400 }
            }
          });
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
          throw new GraphQLError('사용자를 찾을 수 없습니다', {
            extensions: {
              code: 'USER_NOT_FOUND',
              http: { status: 404 }
            }
          });
        }

        logger.info(`사용자 삭제: ${user.username} (${userId}) by ${adminUser.username}`);

        return true;
      } catch (error: any) {
        logger.error('사용자 삭제 실패:', error);
        
        if (error instanceof GraphQLError) {
          throw error;
        }

        throw new GraphQLError('사용자 삭제 중 오류가 발생했습니다', {
          extensions: {
            code: 'INTERNAL_ERROR',
            http: { status: 500 }
          }
        });
      }
    }
  )
};

export default {
  Query: authQueryResolvers,
  Mutation: authMutationResolvers
};