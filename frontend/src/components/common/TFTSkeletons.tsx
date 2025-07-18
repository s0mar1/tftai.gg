import React from 'react';
import { SkeletonCircle, SkeletonText, SkeletonRectangle } from './Skeleton';

// 챔피언 카드 스켈레톤
export const ChampionCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative flex flex-col items-center gap-1 w-14 ${className}`}>
    <SkeletonRectangle width={48} height={48} className="rounded-md" />
    <div className="flex justify-center items-center h-4 gap-px mt-0.5">
      <SkeletonCircle width={16} height={16} />
      <SkeletonCircle width={16} height={16} />
      <SkeletonCircle width={16} height={16} />
    </div>
    <SkeletonText width="100%" height={12} />
  </div>
);

// 특성 아이콘 스켈레톤
export const TraitIconSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    <SkeletonCircle width={32} height={32} />
    <SkeletonText width={24} height={14} />
  </div>
);

// 덱 카드 스켈레톤
export const DeckCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-gray-300 dark:border-gray-600 ${className}`}>
    {/* 티어 랭크 */}
    <div className="flex items-center gap-4 flex-shrink-0 w-64">
      <SkeletonRectangle width={40} height={40} className="rounded-md" />
      <div className="space-y-2">
        <SkeletonText width={120} height={20} />
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4].map((i) => (
            <TraitIconSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>

    {/* 챔피언들 */}
    <div className="flex-grow flex items-start gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ChampionCardSkeleton key={i} />
      ))}
    </div>

    {/* 통계 */}
    <div className="flex-shrink-0 grid grid-cols-4 gap-3 w-80 text-center">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1">
          <SkeletonText width={48} height={16} className="mx-auto" />
          <SkeletonText width={60} height={12} className="mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

// 매치 카드 스켈레톤
export const MatchCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative bg-white dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md ${className}`}>
    <div className="flex gap-4 items-center">
      {/* 등수 정보 */}
      <div className="flex-shrink-0 w-20 text-center flex flex-col gap-0.5">
        <SkeletonText width={32} height={24} className="mx-auto" />
        <SkeletonText width={48} height={12} className="mx-auto" />
        <SkeletonText width={60} height={12} className="mx-auto" />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-1.5 items-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <TraitIconSkeleton key={i} />
            ))}
          </div>
          <SkeletonCircle width={24} height={24} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ChampionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// 프로필 헤더 스켈레톤
export const ProfileHeaderSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-lg p-6 ${className}`}>
    <div className="flex items-center gap-4">
      <SkeletonCircle width={80} height={80} />
      <div className="flex-grow space-y-2">
        <SkeletonText width={192} height={24} />
        <SkeletonText width={128} height={16} />
        <SkeletonText width={96} height={16} />
      </div>
      <SkeletonRectangle width={96} height={40} className="rounded-md" />
    </div>
  </div>
);

// 랭크 통계 스켈레톤
export const RankedStatsSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-lg p-6 ${className}`}>
    <SkeletonText width={96} height={20} className="mb-4" />
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex justify-between items-center">
          <SkeletonText width={64} height={16} />
          <SkeletonText width={48} height={16} />
        </div>
      ))}
    </div>
  </div>
);

// LP 그래프 스켈레톤
export const LPGraphSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-lg ${className}`}>
    <div className="p-3 border-b">
      <SkeletonText width={96} height={20} />
    </div>
    <div className="p-4">
      <SkeletonRectangle width="100%" height={200} className="rounded" />
    </div>
  </div>
);

// 티어리스트 페이지 스켈레톤
export const TierListPageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* 헤더 */}
    <div className="flex items-center justify-between">
      <div className="flex-1 text-center space-y-2">
        <SkeletonText width={300} height={32} className="mx-auto" />
        <SkeletonText width={400} height={16} className="mx-auto" />
      </div>
      <SkeletonRectangle width={100} height={40} className="rounded-lg" />
    </div>

    {/* 덱 카드들 */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <DeckCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// 소환사 페이지 스켈레톤
export const SummonerPageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* 프로필 헤더 */}
    <ProfileHeaderSkeleton />

    {/* 통계 그리드 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <RankedStatsSkeleton />
      </div>
      <div className="lg:col-span-2">
        <LPGraphSkeleton />
      </div>
    </div>

    {/* 매치 카드들 */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// 통계 페이지 스켈레톤
export const StatsPageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* 탭 네비게이션 */}
    <div className="flex space-x-4 border-b">
      <SkeletonText width={80} height={40} />
      <SkeletonText width={80} height={40} />
    </div>

    {/* 필터 섹션 */}
    <div className="flex gap-4">
      <SkeletonRectangle width={120} height={40} className="rounded" />
      <SkeletonRectangle width={120} height={40} className="rounded" />
      <SkeletonRectangle width={120} height={40} className="rounded" />
    </div>

    {/* 통계 그리드 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <SkeletonCircle width={40} height={40} />
            <div className="space-y-1">
              <SkeletonText width={100} height={16} />
              <SkeletonText width={80} height={14} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <SkeletonText width={60} height={20} className="mx-auto" />
              <SkeletonText width={80} height={12} className="mx-auto" />
            </div>
            <div className="text-center">
              <SkeletonText width={60} height={20} className="mx-auto" />
              <SkeletonText width={80} height={12} className="mx-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default {
  ChampionCardSkeleton,
  TraitIconSkeleton,
  DeckCardSkeleton,
  MatchCardSkeleton,
  ProfileHeaderSkeleton,
  RankedStatsSkeleton,
  LPGraphSkeleton,
  TierListPageSkeleton,
  SummonerPageSkeleton,
  StatsPageSkeleton,
};