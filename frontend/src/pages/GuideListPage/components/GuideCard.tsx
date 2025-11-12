import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { decodeDeck } from '../../../utils/deckCode';
import Trait from '../../summoner/components/Trait';
import { Champion, Item, Trait as TraitType } from '../../../types';

// Type Definitions
interface LevelBoard {
  level: number;
  board: string;
}

interface GuideAuthor {
  name: string;
  score: number;
}

interface Guide {
  _id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  author: GuideAuthor;
  recommendCount: number;
  viewCount: number;
  createdAt: string;
  level_boards: LevelBoard[];
  initialDeckLevel: number;
}

interface DecodedUnit extends Champion {
  items: Item[];
  tier: number;
}

interface GuideCardProps {
  guide: Guide;
  champions: Champion[];
  allItems: { [key: string]: Item };
  traitMap: Map<string, string>;
  allTraits: TraitType[];
}

const getDifficultyColor = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
  const colorMap = { Easy: 'bg-green-600', Medium: 'bg-yellow-600', Hard: 'bg-red-600' };
  return colorMap[difficulty] || 'bg-gray-600';
};

const IDX2KEY = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_RANK: { [key: string]: number } = { prismatic: 4, gold: 3, silver: 2, bronze: 1, unique: 4, none: 0 };

const calculateActiveTraits = (unitsArray: DecodedUnit[], allTraits: TraitType[], koreanToApiNameMap: Map<string, string>): TraitType[] => {
  const traitCounts: { [key: string]: number } = {};
  unitsArray.forEach(unit => {
    if (unit.traits && Array.isArray(unit.traits)) {
      const uniqueTraits = new Set(unit.traits);
      uniqueTraits.forEach(koreanTraitName => {
        const apiName = koreanToApiNameMap.get(koreanTraitName);
        if (apiName) {
          traitCounts[apiName] = (traitCounts[apiName] || 0) + 1;
        }
      });
    }
  });

  const activeTraits = allTraits
    .map(trait => {
      const count = traitCounts[trait.apiName] || 0;
      if (count === 0) return null;
      
      const sortedEffects = trait.effects.sort((a, b) => a.minUnits - b.minUnits);
      let currentThreshold = 0;
      let activeStyleKey = 'bronze';
      
      for (const effect of sortedEffects) {
        if (count >= effect.minUnits) {
          currentThreshold = effect.minUnits;
          activeStyleKey = (typeof effect.style === 'number' ? IDX2KEY[effect.style] : effect.style?.toLowerCase()) || 'bronze';
        }
      }
      
      if (sortedEffects.length === 1 && sortedEffects[0].minUnits === 1) {
          activeStyleKey = 'unique';
      }

      const isActive = count >= currentThreshold && currentThreshold > 0;
      const styleOrder = STYLE_RANK[activeStyleKey] || 0;

      return {
        ...trait,
        tier_current: count,
        style: activeStyleKey,
        isActive,
        styleOrder,
      };
    })
    .filter((trait): trait is TraitType => trait !== null)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
      return b.tier_current - a.tier_current;
    });
  return activeTraits;
};

const GuideCard: React.FC<GuideCardProps> = ({ guide, champions, allItems, traitMap, allTraits }) => {
  const { t } = useTranslation();
  const previewBoard = guide.level_boards.find(b => b.level === guide.initialDeckLevel) || guide.level_boards.find(b => b.level === 8) || guide.level_boards[0];
  const units = previewBoard ? decodeDeck(previewBoard.board, champions, allItems) : {};
  const unitsArray: DecodedUnit[] = Object.values(units);

  const koreanToApiNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!traitMap) return map;
    for (const [apiName, koreanName] of traitMap.entries()) {
      if (!map.has(koreanName)) {
        map.set(koreanName, apiName);
      }
    }
    return map;
  }, [traitMap]);

  const activeTraits = useMemo(() => {
    if (!allTraits || !Array.isArray(allTraits)) return [];
    return calculateActiveTraits(unitsArray, allTraits, koreanToApiNameMap);
  }, [unitsArray, allTraits, koreanToApiNameMap]);

  const getCostBorderColor = (cost: number): string => {
    const costColors = {
      1: '#6B7280',
      2: '#10B981',
      3: '#3B82F6',
      4: '#8B5CF6',
      5: '#F59E0B',
    };
    return costColors[cost as keyof typeof costColors] || '#6B7280';
  };

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary rounded-lg p-6 border border-border-light dark:border-dark-border-light hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Link
            to={`/guides/${guide._id}`}
            className="text-xl font-semibold text-text-primary dark:text-dark-text-primary hover:text-brand-mint transition-colors"
          >
            {guide.title}
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <span className={`${getDifficultyColor(guide.difficulty)} text-white px-2 py-1 text-xs rounded`}>
              {guide.difficulty}
            </span>
            <span className="text-text-secondary dark:text-dark-text-secondary text-sm">
              {guide.author.name} ({t('guides.score')}: {guide.author.score})
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end text-sm text-text-secondary dark:text-dark-text-secondary">
          <span>{t('guides.recommend')} {guide.recommendCount}</span>
          <span>{t('guides.view')} {guide.viewCount}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
          {t('guides.levelDeckComposition', { level: previewBoard?.level })}
        </h4>
        <div className="flex flex-wrap gap-1 mb-3">
          {unitsArray.map((unit, index) => (
            <div key={index} className="relative">
              <div
                className="w-12 h-12 rounded-md border-2 overflow-hidden"
                style={{ borderColor: getCostBorderColor(unit.cost) }}
              >
                <img
                  src={unit.image_url}
                  alt={unit.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unit.tier}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
          {t('guides.activeSynergies')}
        </h4>
        <div className="flex flex-wrap gap-1">
          {activeTraits.slice(0, 8).map((trait, index) => (
            <Trait
              key={index}
              trait={trait}
              apiName={trait.apiName}
              name={trait.name}
              tier_current={trait.tier_current}
              style={trait.style}
              isActive={trait.isActive}
              className="flex-shrink-0"
            />
          ))}
          {activeTraits.length > 8 && (
            <span className="text-text-secondary dark:text-dark-text-secondary text-sm">
              +{activeTraits.length - 8}개
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
        {new Date(guide.createdAt).toLocaleDateString('ko-KR')}
      </div>
    </div>
  );
};

export default GuideCard;