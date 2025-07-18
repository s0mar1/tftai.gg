import React from 'react';
import classNames from 'classnames';

interface League {
  tier: string;
  leaguePoints: number;
}

interface Match {
  placement: number;
}

interface RankedStatsProps {
  league: League | null;
  matches: Match[];
}

interface StatData {
  label: string;
  value: string | number;
}

const tierColors: Record<string, string> = {
    CHALLENGER: 'text-brand-mint', 
    GRANDMASTER: 'text-error-red', 
    MASTER: 'text-purple-500',
    DIAMOND: 'text-blue-400', 
    EMERALD: 'text-emerald-400', 
    PLATINUM: 'text-teal-400',
    GOLD: 'text-yellow-500', 
    SILVER: 'text-slate-400', 
    BRONZE: 'text-orange-400',
    IRON: 'text-text-secondary dark:text-dark-text-secondary', 
    UNRANKED: 'text-text-secondary dark:text-dark-text-secondary',
};

const formatTierForURL = (tier: string | undefined): string => {
    if (!tier || typeof tier !== 'string') return 'Iron';
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
};

const RankedStats: React.FC<RankedStatsProps> = ({ league, matches }) => {
  if (!league || !matches || matches.length === 0) {
    return (
      <div className="bg-background-card dark:bg-dark-background-card rounded-lg shadow-md">
        <h3 className="text-sm font-bold p-3 text-text-primary dark:text-dark-text-primary border-b border-border-light dark:border-dark-border-light">랭크게임 통계</h3>
        <div className="p-5 text-text-secondary dark:text-dark-text-secondary">
          최근 랭크 게임 기록이 없습니다.
        </div>
      </div>
    );
  }

  const total = matches.length;
  const wins  = matches.filter(m => m.placement === 1).length;
  const top4  = matches.filter(m => m.placement <= 4).length;
  const avg   = (matches.reduce((s, m) => s + m.placement, 0) / total).toFixed(2);
  const winRate = ((wins / total) * 100).toFixed(1);
  const top4Rate = ((top4 / total) * 100).toFixed(1);

  const tier = league.tier.toUpperCase();
  const formattedTier = formatTierForURL(league.tier);
  const LATEST_DDRAGON_VERSION = '14.12.1';
  const tierIconSrc = `https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/img/tft-regalia/TFT_Regalia_${formattedTier}.png`;
  const colorClass = tierColors[tier] || tierColors.UNRANKED;

  const statsData: StatData[] = [
    { label: '승리', value: wins }, { label: '승률', value: `${winRate}%` },
    { label: 'Top4', value: top4 }, { label: 'Top4 비율', value: `${top4Rate}%` },
    { label: '게임 수', value: total }, { label: '평균 등수', value: `#${avg}` },
  ];

  return (
    <div className="bg-background-card dark:bg-dark-background-card rounded-lg shadow-md text-text-primary dark:text-dark-text-primary">
      <h3 className="text-sm font-bold p-3 border-b border-border-light dark:border-dark-border-light">랭크게임 통계</h3>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4 mb-4">
          <img src={tierIconSrc} alt={league.tier} className="w-16 h-16" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <div className={classNames('text-xl font-bold', colorClass)}>{league.tier}</div>
            <div className="text-base font-semibold">{league.leaguePoints.toLocaleString()} LP</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">상위 0.0001% | 1위 (API 추가 필요)</div>
          </div>
        </div>
        <div className="border-b border-border-light dark:border-dark-border-light -mx-5 mb-4"></div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
          {statsData.map(stat => (
            <div key={stat.label} className="flex flex-col items-start gap-1">
              <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{stat.label}</span>
              <span className="text-sm font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RankedStats;
