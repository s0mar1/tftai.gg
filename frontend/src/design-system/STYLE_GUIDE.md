# TFT Meta Analyzer 스타일 가이드

## 📌 개요

이 문서는 TFT Meta Analyzer 프로젝트의 디자인 시스템과 스타일 가이드를 정리한 문서입니다.
기존 스타일을 유지하면서 점진적으로 개선하기 위한 참고 자료입니다.

---

## 🎨 색상 시스템

### 현재 사용 중인 색상

#### 브랜드 색상
- `brand-mint`: #3ED2B9 - 메인 브랜드 색상
- 새로운 alias: `brand` (점진적 마이그레이션용)

#### 텍스트 색상
| 용도 | Light Mode | Dark Mode | 새로운 Alias |
|------|------------|-----------|--------------|
| 주요 텍스트 | `text-primary` (#2E2E2E) | `dark:text-dark-text-primary` (#E0E0E0) | `text-primary` |
| 보조 텍스트 | `text-secondary` (#6E6E6E) | `dark:text-dark-text-secondary` (#A0AEC0) | `text-secondary` |

#### 배경 색상
| 용도 | Light Mode | Dark Mode | 새로운 Alias |
|------|------------|-----------|--------------|
| 페이지 배경 | `bg-background-base` (#FAFFFF) | `dark:bg-dark-background-base` (#121212) | `bg-surface-base` |
| 카드 배경 | `bg-background-card` (#FFFFFF) | `dark:bg-dark-background-card` (#1A1A1A) | `bg-surface-card` |
| 패널 배경 | `bg-panel-bg-primary` (#FFFFFF) | `dark:bg-dark-panel-bg-primary` (#1E1E1E) | `bg-surface-panel` |

#### 회색 계열
- `tft-gray-100`: #F3F4F6 → `neutral-100`
- `tft-gray-200`: #E5E7EB → `neutral-200`
- `tft-gray-700`: #4B5563 → `neutral-700`
- `tft-gray-900`: #1f2937 → `neutral-900`

#### 시스템 색상
- `error-red`: #E74C3C - 에러 메시지
- `border-light`: #E6E6E6 - 테두리 색상

---

## 📝 타이포그래피

### 폰트 스택
```css
font-family: 'Inter', 'Roboto', 'Noto Sans KR', sans-serif;
```

### 텍스트 스타일

#### 제목 (Headings)
| 레벨 | 클래스 | 사용 예시 |
|------|--------|-----------|
| Hero | `text-5xl font-extrabold` | 홈페이지 메인 타이틀 |
| Section | `text-2xl font-bold` | 섹션 제목 |
| Card | `text-lg font-semibold` | 카드 제목 |
| Sub | `text-base font-medium` | 부제목 |

#### 본문 (Body)
| 크기 | 클래스 | 사용 예시 |
|------|--------|-----------|
| Large | `text-base` | 주요 본문 |
| Default | `text-sm` | 일반 텍스트 |
| Small | `text-xs` | 작은 텍스트, 라벨 |

---

## 🧩 컴포넌트 스타일

### Button
```tsx
// Primary 버튼
<Button variant="primary">확인</Button>
// 클래스: bg-brand-mint text-white hover:bg-brand-mint/90

// Secondary 버튼
<Button variant="secondary">취소</Button>
// 클래스: bg-panel-bg-secondary text-text-primary border

// Outline 버튼
<Button variant="outline">더보기</Button>
// 클래스: bg-transparent text-text-primary border
```

### Card
```tsx
// 기본 카드
<Card variant="default" size="md">
  내용
</Card>
// 클래스: bg-background-card border rounded-lg

// Elevated 카드 (그림자)
<Card variant="elevated">
  내용
</Card>
// 클래스: bg-background-card rounded-lg shadow-block

// 클릭 가능한 카드
<Card clickable>
  내용
</Card>
// hover 효과 추가
```

---

## 🔄 점진적 마이그레이션 가이드

### Phase 1: 새로운 컴포넌트
새로 작성하는 컴포넌트는 다음 패턴을 따릅니다:

```tsx
// ❌ 기존 방식
<div className="bg-background-card dark:bg-dark-background-card">

// ✅ 새로운 방식 (utils/styles.ts 활용)
import { cardStyles } from '@/utils/styles';
<div className={cardStyles.variants.default}>
```

### Phase 2: 기존 컴포넌트 수정 시
기존 컴포넌트를 수정할 때만 점진적으로 업데이트:

```tsx
// 색상 alias 사용
// 기존: text-text-primary
// 신규: text-primary (Tailwind config의 새 alias)
```

### Phase 3: 일관성 체크리스트
- [ ] 동일한 용도의 요소는 동일한 스타일 사용
- [ ] 다크모드 클래스 포함 여부 확인
- [ ] hover/focus 상태 스타일 확인
- [ ] 반응형 클래스 필요 여부 확인

---

## 📐 레이아웃 패턴

### Container
```tsx
// 기본 컨테이너
<div className="max-w-7xl mx-auto px-6">

// 좁은 컨테이너
<div className="max-w-4xl mx-auto px-6">

// 전체 너비
<div className="w-full px-6">
```

### Grid
```tsx
// 3열 그리드 (반응형)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// 2열 그리드
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

---

## 🚀 Quick Reference

### 자주 사용하는 조합

#### 카드 헤더
```tsx
className="flex items-start justify-between"
```

#### 중앙 정렬 컨테이너
```tsx
className="flex items-center justify-center"
```

#### 텍스트 말줄임
```tsx
className="truncate"
// 또는
className="line-clamp-2" // 2줄까지 표시
```

#### 호버 효과
```tsx
className="hover:bg-tft-gray-100 dark:hover:bg-dark-tft-gray-100"
```

---

## 📋 체크리스트

새로운 컴포넌트 작성 시:
- [ ] `utils/styles.ts`의 공통 스타일 확인
- [ ] 다크모드 스타일 포함
- [ ] 반응형 breakpoint 고려
- [ ] 접근성 속성 추가 (aria-label 등)
- [ ] hover/focus/active 상태 정의

---

이 가이드는 지속적으로 업데이트됩니다. 
질문이나 제안사항이 있으면 팀에 공유해주세요.