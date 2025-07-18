# AI CLI 도구를 위한 TFT Meta Analyzer 작업 가이드

## 🚨 TypeScript 철의 장막 규칙

> **"우리 프로젝트의 TypeScript 설정을 가장 엄격하게 만들어줘. `tsconfig.json` 파일에서 `strict`와 관련된 모든 옵션을 활성화해서, AI인 네가 사소한 실수도 할 수 없도록 만들어. 이걸 우리 프로젝트의 '철의 장막' 규칙으로 삼자."**

이 프로젝트는 **최대 엄격성의 TypeScript 설정**을 사용합니다:
- `noImplicitAny: true` - any 타입 사용 절대 금지
- `strictNullChecks: true` - null/undefined 엄격 체크
- `noUnusedLocals: true` - 사용하지 않는 변수 금지
- `noUnusedParameters: true` - 사용하지 않는 매개변수 금지
- `noImplicitReturns: true` - 모든 경로에서 return 필수
- `allowUnreachableCode: false` - 도달할 수 없는 코드 금지

**AI CLI 도구는 이 규칙을 절대 위반하지 말고, 타입 안전성을 최우선으로 코드를 작성해야 합니다.**

---

# 대규모 코드베이스 분석을 위한 Gemini CLI 사용

컨텍스트 제한을 초과할 수 있는 대규모 코드베이스나 여러 파일을 분석할 때는 대규모 기능을 갖춘 Gemini CLI를 사용하세요.
컨텍스트 창. Google Gemini의 대용량 컨텍스트 기능을 활용하려면 `gemini -p`를 사용하세요.

## 파일 및 디렉터리 포함 구문

Gemini 프롬프트에 파일과 디렉터리를 포함하려면 `@` 구문을 사용하세요. 경로는 실행 위치를 기준으로 해야 합니다.
  제미니 명령:

### 예:

**단일 파일 분석:**
gemini -p "@src/main.py 이 파일의 목적과 구조를 설명하세요"

여러 파일:
gemini -p "@package.json @src/index.js 코드에서 사용된 종속성을 분석합니다"

전체 디렉토리:
gemini -p "@src/ 이 코드베이스의 아키텍처를 요약합니다"

여러 디렉토리:
gemini -p "@src/ @tests/ 소스 코드에 대한 테스트 커버리지 분석"

현재 디렉토리 및 하위 디렉토리:
gemini -p "@./ 이 프로젝트 전체에 대한 개요를 알려주세요"

# 또는 --all_files 플래그를 사용하세요:
gemini --all_files -p "프로젝트 구조 및 종속성 분석"

구현 검증 예

기능이 구현되었는지 확인하세요.
gemini -p "@src/ @lib/ 이 코드베이스에 다크 모드가 구현되어 있나요? 관련 파일과 함수를 보여주세요"

인증 구현 확인:
gemini -p "@src/ @middleware/ JWT 인증이 구현되어 있습니까? 모든 인증 관련 엔드포인트와 미들웨어를 나열합니다."

특정 패턴을 확인하세요:
gemini -p "@src/ WebSocket 연결을 처리하는 React 훅이 있나요? 파일 경로와 함께 나열하세요"

오류 처리 확인:
gemini -p "@src/ @api/ 모든 API 엔드포인트에 대해 적절한 오류 처리가 구현되어 있습니까? try-catch 블록의 예를 보여주세요"

속도 제한을 확인하세요:
gemini -p "@backend/ @middleware/ API에 속도 제한이 구현되어 있습니까? 구현 세부 정보를 표시합니다."

캐싱 전략 확인:
gemini -p "@src/ @lib/ @services/ Redis 캐싱이 구현되어 있나요? 캐시 관련 함수와 사용법을 모두 나열하세요"

특정 보안 조치를 확인하세요.
gemini -p "@src/ @api/ SQL 주입 보호 기능이 구현되어 있나요? 사용자 입력이 어떻게 정제되는지 보여주세요"

기능에 대한 테스트 범위를 확인하세요.
gemini -p "@src/payment/ @tests/ 결제 처리 모듈이 완전히 테스트되었습니까? 모든 테스트 케이스를 나열하세요"

Gemini CLI를 사용해야 하는 경우

다음과 같은 경우 gemini -p를 사용하세요:
- 전체 코드베이스 또는 대규모 디렉토리 분석
- 여러 개의 대용량 파일 비교
- 프로젝트 전반의 패턴이나 아키텍처를 이해해야 함
- 현재 컨텍스트 창이 작업에 충분하지 않습니다.
- 총 100KB가 넘는 파일 작업
- 특정 기능, 패턴 또는 보안 조치가 구현되었는지 확인
- 전체 코드베이스에서 특정 코딩 패턴의 존재 여부 확인

중요 참고 사항

- @ 구문의 경로는 gemini를 호출할 때 현재 작업 디렉토리를 기준으로 합니다.
- CLI는 파일 내용을 컨텍스트에 직접 포함합니다.
- 읽기 전용 분석에는 --yolo 플래그가 필요하지 않습니다.
- Gemini의 컨텍스트 창은 Claude의 컨텍스트를 오버플로할 수 있는 전체 코드베이스를 처리할 수 있습니다.
- 구현을 확인할 때 정확한 결과를 얻기 위해 무엇을 찾고 있는지 구체적으로 설명하십시오.

---

# Claude Code MCP 서버 활용 가이드

## 🎯 MCP vs Gemini CLI 선택 기준

### MCP 서버 사용 시기
- **파일 시스템 직접 조작**이 필요한 경우
- **실시간 데이터 수집**이 필요한 경우 (웹 스크래핑)
- **GitHub API 연동**이 필요한 경우
- **세션 간 컨텍스트 유지**가 필요한 경우
- **즉각적인 코드 수정 및 실행**이 필요한 경우

### Gemini CLI 사용 시기
- **대규모 코드베이스 분석**이 필요한 경우
- **여러 파일 간 패턴 분석**이 필요한 경우
- **아키텍처 설계 및 리뷰**가 필요한 경우
- **읽기 전용 분석**만 필요한 경우

## 🛠️ 각 MCP 서버별 활용 시나리오

### 1. Filesystem MCP Server 활용

#### 코드 분석 및 수정
```bash
# TypeScript 에러 분석 및 수정
claude "backend/src/ 디렉토리의 모든 TypeScript 파일을 검사하고 컴파일 에러를 수정해줘"

# 새로운 기능 추가
claude "새로운 TFT 챔피언 데이터를 처리하는 API 엔드포인트를 추가해줘"

# 코드 리팩토링
claude "services 디렉토리의 코드를 분석하고 중복 코드를 제거해줘"
```

#### 프로젝트 구조 관리
```bash
# 프로젝트 구조 분석
claude "현재 프로젝트의 구조를 분석하고 개선점을 제안해줘"

# 파일 정리
claude "사용하지 않는 파일들을 찾아서 정리해줘"

# 테스트 파일 생성
claude "API 엔드포인트에 대한 테스트 파일을 생성해줘"
```

### 2. GitHub MCP Server 활용

#### 이슈 관리
```bash
# 현재 이슈 상태 확인
claude "현재 저장소의 열린 이슈들을 분석하고 우선순위를 매겨줘"

# 버그 리포트 생성
claude "방금 수정한 코드에 대한 버그 리포트 이슈를 생성해줘"

# 기능 요청 이슈 생성
claude "새로운 AI 분석 기능에 대한 기능 요청 이슈를 생성해줘"
```

#### PR 관리
```bash
# PR 생성
claude "현재 변경사항을 정리해서 PR을 생성해줘"

# 코드 리뷰
claude "최근 PR의 코드 변경사항을 리뷰해줘"

# 머지 전 체크
claude "PR을 머지하기 전에 확인해야 할 사항들을 체크해줘"
```

### 3. Puppeteer MCP Server 활용

#### TFT 데이터 수집
```bash
# 최신 패치 정보 수집
claude "TFT 공식 사이트에서 최신 패치 노트를 수집해줘"

# 메타 데이터 수집
claude "주요 TFT 사이트들에서 현재 메타 정보를 수집해줘"

# 경쟁사 분석
claude "다른 TFT 분석 사이트들의 기능을 분석하고 스크린샷을 촬영해줘"
```

#### 테스트 자동화
```bash
# UI 테스트
claude "프론트엔드 페이지들의 스크린샷을 촬영해서 UI 테스트를 진행해줘"

# 성능 테스트
claude "웹사이트의 로딩 속도를 측정하고 성능 리포트를 생성해줘"
```

### 4. Memory MCP Server 활용

#### 프로젝트 컨텍스트 관리
```bash
# 아키텍처 정보 저장
claude "이 프로젝트의 핵심 아키텍처와 설계 결정사항들을 기억해줘"

# 진행상황 추적
claude "오늘 작업한 내용들을 정리해서 저장해줘"

# 이전 결정사항 참조
claude "이전에 논의했던 데이터베이스 스키마 변경사항을 다시 설명해줘"
```

#### 개발 히스토리 관리
```bash
# 버그 수정 히스토리
claude "최근에 수정한 주요 버그들과 해결 방법을 기록해줘"

# 성능 최적화 기록
claude "지금까지 적용한 성능 최적화 방법들을 요약해줘"
```

## 🔄 실제 개발 워크플로우 예시

### 새로운 기능 개발 워크플로우
```bash
# 1. 요구사항 분석 및 설계
claude "TFT 챔피언 추천 시스템의 요구사항을 분석하고 설계해줘"

# 2. 관련 파일 검토
claude "기존 추천 시스템 코드를 분석하고 수정할 파일들을 찾아줘"

# 3. 백엔드 API 개발
claude "챔피언 추천 API 엔드포인트를 개발해줘"

# 4. 프론트엔드 컴포넌트 개발
claude "챔피언 추천 UI 컴포넌트를 개발해줘"

# 5. 테스트 작성
claude "새로운 기능에 대한 테스트 코드를 작성해줘"

# 6. 문서화
claude "새로운 기능을 README.md에 문서화해줘"

# 7. GitHub 이슈 및 PR 생성
claude "개발 완료된 기능에 대한 PR을 생성해줘"
```

### 버그 수정 워크플로우
```bash
# 1. 버그 분석
claude "현재 보고된 버그들을 분석하고 원인을 파악해줘"

# 2. 관련 코드 검토
claude "버그가 발생한 코드 영역을 찾아서 분석해줘"

# 3. 수정 방안 제시
claude "버그를 수정하는 방법을 제안해줘"

# 4. 코드 수정
claude "제안된 방법으로 버그를 수정해줘"

# 5. 테스트 확인
claude "수정된 코드가 제대로 동작하는지 테스트해줘"

# 6. 히스토리 기록
claude "이번 버그 수정 과정을 기록해줘"
```

### 성능 최적화 워크플로우
```bash
# 1. 성능 분석
claude "현재 애플리케이션의 성능을 분석하고 병목점을 찾아줘"

# 2. 데이터 수집
claude "성능 관련 데이터를 웹에서 수집해줘"

# 3. 최적화 방안 제시
claude "성능 개선 방안을 제안하고 우선순위를 매겨줘"

# 4. 코드 최적화
claude "제안된 방법으로 코드를 최적화해줘"

# 5. 성능 측정
claude "최적화 전후의 성능을 비교 측정해줘"

# 6. 결과 문서화
claude "성능 최적화 결과를 문서화해줘"
```

## 📋 베스트 프랙티스

### MCP 서버 사용 시 주의사항
1. **보안**: 민감한 정보가 포함된 작업 시 권한 확인
2. **성능**: 대규모 작업 시 시스템 리소스 모니터링
3. **백업**: 중요한 파일 수정 전 백업 생성
4. **테스트**: 코드 수정 후 반드시 테스트 실행

### 효율적인 프롬프트 작성법
```bash
# 명확한 목표 설정
claude "backend/src/services/tftData.ts 파일의 캐싱 로직을 개선해줘"

# 구체적인 요구사항 제시
claude "React 컴포넌트를 TypeScript로 변환하고 strict 모드 규칙을 준수해줘"

# 컨텍스트 제공
claude "이전에 작업한 AI 분석 서비스와 연동되는 새로운 API를 추가해줘"
```

### 디렉토리별 MCP 서버 관리
```bash
# 프로젝트 루트에서 전체 관리
cd /mnt/c/Users/jiseo/Desktop/tft-meta-analyzer-full/tft-meta-analyzer
claude mcp list

# 백엔드 디렉토리에서 백엔드 전용 설정
cd backend
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ../

# 프론트엔드 디렉토리에서 프론트엔드 전용 설정
cd frontend
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ../
```

## 🚨 문제 해결 가이드

### 자주 발생하는 문제들

#### 1. MCP 서버 연결 실패
```bash
# 해결 방법
claude mcp list
claude mcp remove <server_name>
claude mcp add <server_name> -- <command>
```

#### 2. 파일 권한 오류
```bash
# 해결 방법
chmod +x /path/to/file
chown user:group /path/to/file
```

#### 3. GitHub Token 만료
```bash
# 해결 방법
# 1. GitHub에서 새 토큰 생성
# 2. 환경 변수 업데이트
export GITHUB_TOKEN=new_token
# 3. MCP 서버 재설정
claude mcp remove github
claude mcp add github -- env GITHUB_TOKEN=$GITHUB_TOKEN npx -y @modelcontextprotocol/server-github
```

#### 4. 웹 스크래핑 차단
```bash
# 해결 방법
# 1. User-Agent 변경
# 2. 요청 간격 조정
# 3. robots.txt 확인
# 4. 대안 데이터 소스 활용
```

이 가이드를 통해 Claude Code MCP 서버들을 효과적으로 활용하여 TFT Meta Analyzer 프로젝트의 개발 생산성을 극대화할 수 있습니다.