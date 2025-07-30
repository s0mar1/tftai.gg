/**
 * Token Viewer Component
 * 
 * 디자인 토큰을 시각적으로 표시하고 클립보드에 복사할 수 있는 컴포넌트
 */

import React, { useState } from 'react';
import { tokens } from '../../design-system/tokens';

interface TokenViewerProps {
  title: string;
  tokens: Record<string, any>;
  type?: 'color' | 'spacing' | 'shadow' | 'text';
  className?: string;
}

interface ColorTokenProps {
  name: string;
  value: string;
  description?: string;
}

interface SpacingTokenProps {
  name: string;
  value: string;
}

// 색상 토큰 표시 컴포넌트
const ColorToken: React.FC<ColorTokenProps> = ({ name, value, description }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className="group cursor-pointer p-3 rounded-lg border border-border-light dark:border-dark-border-light hover:shadow-md transition-all duration-200"
      onClick={handleCopy}
      title="클릭하여 클래스명 복사"
    >
      <div 
        className="w-full h-12 rounded-md mb-2 border border-border-light dark:border-dark-border-light"
        style={{ backgroundColor: value }}
      />
      <div className="text-xs">
        <div className="font-medium text-text-primary dark:text-dark-text-primary">
          {name}
        </div>
        <div className="text-text-secondary dark:text-dark-text-secondary font-mono">
          {value}
        </div>
        {description && (
          <div className="text-text-secondary dark:text-dark-text-secondary mt-1">
            {description}
          </div>
        )}
        {copied && (
          <div className="text-brand-mint text-xs mt-1 font-medium">
            복사됨!
          </div>
        )}
      </div>
    </div>
  );
};

// 간격 토큰 표시 컴포넌트
const SpacingToken: React.FC<SpacingTokenProps> = ({ name, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`p-${name}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className="group cursor-pointer p-3 rounded-lg border border-border-light dark:border-dark-border-light hover:shadow-md transition-all duration-200"
      onClick={handleCopy}
      title="클릭하여 클래스명 복사"
    >
      <div className="flex items-center justify-center mb-2">
        <div 
          className="bg-brand-mint flex items-center justify-center text-white text-xs font-medium"
          style={{ 
            width: value,
            height: '32px',
            minWidth: '32px'
          }}
        >
          {value}
        </div>
      </div>
      <div className="text-xs text-center">
        <div className="font-medium text-text-primary dark:text-dark-text-primary">
          {name}
        </div>
        <div className="text-text-secondary dark:text-dark-text-secondary font-mono">
          {value}
        </div>
        {copied && (
          <div className="text-brand-mint text-xs mt-1 font-medium">
            복사됨!
          </div>
        )}
      </div>
    </div>
  );
};

// 그림자 토큰 표시 컴포넌트
const ShadowToken: React.FC<{ name: string; value: string }> = ({ name, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`shadow-${name}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className="group cursor-pointer p-4 rounded-lg border border-border-light dark:border-dark-border-light hover:shadow-md transition-all duration-200"
      onClick={handleCopy}
      title="클릭하여 클래스명 복사"
    >
      <div 
        className="w-full h-16 bg-background-card dark:bg-dark-background-card rounded-lg mb-3 flex items-center justify-center"
        style={{ boxShadow: value }}
      >
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
          Shadow Preview
        </span>
      </div>
      <div className="text-xs">
        <div className="font-medium text-text-primary dark:text-dark-text-primary">
          {name}
        </div>
        <div className="text-text-secondary dark:text-dark-text-secondary font-mono text-[10px] break-all">
          {value}
        </div>
        {copied && (
          <div className="text-brand-mint text-xs mt-1 font-medium">
            복사됨!
          </div>
        )}
      </div>
    </div>
  );
};

// 메인 TokenViewer 컴포넌트
const TokenViewer: React.FC<TokenViewerProps> = ({ 
  title, 
  tokens: tokenData, 
  type = 'color',
  className = '' 
}) => {
  const renderTokens = () => {
    switch (type) {
      case 'color':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(tokenData).map(([key, value]) => (
              <ColorToken 
                key={key} 
                name={key} 
                value={value as string} 
              />
            ))}
          </div>
        );
      
      case 'spacing':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(tokenData).map(([key, value]) => (
              <SpacingToken 
                key={key} 
                name={key} 
                value={value as string} 
              />
            ))}
          </div>
        );
      
      case 'shadow':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tokenData).map(([key, value]) => (
              <ShadowToken 
                key={key} 
                name={key} 
                value={value as string} 
              />
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
        {title}
      </h3>
      {renderTokens()}
      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-4">
        💡 클릭하여 Tailwind 클래스명을 클립보드에 복사할 수 있습니다.
      </p>
    </div>
  );
};

// 프리셋 토큰 뷰어들
export const BrandColorViewer: React.FC = () => (
  <TokenViewer
    title="브랜드 색상"
    tokens={{
      'brand-mint': tokens.colors.brand.mint,
      'brand-mint-hover': tokens.colors.brand.mintHover,
    }}
    type="color"
  />
);

export const TextColorViewer: React.FC = () => (
  <div className="space-y-8">
    <TokenViewer
      title="텍스트 색상 (Light Mode)"
      tokens={{
        'text-primary': tokens.colors.text.primary,
        'text-secondary': tokens.colors.text.secondary,
      }}
      type="color"
    />
    <div className="dark">
      <TokenViewer
        title="텍스트 색상 (Dark Mode)"
        tokens={{
          'dark-text-primary': tokens.colors.text.dark.primary,
          'dark-text-secondary': tokens.colors.text.dark.secondary,
        }}
        type="color"
      />
    </div>
  </div>
);

export const BackgroundColorViewer: React.FC = () => (
  <div className="space-y-8">
    <TokenViewer
      title="배경 색상 (Light Mode)"
      tokens={{
        'background-base': tokens.colors.background.base,
        'background-card': tokens.colors.background.card,
        'panel-bg-primary': tokens.colors.background.panel.primary,
      }}
      type="color"
    />
    <div className="dark">
      <TokenViewer
        title="배경 색상 (Dark Mode)"
        tokens={{
          'dark-background-base': tokens.colors.background.dark.base,
          'dark-background-card': tokens.colors.background.dark.card,
          'dark-panel-bg-primary': tokens.colors.background.dark.panel.primary,
        }}
        type="color"
      />
    </div>
  </div>
);

export const GrayColorViewer: React.FC = () => (
  <TokenViewer
    title="회색 계열"
    tokens={{
      'tft-gray-100': tokens.colors.gray[100],
      'tft-gray-200': tokens.colors.gray[200],
      'tft-gray-700': tokens.colors.gray[700],
      'tft-gray-900': tokens.colors.gray[900],
    }}
    type="color"
  />
);

export const SpacingViewer: React.FC = () => (
  <TokenViewer
    title="간격 시스템"
    tokens={tokens.spacing}
    type="spacing"
  />
);

export const ShadowViewer: React.FC = () => (
  <TokenViewer
    title="그림자 효과"
    tokens={tokens.shadows}
    type="shadow"
  />
);

export default TokenViewer;