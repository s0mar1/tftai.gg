/**
 * Typography System
 * 
 * 타이포그래피 디자인 토큰 정의
 * 한글 가독성을 고려한 최적화된 설정 포함
 * 
 * @note 기존 텍스트 스타일을 분석하여 체계적으로 정리
 *       점진적 마이그레이션을 위해 기존 클래스와 호환 가능
 */

export const typography = {
  // 폰트 패밀리
  fontFamily: {
    sans: ['Inter', 'Roboto', '"Noto Sans KR"', 'sans-serif'].join(', '),
    mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'].join(', '),
  },
  
  // 폰트 크기 스케일
  fontSize: {
    // Display (큰 제목)
    display: {
      large: '3rem',     // 48px
      medium: '2.5rem',  // 40px
      small: '2rem',     // 32px
    },
    
    // Heading (제목)
    heading: {
      h1: '3.125rem',    // 50px (기존 text-5xl)
      h2: '1.5rem',      // 24px (기존 text-2xl)
      h3: '1.125rem',    // 18px (기존 text-lg)
      h4: '1rem',        // 16px (기존 text-base)
      h5: '0.875rem',    // 14px (기존 text-sm)
      h6: '0.75rem',     // 12px (기존 text-xs)
    },
    
    // Body (본문)
    body: {
      large: '1rem',     // 16px (text-base)
      medium: '0.875rem', // 14px (text-sm)
      small: '0.75rem',   // 12px (text-xs)
    },
    
    // 특수 크기
    special: {
      '0.8rem': '0.8rem',   // 기존 프로젝트에서 사용
      '0.9rem': '0.9rem',   // 기존 프로젝트에서 사용
      '1.5rem': '1.5rem',   // 기존 프로젝트에서 사용
    }
  },
  
  // 폰트 굵기
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // 줄 높이 (한글 가독성 최적화)
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',      // 기본값
    relaxed: '1.625',   // 한글 본문에 권장
    loose: '2',
  },
  
  // 자간 (Letter Spacing)
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // 텍스트 스타일 프리셋 (자주 사용되는 조합)
  styles: {
    // 제목 스타일
    heading: {
      hero: 'text-5xl font-extrabold',  // HomePage hero 제목
      section: 'text-2xl font-bold',     // 섹션 제목
      card: 'text-lg font-semibold',    // 카드 제목
      sub: 'text-base font-medium',      // 부제목
    },
    
    // 본문 스타일
    body: {
      large: 'text-base font-normal',
      default: 'text-sm font-normal',
      small: 'text-xs font-normal',
    },
    
    // 라벨 및 버튼
    label: {
      large: 'text-sm font-medium',
      default: 'text-sm font-medium',
      small: 'text-xs font-medium',
    },
    
    // 특수 스타일
    special: {
      brandTitle: 'text-5xl font-extrabold text-brand-mint',
      error: 'text-sm text-error-red',
      muted: 'text-sm text-text-secondary dark:text-dark-text-secondary',
    }
  },
  
  // 반응형 타이포그래피 스케일
  responsive: {
    // 모바일 우선 접근법
    heading: {
      h1: {
        base: 'text-3xl',    // 모바일
        md: 'text-4xl',      // 태블릿
        lg: 'text-5xl',      // 데스크톱
      },
      h2: {
        base: 'text-xl',
        md: 'text-2xl',
        lg: 'text-2xl',
      },
      h3: {
        base: 'text-base',
        md: 'text-lg',
        lg: 'text-lg',
      }
    }
  }
};

// 타이포그래피 클래스 생성 헬퍼
export function createTextClass(
  size: keyof typeof typography.fontSize.body | keyof typeof typography.fontSize.heading,
  weight: keyof typeof typography.fontWeight = 'normal',
  color?: string
): string {
  const classes = [];
  
  // 크기 매핑
  const sizeMap: Record<string, string> = {
    h1: 'text-5xl',
    h2: 'text-2xl',
    h3: 'text-lg',
    h4: 'text-base',
    h5: 'text-sm',
    h6: 'text-xs',
    large: 'text-base',
    medium: 'text-sm',
    small: 'text-xs',
  };
  
  // 굵기 매핑
  const weightMap: Record<string, string> = {
    thin: 'font-thin',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  };
  
  if (sizeMap[size]) classes.push(sizeMap[size]);
  if (weightMap[weight]) classes.push(weightMap[weight]);
  if (color) classes.push(color);
  
  return classes.join(' ');
}

// 기존 텍스트 스타일 매핑 (마이그레이션용)
export const textStyleMappings = {
  // HomePage
  'text-5xl font-extrabold': 'heading.hero',
  'text-2xl font-bold': 'heading.section',
  'text-lg font-semibold': 'heading.card',
  
  // 일반 텍스트
  'text-sm': 'body.default',
  'text-xs': 'body.small',
  'text-base': 'body.large',
  
  // 색상 포함 스타일
  'text-text-primary dark:text-dark-text-primary': 'text.primary',
  'text-text-secondary dark:text-dark-text-secondary': 'text.secondary',
};

// Type exports
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type TextStyle = keyof typeof typography.styles;