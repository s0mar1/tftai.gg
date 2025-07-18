// backend/src/routes/__tests__/translation.test.ts

import request from 'supertest';
import express from 'express';
import translationRoutes from '../translation';
import { translateUITexts } from '../../services/translationService';

// translationService 모의(mock) 처리
jest.mock('../../services/translationService', () => ({
  translateUITexts: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/translate', translationRoutes);

describe('Translation Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/translate/ui', () => {
    it('유효한 언어로 요청 시 200 OK와 성공 응답을 반환해야 한다', async () => {
      // 모의 함수가 성공 결과를 반환하도록 설정
      (translateUITexts as jest.Mock).mockResolvedValue({
        success: true,
        message: '영어(en) UI 번역 파일이 성공적으로 업데이트되었습니다.',
        language: 'en',
      });

      const response = await request(app)
        .post('/api/translate/ui')
        .send({ targetLanguage: 'en' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: expect.any(String),
        language: 'en',
      });
      expect(translateUITexts).toHaveBeenCalledWith('en', false);
    });

    it('지원하지 않는 언어로 요청 시 400 Bad Request를 반환해야 한다', async () => {
      const response = await request(app)
        .post('/api/translate/ui')
        .send({ targetLanguage: 'fr' }); // 지원하지 않는 언어

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        _error: expect.stringContaining('지원하지 않는 언어입니다'),
      });
      expect(translateUITexts).not.toHaveBeenCalled();
    });

    it('targetLanguage 파라미터가 없을 경우 400 Bad Request를 반환해야 한다', async () => {
      const response = await request(app)
        .post('/api/translate/ui')
        .send({}); // 파라미터 누락

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        _error: 'targetLanguage는 필수입니다. (예: en, ja, zh)',
      });
      expect(translateUITexts).not.toHaveBeenCalled();
    });

    it('translationService에서 에러 발생 시 500 Internal Server Error를 반환해야 한다', async () => {
      // 모의 함수가 에러를 던지도록 설정
      (translateUITexts as jest.Mock).mockRejectedValue(new Error('번역 API 키가 유효하지 않습니다.'));

      const response = await request(app)
        .post('/api/translate/ui')
        .send({ targetLanguage: 'ja' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        _error: '번역 API 키가 유효하지 않습니다.',
      });
      expect(translateUITexts).toHaveBeenCalledWith('ja', false);
    });
  });
});
