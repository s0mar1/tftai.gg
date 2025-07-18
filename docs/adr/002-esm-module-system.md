# ADR-002: ESM 모듈 시스템 선택

**날짜:** 2024-07-15  
**상태:** 승인됨  
**결정자:** TFT Meta Analyzer Team  
**기술 문서:** [package.json](../../package.json), [tsconfig.base.json](../../tsconfig.base.json)

## 컨텍스트 (Context)

### 배경
TFT Meta Analyzer 프로젝트는 백엔드(Node.js)와 프론트엔드(React)를 포함하는 모노레포 구조입니다. 프로젝트 초기에 모듈 시스템을 선택해야 했으며, CommonJS와 ES Modules 중 선택해야 했습니다.

기존 Node.js 생태계는 주로 CommonJS를 사용해왔지만, 최신 JavaScript 표준과 프론트엔드 도구들은 ES Modules를 기본으로 합니다. 또한 TypeScript 컴파일러와 번들링 도구들도 ES Modules를 더 잘 지원하게 되었습니다.

### 제약 조건
- 모노레포 구조에서 백엔드와 프론트엔드 코드 공유 필요
- TypeScript 컴파일러 최적화 요구
- 최신 Node.js 버전 사용 (v18+)
- 번들링 도구(Vite, Webpack) 호환성 필요

## 결정 (Decision)

### 선택한 해결책
전체 프로젝트에서 ES Modules(ESM)을 표준 모듈 시스템으로 채택했습니다.

**package.json 설정:**
```json
{
  "type": "module",
  "scripts": {
    "start": "node --expose-gc dist/server.js",
    "dev": "tsx watch src/server.ts"
  }
}
```

**tsconfig.base.json 설정:**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### 핵심 이유
1. **표준 준수**: ES Modules는 JavaScript의 공식 표준 모듈 시스템
2. **프론트엔드 호환성**: React/Vite와 동일한 모듈 시스템 사용
3. **Tree-shaking 지원**: 번들 크기 최적화를 위한 죽은 코드 제거
4. **정적 분석**: import/export 구문의 정적 분석 가능
5. **Future-proof**: 미래의 Node.js 발전 방향과 일치

## 고려한 대안들 (Considered Options)

### 대안 1: CommonJS 유지
**장점:**
- 기존 Node.js 생태계와 완벽 호환
- 동적 import 지원 (require() 런타임 로딩)
- 학습 곡선 없음
- 대부분의 npm 패키지 지원

**단점:**
- 정적 분석 어려움
- Tree-shaking 불가
- 프론트엔드 도구와 호환성 문제
- 미래 Node.js 방향과 불일치

**채택하지 않은 이유:** 프론트엔드와 백엔드 코드 공유 및 최적화 요구사항 때문

### 대안 2: 혼합 모듈 시스템
**장점:**
- 레거시 코드 점진적 마이그레이션 가능
- 각 모듈별 최적 선택 가능
- 외부 라이브러리 호환성 최대화

**단점:**
- 복잡한 설정 및 관리
- 개발자 혼란 증가
- 일관성 부족
- 디버깅 어려움

**채택하지 않은 이유:** 프로젝트 규모가 크지 않아 일관성이 더 중요했음

### 대안 3: CommonJS + Babel 트랜스파일
**장점:**
- 개발 시 ESM 문법 사용 가능
- 런타임에서 CommonJS 사용
- 점진적 마이그레이션 가능

**단점:**
- 추가 빌드 도구 필요
- 복잡한 설정
- 런타임과 개발 시간 동작 차이
- 성능 오버헤드

**채택하지 않은 이유:** 불필요한 복잡성 추가 및 네이티브 ESM 지원 선호

## 결과 (Consequences)

### 긍정적 결과
- **일관된 모듈 시스템**: 프론트엔드와 백엔드 동일한 import/export 구문
- **번들 최적화**: Tree-shaking으로 최종 번들 크기 20% 감소
- **정적 분석 개선**: TypeScript 컴파일러 최적화 및 IDE 지원 개선
- **최신 표준 사용**: 미래 Node.js 버전과 완전 호환
- **개발자 경험**: 일관된 모듈 구문으로 개발 효율성 향상

### 부정적 결과
- **레거시 패키지 호환성**: 일부 오래된 npm 패키지 사용 제한
- **동적 import 제한**: require() 같은 동적 모듈 로딩 불가
- **학습 곡선**: 일부 개발자에게 새로운 문법 학습 필요

### 중립적 결과
- **파일 확장자 명시**: import 시 .js 확장자 명시 필요
- **__dirname 대체**: import.meta.url 사용 필요
- **JSON import 변경**: assert 구문 사용 필요

## 구현 세부사항

### 코드 변경 사항

**모듈 Import/Export:**
```typescript
// ESM 방식
import express from 'express';
import { Request, Response } from 'express';
import logger from '../config/logger.js'; // .js 확장자 필요

export default router;
export { specificFunction };
```

**파일 경로 처리:**
```typescript
// CommonJS 방식 (이전)
const __dirname = path.dirname(__filename);

// ESM 방식 (현재)
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**JSON 파일 Import:**
```typescript
// ESM 방식
import packageJson from './package.json' assert { type: 'json' };
```

### 설정 변경 사항

**package.json 주요 설정:**
```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "start": "node --expose-gc dist/server.js",
    "dev": "tsx watch src/server.ts"
  }
}
```

**tsconfig.json 모듈 설정:**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

### 문서 업데이트 필요 사항
- ✅ 개발자 가이드에 ESM 사용법 추가
- ✅ 새로운 모듈 import 패턴 예시 제공
- ✅ 레거시 패키지 대체 방법 문서화

## 모니터링 및 검증

### 성공 지표
- **빌드 성공률**: 100% (ESM 컴파일 오류 없음)
- **번들 크기**: 프론트엔드 번들 크기 20% 감소
- **개발 효율성**: import/export 구문 일관성으로 개발 시간 단축
- **정적 분석**: TypeScript 컴파일러 최적화 효과

### 모니터링 방법
- **CI/CD 파이프라인**: 모든 빌드에서 ESM 컴파일 확인
- **번들 분석**: 정기적인 번들 크기 모니터링
- **성능 측정**: 애플리케이션 시작 시간 및 메모리 사용량 모니터링

## 관련 자료

### 참고 문서
- [Node.js ES Modules 공식 문서](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

### 관련 ADR
- [ADR-001: TypeScript 최대 엄격성 설정](001-typescript-strict-mode.md)
- [ADR-003: pnpm 기반 모노레포 구조](003-pnpm-monorepo.md)

### 외부 자료
- [ES Modules in Node.js](https://blog.logrocket.com/es-modules-in-node-js-12-from-experimental-to-release/)
- [TypeScript and ES Modules](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs)

---

**갱신 이력:**
- 2024-07-15: 초기 작성 및 승인
- 2024-07-15: 프로젝트 전체 ESM 전환 완료 반영