import { StatsAnalyzer } from '../statsAnalyzer';
import Match from '../../models/Match';
import ItemStats from '../../models/ItemStats';
import TraitStats from '../../models/TraitStats';
import getTFTData from '../tftData';
import logger from '../../config/logger';

jest.mock('../../models/Match');
jest.mock('../../models/ItemStats');
jest.mock('../../models/TraitStats');
jest.mock('../tftData');
jest.mock('../../config/logger');

const mockTFTData = {
  items: {
    basic: [{ apiName: 'item1', name: 'Item One', icon: 'icon1.png' }],
    completed: [{ apiName: 'item2', name: 'Item Two', icon: 'icon2.png' }],
    ornn: [],
    radiant: [],
    emblem: [],
    support: [],
    robot: []
  },
  traitMap: new Map([
    ['trait1', { name: 'Trait One', icon: 'trait1.png', type: 'origin' }]
  ])
};

const mockMatches = [
  {
    info: {
      participants: [
        {
          placement: 1,
          units: [{ itemNames: ['item1', 'item2'] }],
          traits: [{ name: 'trait1', tier_current: 2 }]
        },
        {
          placement: 8,
          units: [{ itemNames: ['item1'] }],
          traits: [{ name: 'trait1', tier_current: 1 }]
        }
      ]
    }
  }
];

describe('StatsAnalyzer', () => {
  let analyzer: StatsAnalyzer;

  beforeEach(() => {
    analyzer = new StatsAnalyzer();
    (Match.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockMatches)
    });
    (ItemStats.deleteMany as jest.Mock).mockResolvedValue({});
    (ItemStats.insertMany as jest.Mock).mockResolvedValue({});
    (TraitStats.deleteMany as jest.Mock).mockResolvedValue({});
    (TraitStats.insertMany as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeItemStats', () => {
    it('should analyze and save item stats correctly', async () => {
      (getTFTData as jest.Mock).mockResolvedValue(mockTFTData);
      
      await analyzer.analyzeItemStats();

      expect(getTFTData).toHaveBeenCalled();
      expect(Match.find).toHaveBeenCalled();
      expect(ItemStats.insertMany).toHaveBeenCalledWith(expect.any(Array));
      
      const savedStats = (ItemStats.insertMany as jest.Mock).mock.calls[0][0];
      expect(savedStats[0].itemId).toBe('item1');
      expect(savedStats[0].totalGames).toBe(2);
    });

    it('should throw an error if TFT data is not available', async () => {
      (getTFTData as jest.Mock).mockResolvedValue(null);
      await expect(analyzer.analyzeItemStats()).rejects.toThrow('TFT 데이터를 불러올 수 없습니다.');
    });
  });

  describe('analyzeTraitStats', () => {
    it('should analyze and save trait stats correctly', async () => {
      (getTFTData as jest.Mock).mockResolvedValue(mockTFTData);

      await analyzer.analyzeTraitStats();

      expect(getTFTData).toHaveBeenCalled();
      expect(TraitStats.insertMany).toHaveBeenCalled();
      const savedStats = (TraitStats.insertMany as jest.Mock).mock.calls[0][0];
      expect(savedStats[0].traitId).toBe('trait1');
      expect(savedStats[0].totalGames).toBe(2);
    });
  });
});