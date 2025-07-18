// backend/trigger-translation.ts
import axios from 'axios';

const triggerAllTranslations = async () => {
  try {
    console.log('모든 지원 언어의 UI 번역을 요청합니다...');
    const response = await axios.post('http://localhost:4000/api/translate/ui/all');
    console.log('--- 일괄 번역 요청 성공 ---');
    console.log('상태 코드:', response.status);
    console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('--- 일괄 번역 요청 실패 ---');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('에러 데이터:', error.response.data);
    } else {
      console.error('에러 메시지:', error.message);
    }
  }
};

triggerAllTranslations();
