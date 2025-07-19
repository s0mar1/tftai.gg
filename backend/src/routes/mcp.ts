// MCP (Model Context Protocol) 라우터
import { Router } from 'express';
import { mcpService } from '../services/mcpService';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../config/logger';

const router = Router();

// MongoDB 쿼리 실행
router.post('/mongodb/query', asyncHandler(async (req, res) => {
    const { query, collection, operation } = req.body;
    
    // 기본 검증
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a string'
      });
    }
    
    if (!operation || !['find', 'aggregate', 'count', 'distinct', 'schema'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Must be one of: find, aggregate, count, distinct, schema'
      });
    }
    
    logger.info('MCP MongoDB query request', { query, collection, operation });
    
    // MCP 서비스를 통해 쿼리 실행
    const result = await mcpService.executeMongoDBQuery({ query, collection, operation });
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

// 데이터베이스 통계 조회
router.get('/mongodb/stats', asyncHandler(async (req, res) => {
    const { type = 'overview' } = req.query;
    
    // 기본 검증
    if (!['overview', 'collections', 'indexes', 'performance'].includes(type as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stats type. Must be one of: overview, collections, indexes, performance'
      });
    }
    
    logger.info('MCP MongoDB stats request', { type });
    
    const result = await mcpService.getDatabaseStats({ type });
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

// 성능 분석
router.post('/mongodb/analyze', asyncHandler(async (req, res) => {
    const { collection, timeRange } = req.body;
    
    logger.info('MCP MongoDB performance analysis request', { collection, timeRange });
    
    const result = await mcpService.analyzePerformance({ collection, timeRange });
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

// 쿼리 설명 및 최적화 제안
router.post('/mongodb/explain', asyncHandler(async (req, res) => {
    const { collection, query } = req.body;
    
    // 기본 검증
    if (!collection || typeof collection !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Collection is required and must be a string'
      });
    }
    
    if (!query || typeof query !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be an object'
      });
    }
    
    logger.info('MCP MongoDB explain query request', { collection, query });
    
    const result = await mcpService.explainQuery({ collection, query });
    
    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

// MCP 서비스 상태 확인
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'MCP Service',
      status: 'running',
      capabilities: [
        'MongoDB natural language queries',
        'Database statistics',
        'Performance analysis',
        'Query explanation and optimization'
      ],
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;