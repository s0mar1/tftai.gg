// backend/src/utils/cursorPagination.ts

import { Document, Query, FilterQuery } from 'mongoose';
import logger from '../config/logger';

/**
 * 커서 페이지네이션 설정 인터페이스
 */
export interface CursorPaginationOptions {
  /** 커서 값 (Base64 인코딩된 문자열) */
  cursor?: string;
  /** 페이지당 항목 수 (기본값: 20) */
  limit?: number;
  /** 정렬 필드 (기본값: '_id') */
  sortField?: string;
  /** 정렬 순서 (기본값: -1 내림차순) */
  sortOrder?: 1 | -1;
  /** 추가 필터 조건 */
  filter?: FilterQuery<any>;
}

/**
 * 커서 페이지네이션 결과 인터페이스
 */
export interface CursorPaginationResult<T> {
  /** 조회된 데이터 배열 */
  items: T[];
  /** 다음 페이지가 존재하는지 여부 */
  hasNextPage: boolean;
  /** 이전 페이지가 존재하는지 여부 */
  hasPrevPage: boolean;
  /** 다음 페이지 커서 */
  nextCursor: string | null;
  /** 이전 페이지 커서 */
  prevCursor: string | null;
  /** 총 조회된 항목 수 */
  totalCount: number;
}

/**
 * 커서 정보 인터페이스
 */
interface CursorInfo {
  value: any;
  id: string;
  direction: 'forward' | 'backward';
}

/**
 * 커서 페이지네이션 유틸리티 클래스
 */
export class CursorPagination {
  
  /**
   * 커서 인코딩 (Base64)
   */
  static encodeCursor(value: any, id: string, direction: 'forward' | 'backward' = 'forward'): string {
    const cursorInfo: CursorInfo = { value, id, direction };
    return Buffer.from(JSON.stringify(cursorInfo)).toString('base64');
  }

  /**
   * 커서 디코딩 (Base64)
   */
  static decodeCursor(cursor: string): CursorInfo | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorInfo = JSON.parse(decoded) as CursorInfo;
      
      // 필수 필드 검증
      if (!cursorInfo.value || !cursorInfo.id) {
        logger.warn('Invalid cursor format: missing required fields');
        return null;
      }
      
      return cursorInfo;
    } catch (error) {
      logger.warn('Failed to decode cursor:', error);
      return null;
    }
  }

  /**
   * 커서 기반 페이지네이션 쿼리 생성
   */
  static async paginate<T extends Document>(
    baseQuery: Query<T[], T>,
    options: CursorPaginationOptions
  ): Promise<CursorPaginationResult<T>> {
    const {
      cursor,
      limit = 20,
      sortField = '_id',
      sortOrder = -1,
      filter = {}
    } = options;

    // 입력값 검증
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    let query = baseQuery.find(filter);
    let cursorInfo: CursorInfo | null = null;

    // 커서가 있는 경우 커서 조건 추가
    if (cursor) {
      cursorInfo = this.decodeCursor(cursor);
      if (!cursorInfo) {
        throw new Error('Invalid cursor format');
      }

      // 커서 방향에 따른 쿼리 조건 설정
      const cursorFilter: FilterQuery<any> = {};
      
      if (cursorInfo.direction === 'forward') {
        // 다음 페이지 (정렬 순서에 따라 조건 변경)
        if (sortOrder === -1) {
          cursorFilter[sortField] = { $lt: cursorInfo.value };
        } else {
          cursorFilter[sortField] = { $gt: cursorInfo.value };
        }
      } else {
        // 이전 페이지 (정렬 순서 반대로 조건 설정)
        if (sortOrder === -1) {
          cursorFilter[sortField] = { $gt: cursorInfo.value };
        } else {
          cursorFilter[sortField] = { $lt: cursorInfo.value };
        }
      }

      query = query.find(cursorFilter);
    }

    // 정렬 및 제한 적용
    query = query.sort({ [sortField]: sortOrder });

    // 이전 페이지 조회 시 정렬 순서 반전
    if (cursorInfo?.direction === 'backward') {
      query = query.sort({ [sortField]: -sortOrder });
    }

    // limit + 1로 다음 페이지 존재 여부 확인
    const items = await query.limit(limit + 1).lean();

    // 다음 페이지 존재 여부 확인
    const hasNextPage = items.length > limit;
    if (hasNextPage) {
      items.pop(); // 마지막 항목 제거
    }

    // 이전 페이지 조회 시 결과 순서 원복
    if (cursorInfo?.direction === 'backward') {
      items.reverse();
    }

    // 커서 생성
    const nextCursor = items.length > 0 && hasNextPage ? 
      this.encodeCursor(items[items.length - 1][sortField], items[items.length - 1]._id, 'forward') : 
      null;

    const prevCursor = items.length > 0 && cursorInfo ? 
      this.encodeCursor(items[0][sortField], items[0]._id, 'backward') : 
      null;

    // 이전 페이지 존재 여부 확인 (커서가 있으면 이전 페이지 존재)
    const hasPrevPage = !!cursor;

    return {
      items: items as T[],
      hasNextPage,
      hasPrevPage,
      nextCursor,
      prevCursor,
      totalCount: items.length
    };
  }

  /**
   * 범위 기반 페이지네이션 (숫자 필드 최적화)
   */
  static async paginateByRange<T extends Document>(
    baseQuery: Query<T[], T>,
    options: CursorPaginationOptions & {
      /** 범위 시작값 */
      rangeStart?: number;
      /** 범위 끝값 */
      rangeEnd?: number;
    }
  ): Promise<CursorPaginationResult<T>> {
    const {
      cursor,
      limit = 20,
      sortField = '_id',
      sortOrder = -1,
      filter = {},
      rangeStart,
      rangeEnd
    } = options;

    let query = baseQuery.find(filter);

    // 범위 조건 추가
    if (rangeStart !== undefined || rangeEnd !== undefined) {
      const rangeFilter: FilterQuery<any> = {};
      
      if (rangeStart !== undefined && rangeEnd !== undefined) {
        rangeFilter[sortField] = { $gte: rangeStart, $lte: rangeEnd };
      } else if (rangeStart !== undefined) {
        rangeFilter[sortField] = { $gte: rangeStart };
      } else if (rangeEnd !== undefined) {
        rangeFilter[sortField] = { $lte: rangeEnd };
      }

      query = query.find(rangeFilter);
    }

    // 커서 조건 추가
    if (cursor) {
      const cursorInfo = this.decodeCursor(cursor);
      if (!cursorInfo) {
        throw new Error('Invalid cursor format');
      }

      const cursorFilter: FilterQuery<any> = {};
      
      if (sortOrder === -1) {
        cursorFilter[sortField] = { $lt: cursorInfo.value };
      } else {
        cursorFilter[sortField] = { $gt: cursorInfo.value };
      }

      query = query.find(cursorFilter);
    }

    // 정렬 및 실행
    const items = await query
      .sort({ [sortField]: sortOrder })
      .limit(limit + 1)
      .lean();

    const hasNextPage = items.length > limit;
    if (hasNextPage) {
      items.pop();
    }

    const nextCursor = items.length > 0 && hasNextPage ? 
      this.encodeCursor(items[items.length - 1][sortField], items[items.length - 1]._id) : 
      null;

    const prevCursor = items.length > 0 && cursor ? 
      this.encodeCursor(items[0][sortField], items[0]._id, 'backward') : 
      null;

    return {
      items: items as T[],
      hasNextPage,
      hasPrevPage: !!cursor,
      nextCursor,
      prevCursor,
      totalCount: items.length
    };
  }

  /**
   * 복합 정렬 커서 페이지네이션
   */
  static async paginateWithCompoundSort<T extends Document>(
    baseQuery: Query<T[], T>,
    options: CursorPaginationOptions & {
      /** 복합 정렬 필드 배열 */
      sortFields: Array<{ field: string; order: 1 | -1 }>;
    }
  ): Promise<CursorPaginationResult<T>> {
    const {
      cursor,
      limit = 20,
      filter = {},
      sortFields
    } = options;

    if (!sortFields || sortFields.length === 0) {
      throw new Error('At least one sort field must be specified');
    }

    let query = baseQuery.find(filter);

    // 커서 조건 추가 (복합 정렬용)
    if (cursor) {
      const cursorInfo = this.decodeCursor(cursor);
      if (!cursorInfo) {
        throw new Error('Invalid cursor format');
      }

      // 복합 정렬을 위한 OR 조건 생성
      const orConditions: FilterQuery<any>[] = [];
      
      for (let i = 0; i < sortFields.length; i++) {
        const field = sortFields[i];
        const andConditions: FilterQuery<any> = {};
        
        // 이전 필드들은 동일한 값
        for (let j = 0; j < i; j++) {
          const prevField = sortFields[j];
          andConditions[prevField.field] = cursorInfo.value[prevField.field];
        }
        
        // 현재 필드는 커서 값과 비교
        if (field.order === -1) {
          andConditions[field.field] = { $lt: cursorInfo.value[field.field] };
        } else {
          andConditions[field.field] = { $gt: cursorInfo.value[field.field] };
        }
        
        orConditions.push(andConditions);
      }

      query = query.find({ $or: orConditions });
    }

    // 복합 정렬 적용
    const sortObj: any = {};
    sortFields.forEach(field => {
      sortObj[field.field] = field.order;
    });

    const items = await query
      .sort(sortObj)
      .limit(limit + 1)
      .lean();

    const hasNextPage = items.length > limit;
    if (hasNextPage) {
      items.pop();
    }

    // 복합 정렬 커서 생성
    const createCompoundCursor = (item: any) => {
      const cursorValue: any = {};
      sortFields.forEach(field => {
        cursorValue[field.field] = item[field.field];
      });
      return this.encodeCursor(cursorValue, item._id);
    };

    const nextCursor = items.length > 0 && hasNextPage ? 
      createCompoundCursor(items[items.length - 1]) : 
      null;

    const prevCursor = items.length > 0 && cursor ? 
      createCompoundCursor(items[0]) : 
      null;

    return {
      items: items as T[],
      hasNextPage,
      hasPrevPage: !!cursor,
      nextCursor,
      prevCursor,
      totalCount: items.length
    };
  }

  /**
   * 요청 쿼리 파라미터에서 커서 페이지네이션 옵션 추출
   */
  static parseQueryParams(query: any): CursorPaginationOptions {
    const {
      cursor,
      limit = '20',
      sortField = '_id',
      sortOrder = '-1'
    } = query;

    return {
      cursor: cursor as string,
      limit: Math.min(Math.max(parseInt(limit), 1), 100), // 1~100 제한
      sortField: sortField as string,
      sortOrder: parseInt(sortOrder) === 1 ? 1 : -1,
    };
  }

  /**
   * 페이지네이션 메타데이터 생성
   */
  static createPaginationMeta(result: CursorPaginationResult<any>) {
    return {
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
      totalCount: result.totalCount
    };
  }
}

export default CursorPagination;