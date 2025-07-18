import axios from 'axios';
import { getTFTDataWithLanguage, getTraitStyleInfo } from '../tftData';
import logger from '../../config/logger';

jest.mock('axios');
jest.mock('../../config/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockEnglishData = {
  sets: {
    '10': {
      champions: [
        { apiName: 'TFT10_Ahri', name: 'Ahri', cost: 4, traits: ['K/DA', 'Spellweaver'] }
      ],
      traits: [
        { apiName: 'Set10_KDA', name: 'K/DA', effects: [{ style: 2, minUnits: 3 }] }
      ]
    }
  },
  items: [
    { apiName: 'NeedlesslyLargeRod', name: 'Needlessly Large Rod', icon: 'rod.png' }
  ]
};

const mockKoreanData = {
  sets: {
    '10': {
      champions: [
        { apiName: 'TFT10_Ahri', name: '아리' }
      ],
      traits: [
        { apiName: 'Set10_KDA', name: 'K/DA' }
      ]
    }
  },
  items: [
    { apiName: 'NeedlesslyLargeRod', name: '쓸데없이 큰 지팡이' }
  ]
};

describe('TFTData Service', () => {
  beforeEach(() => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('en_us')) {
        return Promise.resolve({ data: mockEnglishData });
      }
      if (url.includes('ko_kr')) {
        return Promise.resolve({ data: mockKoreanData });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTFTData', () => {
    it('should fetch and process data correctly', async () => {
      const result = await getTFTDataWithLanguage();
      expect(result).not.toBeNull();
      expect(result?.champions.length).toBeGreaterThan(0);
      expect(result?.champions[0].name).toBe('아리');
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should use cache on subsequent calls', async () => {
      const firstCall = await getTFTDataWithLanguage();
      const secondCall = await getTFTDataWithLanguage();
      expect(axios.get).toHaveBeenCalledTimes(2); // Only called for the first fetch
      expect(secondCall).toEqual(firstCall);
    });

    it('should handle API errors gracefully', async () => {
      // Need to reset modules to re-import tftData with a fresh cache
      jest.resetModules();
      const { default: getTFTDataFresh } = await import('../tftData');
      
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      const result = await getTFTDataFresh();
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('TFT 데이터 서비스 초기화 실패'), expect.any(Error));
    });
  });

  describe('getTraitStyleInfo', () => {
    let tftData;
    beforeEach(async () => {
      jest.resetModules();
      const { default: getTFTDataFresh } = await import('../tftData');
      tftData = await getTFTDataFresh();
    });

    it('should return correct style info for a trait', () => {
      const styleInfo = getTraitStyleInfo('Set10_KDA', 3, tftData);
      expect(styleInfo).not.toBeNull();
      expect(styleInfo?.style).toBe('silver');
    });

    it('should return null for an inactive trait', () => {
      const styleInfo = getTraitStyleInfo('Set10_KDA', 2, tftData);
      expect(styleInfo).toBeNull();
    });

    it('should return null for an unknown trait', () => {
      const styleInfo = getTraitStyleInfo('UnknownTrait', 1, tftData);
      expect(styleInfo).toBeNull();
    });
  });
});