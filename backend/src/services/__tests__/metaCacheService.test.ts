import { describe, test, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import cacheManager from '../cacheManager';
import { getMetaDecks, formatMetaDecksForAI } from '../metaDataService';
import MetaCacheService from '../metaCacheService';

// Mock dependencies
jest.mock('../cacheManager');
jest.mock('../metaDataService');

const mockedCacheManager = cacheManager as jest.Mocked<typeof cacheManager>;
const mockedGetMetaDecks = getMetaDecks as jest.Mock;
const mockedFormatMetaDecksForAI = formatMetaDecksForAI as jest.Mock;

describe('MetaCacheService', () => {

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('getMetaDecks', () => {
    test('캐시에서 데이터를 가져올 때 성공해야 함', async () => {
      const mockDecks = [
        { name: '덱1', tier: 'S' },
        { name: '덱2', tier: 'A' }
      ];
      
      mockedCacheManager.get.mockResolvedValue(mockDecks);
      
      const result = await MetaCacheService.getMetaDecks();
      
      expect(result).toEqual(mockDecks);
      expect(mockedCacheManager.get).toHaveBeenCalledWith('meta_decks_full');
    });

    test('캐시 미스 시 새로운 데이터를 로드해야 함', async () => {
      const mockDecks = [
        { name: '덱1', tier: 'S' },
        { name: '덱2', tier: 'A' }
      ];
      
      mockedCacheManager.get.mockResolvedValue(null);
      mockedGetMetaDecks.mockResolvedValue(mockDecks);
      mockedCacheManager.set.mockResolvedValue();
      
      const result = await MetaCacheService.getMetaDecks();
      
      expect(result).toEqual(mockDecks);
      expect(mockedGetMetaDecks).toHaveBeenCalled();
      expect(mockedCacheManager.set).toHaveBeenCalledWith(
        'meta_decks_full',
        mockDecks,
        expect.any(Number)
      );
    });

    test('에러 발생 시 빈 배열을 반환해야 함', async () => {
      mockedCacheManager.get.mockRejectedValue(new Error('Cache error'));
      
      const result = await MetaCacheService.getMetaDecks();
      
      expect(result).toEqual([]);
    });
  });

  describe('getMetaDecksForAI', () => {
    test('캐시에서 포맷된 데이터를 가져올 때 성공해야 함', async () => {
      const mockFormattedText = '포맷된 메타 덱 데이터';
      
      mockedCacheManager.get.mockResolvedValue(mockFormattedText);
      
      const result = await MetaCacheService.getMetaDecksForAI(10);
      
      expect(result).toBe(mockFormattedText);
      expect(mockedCacheManager.get).toHaveBeenCalledWith('meta_decks_ai_format_10');
    });

    test('캐시 미스 시 새로운 포맷된 데이터를 생성해야 함', async () => {
      const mockDecks = [
        { name: '덱1', tier: 'S' },
        { name: '덱2', tier: 'A' }
      ];
      const mockFormattedText = '포맷된 메타 덱 데이터';
      
      mockedCacheManager.get
        .mockResolvedValueOnce(null) // AI 포맷 캐시 미스
        .mockResolvedValueOnce(mockDecks); // 전체 덱 캐시 히트
      
      mockedFormatMetaDecksForAI.mockReturnValue(mockFormattedText);
      mockedCacheManager.set.mockResolvedValue();
      
      const result = await MetaCacheService.getMetaDecksForAI(10);
      
      expect(result).toContain(mockFormattedText);
      expect(mockedFormatMetaDecksForAI).toHaveBeenCalledWith(mockDecks);
      expect(mockedCacheManager.set).toHaveBeenCalledWith(
        'meta_decks_ai_format_10',
        expect.stringContaining(mockFormattedText),
        expect.any(Number)
      );
    });
  });

  describe('refreshCache', () => {
    test('캐시 새로고침이 성공해야 함', async () => {
      const mockDecks = [{ name: '덱1', tier: 'S' }];
      
      mockedCacheManager.del.mockResolvedValue();
      mockedCacheManager.get.mockResolvedValue(null);
      mockedGetMetaDecks.mockResolvedValue(mockDecks);
      mockedFormatMetaDecksForAI.mockReturnValue('포맷된 데이터');
      mockedCacheManager.set.mockResolvedValue();
      
      const result = await MetaCacheService.refreshCache();
      
      expect(result).toBe(true);
      expect(mockedCacheManager.del).toHaveBeenCalledTimes(7);
    });
  });

  describe('getCacheStats', () => {
    test('캐시 통계를 반환해야 함', async () => {
      const mockStatus = {
        status: {
          META_DECKS: { exists: true, size: 1000, type: 'array' },
          META_DECKS_AI: { exists: true, size: 500, type: 'string' },
          META_DECKS_TOP: { exists: false, size: 0, type: 'undefined' }
        }
      };
      
      // Mock getCacheStatus
      jest.spyOn(MetaCacheService, 'getCacheStatus').mockResolvedValue(mockStatus as any);
      
      const result = await MetaCacheService.getCacheStats();
      
      expect(result).toHaveProperty('totalCaches');
      expect(result).toHaveProperty('totalSize');
      expect(result).toHaveProperty('cachesActive');
    });
  });
});