// backend/src/routes/example-new-pattern.ts
// 새로운 에러 핸들링 패턴을 보여주는 예시 라우터
// ⚠️ 이 파일은 예시용이며, 기존 라우터들은 수정하지 않습니다.

import express from 'express';
import asyncHandler from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import logger from '../config/logger';

const router = express.Router();

/**
 * 기존 패턴 (계속 사용 가능)
 */
router.get('/old-pattern', async (req, res, next) => {
  try {
    // 비즈니스 로직
    const data = await someAsyncOperation();
    res.json({ success: true, data });
  } catch (error) {
    next(error); // 수동으로 에러 전달
  }
});

/**
 * 새로운 패턴 (권장) - asyncHandler 사용
 */
router.get('/new-pattern', asyncHandler(async (req, res) => {
  // try-catch 불필요! 에러 시 자동으로 중앙 핸들러로 전달됨
  const data = await someAsyncOperation();
  res.json({ success: true, data });
}));

/**
 * validation과 함께 사용하는 패턴
 */
router.post('/create-something', asyncHandler(async (req, res) => {
  // validation 로직
  const { name, type } = req.body;
  
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Name is required and must be a string');
  }
  
  if (!type || !['A', 'B', 'C'].includes(type)) {
    throw new ValidationError('Type must be one of: A, B, C');
  }
  
  // 비즈니스 로직
  const result = await createSomething({ name, type });
  
  res.status(201).json({
    success: true,
    data: result,
    message: 'Created successfully'
  });
}));

/**
 * 복잡한 비즈니스 로직 예시
 */
router.get('/complex-operation/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 여러 비동기 작업들
  const [userData, relatedData, statistics] = await Promise.all([
    getUserData(id),
    getRelatedData(id),
    getStatistics(id)
  ]);
  
  // 데이터 처리
  const processedData = await processComplexData({
    user: userData,
    related: relatedData,
    stats: statistics
  });
  
  res.json({
    success: true,
    data: processedData
  });
}));

// 가상의 비동기 함수들 (예시용)
async function someAsyncOperation(): Promise<{ message: string }> {
  // 실제 비즈니스 로직
  return { message: 'Operation completed' };
}

async function createSomething(data: { name: string; type: string }): Promise<{ id: number; name: string; type: string }> {
  // 실제 생성 로직
  return { id: Date.now(), ...data };
}

async function getUserData(id: string): Promise<{ id: string; name: string }> {
  // 사용자 데이터 조회
  return { id, name: 'User' };
}

async function getRelatedData(id: string): Promise<{ relatedItems: unknown[] }> {
  // 관련 데이터 조회
  return { relatedItems: [] };
}

async function getStatistics(id: string): Promise<{ views: number; interactions: number }> {
  // 통계 데이터 조회
  return { views: 0, interactions: 0 };
}

async function processComplexData(data: { user: { id: string; name: string }; related: { relatedItems: unknown[] }; stats: { views: number; interactions: number } }): Promise<{ processed: boolean; timestamp: string; user: { id: string; name: string }; related: { relatedItems: unknown[] }; stats: { views: number; interactions: number } }> {
  // 복잡한 데이터 처리
  return {
    processed: true,
    timestamp: new Date().toISOString(),
    ...data
  };
}

export default router;