import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTFTData } from '../context/TFTDataContext';
import { useTraitProcessing } from '../hooks/useTraitProcessing';
import Trait from '../pages/summoner/components/Trait'; // Trait 컴포넌트 임포트
import { safeProcessImagePath } from '../utils/imageUtils';

// Deck prop의 타입을 정의하는 인��페이스
interface Deck {
  coreUnits: {
    apiName: string;
  }[];
  tierRank: string;
  totalGames: number;
  top4Count: number;
  carryChampionName: string | { ko: string };
  mainTraitName: string | { ko: string };
}

const getTierColor = (tierRank: string) => {
  const colorMap: { [key: string]: string } = { S: '#E13434', A: '#B45AF3', B: '#2C98F0', C: '#20B359', D: '#9E9E9E' };
  return colorMap[tierRank] || '#6E6E6E';
};

const MetaTrendCard: React.FC<{ deck: Deck }> = ({ deck }) => {
  const { champions } = useTFTData();
  const navigate = useNavigate();
  
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
  
  const { processedTraits } = useTraitProcessing(unitsWithTraits);
  const tierColor = getTierColor(deck.tierRank);
  const top4Rate = deck.totalGames > 0 ? ((deck.top4Count / deck.totalGames) * 100).toFixed(1) : "0.0";

  // 캐리 챔피언 찾기 - 데이터 구조에 따른 처리
  const carryChampionName = typeof deck.carryChampionName === 'string' 
    ? deck.carryChampionName 
    : deck.carryChampionName?.ko;
  const carryChampion = champions.find(c => c.name === carryChampionName);
  
  if (import.meta.env.DEV) {
    console.log('🔍 MetaTrendCard 디버깅:', {
      carryChampionName,
      carryChampion: carryChampion ? {
        name: carryChampion.name,
        tileIcon: carryChampion.tileIcon,
        image_url: carryChampion.image_url
      } : null
    });
  }
  
  const carryChampionImageUrl = carryChampion ? safeProcessImagePath(carryChampion.tileIcon || carryChampion.image_url) : 'https://via.placeholder.com/64';

  const handleClick = () => {
    navigate('/tierlist');
  };

  // 활성화된 특성만 필터링 및 정렬
  const activeTraits = processedTraits
    .filter(trait => trait.isActive)
    .sort((a, b) => b.styleOrder - a.styleOrder);

  return (
    <div 
      className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md flex items-center gap-4 cursor-pointer" 
      style={{ border: `2px solid ${tierColor}` }}
      onClick={handleClick}
    >
      <div className="flex-shrink-0">
        <img 
          src={carryChampionImageUrl} 
          alt={carryChampionName} 
          className="w-16 h-16 rounded-full border-2 border-brand-mint"
        />
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-lg text-text-primary dark:text-dark-text-primary leading-tight">[{deck.tierRank}] {typeof deck.mainTraitName === 'string' ? deck.mainTraitName : deck.mainTraitName?.ko} {carryChampionName}</h4>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">순방률: <span className="font-semibold text-brand-mint">{top4Rate}%</span></p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {activeTraits.map((trait) => (
            <Trait key={trait.apiName} trait={trait} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetaTrendCard;