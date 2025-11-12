import React, { memo, useMemo, useCallback, useState } from 'react';
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

// 햄버거 메뉴 아이콘 컴포넌트
const HamburgerIcon: React.FC<{ isOpen: boolean }> = memo(({ isOpen }) => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {isOpen ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    )}
  </svg>
));

// Header 컴포넌트 (props 제거됨)
const Header: React.FC = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // DarkModeContext에서 다크모드 상태와 토글 함수 가져오기
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // 서브 네비게이션 링크에 적용할 스타일 (메모이제이션)
  const navLinkClass = useCallback(({ isActive }: { isActive: boolean }) =>
    `py-3 px-1 text-sm font-bold border-b-2 transition-colors duration-200 ${
      isActive
        ? 'text-brand-mint border-brand-mint'
        : 'text-text-secondary dark:text-dark-text-secondary border-transparent hover:text-text-primary dark:hover:text-dark-text-primary'
    }`, []);

  // 모바일 네비게이션 링크 스타일
  const mobileNavLinkClass = useCallback(({ isActive }: { isActive: boolean }) =>
    `block py-3 px-4 text-base font-medium border-l-4 transition-colors duration-200 ${
      isActive
        ? 'text-brand-mint border-brand-mint bg-brand-mint/5 dark:bg-brand-mint/10'
        : 'text-text-secondary dark:text-dark-text-secondary border-transparent hover:text-text-primary dark:hover:text-dark-text-primary hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100'
    }`, []);
  
  // 다크모드 토글 핸들러 (메모이제이션)
  const handleDarkModeToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  // 모바일 메뉴 토글
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // 모바일 메뉴 닫기
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="bg-background-card dark:bg-dark-background-card border-b border-border-light dark:border-dark-border-light sticky top-0 z-50" role="banner">
      {/* 1단: 로고, 검색, 개인 메뉴 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-2 md:py-3">
          {/* 좌측: 로고 + 모바일 햄버거 메뉴 */}
          <div className="flex items-center gap-3">
            {/* 모바일 햄버거 메뉴 (lg 미만에서만 표시) */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-mint"
              aria-label={isMobileMenuOpen ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={isMobileMenuOpen}
            >
              <HamburgerIcon isOpen={isMobileMenuOpen} />
            </button>

            {/* 로고 */}
            <Link to="/" className="flex items-center gap-2" aria-label={t('nav.home')} onClick={closeMobileMenu}>
              <LogoIcon />
              <span className="text-lg sm:text-xl font-bold text-text-primary dark:text-white">
                <span className="sm:hidden">TFT</span>
                <span className="hidden sm:inline">TFTai.gg</span>
              </span>
            </Link>
          </div>

          {/* 중앙: 검색창 (반응형 너비) */}
          <div className="hidden sm:block w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-4">
            <SearchBar />
          </div>

          {/* 우측: 언어 선택, 다크 모드 토글 */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={handleDarkModeToggle}
              className="p-2 rounded-full hover:bg-background-base dark:hover:bg-dark-background-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2"
              aria-label={isDarkMode ? t('common.toggleLightMode') : t('common.toggleDarkMode')}
              title={isDarkMode ? t('common.toggleLightMode') : t('common.toggleDarkMode')}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-text-primary dark:text-dark-text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm-4 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4-4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm10.293-4.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 14.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM14.293 5.293a1 1 0 010 1.414l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM5.293 5.293a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 8a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 검색창 */}
        <div className="sm:hidden pb-3">
          <SearchBar />
        </div>
      </div>

      {/* 2단: 데스크톱 네비게이션 (lg 이상에서만 표시) */}
      <div className="hidden lg:block border-t border-border-light dark:border-gray-700">
        <nav className="max-w-7xl mx-auto px-6 flex items-center gap-6 xl:gap-8" role="navigation" aria-label="주요 네비게이션">
          <NavLink to="/tierlist" className={navLinkClass}>{t('nav.tierlist')}</NavLink>
          <NavLink to="/guides" className={navLinkClass}>{t('nav.guides')}</NavLink>
          <NavLink to="/ranking" className={navLinkClass}>{t('nav.ranking')}</NavLink>
          <NavLink to="/stats" className={navLinkClass}>{t('nav.stats')}</NavLink>
          <NavLink to="/set15-features" className={navLinkClass}>Set 15</NavLink>
          <NavLink to="/deck-builder" className={navLinkClass}>{t('nav.deckBuilder')}</NavLink>
          <NavLink to="/ai-chat" className={navLinkClass}>{t('nav.aiChat')}</NavLink>
          <NavLink to="/about" className={navLinkClass}>{t('nav.about')}</NavLink>
        </nav>
      </div>

      {/* 모바일 네비게이션 메뉴 (lg 미만에서만 표시) */}
      <div className={`lg:hidden border-t border-border-light dark:border-gray-700 transition-all duration-300 ease-in-out ${
        isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <nav className="max-w-7xl mx-auto bg-background-card dark:bg-dark-background-card" role="navigation" aria-label="모바일 네비게이션">
          <div className="py-2 space-y-1">
            <NavLink to="/tierlist" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.tierlist')}
            </NavLink>
            <NavLink to="/guides" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.guides')}
            </NavLink>
            <NavLink to="/ranking" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.ranking')}
            </NavLink>
            <NavLink to="/stats" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.stats')}
            </NavLink>
            <NavLink to="/set15-features" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              Set 15 Features
            </NavLink>
            <NavLink to="/deck-builder" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.deckBuilder')}
            </NavLink>
            <NavLink to="/ai-chat" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.aiChat')}
            </NavLink>
            <NavLink to="/about" className={mobileNavLinkClass} onClick={closeMobileMenu}>
              {t('nav.about')}
            </NavLink>
            
            {/* 모바일 전용: 언어 선택 */}
            <div className="px-4 py-3 border-t border-border-light dark:border-dark-border-light">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{t('common.selectLanguage')}</span>
                <LanguageSelector />
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

// React.memo로 컴포넌트 메모이제이션
export default memo(Header);