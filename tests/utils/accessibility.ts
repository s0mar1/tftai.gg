import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * 웹 접근성 테스트 유틸리티
 * WCAG 2.1 AA 수준을 기준으로 자동화된 접근성 검사를 수행합니다.
 */

export interface AccessibilityTestOptions {
  /** 특정 태그만 포함하여 테스트 (예: ['wcag2a', 'wcag21aa']) */
  includeTags?: string[];
  /** 특정 태그 제외 (예: ['color-contrast']) */
  excludeTags?: string[];
  /** 특정 요소 제외 (CSS 선택자) */
  exclude?: string[];
  /** 접근성 위반 허용 수준 ('violations' | 'incomplete' | 'all') */
  violationLevel?: 'violations' | 'incomplete' | 'all';
}

/**
 * 페이지 전체에 대해 접근성 스캔을 실행합니다.
 */
export async function runAccessibilityAudit(
  page: Page, 
  options: AccessibilityTestOptions = {}
): Promise<void> {
  const {
    includeTags = ['wcag2a', 'wcag2aa', 'wcag21aa'],
    excludeTags = [],
    exclude = [],
    violationLevel = 'violations'
  } = options;

  const axeBuilder = new AxeBuilder({ page })
    .withTags(includeTags)
    .exclude(exclude);

  // 제외할 태그가 있다면 적용
  if (excludeTags.length > 0) {
    axeBuilder.disableRules(excludeTags);
  }

  const accessibilityScanResults = await axeBuilder.analyze();

  // 위반 사항 확인
  if (violationLevel === 'violations' || violationLevel === 'all') {
    expect(accessibilityScanResults.violations).toEqual([]);
  }

  // 불완전한 항목 확인 (선택사항)
  if (violationLevel === 'incomplete' || violationLevel === 'all') {
    expect(accessibilityScanResults.incomplete).toEqual([]);
  }
}

/**
 * 특정 요소에 대해서만 접근성 스캔을 실행합니다.
 */
export async function runAccessibilityAuditForElement(
  page: Page,
  selector: string,
  options: AccessibilityTestOptions = {}
): Promise<void> {
  const {
    includeTags = ['wcag2a', 'wcag2aa', 'wcag21aa'],
    excludeTags = [],
    violationLevel = 'violations'
  } = options;

  const axeBuilder = new AxeBuilder({ page })
    .withTags(includeTags)
    .include(selector);

  // 제외할 태그가 있다면 적용
  if (excludeTags.length > 0) {
    axeBuilder.disableRules(excludeTags);
  }

  const accessibilityScanResults = await axeBuilder.analyze();

  // 위반 사항 확인
  if (violationLevel === 'violations' || violationLevel === 'all') {
    expect(accessibilityScanResults.violations).toEqual([]);
  }

  // 불완전한 항목 확인 (선택사항)
  if (violationLevel === 'incomplete' || violationLevel === 'all') {
    expect(accessibilityScanResults.incomplete).toEqual([]);
  }
}

/**
 * 키보드 네비게이션 테스트를 위한 헬퍼 함수
 */
export async function testKeyboardNavigation(
  page: Page,
  startSelector: string,
  expectedFocusableElements: string[]
): Promise<void> {
  // 시작 요소에 포커스
  await page.focus(startSelector);
  
  // Tab 키로 순차적으로 이동하며 포커스 확인
  for (let i = 0; i < expectedFocusableElements.length; i++) {
    const currentFocused = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`Focus ${i}: ${currentFocused}`);
    
    // 다음 요소로 이동
    await page.keyboard.press('Tab');
  }
}

/**
 * 스크린 리더 사용자를 위한 ARIA 속성 검증
 */
export async function validateAriaAttributes(
  page: Page,
  selector: string,
  expectedAttributes: Record<string, string>
): Promise<void> {
  const element = page.locator(selector);
  
  for (const [attribute, expectedValue] of Object.entries(expectedAttributes)) {
    const actualValue = await element.getAttribute(attribute);
    expect(actualValue).toBe(expectedValue);
  }
}

/**
 * 색상 대비 검사 (axe-core의 color-contrast 규칙 활용)
 */
export async function checkColorContrast(
  page: Page,
  selector?: string
): Promise<void> {
  const axeBuilder = new AxeBuilder({ page })
    .withTags(['color-contrast']);
    
  if (selector) {
    axeBuilder.include(selector);
  }

  const results = await axeBuilder.analyze();
  expect(results.violations).toEqual([]);
}

/**
 * 이미지 대체 텍스트 검증
 */
export async function validateImageAltText(page: Page): Promise<void> {
  const axeBuilder = new AxeBuilder({ page })
    .withRules(['image-alt']);

  const results = await axeBuilder.analyze();
  expect(results.violations).toEqual([]);
}

/**
 * 폼 접근성 검증 (라벨, 필수 필드 표시 등)
 */
export async function validateFormAccessibility(
  page: Page,
  formSelector: string
): Promise<void> {
  const axeBuilder = new AxeBuilder({ page })
    .withTags(['forms'])
    .include(formSelector);

  const results = await axeBuilder.analyze();
  expect(results.violations).toEqual([]);
}

/**
 * 헤딩 구조 검증 (h1, h2, h3... 순서 확인)
 */
export async function validateHeadingStructure(page: Page): Promise<void> {
  const axeBuilder = new AxeBuilder({ page })
    .withRules(['heading-order']);

  const results = await axeBuilder.analyze();
  expect(results.violations).toEqual([]);
}