#!/bin/bash
# Cloudflare Pages 빌드 스크립트
# TFT Meta Analyzer Frontend

set -e

echo "🚀 Cloudflare Pages 빌드 시작..."

# 1. 루트 디렉토리로 이동
cd ../

# 2. 종속성 설치 (pnpm 사용)
echo "📦 종속성 설치 중..."
npm install -g pnpm
pnpm install

# 3. 공유 패키지 빌드
echo "🔧 공유 패키지 빌드 중..."
cd shared && pnpm build && cd ../

# 4. 프론트엔드 빌드
echo "🎨 프론트엔드 빌드 중..."
cd frontend && pnpm build

# 5. Cloudflare Pages용 라우팅 파일 복사
echo "🌐 Cloudflare Pages 설정 복사 중..."
cp _routes.json dist/

# 6. 환경변수 설정 확인
echo "🔍 환경변수 확인 중..."
if [ -z "$VITE_API_BASE_URL" ]; then
  echo "⚠️  경고: VITE_API_BASE_URL이 설정되지 않았습니다."
  echo "   Cloudflare Pages 환경변수에서 백엔드 URL을 설정해주세요."
fi

echo "✅ 빌드 완료! dist/ 폴더가 준비되었습니다."
echo "📁 출력 디렉토리: frontend/dist"