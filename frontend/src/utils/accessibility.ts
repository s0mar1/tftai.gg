/**
 * 접근성 관련 유틸리티 함수들
 */

/**
 * 요소가 포커스 가능한지 확인
 */
export const isFocusable = (element: HTMLElement): boolean => {
  // 비활성화된 요소는 포커스 불가
  if (element.hasAttribute('disabled')) return false;
  
  // tabindex가 -1인 요소는 프로그래밍적으로만 포커스 가능
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1') return false;
  
  // 기본적으로 포커스 가능한 요소들
  const focusableSelectors = [
    'button',
    'input',
    'select',
    'textarea',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];
  
  return focusableSelectors.some(selector => element.matches(selector));
};

/**
 * 요소가 시각적으로 숨겨져 있는지 확인
 */
export const isVisuallyHidden = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  );
};

/**
 * 포커스 가능한 요소들을 찾기
 */
export const getFocusableElements = (container: HTMLElement = document.body): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  
  // 시각적으로 숨겨진 요소들은 제외
  return elements.filter(element => !isVisuallyHidden(element));
};

/**
 * 접근 가능한 이름 생성
 * aria-label, aria-labelledby, 또는 텍스트 콘텐츠를 기반으로 요소의 접근 가능한 이름을 생성
 */
export const getAccessibleName = (element: HTMLElement): string => {
  // aria-label 우선
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  
  // aria-labelledby 확인
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElements = labelledBy.split(' ')
      .map(id => document.getElementById(id))
      .filter(Boolean);
    
    if (labelElements.length > 0) {
      return labelElements.map(el => el?.textContent?.trim()).join(' ');
    }
  }
  
  // label 요소 확인 (input의 경우)
  if (element.matches('input, select, textarea')) {
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label?.textContent) {
        return label.textContent.trim();
      }
    }
    
    // 감싸는 label 확인
    const wrappingLabel = element.closest('label');
    if (wrappingLabel?.textContent) {
      return wrappingLabel.textContent.trim();
    }
  }
  
  // 텍스트 콘텐츠
  return element.textContent?.trim() || '';
};

/**
 * 색상 대비비 계산
 */
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // RGB 값 추출 (간단한 구현)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // 감마 보정
    const adjustGamma = (value: number) => {
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    
    const rLin = adjustGamma(r);
    const gLin = adjustGamma(g);
    const bLin = adjustGamma(b);
    
    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * WCAG 대비 기준 확인
 */
export const checkContrastCompliance = (
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): { isCompliant: boolean; ratio: number; required: number } => {
  const ratio = calculateContrastRatio(foreground, background);
  
  let required = 4.5; // WCAG AA 일반 텍스트
  
  if (level === 'AAA') {
    required = size === 'large' ? 4.5 : 7;
  } else if (size === 'large') {
    required = 3;
  }
  
  return {
    isCompliant: ratio >= required,
    ratio,
    required
  };
};

/**
 * 요소의 역할(role) 확인
 */
export const getElementRole = (element: HTMLElement): string => {
  // 명시적 role 속성
  const explicitRole = element.getAttribute('role');
  if (explicitRole) return explicitRole;
  
  // 암시적 역할 (태그 기반)
  const tagRoles: Record<string, string> = {
    'button': 'button',
    'a': element.hasAttribute('href') ? 'link' : 'generic',
    'input': getInputRole(element as HTMLInputElement),
    'select': 'combobox',
    'textarea': 'textbox',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading',
    'img': 'img',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'section': 'region',
    'article': 'article',
    'form': 'form',
    'ul': 'list',
    'ol': 'list',
    'li': 'listitem'
  };
  
  return tagRoles[element.tagName.toLowerCase()] || 'generic';
};

/**
 * input 요소의 역할 확인
 */
const getInputRole = (input: HTMLInputElement): string => {
  const type = input.type.toLowerCase();
  
  const inputRoles: Record<string, string> = {
    'button': 'button',
    'submit': 'button',
    'reset': 'button',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'range': 'slider',
    'text': 'textbox',
    'email': 'textbox',
    'password': 'textbox',
    'search': 'searchbox',
    'tel': 'textbox',
    'url': 'textbox',
    'number': 'spinbutton'
  };
  
  return inputRoles[type] || 'textbox';
};

/**
 * 스크린 리더 전용 텍스트 확인
 */
export const hasScreenReaderText = (element: HTMLElement): boolean => {
  // sr-only 클래스나 시각적으로 숨겨진 텍스트 확인
  const srOnlyElements = element.querySelectorAll('.sr-only, [aria-label], [aria-labelledby]');
  return srOnlyElements.length > 0;
};

/**
 * 키보드 이벤트 헬퍼
 */
export const isActivationKey = (event: KeyboardEvent): boolean => {
  return event.key === 'Enter' || event.key === ' ';
};

export const isNavigationKey = (event: KeyboardEvent): boolean => {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key);
};

export const isEscapeKey = (event: KeyboardEvent): boolean => {
  return event.key === 'Escape';
};

/**
 * ARIA 속성 유효성 검사
 */
export const validateAriaAttributes = (element: HTMLElement): string[] => {
  const errors: string[] = [];
  
  // aria-labelledby 검증
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(' ');
    ids.forEach(id => {
      if (!document.getElementById(id)) {
        errors.push(`aria-labelledby references non-existent ID: ${id}`);
      }
    });
  }
  
  // aria-describedby 검증
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const ids = describedBy.split(' ');
    ids.forEach(id => {
      if (!document.getElementById(id)) {
        errors.push(`aria-describedby references non-existent ID: ${id}`);
      }
    });
  }
  
  // required aria 속성 확인
  const role = getElementRole(element);
  const requiredAria = getRequiredAriaForRole(role);
  
  requiredAria.forEach(attr => {
    if (!element.hasAttribute(attr)) {
      errors.push(`Missing required ARIA attribute: ${attr} for role: ${role}`);
    }
  });
  
  return errors;
};

/**
 * 역할별 필수 ARIA 속성 반환
 */
const getRequiredAriaForRole = (role: string): string[] => {
  const requirements: Record<string, string[]> = {
    'checkbox': ['aria-checked'],
    'radio': ['aria-checked'],
    'slider': ['aria-valuenow'],
    'spinbutton': ['aria-valuenow'],
    'progressbar': ['aria-valuenow'],
    'tab': ['aria-selected'],
    'option': ['aria-selected']
  };
  
  return requirements[role] || [];
};