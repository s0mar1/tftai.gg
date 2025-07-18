import { jest } from '@jest/globals';

describe('Guides Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /guides', () => {
    it('should return all guides', () => {
      expect(true).toBe(true);
    });
  });

  describe('GET /guides/:id', () => {
    it('should return specific guide', () => {
      expect(true).toBe(true);
    });
  });

  describe('POST /guides', () => {
    it('should create new guide', () => {
      expect(true).toBe(true);
    });
  });
});