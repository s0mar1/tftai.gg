import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSummonerData, useMatchHistory } from '../../hooks/useQuery';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import ResponsiveContainer, { ResponsiveGrid } from '../../components/common/ResponsiveContainer';
import { SummonerPageSkeleton } from '../../components/common/TFTSkeletons';
import { SummonerData, Match } from '../../types';

import ProfileHeader from './components/ProfileHeader';
import RankedStats from './components/RankedStats';
import LpGraph from './components/LpGraph';
import MatchCard from './components/MatchCard';

interface SummonerPageProps {
  isDarkMode: boolean;
}

const SummonerPage: React.FC<SummonerPageProps> = ({ isDarkMode }) => {
  const { region, summonerName } = useParams<{ region: string; summonerName: string }>();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshCooldownMessage, setRefreshCooldownMessage] = useState<string | null>(null);
  
  // URL에서 서머너 정보 추출
  let gameName = '';
  let tagLine = '';
  
  if (summonerName) {
    const decodedSummonerName = decodeURIComponent(summonerName);
    const parts = decodedSummonerName.split('#');
    if (parts.length === 2) {
      gameName = parts[0];
      tagLine = parts[1];
    }
  }
  
  
  usePerformanceMonitor('SummonerPage', {
    threshold: 50,
    trackReRenders: true,
    trackMemory: true
  });
  
  const handleSummonerError = useCallback((error: any) => {
    if (error.response?.status === 429) {
      setRefreshCooldownMessage('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }
  }, []);

  const { 
    data: summonerApiResponse, 
    isLoading: summonerLoading,
    error: summonerError,
    refetch: refetchSummoner,
    isRefetching: isRefetchingSummoner
  } = useSummonerData(region!, gameName!, tagLine!, {
    enabled: !!(region && gameName && tagLine),
    onError: handleSummonerError,
  });
  const summonerData = summonerApiResponse?.data;
  

  const { 
    data: matchApiResponse, 
    isLoading: matchLoading,
    error: matchError,
    refetch: refetchMatches,
    isRefetching: isRefetchingMatches
  } = useMatchHistory(region!, summonerData?.account?.puuid!, {
    enabled: !!(region && summonerData?.account?.puuid),
  });
  const matchData = matchApiResponse?.data;
  
  // console.log('SummonerPage: 매치 데이터:', { matchLoading, matchError, matchData, matchEnabled: !!(region && summonerData?.account?.puuid) });
  
  const loading = summonerLoading || matchLoading;
  const error = summonerError || matchError;
  const isRefetching = isRefetchingSummoner || isRefetchingMatches;
  
  const data: (SummonerData & { matches: Match[] }) | null = useMemo(() => {
    // 완전한 방어적 프로그래밍
    try {
      // matchData를 안전하게 처리하기 위한 변수들
      let safeMatchData: any = null;
      let matchDataDebugInfo: any = {};
      
      // matchData 안전성 검사
      try {
        safeMatchData = matchData;
        matchDataDebugInfo = {
          exists: matchData !== null && matchData !== undefined,
          type: typeof matchData,
          isArray: Array.isArray(matchData),
          constructor: matchData?.constructor?.name,
          keys: matchData && typeof matchData === 'object' ? Object.keys(matchData) : 'not an object',
          hasMatches: matchData && typeof matchData === 'object' && 'matches' in matchData,
          stringified: JSON.stringify(matchData)?.substring(0, 100) + '...'
        };
      } catch (error) {
        console.error('Error accessing matchData:', error);
        safeMatchData = null;
        matchDataDebugInfo = { error: error.message };
      }
      
      console.log('SummonerPage data processing:', {
        summonerData: !!summonerData,
        summonerDataExists: summonerData !== null && summonerData !== undefined,
        hasAccount: !!summonerData?.account,
        matchDataDebugInfo
      });
      
      // summonerData가 있고 account가 있는 경우에만 처리
      if (summonerData && summonerData.account) {
        // matchData가 배열인지 확인
        if (safeMatchData && Array.isArray(safeMatchData)) {
          try {
            const processedMatches = safeMatchData.map((match: any) => ({
              ...match,
              puuid: summonerData.account.puuid
            }));
            
            console.log('Successfully processed matches:', processedMatches.length);
            return {
              ...summonerData,
              matches: processedMatches
            };
          } catch (mapError) {
            console.error('Error during match processing:', mapError);
            console.error('Match data that caused error:', safeMatchData);
            return {
              ...summonerData,
              matches: []
            };
          }
        } else {
          // matchData가 배열이 아닌 경우
          console.warn('matchData is not an array, returning empty matches');
          return {
            ...summonerData,
            matches: []
          };
        }
      }
      
      // summonerData가 없거나 account가 없는 경우
      return summonerData ? { ...summonerData, matches: [] } : null;
    } catch (error) {
      console.error('Critical error in data processing:', error);
      return summonerData ? { ...summonerData, matches: [] } : null;
    }
  }, [summonerData, matchData]);

  const fetchData = async (force = false) => {
    setRefreshCooldownMessage(null);
    if (!region || !gameName || !tagLine) return;

    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: ['summoner', region, gameName, tagLine] });
        if (summonerData?.account?.puuid) {
          await queryClient.invalidateQueries({ queryKey: ['matches', region, summonerData.account.puuid] });
        }
      }
      
      await Promise.all([
        refetchSummoner(),
        summonerData?.account?.puuid ? refetchMatches() : Promise.resolve()
      ]);
    } catch (e: any) {
      if (e.response?.status === 429) {
        setRefreshCooldownMessage(e.message || '쿨타임 중입니다.');
      }
    }
  };

  // console.log('SummonerPage: 최종 상태:', { loading, error, data, hasData: !!data });

  if (loading && !data) {
    // console.log('SummonerPage: 스켈레톤 표시 중');
    return <ResponsiveContainer maxWidth="5xl" padding="responsive"><SummonerPageSkeleton /></ResponsiveContainer>;
  }
  if (error && !data) {
    // console.log('SummonerPage: 에러 표시:', error);
    return <div className="text-error-red text-center p-8 bg-background-card dark:bg-dark-background-card rounded-lg">{error.message}</div>;
  }
  if (!data) {
    // console.log('SummonerPage: 데이터 없음으로 null 반환');
    return null;
  }

  return (
    <ResponsiveContainer maxWidth="5xl" padding="responsive" containerQuery={true}>
      {() => (
        <>
          <ProfileHeader
            account={data.account}
            region={region!}
            onRefresh={() => fetchData(true)}
            isRefreshing={isRefetching}
            refreshCooldownMessage={refreshCooldownMessage}
          />
          <ResponsiveGrid cols={{ base: 1, lg: 3 }} gap={6} className="mb-6">
            <div className="lg:col-span-1 bg-background-card dark:bg-dark-background-card rounded-lg border border-border-light dark:border-dark-border-light shadow-lg">
              <RankedStats
                league={data.league}
                matches={data.matches || []}
              />
            </div>
            <div className="lg:col-span-2 bg-background-card dark:bg-dark-background-card rounded-lg border border-border-light dark:border-dark-border-light shadow-lg">
              <LpGraph lpHistory={null} isDarkMode={isDarkMode} />
            </div>
          </ResponsiveGrid>
          
          {data.matches && data.matches.length > 0 && (
            <div className="flex flex-col gap-3 relative z-10"> 
              {data.matches.map(m => (
                <MatchCard
                  key={m.matchId}
                  match={m} 
                  onToggle={(id: string) => setExpanded(prev => (prev === id ? null : id))}
                  isExpanded={expanded === m.matchId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </ResponsiveContainer>
  );
}

export default SummonerPage;