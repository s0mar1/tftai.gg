import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();

  const supportedLanguages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const currentLang = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];

  const handleLanguageChange = (newLanguage) => {
    // Change i18n language
    i18n.changeLanguage(newLanguage);
    setIsOpen(false);
    
    // Update URL with new language
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    
    // If already has language prefix, replace it
    if (pathParts[1] && supportedLanguages.some(lang => lang.code === pathParts[1])) {
      pathParts[1] = newLanguage;
    } else {
      // Add language prefix
      pathParts.splice(1, 0, newLanguage);
    }
    
    const newPath = pathParts.join('/') + location.search;
    navigate(newPath, { replace: true });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-background-base dark:hover:bg-dark-background-base transition-colors duration-200"
        aria-label="언어 선택"
      >
        <span className="text-xl">{currentLang.flag}</span>
        <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
          {currentLang.name}
        </span>
        <svg 
          className={`w-4 h-4 text-text-secondary dark:text-dark-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-44 bg-background-card dark:bg-dark-background-card border border-border-light dark:border-dark-border-light rounded-md shadow-lg z-20">
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-background-base dark:hover:bg-dark-background-base transition-colors ${
                    i18n.language === lang.code 
                      ? 'bg-brand-mint/10' 
                      : ''
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className={`text-sm font-medium flex-1 ${
                    i18n.language === lang.code 
                      ? 'text-brand-mint' 
                      : 'text-text-primary dark:text-dark-text-primary'
                  }`}>
                    {lang.name}
                  </span>
                  {i18n.language === lang.code && (
                    <span className="text-brand-mint">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;