#!/usr/bin/env node

/**
 * 환경 변수 디버깅 스크립트
 * 프론트엔드 환경 변수가 올바르게 설정되었는지 확인합니다.
 */

console.log('=== 프론트엔드 환경 변수 디버깅 ===');
console.log('');

// .env 파일 읽기
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    console.log(`📄 ${filePath}:`);
    console.log(content);
    console.log('');
    return content;
  } catch (error) {
    console.log(`❌ ${filePath}: 파일을 찾을 수 없습니다.`);
    console.log('');
    return null;
  }
}

// 환경 파일들 확인
const envFiles = [
  '.env',
  '.env.development',
  '.env.local',
  '.env.development.local'
];

envFiles.forEach(file => {
  readEnvFile(resolve(process.cwd(), file));
});

console.log('=== 추천 해결 방법 ===');
console.log('');
console.log('1. 개발 서버 재시작:');
console.log('   pnpm dev 중지 후 다시 실행');
console.log('');
console.log('2. 브라우저 캐시 클리어:');
console.log('   브라우저 개발자 도구 > Network 탭 > "Disable cache" 체크');
console.log('');
console.log('3. 환경 변수 확인:');
console.log('   브라우저 콘솔에서 fetchApi 환경 변수 로그 확인');
console.log('');
console.log('4. 백엔드 서버 확인:');
console.log('   백엔드가 4001 포트에서 실행 중인지 확인');
console.log('');