import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MetaTrendCard from '../components/MetaTrendCard';
import { useTFTData } from '../context/TFTDataContext';
import PageErrorMessage from '../components/common/PageErrorMessage';
import { useDeckTiers } from '../hooks/useQuery';

// HomePage 전용 검색창. 기존 SearchBar와는 별개입니다.
const HomeSearchBar = () => {
  const [summonerInput, setSummonerInput] = React.useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!summonerInput.trim() || !summonerInput.includes('#')) {
      alert(t('home.hero.searchAlert'));
      return;
    }
    const [gameName, tagLine] = summonerInput.trim().split('#');
    const queryString = new URLSearchParams({ gameName, tagLine }).toString();
    // 현재는 KR 지역만 지원하므로 'kr'로 고정
    navigate(`/summoner/kr?${queryString}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={summonerInput}
          onChange={(e) => setSummonerInput(e.target.value)}
          placeholder={t('home.hero.searchPlaceholder')}
          className="w-full text-lg py-4 px-6 rounded-full bg-background-card dark:bg-dark-background-card border-2 border-border-light dark:border-dark-border-light focus:outline-none focus:ring-2 focus:ring-brand-mint text-text-primary dark:text-dark-text-primary"
        />
        <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-6 text-text-secondary dark:text-dark-text-secondary hover:text-brand-mint">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
        </button>
      </div>
    </form>
  );
};

function HomePage() {
  const { t, i18n } = useTranslation();
  const { data: tierData, isLoading, isError, error, refetch } = useDeckTiers(i18n.language);
  const tftDataResult = useTFTData();
  const { loading: tftDataLoading = true } = tftDataResult || {};

  const handleRetry = () => {
    refetch();
  };

  const displayLoading = isLoading || tftDataLoading;

  return (
    <div>
      <div className="text-center pt-16 pb-20">
        <h1 className="text-5xl font-extrabold text-text-primary dark:text-dark-text-primary mb-4">{t('home.hero.title1')}</h1>
        <h2 className="text-5xl font-extrabold text-brand-mint mb-8">{t('home.hero.title2')}</h2>
        <p className="text-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto mb-12">
          {t('home.hero.description')}
        </p>
        <HomeSearchBar />
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