/**
 * SummonerPage - GraphQL 버전
 * REST API 대신 GraphQL 통합 쿼리를 사용하여 성능 최적화
 * 네트워크 요청: 3-4개 → 1개로 감소
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSummonerIntegrated, handleGraphQLError } from '../../hooks/useGraphQLQueries';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { useTFTData } from '../../context/TFTDataContext';
import ResponsiveContainer, { ResponsiveGrid } from '../../components/common/ResponsiveContainer';
import { SummonerPageSkeleton } from '../../components/common/TFTSkeletons';

import ProfileHeader from './components/ProfileHeader';
import RankedStats from './components/RankedStats';
import LpGraph from './components/LpGraph';
import MatchCard from './components/MatchCard';

interface SummonerPageGraphQLProps {
  isDarkMode: boolean;
}

const SummonerPageGraphQL: React.FC<SummonerPageGraphQLProps> = ({ isDarkMode }) => {
  const { region, summonerName } = useParams<{ region: string; summonerName: string }>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshCooldownMessage, setRefreshCooldownMessage] = useState<string | null>(null);
  
  // TFT 정적 데이터 (챔피언 정보, 아이템 정보 등)
  const { champions, allItems } = useTFTData();
  
  // URL에서 서머너 정보 추출
  const summonerFullName = useMemo(() => {
    if (!summonerName) return '';
    return decodeURIComponent(summonerName);
  }, [summonerName]);
  
  usePerformanceMonitor('SummonerPageGraphQL', {
    threshold: 50,
    trackReRenders: true,
    trackMemory: true
  });
  
  const handleError = useCallback((error: any) => {
    const errorInfo = handleGraphQLError(error);
    
    if (errorInfo.type === 'RATE_LIMIT') {
      setRefreshCooldownMessage(errorInfo.message);
    } else {
      console.error('소환사 데이터 조회 에러:', errorInfo);
    }
  }, []);

  // 🚀 GraphQL 통합 쿼리 - 단일 요청으로 모든 데이터 조회
  const { 
    data: apiResponse,
    isLoading,
    error,
    refetch,
    summoner,
    matches,
    leagueEntries,
    success,
    meta
  } = useSummonerIntegrated(
    summonerFullName,
    region || 'kr',
    10, // 최근 10경기
    {
      enabled: !!(region && summonerFullName),
      onError: handleError,
    }
  );

  // 데이터 변환 (기존 컴포넌트와 호환성 유지)
  const transformedData = useMemo(() => {
    if (!summoner || !success) return null;

    // GraphQL 응답을 기존 컴포넌트가 예상하는 형태로 변환
    return {
      account: {
        puuid: summoner.puuid || '',
        gameName: summoner.name?.split('#')[0] || '',
        tagLine: summoner.name?.split('#')[1] || '',
        summonerId: summoner.summonerId || '',
        profileIconId: summoner.profileIconId || 0,
        summonerLevel: summoner.summonerLevel || 1
      },
      league: leagueEntries?.[0] || {
        tier: summoner.tier || 'UNRANKED',
        rank: summoner.rank || '',
        leaguePoints: summoner.leaguePoints || 0,
        wins: summoner.wins || 0,
        losses: summoner.losses || 0,
        hotStreak: false,
        veteran: false,
        freshBlood: false,
        inactive: false
      },
      matches: matches?.map(match => ({
        matchId: match.gameId,
        gameId: match.gameId,
        gameDateTime: match.gameDateTime,
        game_datetime: match.gameDateTime, // MatchCard가 기대하는 필드명
        queueType: match.queueType,
        placement: match.placement,
        level: match.level || 1, // 백엔드에서 받은 실제 레벨 데이터 사용
        totalDamageToPlayers: match.totalDamageToPlayers,
        // 백엔드에서 이미 완전한 데이터를 제공하므로 단순 전달
        traits: match.traits || [],
        units: match.units || [],
        companionData: match.companionData,
        puuid: summoner.puuid
      })) || []
    };
  }, [summoner, matches, leagueEntries, success]);

  const fetchData = useCallback(async (force = false) => {
    setRefreshCooldownMessage(null);
    
    if (!region || !summonerFullName) return;

    try {
      await refetch();
    } catch (e: any) {
      const errorInfo = handleGraphQLError(e);
      if (errorInfo.type === 'RATE_LIMIT') {
        setRefreshCooldownMessage(errorInfo.message);
      }
    }
  }, [region, summonerFullName, refetch]);

  // 로딩 상태
  if (isLoading && !transformedData) {
    return (
      <ResponsiveContainer maxWidth="5xl" padding="responsive">
        <SummonerPageSkeleton />
      </ResponsiveContainer>
    );
  }

  // 에러 상태
  if (error && !transformedData) {
    const errorInfo = handleGraphQLError(error);
    return (
      <ResponsiveContainer maxWidth="5xl" padding="responsive">
        <div className="text-error-red text-center p-8 bg-background-card dark:bg-dark-background-card rounded-lg shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">오류가 발생했습니다</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {errorInfo.message}
            </p>
          </div>
          
          {/* 개발 환경에서 상세 에러 정보 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left">
              <summary className="cursor-pointer font-semibold text-sm">
                개발자 정보 (상세 에러)
              </summary>
              <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
          
          <button 
            onClick={() => fetchData(true)}
            className="mt-4 px-4 py-2 bg-primary-blue text-white rounded hover:bg-primary-blue-dark transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '재시도 중...' : '다시 시도'}
          </button>
        </div>
      </ResponsiveContainer>
    );
  }

  // 데이터 없음
  if (!transformedData) {
    return (
      <div className="text-gray-500 text-center p-8 bg-background-card dark:bg-dark-background-card rounded-lg">
        소환사 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer maxWidth="5xl" padding="responsive" containerQuery={true}>
      {() => (
        <>
          {/* 성능 개선 정보 표시 (개발 환경에서만) */}
          {process.env.NODE_ENV === 'development' && meta && (
            <div className="mb-4 p-2 bg-green-100 dark:bg-green-900 rounded text-sm">
              ⚡ GraphQL 최적화: 처리시간 {meta.processingTime}ms, 
              네트워크 요청 1개 (기존 3-4개에서 75% 감소)
            </div>
          )}

          <ProfileHeader
            account={transformedData.account}
            region={region!}
            onRefresh={() => fetchData(true)}
            isRefreshing={isLoading}
            refreshCooldownMessage={refreshCooldownMessage}
          />
          
          <ResponsiveGrid cols={{ base: 1, lg: 3 }} gap={6} className="mb-6">
            <div className="lg:col-span-1 bg-background-card dark:bg-dark-background-card rounded-lg border border-border-light dark:border-dark-border-light shadow-lg">
              <RankedStats
                league={transformedData.league}
                matches={transformedData.matches}
              />
            </div>
            <div className="lg:col-span-2 bg-background-card dark:bg-dark-background-card rounded-lg border border-border-light dark:border-dark-border-light shadow-lg">
              <LpGraph lpHistory={null} isDarkMode={isDarkMode} />
            </div>
          </ResponsiveGrid>
          
          {transformedData.matches && transformedData.matches.length > 0 && (
            <div className="flex flex-col gap-3 relative z-10"> 
              {transformedData.matches.map(match => (
                <MatchCard
                  key={match.matchId}
                  match={match} 
                  onToggle={(id: string) => setExpanded(prev => (prev === id ? null : id))}
                  isExpanded={expanded === match.matchId}
                />
              ))}
            </div>
          )}

          {/* 개발 환경에서 GraphQL 응답 디버깅 */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <summary className="cursor-pointer font-semibold">
                GraphQL 응답 디버깅 (개발용)
              </summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify({ success, meta, summoner, matches: matches?.length }, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </ResponsiveContainer>
  );
};

export default SummonerPageGraphQL;