import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/fetchApi';
import { useTFTData } from '../../context/TFTDataContext';
import { decodeDeck } from '../../utils/deckCode';
import Trait from '../summoner/components/Trait';
import { Champion, Item, Trait as TraitType } from '../../types';
import { processImagePath, safeProcessImagePath } from '../../utils/imageUtils';

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
        const traitApiName = koreanToApiNameMap.get(koreanTraitName);
        if (traitApiName) {
          traitCounts[traitApiName] = (traitCounts[traitApiName] || 0) + 1;
        }
      });
    }
  });

  const activeTraits = allTraits
    .map(trait => {
      const count = traitCounts[trait.apiName] || 0;
      if (count === 0) return null;

      const sortedEffects = [...trait.effects].sort((a, b) => a.minUnits - b.minUnits);
      
      let activeStyleKey = 'none';
      let currentThreshold = 0;

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

interface GuideCardProps {
  guide: Guide;
  champions: Champion[];
  allItems: { [key: string]: Item };
  traitMap: Map<string, string>;
  allTraits: TraitType[];
  getChampionImageUrl: (champion: Champion) => string;
}

const GuideCard: React.FC<GuideCardProps> = ({ guide, champions, allItems, traitMap, allTraits, getChampionImageUrl }) => {
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
    return calculateActiveTraits(unitsArray, allTraits, koreanToApiNameMap);
  }, [unitsArray, allTraits, koreanToApiNameMap]);

  const coreChampions = useMemo(() => {
    // 챔피언별로 가장 높은 tier를 가진 유닛만 유지
    const uniqueChampionsMap = new Map<string, DecodedUnit>();
    
    unitsArray.forEach(unit => {
      const existing = uniqueChampionsMap.get(unit.apiName);
      if (!existing || unit.tier > existing.tier) {
        uniqueChampionsMap.set(unit.apiName, unit);
      }
    });
    
    return Array.from(uniqueChampionsMap.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6);
  }, [unitsArray]);

  const getCostBorderColor = (cost: number) => {
    const colorMap: { [key: number]: string } = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
    return colorMap[cost] || colorMap[1];
  };

  return (
    <div className="flex items-center gap-6 p-5 bg-background-card dark:bg-dark-background-card rounded-lg shadow-md border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: getDifficultyColor(guide.difficulty).replace('bg-', '#') }}>
      <div className="flex items-center gap-4 flex-shrink-0 w-64">
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg text-white text-xl font-bold ${getDifficultyColor(guide.difficulty)} shadow-md`}>
          {guide.difficulty.charAt(0)}
        </div>
        <div className="flex-grow">
          <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary leading-tight mb-1">{guide.title}</h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white ${getDifficultyColor(guide.difficulty)}`}>
              {guide.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary dark:text-dark-text-secondary">
            {guide.author && guide.author.name ? (
              <span>작성자: {guide.author.name}</span>
            ) : (
              <span>작성자: 익명</span>
            )}
            <span>점수: {(guide.author && guide.author.score) || 1500}점</span>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        <div className="flex flex-wrap gap-1 mb-3">
          {activeTraits.filter(trait => trait.isActive).slice(0, 6).map(trait => (
            <div key={trait.apiName} className="transform scale-75 origin-left">
              <Trait trait={{...trait, image_url: trait.icon}} showCount={false} />
            </div>
          ))}
        </div>
        
        <div className="flex items-start gap-2">
          {coreChampions.map((unit, index) => (
            <div key={`${unit.apiName}-${index}`} className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={getChampionImageUrl(unit)}
                  alt={unit.name}
                  className="w-12 h-12 rounded-md border-2 hover:scale-105 transition-transform"
                  style={{ borderColor: getCostBorderColor(unit.cost) }}
                  title={unit.name}
                />
                {unit.tier > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border border-yellow-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">★</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-text-secondary dark:text-dark-text-secondary truncate w-12 text-center mt-1">{unit.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <div className="text-right text-xs text-text-secondary dark:text-dark-text-secondary">
          <div className="flex gap-3">
            <span>추천 {guide.recommendCount || 0}</span>
            <span>조회 {guide.viewCount || 0}</span>
            {guide.createdAt && (
              <span>{new Date(guide.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <Link 
          to={`/guides/${guide._id}`} 
          className="px-4 py-2 bg-brand-mint text-white rounded-md hover:bg-brand-mint/80 transition-colors font-medium"
        >
          공략 보기
        </Link>
      </div>
    </div>
  );
};

export default function GuideListPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recommended' | 'score' | 'newest'>('recommended');
  const tftDataResult = useTFTData();
  const { champions = [], traits: allTraits = [], traitMap = new Map(), allItems = [] } = tftDataResult || {};

  // 공통 함수: 챔피언 이미지 URL 생성
  const getChampionImageUrl = useCallback((champion: Champion): string => {
    // 1순위: 백엔드에서 처리된 절대 URL 그대로 사용
    if (champion.image_url && champion.image_url.startsWith('http')) {
      return champion.image_url;
    }
    
    // 2순위: image_url이 상대 경로인 경우 안전하게 처리
    if (champion.image_url) {
      return safeProcessImagePath(champion.image_url);
    }
    
    // 3순위: tileIcon 사용
    if (champion.tileIcon) {
      return safeProcessImagePath(champion.tileIcon);
    }
    
    // 4순위: icon 사용
    if (champion.icon) {
      return safeProcessImagePath(champion.icon);
    }
    
    // 최후의 수단: 빈 문자열
    return '';
  }, []);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const response = await api.get('/api/guides');
        setGuides(response);
      } catch (err) {
        setError('공략을 불러오는 데 실패했습니다.');
      }
      setLoading(false);
    };

    if (champions.length > 0 && allTraits.length > 0) {
        fetchGuides();
    }
  }, [champions, allTraits]);

  const championsByCost = useMemo(() => {
    const grouped: { [key: number]: Champion[] } = {};
    champions.forEach(champion => {
      const cost = champion.cost || 1;
      if (!grouped[cost]) grouped[cost] = [];
      grouped[cost].push(champion);
    });
    return grouped;
  }, [champions]);

  const filteredAndSortedGuides = useMemo(() => {
    let filtered: Guide[] = guides;

    if (searchQuery) {
      filtered = filtered.filter(guide => 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedChampion) {
      filtered = filtered.filter(guide => {
        const previewBoard = guide.level_boards.find(b => b.level === guide.initialDeckLevel) || 
                            guide.level_boards.find(b => b.level === 8) || 
                            guide.level_boards[0];
        if (!previewBoard) return false;
        
        const units = decodeDeck(previewBoard.board, champions, allItems);
        const unitsArray: DecodedUnit[] = Object.values(units);
        return unitsArray.some(unit => unit.apiName === selectedChampion.apiName);
      });
    }

    switch (sortBy) {
      case 'score':
        return [...filtered].sort((a, b) => (b.author?.score || 0) - (a.author?.score || 0));
      case 'newest':
        return [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'recommended':
      default:
        return [...filtered].sort((a, b) => (b.recommendCount || 0) - (a.recommendCount || 0));
    }
  }, [guides, searchQuery, selectedChampion, sortBy, champions, allItems]);

  if (loading) return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-center mb-2 text-text-primary dark:text-dark-text-primary">추천 덱 공략</h1>
      <p className="text-center text-text-secondary dark:text-dark-text-secondary mb-8">최신 공략 데이터를 기반으로 집계된 덱 공략입니다.</p>
      
      <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 mb-6 shadow-md animate-pulse">
        <div className="space-y-3 mb-6">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-2"></div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <div key={j} className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow h-10 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
          <div className="flex gap-2">
            <div className="w-24 h-10 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-40 animate-pulse"></div>
      </div>
      
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 p-5 bg-background-card dark:bg-dark-background-card rounded-lg shadow-md border-l-4 border-gray-300 dark:border-gray-600 animate-pulse">
            <div className="flex items-center gap-4 flex-shrink-0 w-64">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              <div className="flex-grow">
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
              </div>
            </div>

            <div className="flex-grow">
              <div className="flex flex-wrap gap-1 mb-3">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                ))}
              </div>
              <div className="flex items-start gap-2">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-8 mt-1"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <div className="flex gap-3">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="w-20 h-8 bg-gray-300 dark:bg-gray-600 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return <div className="py-8 text-center text-error-red">{error}</div>;

  const getCostBorderColor = (cost: number) => {
    const colorMap: { [key: number]: string } = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
    return colorMap[cost] || colorMap[1];
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-center mb-2 text-text-primary dark:text-dark-text-primary">추천 덱 공략</h1>
      <p className="text-center text-text-secondary dark:text-dark-text-secondary mb-8">최신 공략 데이터를 기반으로 집계된 덱 공략입니다.</p>
      
      <div className="bg-background-card dark:bg-dark-background-card rounded-lg p-6 mb-6 shadow-md">
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">챔피언별 필터</h3>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(cost => {
              const champions = championsByCost[cost] || [];
              const gridCols = Math.min(Math.ceil(Math.sqrt(champions.length)), 4);
              
              return (
                <div key={cost} className="flex-shrink-0">
                  <div 
                    className="p-3 rounded-lg border-2 bg-gray-50/50 dark:bg-gray-800/50"
                    style={{ borderColor: getCostBorderColor(cost) }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold text-text-primary dark:text-dark-text-primary">
                        {cost}코스트
                      </span>
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCostBorderColor(cost) }}
                      />
                    </div>
                    <div 
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    >
                      {champions.map(champion => {
                        // 디버깅: 실제 URL 확인 (모든 코스트의 첫 번째 챔피언)
                        if (champions.indexOf(champion) === 0) {
                          const testImageUrl = getChampionImageUrl(champion);
                          console.log(`🔍 Champion Image URL Debug (${cost}코스트):`, {
                            name: champion.name,
                            apiName: champion.apiName,
                            original_image_url: champion.image_url,
                            tileIcon: champion.tileIcon,
                            icon: champion.icon,
                            processed_url: processImagePath(champion.image_url),
                            safe_processed_url: safeProcessImagePath(champion.image_url),
                            final_url: testImageUrl,
                            url_type: champion.image_url?.startsWith('http') ? 'absolute' : 'relative'
                          });
                          
                          // 임시 테스트: 알려진 정상 URL로도 시도
                          console.log('🧪 Test URL:', `https://raw.communitydragon.org/latest/game/assets/characters/tft14_drmundo/hud/tft14_drmundo_square.png`);
                        }

                        const imageUrl = getChampionImageUrl(champion);

                        return (
                          <button
                            key={champion.apiName}
                            onClick={() => setSelectedChampion(selectedChampion?.apiName === champion.apiName ? null : champion)}
                            className={`relative w-10 h-10 rounded-md border-2 hover:scale-105 transition-all ${
                              selectedChampion?.apiName === champion.apiName 
                                ? 'ring-2 ring-brand-mint shadow-lg' 
                                : 'hover:ring-2 hover:ring-gray-300'
                            }`}
                            style={{ borderColor: getCostBorderColor(cost) }}
                            title={champion.name}
                          >
                            <img
                              src={imageUrl}
                              alt={champion.name}
                              className="w-full h-full rounded-sm object-cover"
                              onError={(e) => {
                                console.error(`❌ Image load failed for ${champion.name}:`, imageUrl);
                                // 이미지 로드 실패 시 투명하게 처리
                                e.currentTarget.style.opacity = '0.3';
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="덱 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border-light dark:border-dark-border-light bg-background-base dark:bg-dark-background-base text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-mint focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recommended' | 'score' | 'newest')}
              className="px-4 py-2 rounded-md border border-border-light dark:border-dark-border-light bg-background-base dark:bg-dark-background-base text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-mint"
            >
              <option value="recommended">추천순</option>
              <option value="score">점수순</option>
              <option value="newest">최신순</option>
            </select>
            {(selectedChampion || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedChampion(null);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>
        
        {selectedChampion && (
          <div className="flex items-center gap-2 p-3 bg-brand-mint/10 rounded-md mt-4">
            <img 
              src={getChampionImageUrl(selectedChampion)} 
              alt={selectedChampion.name}
              className="w-8 h-8 rounded-md"
              onError={(e) => {
                console.error(`❌ Selected champion image load failed for ${selectedChampion.name}`);
                e.currentTarget.style.opacity = '0.3';
              }}
            />
            <span className="text-text-primary dark:text-dark-text-primary font-medium">
              {selectedChampion.name} 포함 덱만 표시
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-text-secondary dark:text-dark-text-secondary">
          총 {filteredAndSortedGuides.length}개의 공략이 있습니다.
        </p>
      </div>
      
      {filteredAndSortedGuides.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredAndSortedGuides.map((guide) => (
            <GuideCard
              key={guide._id}
              guide={guide}
              champions={champions}
              allItems={allItems}
              traitMap={traitMap}
              allTraits={allTraits}
              getChampionImageUrl={getChampionImageUrl}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-text-secondary dark:text-dark-text-secondary">
          {guides.length === 0 ? (
            <>
              아직 작성된 공략이 없습니다. <br />
              새로운 공략을 작성해 보세요!
            </>
          ) : (
            <>
              검색 조건에 맞는 공략이 없습니다. <br />
              다른 검색어나 필터를 시도해보세요.
            </>
          )}
        </div>
      )}
    </div>
  );
}