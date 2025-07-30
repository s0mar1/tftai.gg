/**
 * 매치 분석 진행상황 컴포넌트
 * GraphQL Subscription을 사용한 선택적 실시간 기능
 * 사용자 경험을 고려하여 조용하고 부드러운 인터페이스
 */

import React, { useState, useEffect } from 'react';
import { useMatchAnalysisProgress } from '../../hooks/useGraphQLQueries';

interface MatchAnalysisProgressProps {
  matchId: string;
  userPuuid: string;
  onComplete?: (analysisData: any) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
}

const MatchAnalysisProgress: React.FC<MatchAnalysisProgressProps> = ({
  matchId,
  userPuuid,
  onComplete,
  onError,
  enabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // 🚀 GraphQL Subscription - 선택적 실시간 기능
  const {
    data: progressData,
    isLoading,
    error,
    eventType,
    progress,
    message,
    analysisData
  } = useMatchAnalysisProgress(matchId, userPuuid, {
    enabled: enabled && hasStarted
  });

  // 분석이 시작되면 진행바 표시
  useEffect(() => {
    if (eventType === 'MATCH_ANALYSIS_STARTED') {
      setHasStarted(true);
      setIsVisible(true);
    }
  }, [eventType]);

  // 분석 완료 처리
  useEffect(() => {
    if (eventType === 'MATCH_ANALYSIS_COMPLETED') {
      onComplete?.(analysisData);
      
      // 3초 후 진행바 숨김
      setTimeout(() => {
        setIsVisible(false);
        setHasStarted(false);
      }, 3000);
    }
  }, [eventType, analysisData, onComplete]);

  // 에러 처리
  useEffect(() => {
    if (eventType === 'MATCH_ANALYSIS_FAILED' || error) {
      onError?.(error);
      
      // 5초 후 진행바 숨김
      setTimeout(() => {
        setIsVisible(false);
        setHasStarted(false);
      }, 5000);
    }
  }, [eventType, error, onError]);

  // 진행상황 표시가 필요없거나 비활성화된 경우
  if (!enabled || !isVisible) {
    return null;
  }

  const progressPercentage = progress || 0;
  const currentMessage = message || '매치 분석 중...';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-slide-in-right">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              eventType === 'MATCH_ANALYSIS_COMPLETED' ? 'bg-green-500' :
              eventType === 'MATCH_ANALYSIS_FAILED' ? 'bg-red-500' :
              'bg-blue-500 animate-pulse'
            }`} />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {eventType === 'MATCH_ANALYSIS_COMPLETED' ? '분석 완료' :
               eventType === 'MATCH_ANALYSIS_FAILED' ? '분석 실패' :
               'AI 매치 분석'}
            </h3>
          </div>
          
          {/* 닫기 버튼 */}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 진행상황 바 */}
        {eventType !== 'MATCH_ANALYSIS_COMPLETED' && eventType !== 'MATCH_ANALYSIS_FAILED' && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {currentMessage}
              </span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* 완료/실패 메시지 */}
        {eventType === 'MATCH_ANALYSIS_COMPLETED' && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✅ 매치 분석이 완료되었습니다!
          </div>
        )}

        {eventType === 'MATCH_ANALYSIS_FAILED' && (
          <div className="text-sm text-red-600 dark:text-red-400">
            ❌ 분석 중 오류가 발생했습니다.
          </div>
        )}

        {/* 매치 정보 (작은 글씨로) */}
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            매치 ID: {matchId.substring(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 매치 분석 시작 버튼 컴포넌트
 * 사용자가 원할 때만 분석을 시작하는 선택적 기능
 */
interface MatchAnalysisButtonProps {
  matchId: string;
  userPuuid: string;
  onAnalysisStart?: () => void;
  disabled?: boolean;
  className?: string;
}

export const MatchAnalysisButton: React.FC<MatchAnalysisButtonProps> = ({
  matchId,
  userPuuid,
  onAnalysisStart,
  disabled = false,
  className = ""
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const handleStartAnalysis = async () => {
    if (disabled || isAnalyzing) return;

    setIsAnalyzing(true);
    setShowProgress(true);
    onAnalysisStart?.();

    // 여기서 실제 매치 분석 뮤테이션을 호출
    // const { analyze } = useMatchAnalysis();
    // await analyze(matchId, userPuuid);
  };

  const handleAnalysisComplete = (analysisData: any) => {
    setIsAnalyzing(false);
    console.log('매치 분석 완료:', analysisData);
  };

  const handleAnalysisError = (error: any) => {
    setIsAnalyzing(false);
    console.error('매치 분석 실패:', error);
  };

  return (
    <>
      <button
        onClick={handleStartAnalysis}
        disabled={disabled || isAnalyzing}
        className={`
          inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md
          transition-colors duration-200
          ${isAnalyzing 
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
          }
          ${className}
        `}
        title={isAnalyzing ? '분석 중...' : 'AI 매치 분석 시작'}
      >
        {isAnalyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            분석 중...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI 분석
          </>
        )}
      </button>

      {/* 실시간 진행상황 표시 */}
      <MatchAnalysisProgress
        matchId={matchId}
        userPuuid={userPuuid}
        enabled={showProgress}
        onComplete={handleAnalysisComplete}
        onError={handleAnalysisError}
      />
    </>
  );
};

export default MatchAnalysisProgress;