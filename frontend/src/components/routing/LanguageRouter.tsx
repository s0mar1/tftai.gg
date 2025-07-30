// Language-based URL routing component
import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createLazyComponent } from '../common/LazyComponentLoader';
import PageLoadingFallback from '../common/PageLoadingFallback.jsx';

// Supported languages
export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Lazy-loaded page components with priority-based loading
// High priority pages (likely to be visited first)
const HomePage = createLazyComponent(() => import('../../pages/HomePage'), { priority: 'high' });
const SummonerPage = createLazyComponent(() => import('../../pages/summoner/SummonerPageGraphQL'), { priority: 'high' });
const TierListPage = createLazyComponent(() => import('../../pages/tierlist/TierListPage'), { priority: 'high' });

// Medium priority pages (commonly visited)
const RankingPage = createLazyComponent(() => import('../../pages/ranking/RankingPage'), { priority: 'medium' });
const DeckBuilderPage = createLazyComponent(() => import('../../pages/DeckBuilderPage/DeckBuilderPage'), { priority: 'medium' });
const StatsPage = createLazyComponent(() => import('../../pages/stats/StatsPage'), { priority: 'medium' });

// Low priority pages (less frequently visited)
const AiQnaPage = createLazyComponent(() => import('../../pages/AiQnaPage/AiQnaPage'), { priority: 'low' });
const GuideListPage = createLazyComponent(() => import('../../pages/GuideListPage/GuideListPage'), { priority: 'low' });
const GuideDetailPage = createLazyComponent(() => import('../../pages/GuideDetailPage/GuideDetailPage'), { priority: 'low' });
const GuideEditorPage = createLazyComponent(() => import('../../pages/GuideEditorPage/GuideEditorPage'), { priority: 'low' });
const AboutPage = createLazyComponent(() => import('../../pages/AboutPage/AboutPage'), { priority: 'low' });
const Set15FeaturesPage = createLazyComponent(() => import('../../pages/Set15FeaturesPage'), { priority: 'medium' });

// Route preloading for better performance
const preloadRoutes = {
  high: [
    () => import('../../pages/HomePage'),
    () => import('../../pages/summoner/SummonerPageGraphQL'),
    () => import('../../pages/tierlist/TierListPage'),
  ],
  medium: [
    () => import('../../pages/ranking/RankingPage'),
    () => import('../../pages/DeckBuilderPage/DeckBuilderPage'),
    () => import('../../pages/stats/StatsPage'),
    () => import('../../pages/Set15FeaturesPage'),
  ],
  low: [
    () => import('../../pages/AiQnaPage/AiQnaPage'),
    () => import('../../pages/GuideListPage/GuideListPage'),
    () => import('../../pages/GuideDetailPage/GuideDetailPage'),
    () => import('../../pages/GuideEditorPage/GuideEditorPage'),
    () => import('../../pages/AboutPage/AboutPage'),
  ]
};

interface LanguageWrapperProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
}

// Language wrapper component with preloading support
const LanguageWrapper: React.FC<LanguageWrapperProps> = ({ children, isDarkMode }) => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Validate language parameter
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      // Change language if it's different from current
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else {
      // Redirect to default language if invalid or missing
      const defaultLang = 'ko';
      const newPath = `/${defaultLang}${location.pathname}`;
      navigate(newPath, { replace: true });
    }
  }, [lang, i18n, navigate, location.pathname]);

  // Route preloading effect
  useEffect(() => {
    // Preload high priority routes immediately
    if (typeof window !== 'undefined') {
      const preloadWithDelay = (routes: (() => Promise<any>)[], delay: number) => {
        setTimeout(() => {
          routes.forEach(route => {
            route().catch(() => {
              // Silently ignore preloading errors
            });
          });
        }, delay);
      };

      // Preload high priority routes immediately
      preloadWithDelay(preloadRoutes.high, 100);
      
      // Preload medium priority routes after 1 second
      preloadWithDelay(preloadRoutes.medium, 1000);
      
      // Preload low priority routes after 3 seconds
      preloadWithDelay(preloadRoutes.low, 3000);
    }
  }, []);

  return <>{children}</>;
};

interface LanguageRoutesProps {
  isDarkMode?: boolean;
}

// Main language-based routing component
export const LanguageRoutes: React.FC<LanguageRoutesProps> = ({ isDarkMode }) => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Language-prefixed routes */}
        <Route path="/:lang/*" element={
          <LanguageWrapper>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/summoner/:region/:summonerName" element={<SummonerPage isDarkMode={isDarkMode} />} />
              <Route path="/tierlist" element={<TierListPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/ai-chat" element={<AiQnaPage />} />
              <Route path="/deck-builder" element={<DeckBuilderPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/guides" element={<GuideListPage />} />
              <Route path="/guides/:id" element={<GuideDetailPage />} />
              <Route path="/guides/new" element={<GuideEditorPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/set15-features" element={<Set15FeaturesPage />} />
            </Routes>
          </LanguageWrapper>
        } />
        
        {/* Root redirect to default language */}
        <Route path="/*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
};

// Component to handle root path redirects
const RootRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Get user's preferred language or default to Korean
    const userLang = i18n.language || 'ko';
    const validLang = SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage) ? userLang : 'ko';
    
    // Redirect to language-prefixed path
    const newPath = `/${validLang}${location.pathname}${location.search}`;
    navigate(newPath, { replace: true });
  }, [navigate, location, i18n.language]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
    </div>
  );
};

export default LanguageRoutes;