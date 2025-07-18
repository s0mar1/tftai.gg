#!/bin/bash

# E2E 테스트 실행 스크립트
# 이 스크립트는 로컬에서 E2E 테스트를 실행하기 위한 헬퍼입니다.

set -e

echo "🚀 TFT Meta Analyzer E2E 테스트 시작"
echo "======================================"

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo "❌ 프로젝트 루트에서 실행해주세요."
    exit 1
fi

# 의존성 설치 확인
echo "📦 의존성 설치 확인 중..."
pnpm install

# 공유 패키지 빌드
echo "🔨 공유 패키지 빌드 중..."
pnpm build:shared

# 백엔드 빌드
echo "🏗️ 백엔드 빌드 중..."
pnpm build:backend

# 프론트엔드 빌드
echo "🎨 프론트엔드 빌드 중..."
pnpm build:frontend

# Playwright 브라우저 설치
echo "🌐 Playwright 브라우저 설치 중..."
pnpm exec playwright install

# 백엔드 서버 시작
echo "🖥️ 백엔드 서버 시작 중..."
cd backend
pnpm start &
BACKEND_PID=$!
cd ..

# 백엔드 서버 준비 대기
echo "⏳ 백엔드 서버 준비 대기 중..."
sleep 10

# 프론트엔드 서버 시작
echo "🎭 프론트엔드 서버 시작 중..."
cd frontend
pnpm preview &
FRONTEND_PID=$!
cd ..

# 프론트엔드 서버 준비 대기
echo "⏳ 프론트엔드 서버 준비 대기 중..."
sleep 10

# 서버 상태 확인
echo "🔍 서버 상태 확인 중..."
curl -f http://localhost:4002/health || {
    echo "❌ 백엔드 서버가 응답하지 않습니다."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
}

curl -f http://localhost:3000 || {
    echo "❌ 프론트엔드 서버가 응답하지 않습니다."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
}

# E2E 테스트 실행
echo "🧪 E2E 테스트 실행 중..."
export FRONTEND_URL=http://localhost:3000
pnpm test:e2e

# 테스트 결과 확인
TEST_EXIT_CODE=$?

# 서버 종료
echo "🛑 서버 종료 중..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true

# 결과 출력
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E 테스트 성공!"
    echo "📊 테스트 리포트: playwright-report/index.html"
else
    echo "❌ E2E 테스트 실패!"
    echo "📊 테스트 리포트: playwright-report/index.html"
    echo "📹 실패 비디오: test-results/"
    exit 1
fi

echo "======================================"
echo "🎉 E2E 테스트 완료"