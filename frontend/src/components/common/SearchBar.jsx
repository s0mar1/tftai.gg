import React, { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SearchBar = memo(() => {
  const [summonerInput, setSummonerInput] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('kr');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();

  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setErrorMessage(''); // 에러 메시지 초기화
    
    if (!summonerInput.trim() || !summonerInput.includes('#')) {
      const errorMsg = t('summoner.searchPlaceholder') + ' (예: 챌린저#KR1)';
      setErrorMessage(errorMsg);
      // 스크린 리더 사용자를 위해 에러 메시지에 포커스
      setTimeout(() => {
        const errorElement = document.getElementById('search-error');
        if (errorElement) {
          errorElement.focus();
        }
      }, 100);
      return;
    }
    const [gameName, tagLine] = summonerInput.trim().split('#');
    const currentLang = lang || i18n.language || 'ko';
    // URL에 gameName#tagLine 형태로 포함
    const encodedSummonerName = encodeURIComponent(`${gameName}#${tagLine}`);
    navigate(`/${currentLang}/summoner/${selectedRegion}/${encodedSummonerName}`); // 현재 언어 포함
  }, [summonerInput, selectedRegion, lang, i18n.language, navigate, t]);

  const regions = useMemo(() => [
    { value: 'kr', label: 'KR' },
    { value: 'na', label: 'NA' },
    { value: 'euw', label: 'EUW' },
    { value: 'eune', label: 'EUNE' },
    { value: 'jp', label: 'JP' },
    { value: 'br', label: 'BR' },
    { value: 'la1', label: 'LAN' },
    { value: 'la2', label: 'LAS' },
    { value: 'tr', label: 'TR' },
    { value: 'ru', label: 'RU' }
  ], []);

  const handleRegionChange = useCallback((e) => {
    setSelectedRegion(e.target.value);
  }, []);

  const handleInputChange = useCallback((e) => {
    setSummonerInput(e.target.value);
    // 입력 중에 에러 메시지 클리어
    if (errorMessage) {
      setErrorMessage('');
    }
  }, [errorMessage]);

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="소환사 검색">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="summoner-search" className="sr-only">소환사명 입력</label>
          <input
            id="summoner-search"
            type="text"
            value={summonerInput}
            onChange={handleInputChange}
            placeholder={t('header.search_placeholder')}
            className={`w-full py-2 pl-4 pr-10 rounded-full bg-background-card dark:bg-dark-background-card border focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 ${
              errorMessage ? 'border-red-500' : 'border-border-light'
            }`}
            aria-describedby={errorMessage ? "search-help search-error" : "search-help"}
            aria-invalid={errorMessage ? "true" : "false"}
            autoComplete="off"
          />
          <div id="search-help" className="sr-only">
            소환사명을 게임명#태그 형태로 입력하세요. 예: 챌린저#KR1
          </div>
          {errorMessage && (
            <div 
              id="search-error" 
              className="absolute top-full mt-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
              aria-live="polite"
              tabIndex="-1"
            >
              {errorMessage}
            </div>
          )}
          <button 
            type="submit" 
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-brand-mint focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 rounded-r-full"
            aria-label="소환사 검색 실행"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        <label htmlFor="region-select" className="sr-only">지역 선택</label>
        <select
          id="region-select"
          value={selectedRegion}
          onChange={handleRegionChange}
          className="px-3 py-2 rounded-lg bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary border border-border-light dark:border-dark-border-light focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 focus:ring-offset-background-base dark:focus:ring-offset-dark-background-base"
          aria-label="지역 선택"
        >
          {regions.map(region => (
            <option key={region.value} value={region.value} className="bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary">{region.label}</option>
          ))}
        </select>
      </div>
    </form>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;