console.log('=== 서버 디버그 시작 ===');

console.log('1. dotenv 로딩...');
import dotenv from 'dotenv';
dotenv.config();
console.log('✅ dotenv 완료');

console.log('2. express 로딩...');
import express from 'express';
console.log('✅ express 완료');

console.log('3. cors 로딩...');
import cors from 'cors';
console.log('✅ cors 완료');

console.log('4. logger 로딩...');
import logger from './src/config/logger.ts';
console.log('✅ logger 완료');

console.log('5. 기본 Express 앱 생성...');
const app = express();
console.log('✅ Express 앱 생성 완료');

console.log('6. 기본 미들웨어 설정...');
app.use(cors());
app.use(express.json());
console.log('✅ 미들웨어 설정 완료');

console.log('7. 기본 라우트 설정...');
app.get('/', (req, res) => {
  res.json({ message: 'Debug server running' });
});
console.log('✅ 기본 라우트 설정 완료');

console.log('8. 서버 시작...');
const PORT = 4001;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
});

console.log('=== 서버 디버그 완료 ===');