/**
 * 사용자 모델 정의
 * JWT 인증 및 RBAC 권한 제어를 위한 사용자 데이터 모델
 */

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 사용자 역할 enum
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator', 
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// 사용자 상태 enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

// 권한 enum
export enum Permission {
  // 기본 권한
  READ_CHAMPIONS = 'read:champions',
  READ_TIERLIST = 'read:tierlist',
  READ_SUMMONER = 'read:summoner',
  
  // 사용자 권한
  CREATE_ANALYSIS = 'create:analysis',
  READ_OWN_ANALYSIS = 'read:own_analysis',
  UPDATE_OWN_PROFILE = 'update:own_profile',
  
  // 모더레이터 권한
  READ_ALL_ANALYSIS = 'read:all_analysis',
  MODERATE_CONTENT = 'moderate:content',
  MANAGE_GUIDES = 'manage:guides',
  
  // 관리자 권한
  MANAGE_USERS = 'manage:users',
  VIEW_ANALYTICS = 'view:analytics',
  MANAGE_SYSTEM = 'manage:system',
  
  // 슈퍼 관리자 권한
  FULL_ACCESS = 'full:access'
}

// 사용자 인터페이스
export interface IUser extends Document {
  _id: Types.ObjectId;
  
  // 기본 정보
  email: string;
  username: string;
  password: string;
  displayName?: string;
  avatar?: string;
  
  // 계정 정보
  role: UserRole;
  status: UserStatus;
  permissions: Permission[];
  
  // Riot 게임 연동 정보
  riotPuuid?: string;
  riotGameName?: string;
  riotTagLine?: string;
  linkedRegions: string[];
  
  // 메타 정보
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  loginCount: number;
  
  // 설정
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
      tierlistUpdates: boolean;
      patchNotes: boolean;
    };
  };
  
  // 통계
  stats: {
    analysisCount: number;
    guideCount: number;
    favoriteChampions: string[];
  };
  
  // 타임스탬프
  createdAt: Date;
  updatedAt: Date;
  
  // 인스턴스 메서드
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  hasPermission(permission: Permission): boolean;
  hasRole(role: UserRole): boolean;
  canAccess(resource: string, action: string): boolean;
  toJSON(): Partial<IUser>;
}

// 사용자 스키마
const UserSchema = new Schema<IUser>({
  // 기본 정보
  email: {
    type: String,
    required: [true, '이메일은 필수입니다'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '올바른 이메일 형식이 아닙니다'
    ]
  },
  
  username: {
    type: String,
    required: [true, '사용자명은 필수입니다'],
    unique: true,
    trim: true,
    minlength: [3, '사용자명은 최소 3자 이상이어야 합니다'],
    maxlength: [20, '사용자명은 최대 20자까지 가능합니다'],
    match: [
      /^[a-zA-Z0-9_]+$/,
      '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다'
    ]
  },
  
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다'],
    minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다'],
    validate: {
      validator: function(password: string) {
        // 영문, 숫자, 특수문자 포함 검증
        return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다'
    }
  },
  
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, '표시명은 최대 50자까지 가능합니다']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  // 계정 정보
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE
  },
  
  permissions: [{
    type: String,
    enum: Object.values(Permission)
  }],
  
  // Riot 게임 연동 정보
  riotPuuid: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  
  riotGameName: {
    type: String,
    default: null
  },
  
  riotTagLine: {
    type: String,
    default: null
  },
  
  linkedRegions: [{
    type: String,
    enum: ['na1', 'euw1', 'eun1', 'kr', 'jp1', 'br1', 'la1', 'la2', 'oc1', 'tr1', 'ru']
  }],
  
  // 메타 정보
  lastLoginAt: {
    type: Date,
    default: null
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  loginCount: {
    type: Number,
    default: 0
  },
  
  // 설정
  preferences: {
    language: {
      type: String,
      enum: ['ko', 'en', 'ja', 'zh'],
      default: 'ko'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      tierlistUpdates: { type: Boolean, default: true },
      patchNotes: { type: Boolean, default: true }
    }
  },
  
  // 통계
  stats: {
    analysisCount: { type: Number, default: 0 },
    guideCount: { type: Number, default: 0 },
    favoriteChampions: [{ type: String }]
  }
}, {
  timestamps: true,
  
  // JSON 변환 시 민감한 정보 제외
  toJSON: {
    transform: function(_doc, ret) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (ret as any).password;
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (ret as any).__v;
      return ret;
    }
  }
});

// 인덱스 설정
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ riotPuuid: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActiveAt: -1 });

// 비밀번호 해싱 미들웨어
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error: any) {
    next(error);
  }
});

// 비밀번호 업데이트 시 권한 재설정
UserSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.permissions = getRolePermissions(this.role);
  }
  next();
});

// 인스턴스 메서드들
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function(): string {
  const payload = {
    userId: this._id.toString(),
    username: this.username,
    role: this.role,
    permissions: this.permissions,
    status: this.status
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'tft-meta-analyzer',
    audience: 'tft-users'
  } as jwt.SignOptions);
};

UserSchema.methods.generateRefreshToken = function(): string {
  const payload = {
    userId: this._id.toString(),
    tokenType: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'tft-meta-analyzer',
    audience: 'tft-users'
  } as jwt.SignOptions);
};

UserSchema.methods.hasPermission = function(permission: Permission): boolean {
  return this.permissions.includes(permission) || this.permissions.includes(Permission.FULL_ACCESS);
};

UserSchema.methods.hasRole = function(role: UserRole): boolean {
  return this.role === role;
};

UserSchema.methods.canAccess = function(resource: string, action: string): boolean {
  const requiredPermission = `${action}:${resource}` as Permission;
  return this.hasPermission(requiredPermission);
};

// 정적 메서드들
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ status: UserStatus.ACTIVE });
};

// 역할별 기본 권한 설정
function getRolePermissions(role: UserRole): Permission[] {
  const userPermissions = [
    Permission.READ_CHAMPIONS,
    Permission.READ_TIERLIST,
    Permission.READ_SUMMONER,
    Permission.CREATE_ANALYSIS,
    Permission.READ_OWN_ANALYSIS,
    Permission.UPDATE_OWN_PROFILE
  ];
  
  const moderatorPermissions = [
    ...userPermissions,
    Permission.READ_ALL_ANALYSIS,
    Permission.MODERATE_CONTENT,
    Permission.MANAGE_GUIDES
  ];
  
  const adminPermissions = [
    ...moderatorPermissions,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SYSTEM
  ];
  
  const permissionMap: Record<UserRole, Permission[]> = {
    [UserRole.USER]: userPermissions,
    [UserRole.MODERATOR]: moderatorPermissions,
    [UserRole.ADMIN]: adminPermissions,
    [UserRole.SUPER_ADMIN]: [Permission.FULL_ACCESS]
  };
  
  return permissionMap[role] || userPermissions;
}

// 모델 생성 및 내보내기
const User = model<IUser>('User', UserSchema);

export default User;
export { getRolePermissions };