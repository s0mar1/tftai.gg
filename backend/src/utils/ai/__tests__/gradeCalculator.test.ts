import { createGradeInfo, calculateGradeFromScore, normalizeScore } from '../gradeCalculator';

describe('gradeCalculator', () => {
  describe('createGradeInfo', () => {
    it('should create grade info for S grade', () => {
      const result = createGradeInfo('S');
      expect(result).toEqual({
        grade: 'S',
        color: '#FFD700',
        description: '완벽한 게임 플레이'
      });
    });

    it('should create grade info for A grade', () => {
      const result = createGradeInfo('A');
      expect(result).toEqual({
        grade: 'A',
        color: '#10B981',
        description: '우수한 성과'
      });
    });

    it('should handle invalid grade with default', () => {
      const result = createGradeInfo('');
      expect(result).toEqual({
        grade: 'C',
        color: '#F59E0B',
        description: '평균적인 성과'
      });
    });

    it('should handle unknown grade', () => {
      const result = createGradeInfo('Z');
      expect(result).toEqual({
        grade: 'Z',
        color: '#6B7280',
        description: '분석 진행 중'
      });
    });
  });

  describe('calculateGradeFromScore', () => {
    it('should return S for score >= 95', () => {
      expect(calculateGradeFromScore(95)).toBe('S');
      expect(calculateGradeFromScore(100)).toBe('S');
    });

    it('should return A for score >= 85', () => {
      expect(calculateGradeFromScore(85)).toBe('A');
      expect(calculateGradeFromScore(94)).toBe('A');
    });

    it('should return B for score >= 70', () => {
      expect(calculateGradeFromScore(70)).toBe('B');
      expect(calculateGradeFromScore(84)).toBe('B');
    });

    it('should return C for score >= 55', () => {
      expect(calculateGradeFromScore(55)).toBe('C');
      expect(calculateGradeFromScore(69)).toBe('C');
    });

    it('should return D for score >= 40', () => {
      expect(calculateGradeFromScore(40)).toBe('D');
      expect(calculateGradeFromScore(54)).toBe('D');
    });

    it('should return F for score < 40', () => {
      expect(calculateGradeFromScore(39)).toBe('F');
      expect(calculateGradeFromScore(0)).toBe('F');
    });
  });

  describe('normalizeScore', () => {
    it('should normalize score within bounds', () => {
      expect(normalizeScore(50)).toBe(50);
      expect(normalizeScore(75.7)).toBe(76);
    });

    it('should clamp score to minimum', () => {
      expect(normalizeScore(-10)).toBe(0);
      expect(normalizeScore(-10, 10)).toBe(10);
    });

    it('should clamp score to maximum', () => {
      expect(normalizeScore(110)).toBe(100);
      expect(normalizeScore(110, 0, 90)).toBe(90);
    });

    it('should handle custom bounds', () => {
      expect(normalizeScore(50, 20, 80)).toBe(50);
      expect(normalizeScore(10, 20, 80)).toBe(20);
      expect(normalizeScore(90, 20, 80)).toBe(80);
    });
  });
});