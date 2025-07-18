import React, { memo, useMemo, useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import SearchBar from '../common/SearchBar';
import LanguageSelector from '../common/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../../hooks/useDarkMode';

// 임시 로고 아이콘 (메모이제이션)
const LogoIcon: React.FC = memo(() => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C21.9939 8.94833 20.3541 6.19524 17.75 4.75" stroke="#3ED2B9" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" stroke="#3ED2B9" strokeWidth="2"/>
    <path d="M12 12V16C12 17.1046 12.8954 18 14 18" stroke="#3ED2B9" strokeWidth="2" strokeLinecap="round"/>
  </svg>
));

// Header 컴포넌트 (props 제거됨)
const Header: React.FC = () => {
  const { t } = useTranslation();
  
  // DarkModeContext에서 다크모드 상태와 토글 함수 가져오기
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // 서브 네비게이션 링크에 적용할 스타일 (메모이제이션)
  const navLinkClass = useCallback(({ isActive }: { isActive: boolean }) =>
    `py-3 text-sm font-bold border-b-2 transition-colors duration-200 ${
      isActive
        ? 'text-brand-mint border-brand-mint'
        : 'text-text-secondary dark:text-dark-text-secondary border-transparent hover:text-text-primary dark:hover:text-dark-text-primary'
    }`, []);
  
  // 다크모드 토글 핸들러 (메모이제이션)
  const handleDarkModeToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);
  
  // 다크모드 아이콘 (메모이제이션)
  const darkModeIcon = useMemo(() => {
    if (isDarkMode) {
      // 라이트 모드 아이콘 (현재 다크모드일 때 표시)
      return (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      );
    } else {
      // 다크 모드 아이콘 (현재 라이트모드일 때 표시)
      return (
        <svg className="w-6 h-6 text-text-primary dark:text-dark-text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm-4 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4-4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm10.293-4.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 14.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM14.293 5.293a1 1 0 010 1.414l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 5.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 8a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    }
  }, [isDarkMode]);

  return (
    <header className="bg-background-card dark:bg-dark-background-card border-b border-border-light dark:border-dark-border-light sticky top-0 z-50" role="banner">
      {/* 1단: 로고, 검색, 개인 메뉴 */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center py-2">
          {/* 로고 (클릭 시 홈으로) */}
          <Link to="/" className="flex items-center gap-2" aria-label="TFTai.gg 홈페이지로 이동">
            <LogoIcon />
            <span className="text-xl font-bold text-text-primary dark:text-white">TFTai.gg</span>
          </Link>

          {/* 검색창 */}
          <div className="w-1/3">
            <SearchBar />
          </div>

          {/* 언어 선택, 다크 모드 토글 및 추후 추가될 개인 메뉴 */}
          <div className="flex items-center gap-4">
            <LanguageSelector />
            
            {/* 다크모드 토글 버튼 - Context에서 상태와 함수 사용 */}
            <button
              onClick={handleDarkModeToggle}
              className="p-2 rounded-full hover:bg-background-base dark:hover:bg-dark-background-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2"
              aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? (
                // 라이트 모드 아이콘 (현재 다크모드일 때 표시)
                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                // 다크 모드 아이콘 (현재 라이트모드일 때 표시)
                <svg className="w-6 h-6 text-text-primary dark:text-dark-text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm-4 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4-4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm10.293-4.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 14.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM14.293 5.293a1 1 0 010 1.414l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 5.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 8a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              )}
            </button>
            {/* <button>Login</button> */}
          </div>
        </div>
      </div>

      {/* 2단: 서브 네비게이션 */}
      <div className="border-t border-border-light dark:border-gray-700">
          <nav className="max-w-7xl mx-auto px-6 flex items-center gap-8" role="navigation" aria-label="주요 네비게이션">
            <NavLink to="/tierlist" className={navLinkClass}>{t('nav.tierlist')}</NavLink>
            <NavLink to="/guides" className={navLinkClass}>{t('nav.guides')}</NavLink>
            <NavLink to="/ranking" className={navLinkClass}>{t('nav.ranking')}</NavLink>
            <NavLink to="/stats" className={navLinkClass}>{t('nav.stats')}</NavLink>
            <NavLink to="/deck-builder" className={navLinkClass}>{t('nav.deckBuilder')}</NavLink>
            <NavLink to="/ai-chat" className={navLinkClass}>{t('nav.aiChat')}</NavLink>
            <NavLink to="/about" className={navLinkClass}>{t('nav.about')}</NavLink>
          </nav>
      </div>
    </header>
  );
};

// React.memo로 컴포넌트 메모이제이션
export default memo(Header);