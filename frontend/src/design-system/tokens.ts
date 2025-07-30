/**
 * Design System Tokens
 * 
 * 중앙화된 디자인 토큰 관리 시스템
 * 기존 색상을 그대로 유지하면서 의미론적으로 그룹화
 * 
 * @note 기존 Tailwind 클래스명은 계속 사용 가능하며,
 *       이 토큰들은 점진적 마이그레이션을 위한 참조용입니다.
 */

export const tokens = {
  colors: {
    // 브랜드 색상
    brand: {
      mint: '#3ED2B9', // 기존 brand-mint
      mintHover: 'rgba(62, 210, 185, 0.9)', // brand-mint/90
    },
    
    // 텍스트 색상
    text: {
      // Light mode
      primary: '#2E2E2E', // text-primary
      secondary: '#6E6E6E', // text-secondary
      
      // Dark mode
      dark: {
        primary: '#E0E0E0', // dark-text-primary
        secondary: '#A0AEC0', // dark-text-secondary
      }
    },
    
    // 배경 색상
    background: {
      // Light mode
      base: '#FAFFFF', // background-base
      card: '#FFFFFF', // background-card
      panel: {
        primary: '#FFFFFF', // panel-bg-primary
        secondary: '#FFFFFF', // panel-bg-secondary
      },
      
      // Dark mode
      dark: {
        base: '#121212', // dark-background-base
        card: '#1A1A1A', // dark-background-card
        page: '#252525', // dark-background-page
        panel: {
          primary: '#1E1E1E', // dark-panel-bg-primary
          secondary: '#1E1E1E', // dark-panel-bg-secondary
        }
      }
    },
    
    // 회색 계열 (TFT Gray)
    gray: {
      100: '#F3F4F6', // tft-gray-100
      200: '#E5E7EB', // tft-gray-200
      700: '#4B5563', // tft-gray-700
      900: '#1f2937', // tft-gray-900
      
      // Dark mode
      dark: {
        100: '#333333', // dark-tft-gray-100
        200: '#1E1E1E', // dark-tft-gray-200
        700: '#A0AEC0', // dark-tft-gray-700
        900: '#E0E0E0', // dark-tft-gray-900
      }
    },
    
    // 시스템 색상
    system: {
      error: '#E74C3C', // error-red
      border: {
        light: '#E6E6E6', // border-light
        dark: '#333333', // dark-border-light
      }
    },
    
    // 기타 색상
    misc: {
      white: '#fff', // tft-white
      darkWhite: '#1E1E1E', // dark-tft-white
      darkLoading: '#A0AEC0', // dark-tft-loading
    }
  },
  
  // 그림자
  shadows: {
    header: '0 4px 12px rgba(0,0,0,0.05)',
    block: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.12)',
    hover: {
      light: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      dark: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }
  },
  
  // 간격 (기존 Tailwind 커스텀 spacing 참조)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  // 테두리 반경
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
    circle: '50%',
  },
  
  // 전환 효과
  transitions: {
    default: 'all 200ms ease',
    fast: 'all 150ms ease',
    slow: 'all 300ms ease',
  }
};

// 색상 매핑 테이블 (기존 → 새로운 토큰)
export const colorMappings = {
  // 기존 클래스명 → 토큰 경로
  'brand-mint': 'brand.mint',
  'text-primary': 'text.primary',
  'text-secondary': 'text.secondary',
  'background-base': 'background.base',
  'background-card': 'background.card',
  'error-red': 'system.error',
  'border-light': 'system.border.light',
  'panel-bg-primary': 'background.panel.primary',
  'panel-bg-secondary': 'background.panel.secondary',
  
  // TFT Gray 시리즈
  'tft-gray-100': 'gray.100',
  'tft-gray-200': 'gray.200',
  'tft-gray-700': 'gray.700',
  'tft-gray-900': 'gray.900',
  'tft-white': 'misc.white',
  
  // Dark mode 매핑
  'dark-background-base': 'background.dark.base',
  'dark-background-card': 'background.dark.card',
  'dark-text-primary': 'text.dark.primary',
  'dark-text-secondary': 'text.dark.secondary',
  'dark-border-light': 'system.border.dark',
  'dark-panel-bg-primary': 'background.dark.panel.primary',
  'dark-panel-bg-secondary': 'background.dark.panel.secondary',
  'dark-tft-gray-100': 'gray.dark.100',
  'dark-tft-gray-200': 'gray.dark.200',
  'dark-tft-gray-700': 'gray.dark.700',
  'dark-tft-gray-900': 'gray.dark.900',
  'dark-tft-white': 'misc.darkWhite',
  'dark-tft-loading': 'misc.darkLoading',
  'dark-background-page': 'background.dark.page',
};

// 헬퍼 함수: 중첩된 객체에서 경로로 값 가져오기
export function getTokenValue(path: string): string | undefined {
  const keys = path.split('.');
  let current: any = tokens;
  
  for (const key of keys) {
    if (current[key] === undefined) return undefined;
    current = current[key];
  }
  
  return current;
}

// Type exports for TypeScript
export type ColorToken = keyof typeof colorMappings;
export type TokenPath = typeof colorMappings[ColorToken];