// frontend/src/pages/summoner/components/MatchCard.jsx

import React from 'react';
import Trait from './Trait';
import Unit from './Unit';
import MatchDetailContent from './MatchDetailContent';

const getPlacementColor = p => (p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280');

const MatchCard = ({ match, onToggle, isExpanded }) => {
  // 안전한 기본값 설정
  if (!match) {
    return <div className="text-center text-text-secondary dark:text-dark-text-secondary p-4">매치 데이터를 불러올 수 없습니다.</div>;
  }

  const traits = match.traits || [];
  const units = match.units || [];

  return (
    <div className="relative bg-background-card dark:bg-dark-background-card border-l-4 rounded-lg p-4 mb-4 shadow-md overflow-hidden"
      style={{ borderLeftColor: getPlacementColor(match.placement) }}>
      <div className="flex gap-4 items-center">
        <div className="flex-shrink-0 w-20 text-center flex flex-col gap-0.5">
          <div className="text-lg font-bold" style={{ color: getPlacementColor(match.placement) }}>#{match.placement || 'N/A'}</div>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">레벨 {match.level || 'N/A'}</p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {match.game_datetime ? new Date(match.game_datetime).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-1.5 items-center">
              {traits
                .filter(t => t && t.style !== 'inactive')
                .sort((a, b) => (b.styleOrder || 0) - (a.styleOrder || 0))
                .map((trait) => (
                  trait ? <Trait key={trait.apiName || trait.name} trait={trait} showCount={true} /> : null
                ))}
            </div>
            <button 
              onClick={() => onToggle(match.matchId)} 
              className="cursor-pointer bg-transparent border-none p-2 text-2xl transition-transform duration-200 text-text-secondary dark:text-dark-text-secondary" 
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} 
              title={isExpanded ? '간략히' : '상세보기'}
            >
              ▼
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {units.map((u, idx) => u && u.image_url &&
              <Unit key={idx} unit={u} isCompact={false} />
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border-light dark:border-dark-border-light pt-4 mt-4">
          <MatchDetailContent
            matchId={match.matchId}
            userPuuid={match.puuid}
            isCompact={true}
          />
        </div>
      )}
    </div>
  );
};

export default MatchCard;