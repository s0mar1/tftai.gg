# 🛠️ TFT Meta Analyzer - 기술 스택 상세 가이드

> **프로젝트에서 사용하는 모든 기술의 상세 설명** - AI CLI 도구를 위한 기술 스택 이해 가이드

## 🏗️ TypeScript 철의 장막 규칙

### 핵심 원칙
> **"AI인 네가 사소한 실수도 할 수 없도록 만들어"**

TypeScript 설정은 **최대 엄격성**으로 구성되어 있어, 컴파일 시점에 모든 잠재적 오류를 차단합니다.

### 엄격 모드 설정 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    // 🔒 철의 장막 규칙 - 절대 변경 금지
    "strict": true,                        // 모든 엄격 옵션 활성화
    "noImplicitAny": true,                 // any 타입 자동 추론 금지
    "strictNullChecks": true,              // null/undefined 엄격 체크
    "strictPropertyInitialization": true,  // 프로퍼티 초기화 필수
    "noImplicitReturns": true,             // 모든 경로에서 return 필수
    "noUnusedLocals": true,                // 사용하지 않는 변수 금지
    "noUnusedParameters": true,            // 사용하지 않는 매개변수 금지
    "exactOptionalPropertyTypes": true,    // 선택적 프로퍼티 정확한 타입
    "allowUnreachableCode": false,         // 도달 불가능한 코드 금지
    
    // ESM 모듈 설정
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

### 타입 안전성 예시
```typescript
// ❌ 철의 장막 위반 - 컴파일 에러
function processData(data) {  // Error: Parameter 'data' implicitly has an 'any' type
  return data.value;
}

// ✅ 올바른 코드
interface DataType {
  value: string;
}

function processData(data: DataType): string {
  return data.value;
}
```

## 📦 핵심 기술 스택

### 🔧 Backend 기술 스택

#### Runtime & Framework
| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **Node.js** | 20+ | 런타임 | ESM 네이티브 지원, 성능 개선 |
| **Express.js** | 4.21+ | 웹 프레임워크 | 성숙한 생태계, 미들웨어 풍부 |
| **TypeScript** | 5.8.3 | 타입 시스템 | 타입 안전성, 개발 생산성 |

#### 데이터베이스 & 캐싱
| 기술 | 용도 | 특징 |
|------|------|------|
| **MongoDB** | 주 데이터베이스 | NoSQL, 유연한 스키마 |
| **Mongoose** | ODM | 스키마 검증, 타입 안전성 |
| **Redis (Upstash)** | 분산 캐시 | 서버리스 Redis, 자동 확장 |
| **NodeCache** | 인메모리 캐시 | 빠른 응답, 로컬 캐싱 |

#### AI & 외부 API
| 기술 | 용도 | 특징 |
|------|------|------|
| **Google Gemini** | AI 분석 | 대규모 언어 모델 |
| **Riot Games API** | 게임 데이터 | 공식 API, 실시간 데이터 |

#### 모니터링 & 로깅
```javascript
// Winston 로깅 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 🎨 Frontend 기술 스택

#### 코어 라이브러리
| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|-----------|
| **React** | 18.3+ | UI 라이브러리 | 컴포넌트 기반, 생태계 |
| **Vite** | 5.4+ | 빌드 도구 | 빠른 HMR, ESM 기반 |
| **TypeScript** | 5.8.3 | 타입 시스템 | 타입 안전성 |

#### 상태 관리 & 데이터 페칭
```typescript
// TanStack Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5분
      cacheTime: 10 * 60 * 1000,     // 10분
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
});

// 사용 예시
const { data, isLoading } = useQuery({
  queryKey: ['champions', language],
  queryFn: () => api.getChampions(language),
  staleTime: 24 * 60 * 60 * 1000  // 24시간
});
```

#### 스타일링 & UI
| 기술 | 용도 | 특징 |
|------|------|------|
| **Tailwind CSS** | 유틸리티 CSS | 빠른 스타일링, 일관성 |
| **PostCSS** | CSS 처리 | 자동 벤더 프리픽스 |
| **classnames** | 조건부 클래스 | 동적 스타일링 |

#### 국제화 (i18n)
```javascript
// i18next 설정
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ko',
    supportedLngs: ['ko', 'en', 'ja', 'zh'],
    interpolation: {
      escapeValue: false
    }
  });
```

### 🔗 공유 패키지 기술

#### 타입 정의 전략
```typescript
// shared/src/types.ts
// 백엔드와 프론트엔드가 공유하는 타입 정의

export interface Champion {
  id: string;
  name: string;
  cost: number;
  traits: string[];
}

export interface MatchData {
  matchId: string;
  placement: number;
  units: Unit[];
  traits: ActiveTrait[];
  augments: string[];
}
```

## 🛠️ 개발 도구 및 빌드 시스템

### 📦 패키지 관리자 - pnpm
**선택 이유:**
- **디스크 공간 절약**: 심볼릭 링크 사용
- **빠른 설치**: 병렬 처리, 캐싱
- **엄격한 의존성**: 유령 의존성 방지
- **워크스페이스**: 모노레포 네이티브 지원

```yaml
# pnpm-workspace.yaml
packages:
  - 'frontend'
  - 'backend'
  - 'shared'

preferWorkspacePackages: true
```

### ⚡ 빌드 도구 - Turbo
**특징:**
- **증분 빌드**: 변경된 부분만 빌드
- **원격 캐싱**: 팀 간 캐시 공유
- **병렬 처리**: 의존성 그래프 기반
- **파이프라인**: 작업 순서 자동화

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 🔍 코드 품질 도구

#### ESLint 설정
```javascript
// TypeScript 엄격 규칙
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

#### Prettier 설정
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## 🔒 보안 기술 스택

### 백엔드 보안
```javascript
// Helmet.js - 보안 헤더
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,                   // 최대 100 요청
  message: 'Too many requests'
});

// 입력 검증 (Zod)
const schema = z.object({
  summonerName: z.string().min(3).max(16),
  region: z.enum(['kr', 'na', 'euw', 'jp'])
});
```

### 프론트엔드 보안
- **XSS 방지**: React 자동 이스케이핑
- **HTTPS 강제**: Cloudflare 자동 적용
- **환경변수 보호**: `VITE_` 접두사만 노출
- **CSP 헤더**: Cloudflare Workers 설정

## 📊 성능 최적화 기술

### 백엔드 최적화
```javascript
// 응답 압축
app.use(compression({
  level: 6,
  threshold: 10 * 1024  // 10KB 이상만 압축
}));

// 데이터베이스 연결 풀링
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000
});

// 쿼리 최적화
const aggregatePipeline = [
  { $match: { region: 'kr' } },
  { $sort: { lp: -1 } },
  { $limit: 100 },
  { $project: { name: 1, tier: 1, lp: 1 } }
];
```

### 프론트엔드 최적화
```javascript
// Vite 코드 분할
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@tanstack/react-query', 'react-router-dom'],
          'utils': ['classnames', 'zod']
        }
      }
    }
  }
}

// 지연 로딩
const TierListPage = lazy(() => import('./pages/tierlist/TierListPage'));

// 이미지 최적화
<LazyImage
  src="/champion.webp"
  fallback="/champion-placeholder.jpg"
  alt="Champion"
/>
```

## 🧪 테스팅 전략

### 백엔드 테스팅
```javascript
// Jest + Supertest
describe('GET /api/champions', () => {
  it('should return champions list', async () => {
    const response = await request(app)
      .get('/api/champions')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('champions');
  });
});
```

### 프론트엔드 테스팅
```javascript
// React Testing Library
test('renders champion card', () => {
  render(<ChampionCard champion={mockChampion} />);
  
  expect(screen.getByText(mockChampion.name)).toBeInTheDocument();
  expect(screen.getByText(`Cost: ${mockChampion.cost}`)).toBeInTheDocument();
});
```

## 🚀 미래 기술 스택 로드맵

### 계획 중인 기술
1. **GraphQL**: REST API 대체 고려
2. **WebSocket**: 실시간 업데이트
3. **PWA**: 오프라인 지원
4. **Web Workers**: 무거운 연산 처리
5. **Edge Functions**: 글로벌 엣지 배포

### 실험 중인 기술
- **Bun**: Node.js 대체 런타임
- **SWC**: TypeScript 컴파일러
- **Million.js**: React 최적화
- **Partytown**: 써드파티 스크립트 최적화

---

**💡 팁**: 새로운 기술 도입 시 항상 현재 스택과의 호환성을 확인하고, TypeScript 철의 장막 규칙을 준수하는지 검증하세요. 성능과 타입 안전성이 최우선입니다.