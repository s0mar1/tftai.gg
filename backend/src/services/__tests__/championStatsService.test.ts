import { jest } from '@jest/globals';
import { calculatePickRates, calculateWinRates } from '../championStatsService';
import Match from '../../models/Match';
import { PARTICIPANTS_PER_MATCH } from '../constants';

// Mock the Match model
jest.mock('../../models/Match');

describe('MetaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePickRates', () => {
    it('should calculate pick rates correctly', async () => {
      const mockTotalMatches = 100;
      const mockAggregationResult = [
        { _id: 'Akali', count: 50 },
        { _id: 'Jinx', count: 30 },
        { _id: 'Caitlyn', count: 20 }
      ];

      (Match.countDocuments as jest.Mock).mockResolvedValue(mockTotalMatches);
      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculatePickRates();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        champion: 'Akali',
        pickCount: 50,
        pickRate: parseFloat(((50 / (mockTotalMatches * PARTICIPANTS_PER_MATCH)) * 100).toFixed(2))
      });
      expect(result[1]).toEqual({
        champion: 'Jinx',
        pickCount: 30,
        pickRate: parseFloat(((30 / (mockTotalMatches * PARTICIPANTS_PER_MATCH)) * 100).toFixed(2))
      });
      expect(result[2]).toEqual({
        champion: 'Caitlyn',
        pickCount: 20,
        pickRate: parseFloat(((20 / (mockTotalMatches * PARTICIPANTS_PER_MATCH)) * 100).toFixed(2))
      });
    });

    it('should return empty array when no matches', async () => {
      (Match.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await calculatePickRates();

      expect(result).toEqual([]);
      expect(Match.aggregate).not.toHaveBeenCalled();
    });

    it('should handle empty aggregation result', async () => {
      (Match.countDocuments as jest.Mock).mockResolvedValue(100);
      (Match.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await calculatePickRates();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      (Match.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(calculatePickRates()).rejects.toThrow('Database error');
    });

    it('should handle aggregation errors', async () => {
      (Match.countDocuments as jest.Mock).mockResolvedValue(100);
      (Match.aggregate as jest.Mock).mockRejectedValue(new Error('Aggregation error'));

      await expect(calculatePickRates()).rejects.toThrow('Aggregation error');
    });

    it('should handle missing champion names', async () => {
      const mockTotalMatches = 100;
      const mockAggregationResult = [
        { _id: 'Akali', count: 50 },
        { _id: null, count: 30 },
        { _id: undefined, count: 20 }
      ];

      (Match.countDocuments as jest.Mock).mockResolvedValue(mockTotalMatches);
      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculatePickRates();

      expect(result).toHaveLength(3);
      expect(result[0].champion).toBe('Akali');
      expect(result[1].champion).toBe(null);
      expect(result[2].champion).toBe(undefined);
    });
  });

  describe('calculateWinRates', () => {
    it('should calculate win rates correctly', async () => {
      const mockAggregationResult = [
        { _id: 'Akali', totalCount: 100, winCount: 65, winRate: 65.0 },
        { _id: 'Jinx', totalCount: 80, winCount: 45, winRate: 56.25 },
        { _id: 'Caitlyn', totalCount: 60, winCount: 30, winRate: 50.0 }
      ];

      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculateWinRates();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        champion: 'Akali',
        totalCount: 100,
        winCount: 65,
        winRate: 65.0
      });
      expect(result[1]).toEqual({
        champion: 'Jinx',
        totalCount: 80,
        winCount: 45,
        winRate: 56.25
      });
      expect(result[2]).toEqual({
        champion: 'Caitlyn',
        totalCount: 60,
        winCount: 30,
        winRate: 50.0
      });
    });

    it('should handle empty aggregation result', async () => {
      (Match.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await calculateWinRates();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      (Match.aggregate as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(calculateWinRates()).rejects.toThrow('Database error');
    });

    it('should handle missing champion names', async () => {
      const mockAggregationResult = [
        { _id: 'Akali', totalCount: 100, winCount: 65, winRate: 65.0 },
        { _id: null, totalCount: 80, winCount: 45, winRate: 56.25 },
        { _id: undefined, totalCount: 60, winCount: 30, winRate: 50.0 }
      ];

      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculateWinRates();

      expect(result).toHaveLength(3);
      expect(result[0].champion).toBe('Akali');
      expect(result[1].champion).toBe(null);
      expect(result[2].champion).toBe(undefined);
    });

    it('should handle zero total count', async () => {
      const mockAggregationResult = [
        { _id: 'Akali', totalCount: 0, winCount: 0, winRate: 0 }
      ];

      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculateWinRates();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        champion: 'Akali',
        totalCount: 0,
        winCount: 0,
        winRate: 0
      });
    });

    it('should handle malformed aggregation data', async () => {
      const mockAggregationResult = [
        { _id: 'Akali', totalCount: 100, winCount: 65, winRate: 65.0 },
        { _id: 'Jinx' }, // Missing required fields
        { totalCount: 60, winCount: 30, winRate: 50.0 } // Missing _id
      ];

      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculateWinRates();

      expect(result).toHaveLength(3);
      expect(result[0].champion).toBe('Akali');
      expect(result[1].champion).toBe('Jinx');
      expect(result[2].champion).toBe(undefined);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', async () => {
      const mockTotalMatches = 1000000;
      const mockAggregationResult = [
        { _id: 'Akali', count: 500000 }
      ];

      (Match.countDocuments as jest.Mock).mockResolvedValue(mockTotalMatches);
      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculatePickRates();

      expect(result).toHaveLength(1);
      expect(result[0].pickCount).toBe(500000);
      expect(typeof result[0].pickRate).toBe('number');
    });

    it('should handle decimal precision correctly', async () => {
      const mockTotalMatches = 3;
      const mockAggregationResult = [
        { _id: 'Akali', count: 1 }
      ];

      (Match.countDocuments as jest.Mock).mockResolvedValue(mockTotalMatches);
      (Match.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      const result = await calculatePickRates();

      expect(result).toHaveLength(1);
      expect(result[0].pickRate).toBe(parseFloat(((1 / (3 * PARTICIPANTS_PER_MATCH)) * 100).toFixed(2)));
    });
  });
});