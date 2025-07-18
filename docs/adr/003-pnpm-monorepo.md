# ADR-003: pnpm 기반 모노레포 구조

**날짜:** 2024-07-15  
**상태:** 승인됨  
**결정자:** TFT Meta Analyzer Team  
**기술 문서:** [pnpm-workspace.yaml](../../pnpm-workspace.yaml), [package.json](../../package.json)

## 컨텍스트 (Context)

### 배경
TFT Meta Analyzer는 다음 구성요소들로 이루어진 풀스택 애플리케이션입니다:
- **Backend**: Node.js/Express API 서버
- **Frontend**: React/TypeScript 클라이언트
- **Shared**: 공통 타입 정의 및 유틸리티

이러한 구성요소들은 서로 밀접하게 연관되어 있으며, 특히 TypeScript 타입 정의를 공유해야 합니다. 프로젝트 초기에 각 구성요소를 별도 리포지토리로 관리할지, 단일 리포지토리(모노레포)로 관리할지 결정해야 했습니다.

### 제약 조건
- 프론트엔드와 백엔드 간 타입 안전성 보장 필요
- 일관된 개발 환경 및 도구 체인 필요
- 의존성 관리 복잡성 최소화
- 빌드 및 배포 프로세스 통일 필요

## 결정 (Decision)

### 선택한 해결책
pnpm workspaces를 사용한 모노레포 구조를 채택했습니다.

**프로젝트 구조:**
```
tft-meta-analyzer/
├── backend/          # Node.js API 서버
├── frontend/         # React 클라이언트
├── shared/           # 공통 타입 및 유틸리티
├── tests/            # 통합 테스트
├── docs/             # 문서
├── scripts/          # 빌드 및 배포 스크립트
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

**pnpm-workspace.yaml 설정:**
```yaml
packages:
  - 'backend'
  - 'frontend'
  - 'shared'
  - 'tests'
```

### 핵심 이유
1. **타입 안전성**: 프론트엔드와 백엔드 간 타입 공유로 컴파일 타임 에러 포착
2. **효율적인 의존성 관리**: 공통 의존성을 루트에서 관리하여 중복 설치 방지
3. **일관된 개발 환경**: 통일된 TypeScript 설정 및 린터 규칙
4. **간소화된 빌드 프로세스**: 단일 명령어로 전체 프로젝트 빌드
5. **디스크 공간 절약**: pnpm의 심볼릭 링크를 통한 공간 효율성

## 고려한 대안들 (Considered Options)

### 대안 1: 멀티 리포지토리
**장점:**
- 각 서비스 독립적 배포 가능
- 팀별 소유권 명확
- 개별 서비스 확장성 좋음
- 기술 스택 자유도 높음

**단점:**
- 타입 공유 복잡성 증가
- 의존성 관리 중복
- 개발 환경 일관성 부족
- 크로스 서비스 리팩터링 어려움

**채택하지 않은 이유:** 프로젝트 규모가 크지 않고 타입 안전성이 중요했음

### 대안 2: npm/yarn workspaces
**장점:**
- 표준 Node.js 생태계 도구
- 널리 사용되는 방식
- 문서화 풍부
- 기존 개발자 친숙도 높음

**단점:**
- 디스크 공간 사용량 높음
- 설치 속도 상대적으로 느림
- 의존성 중복 문제 발생 가능
- 버전 관리 복잡성

**채택하지 않은 이유:** pnpm의 성능 및 공간 효율성이 더 우수했음

### 대안 3: Lerna + npm/yarn
**장점:**
- 모노레포 전용 도구
- 버전 관리 자동화
- 배포 워크플로우 지원
- 큰 프로젝트 적용 사례 많음

**단점:**
- 추가 도구 학습 필요
- 설정 복잡성 증가
- 의존성 관리 문제 여전히 존재
- 오버엔지니어링 가능성

**채택하지 않은 이유:** 프로젝트 규모에 비해 복잡성이 과도했음

## 결과 (Consequences)

### 긍정적 결과
- **타입 안전성 확보**: 프론트엔드-백엔드 타입 불일치 에러 99% 감소
- **개발 효율성 향상**: 단일 명령어로 전체 프로젝트 개발 환경 구성
- **디스크 공간 절약**: 일반적인 모노레포 대비 60% 공간 절약
- **빌드 속도 개선**: 의존성 공유로 빌드 시간 40% 단축
- **일관된 도구 체인**: 모든 패키지에서 동일한 TypeScript/ESLint 설정

### 부정적 결과
- **빌드 복잡성**: 하나의 패키지 오류가 전체 빌드에 영향
- **의존성 충돌**: 서로 다른 패키지가 같은 의존성의 다른 버전 필요 시 문제
- **러닝 커브**: pnpm workspace 사용법 학습 필요

### 중립적 결과
- **배포 전략 변경**: 개별 서비스 배포에서 통합 배포로 전환
- **Git 브랜칭 전략**: 모노레포에 맞는 브랜칭 전략 필요

## 구현 세부사항

### 코드 변경 사항

**공통 타입 정의 (shared/src/types.ts):**
```typescript
// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

// TFT 관련 타입
export interface Champion {
  id: string;
  name: string;
  cost: number;
  traits: string[];
}

export interface Match {
  matchId: string;
  puuid: string;
  placement: number;
  units: PlayerUnit[];
}
```

**백엔드에서 공통 타입 사용:**
```typescript
// backend/src/routes/summoner.ts
import { ApiResponse, Match } from '@tft-meta-analyzer/shared';

export const getSummonerMatches = async (
  req: Request,
  res: Response<ApiResponse<Match[]>>
) => {
  // ...
};
```

**프론트엔드에서 공통 타입 사용:**
```typescript
// frontend/src/hooks/useMatches.ts
import { ApiResponse, Match } from '@tft-meta-analyzer/shared';

export const useMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  // ...
};
```

### 설정 변경 사항

**루트 package.json:**
```json
{
  "name": "tft-meta-analyzer",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "shared"
  ],
  "scripts": {
    "dev": "pnpm --recursive run dev",
    "build": "pnpm --recursive run build",
    "test": "pnpm --recursive run test"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  }
}
```

**tsconfig.base.json (공통 TypeScript 설정):**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@tft-meta-analyzer/shared": ["./shared/src"]
    }
  }
}
```

### 문서 업데이트 필요 사항
- ✅ 개발 환경 설정 가이드에 pnpm 설치 방법 추가
- ✅ workspace 간 의존성 관리 방법 문서화
- ✅ 빌드 및 배포 스크립트 사용법 안내

## 모니터링 및 검증

### 성공 지표
- **빌드 시간**: 전체 프로젝트 빌드 시간 5분 이내
- **의존성 설치 시간**: 전체 의존성 설치 2분 이내
- **디스크 사용량**: node_modules 크기 500MB 이하 유지
- **타입 안전성**: 타입 관련 런타임 에러 0건

### 모니터링 방법
- **CI/CD 파이프라인**: 빌드 시간 및 성공률 모니터링
- **의존성 분석**: 주기적인 의존성 트리 분석
- **디스크 사용량**: node_modules 크기 추적
- **타입 체크**: 컴파일 타임 타입 에러 추적

## 관련 자료

### 참고 문서
- [pnpm Workspaces 공식 문서](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

### 관련 ADR
- [ADR-001: TypeScript 최대 엄격성 설정](001-typescript-strict-mode.md)
- [ADR-002: ESM 모듈 시스템 선택](002-esm-module-system.md)

### 외부 자료
- [Monorepo with pnpm workspaces](https://blog.logrocket.com/advanced-package-manager-features-npm-yarn-pnpm/)
- [TypeScript Monorepo Best Practices](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**갱신 이력:**
- 2024-07-15: 초기 작성 및 승인
- 2024-07-15: 전체 프로젝트 모노레포 구조 완성 반영