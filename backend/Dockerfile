# Render 배포용 Dockerfile
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저 설치
RUN npm install -g pnpm

# 의존성 설치를 위한 파일 복사
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN pnpm run build

# 프로덕션 의존성만 설치
RUN pnpm prune --prod

# 포트 노출
EXPOSE 10000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/api/health || exit 1

# 프로덕션 모드로 실행
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]