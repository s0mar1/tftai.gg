import React from 'react';
import { useTranslation } from 'react-i18next';

const PageLoadingFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
        <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">{t('common.loading')}</p>
      </div>
    </div>
  );
};

export default PageLoadingFallback;