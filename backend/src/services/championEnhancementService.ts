import { Champion, ChampionStats } from '../types';
import logger from '../config/logger';

export interface ChampionEnhancement {
  championApiName: string;
  level: number;
  enhancements: Enhancement[];
}

export interface Enhancement {
  type: 'cc_immunity' | 'mana_regen' | 'stats' | 'special';
  value?: number | string | boolean;
  description: string;
}

/**
 * 챔피언 강화 서비스
 * Set 15의 특수 효과들을 관리합니다
 */
export class ChampionEnhancementService {
  /**
   * 3성 5코스트 챔피언의 특수 효과를 반환합니다
   */
  static getThreeStarFiveCostEnhancements(): Enhancement[] {
    return [
      {
        type: 'cc_immunity',
        description: 'Immune to Crowd Control',
        value: true
      },
      {
        type: 'mana_regen',
        description: '20 Mana Regeneration per second',
        value: 20
      }
    ];
  }

  /**
   * 유닛 롤에 따른 패시브 효과를 반환합니다
   */
  static getRolePassiveEffects(role: string, stage: number = 1): Enhancement[] {
    const effects: Enhancement[] = [];

    switch (role) {
      case 'tank':
        effects.push({
          type: 'special',
          description: 'Gain 2 Mana when taking damage',
          value: 2
        });
        effects.push({
          type: 'special',
          description: 'More likely to be targeted',
          value: 'increased_threat'
        });
        break;

      case 'fighter':
        const omnivampValue = stage >= 5 ? 20 : 
                             stage === 4 ? 16 : 
                             stage === 3 ? 12 : 8;
        effects.push({
          type: 'special',
          description: `${omnivampValue}% Omnivamp`,
          value: omnivampValue
        });
        break;

      case 'assassin':
        effects.push({
          type: 'special',
          description: 'Less likely to be targeted',
          value: 'decreased_threat'
        });
        break;

      case 'caster':
        effects.push({
          type: 'mana_regen',
          description: 'Generate 2 Mana per second',
          value: 2
        });
        break;

      case 'marksman':
        effects.push({
          type: 'special',
          description: 'Gain 10% Attack Speed after each attack (max 5 stacks)',
          value: 'attack_speed_stack'
        });
        break;

      case 'specialist':
        effects.push({
          type: 'special',
          description: 'Unique resource generation',
          value: 'unique'
        });
        break;
    }

    return effects;
  }

  /**
   * 챔피언에 강화 효과를 적용합니다
   */
  static applyEnhancements(
    champion: Champion, 
    level: number, 
    stage: number = 1
  ): Champion & { enhancements?: Enhancement[] } {
    const enhancedChampion = { ...champion };
    const enhancements: Enhancement[] = [];

    // 3성 5코스트 특수 효과
    if (level === 3 && champion.cost === 5) {
      enhancements.push(...this.getThreeStarFiveCostEnhancements());
      logger.info(`3성 5코스트 특수 효과 적용: ${champion.name}`);
    }

    // 롤 패시브 효과 (role이 있는 경우에만)
    const championWithRole = champion as Champion & { role?: string };
    if (championWithRole.role) {
      enhancements.push(...this.getRolePassiveEffects(championWithRole.role, stage));
      logger.debug(`롤 패시브 효과 적용: ${champion.name} (${championWithRole.role})`);
    }

    if (enhancements.length > 0) {
      return {
        ...enhancedChampion,
        enhancements
      };
    }

    return enhancedChampion;
  }

  /**
   * 챔피언 스탯을 강화 효과에 따라 계산합니다
   */
  static calculateEnhancedStats(
    baseStats: ChampionStats,
    enhancements: Enhancement[]
  ): ChampionStats {
    const enhancedStats = { ...baseStats };

    enhancements.forEach(enhancement => {
      if (enhancement.type === 'stats' && typeof enhancement.value === 'number') {
        // 퍼센트 증가로 처리
        const multiplier = 1 + enhancement.value / 100;
        Object.keys(enhancedStats).forEach(stat => {
          const statKey = stat as keyof ChampionStats;
          if (typeof enhancedStats[statKey] === 'number') {
            (enhancedStats[statKey] as number) *= multiplier;
          }
        });
      }
    });

    return enhancedStats;
  }

  /**
   * Power Snax 효과를 적용합니다
   */
  static applyPowerSnaxEffect(
    champion: Champion,
    powerUpId: string
  ): Champion & { powerUp?: Enhancement } {
    // TODO: 실제 Power Snax 데이터와 연동
    const mockPowerUp: Enhancement = {
      type: 'stats',
      value: 10,
      description: 'Power Snax: +10% all stats'
    };

    logger.info(`Power Snax 효과 적용: ${champion.name} - ${powerUpId}`);

    return {
      ...champion,
      powerUp: mockPowerUp
    };
  }
}

export default ChampionEnhancementService;