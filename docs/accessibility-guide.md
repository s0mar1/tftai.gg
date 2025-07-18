# TFT Meta Analyzer 접근성 가이드

## 개요
이 가이드는 TFT Meta Analyzer 프로젝트의 웹 접근성(Web Accessibility) 표준과 구현 방법을 설명합니다. 우리는 WCAG 2.1 AA 수준을 기준으로 모든 사용자가 우리 서비스를 원활하게 이용할 수 있도록 보장합니다.

## 📋 목차
1. [접근성 원칙](#접근성-원칙)
2. [구현된 접근성 기능](#구현된-접근성-기능)
3. [접근성 컴포넌트 사용법](#접근성-컴포넌트-사용법)
4. [테스트 방법](#테스트-방법)
5. [개발 가이드라인](#개발-가이드라인)
6. [체크리스트](#체크리스트)

## 🎯 접근성 원칙

### 1. 인지 가능성 (Perceivable)
- **텍스트 대안**: 모든 이미지에 의미 있는 대체 텍스트 제공
- **색상 대비**: WCAG AA 기준 4.5:1 이상의 색상 대비 유지
- **확대**: 200%까지 확대 시에도 가로 스크롤 없이 이용 가능

### 2. 운용 가능성 (Operable)
- **키보드 접근**: 모든 기능을 키보드만으로 사용 가능
- **포커스 관리**: 명확한 포커스 표시 및 논리적 순서
- **충분한 시간**: 시간 제한이 있는 경우 사용자가 연장 가능

### 3. 이해 가능성 (Understandable)
- **명확한 언어**: 간결하고 이해하기 쉬운 콘텐츠
- **일관성**: 동일한 기능은 동일한 방식으로 작동
- **오류 방지**: 입력 오류를 방지하고 명확한 오류 메시지 제공

### 4. 견고성 (Robust)
- **호환성**: 다양한 보조 기술과 브라우저에서 작동
- **표준 준수**: 유효한 HTML과 ARIA 속성 사용

## 🔧 구현된 접근성 기능

### ESLint 접근성 검사
```bash
# ESLint 접근성 규칙 검사
npm run lint
```

설정된 규칙:
- `jsx-a11y/alt-text`: 이미지 대체 텍스트 필수
- `jsx-a11y/aria-props`: 유효한 ARIA 속성만 사용
- `jsx-a11y/click-events-have-key-events`: 클릭 이벤트에 키보드 이벤트 추가
- `jsx-a11y/heading-has-content`: 헤딩에 의미 있는 콘텐츠 필수

### 자동화된 접근성 테스트
```bash
# Playwright 접근성 테스트 실행
npx playwright test tests/e2e/accessibility.spec.ts
```

테스트 범위:
- 전체 페이지 접근성 스캔
- 키보드 네비게이션 테스트
- 색상 대비 검사
- ARIA 속성 검증

### Header/Navigation 접근성
- **landmark 역할**: `<header role="banner">`와 `<nav role="navigation">` 사용
- **건너뛰기 링크**: 메인 콘텐츠로 바로 이동 가능
- **키보드 네비게이션**: Tab과 화살표 키로 모든 요소 접근 가능
- **의미 있는 링크**: 각 링크의 목적이 명확함

### Search Bar 접근성
- **폼 역할**: `role="search"` 명시
- **라벨링**: 모든 입력 필드에 적절한 라벨 제공
- **오류 처리**: `aria-invalid`와 `role="alert"`로 오류 상태 전달
- **도움말**: `aria-describedby`로 입력 형식 안내

### 다크모드 토글 접근성
- **상태 표시**: `aria-pressed` 속성으로 현재 상태 전달
- **명확한 라벨**: 현재 모드와 전환될 모드를 명시
- **키보드 지원**: Enter와 Space 키로 토글 가능
- **포커스 표시**: 명확한 포커스 링 제공

## 🧩 접근성 컴포넌트 사용법

### 1. SkipLink 컴포넌트
메인 콘텐츠로 바로 이동하는 건너뛰기 링크:

```tsx
import SkipLink from '../components/common/SkipLink';

<SkipLink targetId="main-content">
  메인 콘텐츠로 건너뛰기
</SkipLink>
```

### 2. VisuallyHidden 컴포넌트
스크린 리더에만 읽히는 텍스트:

```tsx
import VisuallyHidden from '../components/common/VisuallyHidden';

<VisuallyHidden>
  현재 페이지: 홈
</VisuallyHidden>
```

### 3. FocusTrap 컴포넌트
모달에서 포커스를 제한:

```tsx
import FocusTrap from '../components/common/FocusTrap';

<FocusTrap isActive={isModalOpen} onEscape={closeModal}>
  <div>모달 콘텐츠</div>
</FocusTrap>
```

### 4. LiveRegion 컴포넌트
동적 콘텐츠 변경 알림:

```tsx
import LiveRegion, { useLiveRegion } from '../components/common/LiveRegion';

const { announce, LiveRegions } = useLiveRegion();

// 사용법
announce('데이터가 업데이트되었습니다', 'polite');

// JSX에서 렌더링
<LiveRegions />
```

### 5. 키보드 네비게이션 훅
화살표 키 네비게이션 구현:

```tsx
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

useKeyboardNavigation({
  itemSelector: '.nav-item',
  enableVertical: true,
  wrap: true,
  onEnter: (element) => element.click()
});
```

### 6. 포커스 관리 훅
컴포넌트의 포커스 상태 관리:

```tsx
import { useFocusManagement } from '../hooks/useFocusManagement';

const { containerRef, focusFirst, focusLast } = useFocusManagement({
  autoFocus: true,
  restoreFocus: true
});
```

## 🧪 테스트 방법

### 1. 자동화된 테스트
```bash
# ESLint 접근성 규칙 검사
npm run lint

# Playwright 접근성 테스트
npx playwright test tests/e2e/accessibility.spec.ts

# 모든 테스트 실행
npm test
```

### 2. 수동 테스트

#### 키보드 네비게이션 테스트
1. **Tab 키**: 모든 대화형 요소 순차 접근
2. **Shift+Tab**: 역순 네비게이션
3. **Enter/Space**: 버튼과 링크 활성화
4. **화살표 키**: 메뉴나 탭에서 방향 이동
5. **Esc**: 모달이나 메뉴 닫기

#### 스크린 리더 테스트
1. **NVDA/JAWS** (Windows)
2. **VoiceOver** (macOS)
3. **Orca** (Linux)

주요 확인 사항:
- 헤딩 구조가 논리적인가?
- 링크 텍스트가 의미를 전달하는가?
- 폼 라벨이 명확한가?
- 오류 메시지가 읽히는가?

#### 색상 대비 테스트
1. **WebAIM Contrast Checker** 사용
2. **브라우저 개발자 도구** 색상 대비 확인
3. **색맹 시뮬레이터**로 다양한 색각 이상 테스트

### 3. 브라우저 확장 프로그램
- **axe DevTools**: 자동 접근성 검사
- **WAVE**: 페이지 접근성 평가
- **Lighthouse**: 접근성 점수 확인

## 📝 개발 가이드라인

### HTML 시맨틱 마크업
```html
<!-- 좋은 예 -->
<main>
  <h1>페이지 제목</h1>
  <section>
    <h2>섹션 제목</h2>
    <article>
      <h3>아티클 제목</h3>
    </article>
  </section>
</main>

<!-- 나쁜 예 -->
<div>
  <div class="title">페이지 제목</div>
  <div>
    <div class="subtitle">섹션 제목</div>
  </div>
</div>
```

### ARIA 속성 사용
```tsx
// 좋은 예 - 명확한 역할과 상태
<button 
  aria-expanded={isOpen} 
  aria-controls="menu-list"
  aria-label="메뉴 열기"
>
  메뉴
</button>

// 나쁜 예 - 불필요한 ARIA
<button role="button">클릭</button>
```

### 폼 접근성
```tsx
// 좋은 예 - 명시적 라벨
<label htmlFor="email">이메일 주소</label>
<input 
  id="email" 
  type="email" 
  aria-describedby="email-help"
  aria-invalid={hasError}
/>
<div id="email-help">example@domain.com 형식으로 입력하세요</div>

// 나쁜 예 - 라벨 없음
<input type="email" placeholder="이메일" />
```

### 이미지 접근성
```tsx
// 좋은 예 - 의미 있는 대체 텍스트
<img 
  src="chart.png" 
  alt="2024년 1월 TFT 메타 통계: 빌드 승률 차트" 
/>

// 장식용 이미지
<img src="decoration.png" alt="" role="presentation" />

// 나쁜 예 - 불필요한 대체 텍스트
<img src="chart.png" alt="이미지" />
```

## ✅ 접근성 체크리스트

### 기본 요구사항
- [ ] 모든 이미지에 적절한 `alt` 속성
- [ ] 폼 요소에 라벨 연결
- [ ] 헤딩 구조의 논리적 순서 (h1 → h2 → h3)
- [ ] 키보드만으로 모든 기능 사용 가능
- [ ] 포커스 표시가 명확함
- [ ] 색상에만 의존하지 않는 정보 전달

### ARIA 접근성
- [ ] 적절한 `role` 속성 사용
- [ ] `aria-label` 또는 `aria-labelledby`로 명확한 라벨
- [ ] `aria-expanded`, `aria-selected` 등 상태 속성
- [ ] `aria-describedby`로 추가 정보 제공
- [ ] `aria-live` 영역으로 동적 콘텐츠 알림

### 키보드 네비게이션
- [ ] Tab 순서가 논리적
- [ ] 모든 대화형 요소에 키보드 접근 가능
- [ ] 건너뛰기 링크 제공
- [ ] 포커스 트랩 (모달에서)
- [ ] Esc 키로 닫기 기능

### 시각적 접근성
- [ ] 최소 4.5:1 색상 대비 (일반 텍스트)
- [ ] 최소 3:1 색상 대비 (큰 텍스트)
- [ ] 200% 확대 시에도 가로 스크롤 없음
- [ ] 포커스 표시가 충분히 대비됨

### 콘텐츠 접근성
- [ ] 명확하고 간결한 언어 사용
- [ ] 링크 텍스트가 목적을 명확히 설명
- [ ] 오류 메시지가 구체적이고 도움이 됨
- [ ] 시간 제한이 있는 경우 연장 옵션 제공

## 🔗 참고 자료

### 공식 가이드라인
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN 접근성 가이드](https://developer.mozilla.org/ko/docs/Web/Accessibility)

### 테스트 도구
- [WebAIM WAVE](https://wave.webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### React 접근성
- [React 접근성 문서](https://ko.reactjs.org/docs/accessibility.html)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [React Testing Library 접근성](https://testing-library.com/docs/guide-which-query)

---

이 가이드는 지속적으로 업데이트되며, 새로운 접근성 요구사항이나 기술이 도입될 때마다 개선됩니다. 접근성 관련 질문이나 제안사항이 있으시면 개발팀에 문의해 주세요.