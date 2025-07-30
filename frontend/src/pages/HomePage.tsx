import React from 'react';
import { useTranslation } from 'react-i18next';
import MetaTrendCard from '../components/MetaTrendCard';
import { useTFTData } from '../context/TFTDataContext';
import PageErrorMessage from '../components/common/PageErrorMessage';
import SearchBar from '../components/common/SearchBar';
import { useDeckTiers } from '../hooks/useQuery';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: tierData, isLoading, isError, error, refetch } = useDeckTiers(i18n.language);
  const tftDataResult = useTFTData();
  const { loading: tftDataLoading = true } = tftDataResult || {};

  const handleRetry = (): void => {
    refetch();
  };

  const displayLoading: boolean = isLoading || tftDataLoading;

  return (
    <div className="min-h-screen">
      {/* Hero Section - 반응형 간격과 텍스트 크기 */}
      <div className="text-center pt-12 sm:pt-16 lg:pt-20 xl:pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 메인 제목 - 반응형 텍스트 크기 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-text-primary dark:text-dark-text-primary mb-3 sm:mb-4 lg:mb-6">
            {t('home.hero.title1')}
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-brand-mint mb-6 sm:mb-8 lg:mb-12">
            {t('home.hero.title2')}
          </h2>
          
          {/* 설명 텍스트 - 반응형 너비와 크기 */}
          <p className="text-sm sm:text-base lg:text-lg text-text-secondary dark:text-dark-text-secondary max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto mb-8 sm:mb-12 lg:mb-16 leading-relaxed">
            {t('home.hero.description')}
          </p>
          
          {/* 검색바 - 반응형 너비 */}
          <div className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto">
            <SearchBar 
              variant="hero" 
              showRegionSelector={false}
              placeholder={t('home.hero.searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Trends Section - 반응형 그리드와 간격 */}
      <div className="mt-12 sm:mt-16 lg:mt-20 pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 섹션 제목 - 반응형 크기 */}
          <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-center mb-6 sm:mb-8 lg:mb-12 text-text-primary dark:text-dark-text-primary">
            {t('home.trends.title')}
          </h3>
          
          {displayLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="bg-background-card dark:bg-dark-background-card p-4 sm:p-5 lg:p-6 rounded-lg shadow-md flex flex-col sm:flex-row lg:flex-col items-center gap-4 border-2 border-gray-300 dark:border-gray-600 animate-pulse"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="flex-grow w-full">
                    <div className="h-4 sm:h-5 lg:h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto mb-2 sm:mb-3"></div>
                    <div className="h-3 sm:h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-3 sm:mb-4"></div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="max-w-2xl mx-auto">
              <PageErrorMessage
                title="실시간 메타 트렌드 로딩 실패"
                message={error.message || 'An unexpected error occurred'}
                showRetry={true}
                onRetry={handleRetry}
                variant="compact"
              />
            </div>
          ) : tierData && tierData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {tierData.slice(0, 3).map((deck) => (
                <MetaTrendCard key={deck.deckKey} deck={deck} />
              ))}
            </div>
          ) : (
            <div className="text-center text-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
              <div className="text-base sm:text-lg lg:text-xl">
                {t('home.trends.noData')}
              </div>
              <div className="text-sm sm:text-base mt-2">
                {t('home.trends.noDataDescription')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;