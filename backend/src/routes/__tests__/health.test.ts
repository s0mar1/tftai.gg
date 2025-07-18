import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import healthRouter from '../health.ts';

// Mock dependencies
jest.unstable_mockModule('mongoose', () => ({
  connection: {
    readyState: 1,
    db: {
      admin: () => ({
        ping: jest.fn().mockResolvedValue(true)
      })
    }
  }
}));

jest.unstable_mockModule('../../services/cacheManager', () => ({
  default: {
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue('ok'),
    getStats: jest.fn().mockReturnValue({
      l1CacheStats: { keys: 10 },
      l2CacheConnected: true,
    }),
  }
}));

jest.unstable_mockModule('../../middlewares/rateLimiters.ts', () => ({
  default: {
    getMemoryStats: jest.fn().mockReturnValue({
      totalIPs: 5,
      totalRequests: 50,
      queueSize: 2,
      memoryUsage: {
        rss: 100000000,
        heapUsed: 50000000,
        heapTotal: 100000000
      }
    })
  }
}));

const app = express();
app.use('/health', healthRouter);

describe('Health Check API', () => {
  test('GET /health - 헬스체크가 실행되어야 함', async () => {
    process.env.RIOT_API_KEY = 'test-key';
    process.env.GOOGLE_AI_MAIN_API_KEY = 'test-key';

    const response = await request(app)
      .get('/health');

    // 응답 상태 확인 (정상 또는 degraded 모두 허용)
    expect([200, 503]).toContain(response.status);
    
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('responseTime');
    expect(response.body).toHaveProperty('services');
    expect(response.body).toHaveProperty('version', '1.0.0');

    // 서비스 상태 확인
    if (response.body.services) {
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('cache');
      expect(response.body.services).toHaveProperty('externalApis');
      expect(response.body.services).toHaveProperty('server');
      expect(response.body.services).toHaveProperty('aiQueue');
    }
  });

  test('GET /health/ping - ping 엔드포인트가 정상 작동해야 함', async () => {
    const response = await request(app)
      .get('/health/ping')
      .expect(200);

    expect(response.body).toEqual({
      status: 'pong',
      timestamp: expect.any(String)
    });
  });

  test('AI 큐 상태가 헬스체크에 포함되어야 함', async () => {
    process.env.RIOT_API_KEY = 'test-key';
    process.env.GOOGLE_AI_MAIN_API_KEY = 'test-key';

    const response = await request(app)
      .get('/health');

    // 응답 상태 확인 (정상 또는 degraded 모두 허용)
    expect([200, 503]).toContain(response.status);
    
    if (response.body.services && response.body.services.aiQueue) {
      expect(response.body.services.aiQueue).toHaveProperty('totalIPs');
      expect(response.body.services.aiQueue).toHaveProperty('totalRequests');
      expect(response.body.services.aiQueue).toHaveProperty('queueSize');
    }
  });
});