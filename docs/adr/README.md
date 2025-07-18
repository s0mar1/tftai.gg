# Architecture Decision Records (ADR)

## 개요

이 디렉토리는 TFT Meta Analyzer 프로젝트의 중요한 아키텍처 결정 사항들을 기록하고 관리하기 위한 공간입니다. 

ADR(Architecture Decision Records)은 프로젝트의 아키텍처 결정을 문서화하는 표준 방법으로, 각 결정의 배경, 고려사항, 결과를 체계적으로 기록합니다.

## 목적

- 🎯 **결정의 투명성**: 아키텍처 결정의 배경과 이유를 명확히 기록
- 📚 **지식 보존**: 팀원 변경에도 불구하고 결정의 맥락을 유지
- 🔄 **재검토 기준**: 미래에 결정을 재검토할 때 필요한 정보 제공
- 🚀 **온보딩 지원**: 신규 팀원이 프로젝트의 아키텍처를 이해하는 데 도움

## ADR 목록

### 핵심 아키텍처 결정
- [ADR-001: TypeScript 최대 엄격성 설정 ("철의 장막 규칙")](001-typescript-strict-mode.md)
- [ADR-002: ESM 모듈 시스템 선택](002-esm-module-system.md)
- [ADR-003: pnpm 기반 모노레포 구조](003-pnpm-monorepo.md)
- [ADR-004: MongoDB + Redis 이중 캐싱 전략](004-dual-caching-strategy.md)
- [ADR-005: 중앙집중식 에러 핸들링](005-centralized-error-handling.md)

### 개발 워크플로우
- [ADR-006: AI CLI 도구 협업 방식](006-ai-cli-collaboration.md)
- [ADR-007: 점진적 TypeScript 도입 전략](007-gradual-typescript-adoption.md)

### 보안 및 성능
- [ADR-008: 고도화된 레이트 리미팅 전략](008-advanced-rate-limiting.md)

## ADR 작성 가이드

### 1. ADR 번호 규칙
- 연속된 3자리 번호 사용 (001, 002, 003...)
- 번호는 중복되지 않으며 한번 사용된 번호는 재사용하지 않음

### 2. 파일명 규칙
```
[번호]-[결정-내용-요약].md
```

**예시:**
- `001-typescript-strict-mode.md`
- `002-esm-module-system.md`

### 3. 작성 절차

1. **템플릿 복사**: `template.md` 파일을 복사하여 새 ADR 파일 생성
2. **내용 작성**: 템플릿의 각 섹션을 충실히 작성
3. **검토 및 승인**: 팀원 검토 후 상태를 "승인됨"으로 변경
4. **인덱스 업데이트**: 이 README.md 파일의 ADR 목록에 추가

### 4. 상태 관리

- **제안됨**: 아직 검토 중인 결정
- **승인됨**: 팀에서 승인되어 적용 중인 결정
- **폐기됨**: 더 이상 유효하지 않은 결정
- **대체됨**: 다른 ADR에 의해 대체된 결정

## 사용 방법

### 새로운 ADR 작성
```bash
# 1. 템플릿 복사
cp docs/adr/template.md docs/adr/009-new-decision.md

# 2. 내용 작성
# 템플릿의 각 섹션을 실제 내용으로 대체

# 3. 검토 및 승인
# 팀원 검토 후 상태를 "승인됨"으로 변경

# 4. 인덱스 업데이트
# 이 README.md 파일의 ADR 목록에 추가
```

### 기존 ADR 검토
```bash
# 특정 ADR 검토
cat docs/adr/001-typescript-strict-mode.md

# 모든 ADR 목록 확인
ls docs/adr/*.md
```

## 베스트 프랙티스

### ✅ 권장사항
- 결정의 배경과 맥락을 상세히 기록
- 고려한 대안들과 채택하지 않은 이유 명시
- 구체적인 코드 예시와 설정 변경 사항 포함
- 측정 가능한 성공 지표 정의

### ❌ 주의사항
- 너무 세부적인 구현 디테일은 코드 주석에 위임
- 자주 변경되는 설정값은 ADR 대상이 아님
- 개인적인 선호도보다는 객관적인 기준으로 결정

## 관련 도구

### ADR 관리 도구
- [ADR Tools](https://github.com/npryce/adr-tools): ADR 관리를 위한 CLI 도구
- [ADR Viewer](https://github.com/mrwilson/adr-viewer): ADR을 HTML로 변환하는 도구

### 문서 자동화
- ADR 인덱스 자동 생성: `scripts/generate-adr-index.js`
- 문서 링크 검증: `scripts/validate-adr-links.js`

## 피드백 및 개선

ADR 프로세스나 템플릿에 대한 개선사항이 있다면 다음과 같이 피드백해주세요:

1. **GitHub Issue**: 개선사항을 이슈로 등록
2. **Pull Request**: 직접 개선사항을 제안
3. **팀 회의**: 정기 회의에서 ADR 프로세스 검토

---

**마지막 업데이트**: 2024-07-15  
**관리자**: TFT Meta Analyzer Team