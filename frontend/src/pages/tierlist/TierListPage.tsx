// frontend/src/pages/tierlist/TierListPage.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // i18next 추가
import { useDeckTiers, useCacheInvalidation } from '../../hooks/useQuery';
import { useTFTData } from '../../context/TFTDataContext';
import ResponsiveContainer from '../../components/common/ResponsiveContainer';
import { TierListPageSkeleton } from '../../components/common/TFTSkeletons';
import Trait from '../summoner/components/Trait';
import { useTraitProcessing } from '../../hooks/useTraitProcessing';
import PageErrorMessage from '../../components/common/PageErrorMessage';
import { fixChampionImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

// --- 상수 ---

// --- 헬퍼 함수 ---
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
    name: string | Record<string, string>;
    image_url: string;
    apiName: string;
    tier: number;
    cost: number;
    items?: Array<{
      image_url: string;
      name: string;
    }>;
  };
  showItems: boolean;
  lang: string;
}

// --- 재사용 컴포넌트 (서머너 매치카드와 동일한 디자인) ---
const UnitWithItems: React.FC<UnitWithItemsProps> = ({ unit, showItems, lang }) => {
  const tftDataResult = useTFTData();
  const { showTooltip, hideTooltip, champions = [] } = tftDataResult || {};
  
  // 챔피언 이름 처리: 다국어 객체 또는 단순 문자열 처리
  const unitName = typeof unit.name === 'string' 
    ? unit.name 
    : (unit.name?.[lang] || unit.name?.ko || unit.apiName);

  // 이미지 URL 처리: 백엔드 데이터가 없으면 TFT 정적 데이터에서 가져오기
  let imageUrl = unit.image_url;
  if (!imageUrl && unit.apiName && champions.length > 0) {
    const championData = champions.find(c => c.apiName === unit.apiName);
    imageUrl = championData?.tileIcon || championData?.image_url || '';
  }

  if (!unit || !imageUrl) {
    return <div className="w-12 h-12" />;
  }

  const displayedItems = showItems ? (unit.recommendedItems || []).slice(0, 3) : [];

  const handleMouseEnter = (event, unitData) => {
    const fullChampionData = champions.find(c => c.apiName === unitData.apiName);
    if (fullChampionData) {
      showTooltip(fullChampionData, event);
    }
  };

  const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
  const costBorderColor = costColors[unit.cost] || costColors[1];

  return (
    <div
      className="relative w-12 pt-2"
      onMouseEnter={(e) => handleMouseEnter(e, unit)}
      onMouseLeave={hideTooltip}
    >
      {/* 별 표시 (서머너 매치카드와 동일) */}
      {unit.tier > 0 && (
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 flex text-sm font-bold text-white z-10" 
             style={{ color: costBorderColor, textShadow: '0 0 3px black, 0 0 3px black' }}>
          {'★'.repeat(unit.tier)}
        </div>
      )}
      
      {/* 챔피언 이미지 (서머너 매치카드와 동일) */}
      <img
        src={fixChampionImageUrl(imageUrl)}
        alt={unitName}
        title={unitName}
        className="w-full h-12 rounded-md block object-cover"
        style={{ border: `2px solid ${costBorderColor}` }}
        onError={createImageErrorHandler('champion')}
      />
      
      {/* 아이템 표시 (서머너 매치카드와 동일) */}
      {showItems && (
        <div className="flex justify-center gap-px mt-0.5">
          {displayedItems.map((item, index) => {
            const itemName = typeof item.name === 'string' 
              ? item.name 
              : (item.name?.[lang] || item.name?.ko || 'Unknown Item');
            return item.image_url && (
              <img key={index} src={item.image_url} alt={itemName} title={itemName} className="w-4 h-4 rounded-sm" />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DeckCardProps {
  deck: {
    tierRank: string;
    totalGames: number;
    top4Count: number;
    winCount: number;
    averagePlacement: number;
    deckName?: string | Record<string, string>;
    carryChampionName?: any;
    mainTraitName?: any;
    coreUnits?: Array<{
      name: string | Record<string, string>;
      image_url: string;
      apiName: string;
      tier: number;
      cost: number;
      items?: Array<{
        image_url: string;
        name: string;
      }>;
    }>;
    traits?: Array<{
      name: string;
      tier_current: number;
      style: string | number;
      styleOrder?: number;
      image_url: string;
      apiName: string;
    }>;
  };
  lang: string;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, lang }) => {
  const tftDataResult = useTFTData();
  const { champions = [] } = tftDataResult || {};
  const { t } = useTranslation();
  const tierColor = getTierColor(deck.tierRank);
  const top4Rate = deck.totalGames > 0 ? ((deck.top4Count / deck.totalGames) * 100).toFixed(1) : "0.0";
  const winRate = deck.totalGames > 0 ? ((deck.winCount / deck.totalGames) * 100).toFixed(1) : "0.0";

  // 현재 언어에 맞는 이름 사용 (다국어 객체 또는 단순 문자열 처리)
  const carryChampionName = typeof deck.carryChampionName === 'string' 
    ? deck.carryChampionName 
    : (deck.carryChampionName?.[lang] || deck.carryChampionName?.ko);
  const mainTraitName = typeof deck.mainTraitName === 'string' 
    ? deck.mainTraitName 
    : (deck.mainTraitName?.[lang] || deck.mainTraitName?.ko);

  // deck.coreUnits에서 champions 데이터를 가져와서 traits를 포함한 units 배열 생성
  const unitsWithTraits = useMemo(() => {
    if (!deck.coreUnits || !champions || champions.length === 0) {
      return [];
    }
    
    return deck.coreUnits.map(unit => {
      const championData = champions.find(c => c.apiName === unit.apiName);
      return {
        ...unit,
        traits: championData?.traits || [] // TFT 데이터에서 특성 정보 가져오기
      };
    });
  }, [deck.coreUnits, champions]);

  // useTraitProcessing 훅 사용 (홈페이지 MetaTrendCard와 동일)
  const { processedTraits } = useTraitProcessing(unitsWithTraits);
  
  // 활성화된 특성만 필터링 및 정렬 (홈페이지 MetaTrendCard와 동일)
  const displayedTraits = processedTraits
    .filter(trait => trait.isActive)
    .sort((a, b) => b.styleOrder - a.styleOrder);

  const sortedCoreUnits = [...(deck.coreUnits || [])].sort((a, b) => {
    const isA_Carry = a.apiName === deck.carryChampionName?.apiName;
    const isB_Carry = b.apiName === deck.carryChampionName?.apiName;
    if (isA_Carry && !isB_Carry) return -1;
    if (!isA_Carry && isB_Carry) return 1;
    if (a.cost !== b.cost) return b.cost - a.cost;
    return (b.tier || 0) - (a.tier || 0);
  });

  const majorUnitsToShow = new Set();
  if (deck.carryChampionName?.apiName) {
    majorUnitsToShow.add(deck.carryChampionName.apiName);
  }
  const nonCarry4Costs = sortedCoreUnits.filter(u => u.cost === 4 && u.apiName !== deck.carryChampionName?.apiName);
  nonCarry4Costs.slice(0, 2).forEach(u => majorUnitsToShow.add(u.apiName));
  
  // 나머지 유닛들 중에서 3개 미만이면 추가
  const remainingUnits = sortedCoreUnits.filter(u => !majorUnitsToShow.has(u.apiName));
  remainingUnits.forEach(u => {
    if (majorUnitsToShow.size < 3) majorUnitsToShow.add(u.apiName);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 overflow-hidden" style={{ borderLeftColor: tierColor }}>
      {/* 모바일 레이아웃 (md 미만) */}
      <div className="block md:hidden">
        <div className="p-4 space-y-4">
          {/* 상단: 티어 + 제목 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md text-white text-lg sm:text-2xl font-bold flex-shrink-0" style={{ backgroundColor: tierColor }}>
              {deck.tierRank}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
                {mainTraitName} {carryChampionName}
              </h3>
            </div>
          </div>

          {/* 특성 표시 */}
          <div className="flex flex-wrap gap-1.5">
            {displayedTraits.slice(0, 4).map(trait => (
              <Trait key={trait.apiName} trait={trait} showCount={true} />
            ))}
            {displayedTraits.length > 4 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                +{displayedTraits.length - 4}
              </span>
            )}
          </div>

          {/* 유닛 표시 */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {sortedCoreUnits.slice(0, 6).map((unit) => (
              <UnitWithItems
                key={unit.apiName || unit.name?.[lang]}
                unit={unit}
                showItems={majorUnitsToShow.has(unit.apiName)}
                lang={lang}
              />
            ))}
          </div>

          {/* 통계 (2x2 그리드) */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className={`font-bold text-sm ${getDynamicColor(deck.averagePlacement, 'averagePlacement')}`}>
                {deck.averagePlacement.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.avgPlacement')}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className={`font-bold text-sm ${getDynamicColor(parseFloat(top4Rate), 'top4Rate')}`}>
                {top4Rate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top 4</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className={`font-bold text-sm ${getDynamicColor(parseFloat(winRate), 'winRate')}`}>
                {winRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.winRate')}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{deck.totalGames}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.games')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱 레이아웃 (md 이상) */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 p-4">
        {/* 좌측: 티어 + 제목 (반응형 너비) */}
        <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0 w-48 lg:w-64 xl:w-72">
          <div className="flex items-center justify-center w-10 h-10 rounded-md text-white text-2xl font-bold" style={{ backgroundColor: tierColor }}>
            {deck.tierRank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base lg:text-lg text-gray-800 dark:text-gray-100">
              <div className="truncate">{mainTraitName}</div>
              <div className="truncate text-sm lg:text-base font-medium text-gray-600 dark:text-gray-300">
                {carryChampionName}
              </div>
            </h3>
          </div>
        </div>

        {/* 중앙: 특성 + 유닛 (유연한 너비) */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 특성 표시 */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {displayedTraits.map(trait => (
              <Trait key={trait.apiName} trait={trait} showCount={true} />
            ))}
          </div>
          
          {/* 유닛 표시 */}
          <div className="flex flex-wrap gap-1.5">
            {sortedCoreUnits.slice(0, 8).map((unit) => (
              <UnitWithItems
                key={unit.apiName || unit.name?.[lang]}
                unit={unit}
                showItems={majorUnitsToShow.has(unit.apiName)}
                lang={lang}
              />
            ))}
          </div>
        </div>

        {/* 우측: 통계 (반응형 그리드) */}
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 w-40 lg:w-72 xl:w-80 text-center">
          <div>
            <p className={`font-bold text-sm lg:text-base ${getDynamicColor(deck.averagePlacement, 'averagePlacement')}`}>
              {deck.averagePlacement.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.avgPlacement')}</p>
          </div>
          <div>
            <p className={`font-bold text-sm lg:text-base ${getDynamicColor(parseFloat(top4Rate), 'top4Rate')}`}>
              {top4Rate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Top 4</p>
          </div>
          <div>
            <p className={`font-bold text-sm lg:text-base ${getDynamicColor(parseFloat(winRate), 'winRate')}`}>
              {winRate}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.winRate')}</p>
          </div>
          <div>
            <p className="font-bold text-sm lg:text-base text-gray-800 dark:text-gray-100">{deck.totalGames}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('tierlist.games')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 메인 페이지 컴포넌트 ---
const TierListPage: React.FC = () => {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  // useDeckTiers 훅에 언어 전달
  const { data: tierData = [], isLoading, error, refetch } = useDeckTiers(lang);
  const { invalidateDeckTiers } = useCacheInvalidation();

  const handleRefresh = async (): Promise<void> => {
    await invalidateDeckTiers();
    refetch();
  };

  if (isLoading) return (
    <ResponsiveContainer maxWidth="7xl" padding="responsive">
      <TierListPageSkeleton />
    </ResponsiveContainer>
  );
  if (error) return (
    <ResponsiveContainer maxWidth="7xl" padding="responsive">
      <PageErrorMessage
        title="메타 랭킹 로딩 실패"
        message={error.message || "메타 랭킹 데이터를 불러오는 중 오류가 발생했습니다."}
        showRetry={true}
        onRetry={handleRefresh}
        variant="default"
      />
    </ResponsiveContainer>
  );

  return (
    <ResponsiveContainer maxWidth="7xl" padding="responsive">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">{t('tierlist.title')}</h1>
          <p className="text-center text-gray-500 dark:text-gray-400">{t('tierlist.subtitle')}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
          title="새로고침"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {tierData.length > 0 ? (
        <div className="flex flex-col gap-3">
          {tierData.map((deck) => <DeckCard key={deck.deckKey} deck={deck} lang={lang} />)}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          {t('tierlist.noData')}
        </div>
      )}
    </ResponsiveContainer>
  );
};

export default TierListPage;
