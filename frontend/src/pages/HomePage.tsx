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
    <div>
      <div className="text-center pt-16 pb-20">
        <h1 className="text-5xl font-extrabold text-text-primary dark:text-dark-text-primary mb-4">{t('home.hero.title1')}</h1>
        <h2 className="text-5xl font-extrabold text-brand-mint mb-8">{t('home.hero.title2')}</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto mb-12">
          {t('home.hero.description')}
        </p>
        <SearchBar 
          variant="hero" 
          showRegionSelector={false}
          placeholder={t('home.hero.searchPlaceholder')}
        />
      </div>

      <div className="mt-16">
        <h3 className="text-2xl font-bold text-center mb-6 text-text-primary dark:text-dark-text-primary">{t('home.trends.title')}</h3>
        {displayLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md flex items-center gap-4 border-2 border-gray-300 dark:border-gray-600 animate-pulse">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="flex-grow">
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-40 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-3"></div>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <PageErrorMessage
            title="실시간 메타 트렌드 로딩 실패"
            message={error.message || 'An unexpected error occurred'}
            showRetry={true}
            onRetry={handleRetry}
            variant="compact"
          />
        ) : tierData && tierData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tierData.slice(0, 3).map((deck) => (
              <MetaTrendCard key={deck.deckKey} deck={deck} />
            ))}
          </div>
        ) : (
          <div className="text-center text-text-secondary dark:text-dark-text-secondary">
            {t('home.trends.noData')} <br />
            {t('home.trends.noDataDescription')}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;