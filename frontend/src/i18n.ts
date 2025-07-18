import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files directly from src directory
import koTranslation from './locales/ko/translation.json';
import enTranslation from './locales/en/translation.json';
import jaTranslation from './locales/ja/translation.json';
import zhTranslation from './locales/zh/translation.json';

// 지원하는 언어 목록
export const SUPPORTED_LANGUAGES = {
  ko: {
    code: 'ko',
    name: '한국어',
    flag: '🇰🇷',
    region: 'KR',
    tftLocale: 'ko_kr'
  },
  en: {
    code: 'en',
    name: 'English (US)',
    flag: '🇺🇸',
    region: 'US',
    tftLocale: 'en_us'
  },
  ja: {
    code: 'ja',
    name: '日本語',
    flag: '🇯🇵',
    region: 'JP',
    tftLocale: 'ja_jp'
  },
  zh: {
    code: 'zh',
    name: '中文 (简体)',
    flag: '🇨🇳',
    region: 'CN',
    tftLocale: 'zh_cn'
  }
};

// Translation resources
const resources = {
  ko: {
    translation: koTranslation
  },
  en: {
    translation: enTranslation
  },
  ja: {
    translation: jaTranslation
  },
  zh: {
    translation: zhTranslation
  }
};

i18n
  .use(LanguageDetector) // 언어 감지
  .use(initReactI18next) // React와 연결
  .init({
    lng: 'ko', // 기본 언어
    fallbackLng: 'ko', // 폴백 언어
    debug: process.env.NODE_ENV === 'development',
    
    // Use imported resources directly
    resources,

    interpolation: {
      escapeValue: false // React는 이미 XSS 방지를 지원
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'language',
      caches: ['localStorage']
    },

    // React Suspense 설정
    react: {
      useSuspense: true, // Enable suspense since we're not using async loading
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
    },

    // 지원 언어 목록
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    
    // 네임스페이스 설정
    defaultNS: 'translation',
    ns: ['translation'],

    // 번역이 없을 때 키를 반환하지 않고 fallback 언어 사용
    returnNull: false,
    returnEmptyString: false,
    
    // 언어 로드 설정
    load: 'languageOnly', // 'ko-KR' 대신 'ko'만 사용
  });

export default i18n;