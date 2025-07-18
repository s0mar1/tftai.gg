# Backend Scripts

이 디렉토리는 개발 및 유지보수를 위한 스크립트들을 분류하여 정리한 곳입니다.

## 📁 디렉토리 구조

### `test/`
서버 및 기능 테스트용 스크립트들
- `test-server.js` - 서버 시작 테스트
- `test-cache.js` - 캐시 기능 테스트
- `test-tft-data.js` - TFT 데이터 로딩 테스트
- `test-summoner-api.js` - 소환사 API 테스트
- `test-refactored-server.cjs` - 리팩토링된 서버 테스트

### `debug/`
디버깅 및 문제 해결용 스크립트들
- `debug-server.js` - 서버 시작 과정 디버깅

### `utils/`
데이터 정리 및 유틸리티 스크립트들
- `check-traits.js` - 특성 데이터 검증
- `fix-decktier-traits.js` - 덱 티어 특성 수정

## 🚨 주의사항

- 이 스크립트들은 개발 환경에서만 사용해주세요
- 프로덕션 환경에서는 실행하지 마세요
- 스크립트 실행 전 데이터 백업을 권장합니다