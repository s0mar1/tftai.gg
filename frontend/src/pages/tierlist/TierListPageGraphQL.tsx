/**
 * TierListPage - GraphQL 버전
 * REST API 대신 GraphQL 쿼리를 사용하여 성능 최적화
 * 언어별 캐싱과 선택적 필드 조회 최적화
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTierlist, convertLanguageToGraphQL, handleGraphQLError } from '../../hooks/useGraphQLQueries';
import { useTFTData } from '../../context/TFTDataContext';
import ResponsiveContainer from '../../components/common/ResponsiveContainer';
import { TierListPageSkeleton } from '../../components/common/TFTSkeletons';
import Trait from '../summoner/components/Trait';
import PageErrorMessage from '../../components/common/PageErrorMessage';
import { fixChampionImageUrl } from '../../utils/tft-helpers';
import { createImageErrorHandler, processItemImageUrl } from '../../utils/imageUtils';

// TFT API의 실제 스타일 번호 매핑
const STYLE_MAP: Record<number, string> = {
  0: 'inactive',
  1: 'bronze',
  2: 'bronze', // 2도 bronze로 매핑
  3: 'silver',
  4: 'chromatic', // 5코스트 개인 시너지
  5: 'gold',
  6: 'prismatic'
};

// 기존 헬퍼 함수들 (동일하게 유지)
const getTierColor = (tierRank: string): string => {
  const colorMap: Record<string, string> = { 
    S: '#F87171', A: '#C084FC', B: '#60A5FA', C: '#4ADE80', D: '#9CA3AF'
  };
  return colorMap[tierRank] || '#9CA3AF';
};

const getDynamicColor = (value: number, type: string): string => {
  const redPastel = 'text-red-700 dark:text-red-500';
  const lightRedPastel = 'text-red-200 dark:text-red-200';
  const mintPastelLight = 'text-emerald-400 dark:text-emerald-300';
  const mintPastelStrong = 'text-brand-mint';

  if (type === 'averagePlacement') {
    if (value <= 4.0) return mintPastelStrong;
    if (value <= 4.15) return mintPastelLight;
    if (value <= 4.3) return lightRedPastel;
    return redPastel;
  } else if (type === 'top4Rate') {
    if (value >= 50) return mintPastelStrong;
    if (value >= 45) return mintPastelLight;
    if (value >= 40) return lightRedPastel;
    return redPastel;
  } else if (type === 'winRate') {
    if (value >= 13) return mintPastelStrong;
    if (value >= 12) return mintPastelLight;
    if (value >= 10) return lightRedPastel;
    return redPastel;
  }
  return '';
};

interface UnitWithItemsProps {
  unit: {
    name: string;
    image_url?: string;
    apiName?: string;
    tier?: number;
    cost?: number;
    items?: Array<{
      image_url: string;
      name: string;
    }>;
  };
  showItems: boolean;
  lang: string;
}

const UnitWithItems: React.FC<UnitWithItemsProps> = ({ unit, showItems, lang }) => {
  const tftDataResult = useTFTData();
  const { showTooltip, hideTooltip, champions = [] } = tftDataResult || {};
  
  if (!unit || !unit.image_url) {
    return <div className="w-12 h-12" />;
  }

  const displayedItems = showItems ? (unit.items || []).slice(0, 3) : [];

  const handleMouseEnter = (event: React.MouseEvent, unitData: any) => {
    const fullChampionData = champions.find(c => c.apiName === unitData.apiName);
    if (fullChampionData) {
      showTooltip(fullChampionData, event);
    }
  };

  const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
  const costBorderColor = costColors[unit.cost as keyof typeof costColors] || costColors[1];

  return (
    <div
      className="relative w-12 pt-2"
      onMouseEnter={(e) => handleMouseEnter(e, unit)}
      onMouseLeave={hideTooltip}
    >
      {/* 별 표시 */}
      {unit.tier && unit.tier > 0 && (
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 flex text-sm font-bold text-white z-10" 
             style={{ color: costBorderColor, textShadow: '0 0 3px black, 0 0 3px black' }}>
          {'★'.repeat(unit.tier)}
        </div>
      )}
      
      {/* 챔피언 이미지 */}
      <img
        src={fixChampionImageUrl(unit.image_url)}
        alt={unit.name}
        title={unit.name}
        className="w-full h-12 rounded-md block object-cover"
        style={{ border: `2px solid ${costBorderColor}` }}
        onError={createImageErrorHandler('champion')}
      />
      
      {/* 아이템 표시 */}
      {showItems && (
        <div className="flex justify-center gap-px mt-0.5">
          {displayedItems.map((item, index) => (
            item.image_url && (
              <img 
                key={index} 
                src={fixChampionImageUrl(item.image_url)} 
                alt={item.name} 
                title={item.name} 
                className="w-4 h-4 rounded-sm" 
                onError={createImageErrorHandler('item')}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

interface DeckCardProps {
  deck: {
    id: string;
    name: string;
    tier: 'S' | 'A' | 'B' | 'C' | 'D';
    champions: Array<{
      name: string;
      apiName: string;
      image_url: string;
      cost: number;
      tier: number;
      traits: string[];
      recommendedItems: Array<{
        name: string;
        image_url: string;
      }>;
    }>;
    traits: Array<{
      name: string;
      level: number;
      description?: string;
    }>;
    winRate: number;
    playRate: number;
    avgPlacement: number;
    keyUnits: string[];
    items: Array<{
      name: string;
      champion: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  };
  lang: string;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, lang }) => {
  const tftDataResult = useTFTData();
  const { champions = [] } = tftDataResult || {};
  const { t } = useTranslation();
  
  // GraphQL 데이터를 직접 사용 (변환 로직 최소화)
  const transformedDeck = useMemo(() => {
    const totalGames = 100; // 기본값
    const top4Count = Math.round(totalGames * (100 - deck.avgPlacement * 12.5) / 100);
    const winCount = Math.round(totalGames * deck.winRate / 100);

    return {
      tierRank: deck.tier,
      totalGames,
      top4Count,
      winCount,
      averagePlacement: deck.avgPlacement,
      deckName: deck.name,
      carryChampionName: { apiName: deck.keyUnits[0] || '' },
      mainTraitName: deck.traits[0]?.name || '',
      // GraphQL에서 이미 완전한 챔피언 데이터를 받음
      coreUnits: deck.champions.slice(0, 8).map(champion => ({
        name: champion.name,
        apiName: champion.apiName,
        image_url: fixChampionImageUrl(champion.image_url), // URL 수정 적용
        tier: deck.keyUnits.includes(champion.name) || deck.keyUnits.includes(champion.apiName) ? 3 : champion.tier,
        cost: champion.cost,
        traits: champion.traits || [],
        items: (champion.recommendedItems || []).map(item => ({
          ...item,
          image_url: fixChampionImageUrl(item.image_url)
        })),
        recommendedItems: (champion.recommendedItems || []).map(item => ({
          ...item,
          image_url: fixChampionImageUrl(item.image_url)
        }))
      }))
    };
  }, [deck, champions]);

  const tierColor = getTierColor(transformedDeck.tierRank);
  const top4Rate = transformedDeck.totalGames > 0 ? 
    ((transformedDeck.top4Count / transformedDeck.totalGames) * 100).toFixed(1) : "0.0";
  const winRate = transformedDeck.totalGames > 0 ? 
    ((transformedDeck.winCount / transformedDeck.totalGames) * 100).toFixed(1) : "0.0";

  // GraphQL에서 받은 traits 데이터를 Trait 컴포넌트가 기대하는 형식으로 변환
  const displayedTraits = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Original deck.traits:', deck.traits);
    }
    
    if (!deck.traits || deck.traits.length === 0) return [];
    
    return deck.traits.map(trait => {
      // 특성 레벨에 따른 스타일 결정
      let styleNumber = 0;
      const level = trait.level || 0;
      
      if (level >= 9) styleNumber = 6; // prismatic
      else if (level >= 6) styleNumber = 5; // gold  
      else if (level >= 4) styleNumber = 3; // silver
      else if (level >= 2) styleNumber = 1; // bronze
      else if (level > 0) styleNumber = 1; // bronze
      
      const styleVariant = STYLE_MAP[styleNumber] || 'inactive';
      
      const transformedTrait = {
        name: trait.name,
        apiName: trait.apiName || trait.name, // apiName이 있으면 사용, 없으면 name 사용
        tier_current: level,
        style: styleVariant, // 문자열 variant 사용
        styleOrder: styleNumber,
        image_url: trait.apiName ? 
          `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_${trait.apiName.toLowerCase()}.png` :
          `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_${trait.name.toLowerCase()}.png`,
        isActive: level > 0
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Transformed trait:', transformedTrait);
      }
      
      return transformedTrait;
    }).filter(trait => trait.isActive)
      .sort((a, b) => b.tier_current - a.tier_current);
  }, [deck.traits]);

  const sortedCoreUnits = [...transformedDeck.coreUnits].sort((a, b) => {
    const isA_Carry = a.apiName === transformedDeck.carryChampionName?.apiName;
    const isB_Carry = b.apiName === transformedDeck.carryChampionName?.apiName;
    if (isA_Carry && !isB_Carry) return -1;
    if (!isA_Carry && isB_Carry) return 1;
    if (a.cost !== b.cost) return b.cost - a.cost;
    return (b.tier || 0) - (a.tier || 0);
  });

  const majorUnitsToShow = new Set<string>();
  if (transformedDeck.carryChampionName?.apiName) {
    majorUnitsToShow.add(transformedDeck.carryChampionName.apiName);
  }
  const nonCarry4Costs = sortedCoreUnits.filter(u => 
    u.cost === 4 && u.apiName !== transformedDeck.carryChampionName?.apiName
  );
  nonCarry4Costs.slice(0, 2).forEach(u => majorUnitsToShow.add(u.apiName));
  
  const remainingUnits = sortedCoreUnits.filter(u => !majorUnitsToShow.has(u.apiName));
  remainingUnits.forEach(u => {
    if (majorUnitsToShow.size < 3) majorUnitsToShow.add(u.apiName);
  });

  return (
    <div className="flex items-center gap-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4" 
         style={{ borderLeftColor: tierColor }}>
      <div className="flex items-center gap-4 flex-shrink-0 w-64">
        <div className="flex items-center justify-center w-10 h-10 rounded-md text-white text-2xl font-bold" 
             style={{ backgroundColor: tierColor }}>
          {transformedDeck.tierRank}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {transformedDeck.mainTraitName} {transformedDeck.carryChampionName.apiName}
          </h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {/* 특성 표시 */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {displayedTraits.map(trait => {
            // 디버깅을 위한 로그
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 Trait data:', trait);
            }
            return (
              <Trait key={trait.apiName} trait={trait} showCount={true} />
            );
          })}
        </div>
        {/* 유닛 표시 */}
        <div className="flex flex-wrap gap-1.5">
          {sortedCoreUnits.slice(0, 8).map((unit) => (
            <UnitWithItems
              key={unit.apiName || unit.name}
              unit={unit}
              showItems={majorUnitsToShow.has(unit.apiName)}
              lang={lang}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 grid grid-cols-4 gap-3 w-80 text-center">
        <div>
          <p className={`font-bold text-base ${getDynamicColor(transformedDeck.averagePlacement, 'averagePlacement')}`}>
            {transformedDeck.averagePlacement.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.avgPlacement')}</p>
        </div>
        <div>
          <p className={`font-bold text-base ${getDynamicColor(parseFloat(top4Rate), 'top4Rate')}`}>
            {top4Rate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Top 4</p>
        </div>
        <div>
          <p className={`font-bold text-base ${getDynamicColor(parseFloat(winRate), 'winRate')}`}>
            {winRate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.winRate')}</p>
        </div>
        <div>
          <p className="font-bold text-base text-gray-800 dark:text-gray-100">
            {transformedDeck.totalGames}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.games')}</p>
        </div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
const TierListPageGraphQL: React.FC = () => {
  const { i18n, t } = useTranslation();
  const graphqlLanguage = convertLanguageToGraphQL(i18n.language);

  // 🚀 GraphQL 쿼리 - 언어별 최적화된 캐싱
  const { 
    data: apiResponse,
    isLoading,
    error,
    refetch,
    decks,
    lastUpdated,
    totalDecks,
    success,
    meta
  } = useTierlist(graphqlLanguage);

  // 개발 환경에서 데이터 로깅
  if (process.env.NODE_ENV === 'development' && decks) {
    console.log('🔍 TierList 데이터 수신:', {
      decksLength: decks.length,
      firstDeck: decks[0],
      success,
      totalDecks
    });
  }

  const handleRefresh = async (): Promise<void> => {
    await refetch();
  };

  if (isLoading) {
    return (
      <ResponsiveContainer maxWidth="7xl" padding="responsive">
        <TierListPageSkeleton />
      </ResponsiveContainer>
    );
  }

  if (error && !success) {
    const errorInfo = handleGraphQLError(error);
    return (
      <ResponsiveContainer maxWidth="7xl" padding="responsive">
        <PageErrorMessage
          title="메타 랭킹 로딩 실패"
          message={errorInfo.message}
          showRetry={true}
          onRetry={handleRefresh}
          variant="default"
        />
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer maxWidth="7xl" padding="responsive">
      {/* 성능 개선 정보 표시 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && meta && (
        <div className="mb-4 p-2 bg-blue-100 dark:bg-blue-900 rounded text-sm">
          ⚡ GraphQL 최적화: 언어별 캐싱 활성화 ({graphqlLanguage}), 
          처리시간 {meta.processingTime}ms, 총 {totalDecks}개 덱
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">
            {t('tierlist.title')}
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400">
            {t('tierlist.subtitle')}
            {lastUpdated && (
              <span className="block text-xs mt-1">
                마지막 업데이트: {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          title="새로고침"
        >
          <svg 
            className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          새로고침
        </button>
      </div>

      {decks && decks.length > 0 ? (
        <div className="flex flex-col gap-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} lang={i18n.language} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          {t('tierlist.noData')}
        </div>
      )}

      {/* 개발 환경에서 GraphQL 응답 디버깅 */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <summary className="cursor-pointer font-semibold">
            GraphQL 응답 디버깅 (개발용)
          </summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify({ 
              success, 
              meta, 
              totalDecks, 
              decksCount: decks?.length,
              language: graphqlLanguage 
            }, null, 2)}
          </pre>
        </details>
      )}
    </ResponsiveContainer>
  );
};

export default TierListPageGraphQL;