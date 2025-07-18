# Claude Code MCP 서버 설정 가이드

## 설정된 MCP 서버 목록

### 1. Filesystem MCP Server
- **목적**: 프로젝트 파일 시스템 접근
- **설정**: `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .`
- **기능**: 
  - 파일 읽기/쓰기
  - 디렉토리 탐색
  - 파일 관리 자동화

### 2. GitHub MCP Server
- **목적**: GitHub API 연동
- **설정**: `claude mcp add github -- env GITHUB_TOKEN=your_token_here npx -y @modelcontextprotocol/server-github`
- **기능**:
  - 이슈 관리
  - PR 생성/리뷰
  - 저장소 관리
- **주의**: GitHub Personal Access Token 필요

### 3. Puppeteer MCP Server
- **목적**: 웹 스크래핑 및 브라우저 자동화
- **설정**: `claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer`
- **기능**:
  - 웹 페이지 스크래핑
  - 브라우저 자동화
  - TFT 게임 데이터 수집 지원

### 4. Memory MCP Server
- **목적**: 세션 간 컨텍스트 유지
- **설정**: `claude mcp add memory -- npx -y @modelcontextprotocol/server-memory`
- **기능**:
  - 대화 기록 저장
  - 프로젝트 컨텍스트 유지
  - 개발 세션 연속성

## 환경 변수 설정

### GitHub Token 설정
```bash
# GitHub Personal Access Token 생성 후 설정
export GITHUB_TOKEN=your_github_personal_access_token

# 또는 .env 파일에 추가
echo "GITHUB_TOKEN=your_github_personal_access_token" >> .env
```

### GitHub Token 권한 설정
- `repo` (저장소 접근)
- `issues` (이슈 관리)
- `pull_requests` (PR 관리)
- `contents` (파일 내용 접근)

## MCP 서버 관리 명령어

### 목록 확인
```bash
claude mcp list
```

### 서버 세부사항 확인
```bash
claude mcp get <server_name>
```

### 서버 제거
```bash
claude mcp remove <server_name>
```

### 서버 재시작
```bash
claude mcp remove <server_name>
claude mcp add <server_name> -- <command>
```

## 프로젝트 구조 최적화

### TypeScript 지원
- 현재 프로젝트는 TypeScript strict mode 사용
- MCP 서버들이 TypeScript 환경과 호환됨

### pnpm 사용
- 모든 의존성 관리에 pnpm 사용
- MCP 서버들이 npx를 통해 자동으로 패키지 관리

### React + Node.js 풀스택 지원
- Frontend: React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: MongoDB
- Cache: Redis

## 보안 고려사항

1. **API 키 관리**: 환경 변수로 민감한 정보 관리
2. **파일 시스템 접근**: 프로젝트 루트 디렉토리로 제한
3. **GitHub 권한**: 필요한 최소 권한만 부여
4. **자동 승인 설정**: 신뢰할 수 있는 작업만 자동 승인

## 사용 예시

### 파일 시스템 작업
```bash
# 파일 읽기
claude "README.md 파일의 내용을 읽어줘"

# 파일 생성
claude "새로운 컴포넌트 파일을 생성해줘"

# 프로젝트 구조 분석
claude "프로젝트의 전체 구조를 분석해줘"
```

### GitHub 작업
```bash
# 이슈 생성
claude "새로운 버그 리포트 이슈를 생성해줘"

# PR 생성
claude "현재 변경사항으로 PR을 생성해줘"

# 저장소 상태 확인
claude "현재 저장소의 이슈와 PR 상태를 확인해줘"
```

### 웹 스크래핑
```bash
# TFT 데이터 수집
claude "TFT 공식 사이트에서 최신 패치 정보를 수집해줘"

# 경쟁 사이트 분석
claude "다른 TFT 메타 사이트들의 구조를 분석해줘"
```

## 문제 해결

### 패키지 설치 오류
```bash
# npx 캐시 정리
npx clear-npx-cache

# 전역 패키지 업데이트
npm update -g
```

### 권한 오류
```bash
# 파일 권한 확인
ls -la ~/.claude

# 설정 파일 재생성
claude mcp reset-project-choices
```

### 서버 연결 오류
```bash
# 서버 상태 확인
claude mcp list

# 서버 재시작
claude mcp remove <server_name>
claude mcp add <server_name> -- <command>
```

이제 Claude Code가 TFT Meta Analyzer 프로젝트에서 더욱 효율적으로 작업할 수 있게 되었습니다!