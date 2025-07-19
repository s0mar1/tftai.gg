import Match from '../models/Match';
import ItemStats from '../models/ItemStats';
import TraitStats from '../models/TraitStats';
import { getTFTDataWithLanguage } from './tftData';
import logger from '../config/logger';
import { Item } from '../types/index';

interface TFTData {
  items: {
    basic: Item[];
    completed: Item[];
    ornn: Item[];
    radiant: Item[];
    emblem: Item[];
    support: Item[];
    robot: Item[];
  };
  traitMap: Map<string, TraitData>;
}

interface TraitData {
  name: string;
  icon: string;
  type: string;
}

interface MatchDocument {
  info?: {
    participants?: ParticipantData[];
  };
}

interface ParticipantData {
  placement: number;
  units?: UnitData[];
  traits?: TraitData[];
}

interface UnitData {
  itemNames?: string[];
}

interface TraitData {
  name: string;
  tier_current?: number;
  num_units?: number;
}

interface ItemStatsData {
  itemId: string;
  itemName: string;
  itemIcon: string;
  itemType: string;
  totalGames: number;
  totalTop4: number;
  totalWins: number;
  placementSum: number;
  winRate?: string;
  top4Rate?: string;
  averagePlacement?: string;
  lastUpdated?: Date;
}

interface TraitStatsData {
  traitId: string;
  traitName: string;
  traitIcon: string;
  traitType: string;
  totalGames: number;
  totalTop4: number;
  totalWins: number;
  placementSum: number;
  activationLevels: Map<number, ActivationLevel> | ActivationLevel[];
  winRate?: string;
  top4Rate?: string;
  averagePlacement?: string;
  lastUpdated?: Date;
}

interface ActivationLevel {
  level: number;
  games: number;
  wins: number;
  top4: number;
  placementSum: number;
  winRate?: string;
  top4Rate?: string;
  averagePlacement?: string;
}

interface AnalysisResults {
  itemStats: ItemStatsData[];
  traitStats: TraitStatsData[];
}

export class StatsAnalyzer {
  
  async analyzeItemStats(): Promise<ItemStatsData[]> {
    logger.info('아이템 통계 분석을 시작합니다...');
    
    const tftData = await getTFTDataWithLanguage() as unknown as TFTData;
    if (!tftData) {
      throw new Error('TFT 데이터를 불러올 수 없습니다.');
    }

    const matches = await Match.find({ 'info.participants': { $exists: true } }).lean() as MatchDocument[];
    logger.info(`${matches.length}개의 매치를 분석합니다.`);

    const itemStatsMap = new Map<string, ItemStatsData>();

    for (const match of matches) {
      const participants = match.info?.participants || [];
      
      for (const participant of participants) {
        const placement = participant.placement;
        const units = participant.units || [];
        
        const usedItems = new Set<string>();
        
        for (const unit of units) {
          const items = unit.itemNames || [];
          items.forEach(itemId => usedItems.add(itemId));
        }

        for (const itemId of usedItems) {
          const itemKey = itemId.toLowerCase();
          let itemData: Item | null = null;
          
          const allItems = [
            ...tftData.items.basic,
            ...tftData.items.completed,
            ...tftData.items.ornn,
            ...tftData.items.radiant,
            ...tftData.items.emblem,
            ...tftData.items.support,
            ...tftData.items.robot
          ];
          
          itemData = allItems.find(item => (item as any).apiName?.toLowerCase() === itemKey) || null;
          
          if (!itemData) continue;

          if (!itemStatsMap.has(itemId)) {
            itemStatsMap.set(itemId, {
              itemId,
              itemName: itemData.name || 'Unknown Item',
              itemIcon: itemData.icon || '',
              itemType: this.getItemType(itemData, tftData),
              totalGames: 0,
              totalTop4: 0,
              totalWins: 0,
              placementSum: 0
            });
          }

          const stats = itemStatsMap.get(itemId)!;
          stats.totalGames++;
          stats.placementSum += placement;
          
          if (placement <= 4) stats.totalTop4++;
          if (placement === 1) stats.totalWins++;
        }
      }
    }

    const statsToSave: ItemStatsData[] = [];
    for (const [_itemId, stats] of itemStatsMap) {
      if (stats.totalGames >= 10) {
        stats.winRate = (stats.totalWins / stats.totalGames * 100).toFixed(2);
        stats.top4Rate = (stats.totalTop4 / stats.totalGames * 100).toFixed(2);
        stats.averagePlacement = (stats.placementSum / stats.totalGames).toFixed(2);
        stats.lastUpdated = new Date();
        
        statsToSave.push(stats);
      }
    }

    if (statsToSave.length > 0) {
      await ItemStats.deleteMany({});
      await ItemStats.insertMany(statsToSave);
      logger.info(`${statsToSave.length}개의 아이템 통계가 업데이트되었습니다.`);
    }

    return statsToSave;
  }

  async analyzeTraitStats(): Promise<TraitStatsData[]> {
    logger.info('특성 통계 분석을 시작합니다...');
    
    const tftData = await getTFTDataWithLanguage() as unknown as TFTData;
    if (!tftData) {
      throw new Error('TFT 데이터를 불러올 수 없습니다.');
    }

    const matches = await Match.find({ 'info.participants': { $exists: true } }).lean() as MatchDocument[];
    const traitStatsMap = new Map<string, TraitStatsData>();

    for (const match of matches) {
      const participants = match.info?.participants || [];
      
      for (const participant of participants) {
        const placement = participant.placement;
        const traits = participant.traits || [];
        
        for (const trait of traits) {
          const traitId = trait.name;
          const traitLevel = trait.tier_current || trait.num_units || 0;
          
          if (traitLevel === 0) continue;

          const traitKey = traitId.toLowerCase();
          const traitData = tftData.traitMap.get(traitKey);
          
          if (!traitData) continue;

          if (!traitStatsMap.has(traitId)) {
            traitStatsMap.set(traitId, {
              traitId,
              traitName: traitData.name,
              traitIcon: traitData.icon,
              traitType: traitData.type,
              totalGames: 0,
              totalTop4: 0,
              totalWins: 0,
              placementSum: 0,
              activationLevels: new Map<number, ActivationLevel>()
            });
          }

          const stats = traitStatsMap.get(traitId)!;
          stats.totalGames++;
          stats.placementSum += placement;
          
          if (placement <= 4) stats.totalTop4++;
          if (placement === 1) stats.totalWins++;

          const activationLevels = stats.activationLevels as Map<number, ActivationLevel>;
          if (!activationLevels.has(traitLevel)) {
            activationLevels.set(traitLevel, {
              level: traitLevel,
              games: 0,
              wins: 0,
              top4: 0,
              placementSum: 0
            });
          }

          const levelStats = activationLevels.get(traitLevel)!;
          levelStats.games++;
          levelStats.placementSum += placement;
          if (placement <= 4) levelStats.top4++;
          if (placement === 1) levelStats.wins++;
        }
      }
    }

    const statsToSave: TraitStatsData[] = [];
    for (const [_traitId, stats] of traitStatsMap) {
      if (stats.totalGames >= 10) {
        stats.winRate = (stats.totalWins / stats.totalGames * 100).toFixed(2);
        stats.top4Rate = (stats.totalTop4 / stats.totalGames * 100).toFixed(2);
        stats.averagePlacement = (stats.placementSum / stats.totalGames).toFixed(2);

        const activationLevels: ActivationLevel[] = [];
        const levelMap = stats.activationLevels as Map<number, ActivationLevel>;
        for (const [_level, levelStats] of levelMap) {
          if (levelStats.games >= 5) {
            levelStats.winRate = (levelStats.wins / levelStats.games * 100).toFixed(2);
            levelStats.top4Rate = (levelStats.top4 / levelStats.games * 100).toFixed(2);
            levelStats.averagePlacement = (levelStats.placementSum / levelStats.games).toFixed(2);
            activationLevels.push(levelStats);
          }
        }

        stats.activationLevels = activationLevels.sort((a, b) => a.level - b.level);
        stats.lastUpdated = new Date();
        
        statsToSave.push(stats);
      }
    }

    if (statsToSave.length > 0) {
      await TraitStats.deleteMany({});
      await TraitStats.insertMany(statsToSave);
      logger.info(`${statsToSave.length}개의 특성 통계가 업데이트되었습니다.`);
    }

    return statsToSave;
  }

  getItemType(itemData: Item, tftData: TFTData): string {
    if (tftData.items.basic.includes(itemData)) return 'basic';
    if (tftData.items.completed.includes(itemData)) return 'completed';
    if (tftData.items.ornn.includes(itemData)) return 'ornn';
    if (tftData.items.radiant.includes(itemData)) return 'radiant';
    if (tftData.items.emblem.includes(itemData)) return 'emblem';
    if (tftData.items.support.includes(itemData)) return 'support';
    if (tftData.items.robot.includes(itemData)) return 'robot';
    return 'unknown';
  }

  async analyzeAllStats(): Promise<AnalysisResults> {
    logger.info('전체 통계 분석을 시작합니다...');
    
    const [itemStats, traitStats] = await Promise.all([
      this.analyzeItemStats(),
      this.analyzeTraitStats()
    ]);

    logger.info('전체 통계 분석이 완료되었습니다.');
    return { itemStats, traitStats };
  }
}

export default new StatsAnalyzer();