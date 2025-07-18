import React from 'react';
import { useTranslation, TFunction } from 'react-i18next';

interface Scores {
  metaFit: number;
  deckCompletion: number;
  itemEfficiency: number;
  total: number;
}

interface Grade {
  grade: string;
  description: string;
  color: string;
}

interface AIComments {
  summary: string;
  fullAnalysis?: string;
  scoreAnalysis?: {
    metaFit: string;
    deckCompletion: string;
    itemEfficiency: string;
  };
  keyInsights?: string[];
  improvements?: string[];
  nextSteps?: string;
}

interface RecommendedDeck {
  mainTraitName: string;
  carryChampionName: string;
  averagePlacement: number;
  winRate: number;
}

interface KeyChanges {
  missingUnits?: string[];
  extraUnits?: string[];
}

interface Recommendations {
  recommendedDeck: RecommendedDeck;
  winRateImprovement: number;
  reason: string;
  keyChanges?: KeyChanges;
}

interface Analysis {
  scores: Scores;
  grade: Grade;
  aiComments: AIComments;
  comparison?: unknown;
  recommendations?: Recommendations;
}

interface AnalysisData {
  analysis: Analysis;
}

const ReportCard: React.FC<{ analysisData: AnalysisData }> = ({ analysisData }) => {
  const { t }: { t: TFunction } = useTranslation();

  if (!analysisData || !analysisData.analysis) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">분석 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const { scores, grade, aiComments, recommendations } = analysisData.analysis;
  
  // 데이터 유효성 검증
  if (!scores || !grade) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700">분석 데이터가 불완전합니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  // 레이더 차트용 데이터 변환 (안전한 접근)
  const radarData = [
    {
      subject: '메타 적합도',
      score: scores?.metaFit || 0,
      fullMark: 100
    },
    {
      subject: '덱 완성도', 
      score: scores?.deckCompletion || 0,
      fullMark: 100
    },
    {
      subject: '아이템 효율성',
      score: scores?.itemEfficiency || 0,
      fullMark: 100
    }
  ];

  // 등급별 색상
  const getGradeColor = (gradeInfo: Grade) => {
    return gradeInfo?.color || '#6B7280';
  };

  // 점수별 색상 (레이더 차트용)
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // emerald-500
    if (score >= 60) return '#3B82F6'; // blue-500  
    if (score >= 40) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* 헤더 - 총점 및 등급 */}
      <div className="text-center border-b pb-4">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <div className="text-4xl font-bold" style={{ color: getGradeColor(grade) }}>
            {scores?.total || 0}
          </div>
          <div className="text-2xl font-bold" style={{ color: getGradeColor(grade) }}>
            {grade?.grade || 'N/A'}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {grade?.description}
        </p>
      </div>

      {/* AI 총평 */}
      {aiComments?.summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📝 AI 총평
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
            {aiComments.summary}
          </p>
        </div>
      )}

      {/* 전체 AI 분석 (상세 분석이 있는 경우) */}
      {aiComments?.fullAnalysis && aiComments.fullAnalysis !== aiComments.summary && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <details>
            <summary className="font-semibold text-purple-900 dark:text-purple-100 mb-2 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300">
              🎯 챌린저 레벨 상세 분석 (클릭하여 펼치기)
            </summary>
            <div className="mt-3 text-purple-800 dark:text-purple-200 text-sm leading-relaxed whitespace-pre-wrap border-t border-purple-200 dark:border-purple-700 pt-3">
              {aiComments.fullAnalysis}
            </div>
          </details>
        </div>
      )}

      {/* 점수 분석 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 단순 바 차트 (경고 없이) */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            📊 점수 분석
          </h3>
          <div className="space-y-4">
            {radarData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.subject}
                  </span>
                  <span className="font-bold text-lg" style={{ color: getScoreColor(item.score) }}>
                    {item.score}점
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${item.score}%`,
                      backgroundColor: getScoreColor(item.score)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 세부 점수 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📈 세부 점수
          </h3>
          
          {/* 메타 적합도 */}
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                메타 적합도
              </span>
              <span className="font-bold" style={{ color: getScoreColor(scores?.metaFit || 0) }}>
                {scores?.metaFit || 0}점
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${scores?.metaFit || 0}%`,
                  backgroundColor: getScoreColor(scores?.metaFit || 0)
                }}
              />
            </div>
          </div>

          {/* 덱 완성도 */}
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                덱 완성도
              </span>
              <span className="font-bold" style={{ color: getScoreColor(scores?.deckCompletion || 0) }}>
                {scores?.deckCompletion || 0}점
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${scores?.deckCompletion || 0}%`,
                  backgroundColor: getScoreColor(scores?.deckCompletion || 0)
                }}
              />
            </div>
          </div>

          {/* 아이템 효율성 */}
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                아이템 효율성
              </span>
              <span className="font-bold" style={{ color: getScoreColor(scores?.itemEfficiency || 0) }}>
                {scores?.itemEfficiency || 0}점
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${scores?.itemEfficiency || 0}%`,
                  backgroundColor: getScoreColor(scores?.itemEfficiency || 0)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI 항목별 분석 */}
      {aiComments?.scoreAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-sm">
              메타 적합도 분석
            </h4>
            <p className="text-green-800 dark:text-green-200 text-xs">
              {aiComments.scoreAnalysis.metaFit}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
              덱 완성도 분석
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-xs">
              {aiComments.scoreAnalysis.deckCompletion}
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 text-sm">
              아이템 효율성 분석
            </h4>
            <p className="text-purple-800 dark:text-purple-200 text-xs">
              {aiComments.scoreAnalysis.itemEfficiency}
            </p>
          </div>
        </div>
      )}

      {/* 핵심 인사이트 */}
      {aiComments?.keyInsights && aiComments.keyInsights.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
            💡 핵심 인사이트
          </h3>
          <ul className="space-y-2">
            {aiComments.keyInsights.map((insight, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                  {insight}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 개선점 */}
      {aiComments?.improvements && aiComments.improvements.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">
            🔧 개선점
          </h3>
          <ul className="space-y-2">
            {aiComments.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                <span className="text-orange-800 dark:text-orange-200 text-sm">
                  {improvement}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 챌린저의 추천 (성장 가이드) */}
      {recommendations && recommendations.recommendedDeck && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
            🚀 챌린저의 추천
            <span className="ml-2 text-xs bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
              승률 +{recommendations.winRateImprovement?.toFixed(1)}%
            </span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 추천 덱 정보 */}
            <div>
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                추천 덱: {recommendations.recommendedDeck.mainTraitName} {recommendations.recommendedDeck.carryChampionName}
              </h4>
              <p className="text-purple-700 dark:text-purple-300 text-sm mb-2">
                {recommendations.reason}
              </p>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                평균 등수: {recommendations.recommendedDeck.averagePlacement?.toFixed(2)}
                | 승률: {recommendations.recommendedDeck.winRate?.toFixed(1)}%
              </div>
            </div>

            {/* 핵심 변경사항 */}
            {recommendations.keyChanges && (
              <div>
                <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                  핵심 변경사항
                </h4>
                {recommendations.keyChanges.missingUnits?.length > 0 && (
                  <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                    <span className="font-medium">추가 유닛:</span> {recommendations.keyChanges.missingUnits.slice(0, 3).join(', ')}
                  </div>
                )}
                {recommendations.keyChanges.extraUnits?.length > 0 && (
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    <span className="font-medium">제거 유닛:</span> {recommendations.keyChanges.extraUnits.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 다음 게임 가이드 */}
      {aiComments?.nextSteps && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
            🎯 다음 게임 가이드
          </h3>
          <p className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
            {aiComments.nextSteps}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportCard;