// shared/src/__tests__/types.test.ts

import {
  ApiResponse,
  Champion,
  Item,
  ServiceResult,
  ApiErrorResponse,
  PaginatedResult,
  ChampionStats
} from '../types';

describe('Types Validation', () => {
  describe('ApiResponse', () => {
    it('should allow valid ApiResponse with data', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'test data',
        timestamp: new Date().toISOString()
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('test data');
      expect(response.timestamp).toBeDefined();
    });

    it('should allow valid ApiResponse with error', () => {
      const response: ApiResponse = {
        success: false,
        error: 'Test error message',
        statusCode: 404
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error message');
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Champion', () => {
    it('should validate Champion interface structure', () => {
      const champion: Champion = {
        apiName: 'TFT12_Aatrox',
        characterId: 'TFT12_Aatrox',
        cost: 4,
        displayName: 'Aatrox',
        name: 'Aatrox',
        tileIcon: 'https://example.com/aatrox.png',
        traits: ['Darkin', 'Juggernaut'],
        tier: 1,
        stats: {
          health: 900,
          damage: 60,
          armor: 40,
          magicResist: 40,
          attackSpeed: 0.65,
          range: 1
        }
      };

      expect(champion.apiName).toBe('TFT12_Aatrox');
      expect(champion.cost).toBe(4);
      expect(champion.traits).toContain('Darkin');
      expect(champion.stats?.health).toBe(900);
    });

    it('should allow optional fields to be undefined', () => {
      const champion: Champion = {
        apiName: 'TFT12_Aatrox',
        cost: 4,
        name: 'Aatrox',
        tileIcon: 'https://example.com/aatrox.png',
        traits: ['Darkin']
      };

      expect(champion.characterId).toBeUndefined();
      expect(champion.tier).toBeUndefined();
      expect(champion.recommendedItems).toBeUndefined();
    });
  });

  describe('Item', () => {
    it('should validate Item interface structure', () => {
      const item: Item = {
        apiName: 'TFT_Item_BlueBuff',
        associatedTraits: [],
        composition: ['TFT_Item_TearOfTheGoddess', 'TFT_Item_TearOfTheGoddess'],
        desc: 'Mana cost reduced. On cast, restore mana.',
        effects: [
          {
            name: 'Mana Reduction',
            type: 'passive',
            value: 10
          }
        ],
        from: ['TFT_Item_TearOfTheGoddess'],
        icon: 'https://example.com/bluebuff.png',
        id: 11,
        incompatibleTraits: [],
        name: 'Blue Buff',
        unique: false
      };

      expect(item.apiName).toBe('TFT_Item_BlueBuff');
      expect(item.composition).toHaveLength(2);
      expect(item.effects[0]?.type).toBe('passive');
      expect(item.unique).toBe(false);
    });
  });

  describe('ServiceResult', () => {
    it('should handle successful service result', () => {
      const result: ServiceResult<string> = {
        success: true,
        data: 'success data'
      };

      expect(result.success).toBe(true);
      expect(result.data).toBe('success data');
      expect(result.error).toBeUndefined();
    });

    it('should handle failed service result', () => {
      const result: ServiceResult<string> = {
        success: false,
        error: 'Service failed'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service failed');
      expect(result.data).toBeUndefined();
    });
  });

  describe('ChampionStats', () => {
    it('should allow all stat properties to be optional', () => {
      const stats: ChampionStats = {
        health: 800,
        damage: 50
      };

      expect(stats.health).toBe(800);
      expect(stats.damage).toBe(50);
      expect(stats.mana).toBeUndefined();
      expect(stats.armor).toBeUndefined();
    });

    it('should allow custom stat properties through index signature', () => {
      const stats: ChampionStats = {
        health: 800,
        customStat: 100
      };

      expect(stats.health).toBe(800);
      expect(stats.customStat).toBe(100);
    });
  });

  describe('PaginatedResult', () => {
    it('should validate pagination structure', () => {
      const result: PaginatedResult<Champion> = {
        data: [
          {
            apiName: 'TFT12_Aatrox',
            cost: 4,
            name: 'Aatrox',
            tileIcon: 'https://example.com/aatrox.png',
            traits: ['Darkin']
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 5,
          totalItems: 50
        }
      };

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination?.totalItems).toBe(50);
    });
  });

  describe('ApiErrorResponse', () => {
    it('should validate error response structure', () => {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Validation failed',
        message: 'Invalid input data',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: {
          code: 'VALIDATION_ERROR',
          path: '/api/summoner',
          method: 'POST',
          requestId: 'req_123456'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.statusCode).toBe(400);
      expect(errorResponse.details?.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.details?.requestId).toBe('req_123456');
    });
  });
});