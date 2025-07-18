// frontend/src/pages/summoner/components/MatchDetailContent.jsx

import React, { useState, useEffect } from 'react';
import { api } from '../../../utils/fetchApi';
import Trait from './Trait';
import Unit from './Unit';
import ReportCard from '../../../components/summoner/ReportCard';

const getPlacementColor = p => (p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280');

const AIAnalysisView = ({ matchId, userPuuid }) => {
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    useEffect(() => {
        const fetchAiAnalysis = async () => {
            setAiLoading(true);
            setAiError(null);
            try {
                const response = await api.post('/api/ai/analyze', {
                    matchId: matchId,
                    userPuuid: userPuuid,
                }, {
                    timeout: 120000  // 2분으로 타임아웃 증가
                });
                console.log('AI 분석 응답:', response);
                console.log('ReportCard에 전달할 데이터:', response);
                setAiAnalysis(response);
            } catch (err) {
                setAiError(err.response?.data?.error || err.message || 'AI 분석을 불러오는데 실패했습니다.');
            } finally {
                setAiLoading(false);
            }
        };
        fetchAiAnalysis();
    }, [matchId, userPuuid]);

    return (
        <div className="mt-4">
            {aiLoading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">AI가 경기를 분석 중입니다...</span>
                </div>
            )}
            
            {aiError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <div className="flex items-center">
                        <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                        <p className="text-red-700 dark:text-red-300">AI 분석 오류: {aiError}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setAiError(null);
                            setAiAnalysis(null);
                        }}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                    >
                        다시 시도
                    </button>
                </div>
            )}
            
            {aiAnalysis && !aiLoading && !aiError && (
                <ReportCard analysisData={aiAnalysis} />
            )}
            
            {!aiAnalysis && !aiLoading && !aiError && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 text-center">
                    <div className="text-blue-600 dark:text-blue-400 text-2xl mb-2">🤖</div>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                        매치 분석을 위해 AI 피드백을 요청합니다.
                    </p>
                </div>
            )}
        </div>
    );
};

const MatchDetailContent = ({ matchId, userPuuid, isCompact = false }) => { // isCompact prop을 받도록 추가
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get(`/api/matches/${matchId}`);
        setDetail(r);
      } catch (e) { setError(e.response?.data?.error || e.message); }
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [matchId]);

  const PlayerCard = ({ participant }) => {
    const acct = detail?.info?.accounts?.[participant.puuid];
    
    // 특성 데이터 필터링 및 정렬 (활성화된 특성만, 스타일 순서로 정렬)
    const traits = (participant.traits || [])
      .filter(t => t && t.style !== 'inactive' && t.style !== 'none')
      .sort((a, b) => (b.styleOrder || 0) - (a.styleOrder || 0));
    
    
    return (
      <div className="flex gap-4 items-center bg-background-card dark:bg-dark-background-card p-4 border-b border-border-light dark:border-dark-border-light">
        {/* 플레이어 정보 */}
        <div className="flex-shrink-0 w-20 text-center flex flex-col gap-0.5">
          <div className="text-lg font-bold" style={{ color: getPlacementColor(participant.placement) }}>
            #{participant.placement}
          </div>
          <div className="font-semibold text-xs text-text-secondary dark:text-dark-text-secondary break-all">
            {acct?.gameName || 'Unknown'}
          </div>
          <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
            레벨 {participant.level || 'N/A'}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          {/* 특성 표시 (서머너 매치카드와 동일한 스타일) */}
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-1.5 items-center">
              {traits.map((trait, i) => 
                trait ? <Trait key={trait.apiName || i} trait={trait} showCount={true} /> : null
              )}
            </div>
          </div>
          
          {/* 유닛 표시 (서머너 매치카드와 동일한 스타일) */}
          <div className="flex flex-wrap gap-1.5">
            {participant.units
              .filter(u => u && u.image_url)
              .map((u, idx) => <Unit key={idx} unit={u} isCompact={false} />)
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-4 border-b border-border-light dark:border-dark-border-light mb-4">
        <button
          className={`px-4 py-2 font-bold ${tab === 'info' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'}`}
          onClick={() => setTab('info')}
        >
          종합 정보
        </button>
        <button
          className={`px-4 py-2 font-bold ${tab === 'ai' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'}`}
          onClick={() => setTab('ai')}
        >
          AI 분석
        </button>
      </div>
      {tab === 'info' && (
        loading ? <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">상세 정보 로딩 중...</div>
        : error ? <div className="text-error-red text-center p-8 bg-background-card dark:bg-dark-background-card rounded-lg">{error}</div>
        : (<div>{detail?.info?.participants.sort((a, b) => a.placement - b.placement).map(p => <PlayerCard key={p.puuid} participant={p} />)}</div>)
      )}
      {tab === 'ai' && (<AIAnalysisView matchId={matchId} userPuuid={userPuuid} />)}
    </div>
  );
};

export default MatchDetailContent;