import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/fetchApi';

export default function AiQnaPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatAreaRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 초기 AI 환영 메시지 추가
  useEffect(() => {
    if (messages.length === 0 && !loading && !error) {
      setMessages([{ role: 'ai', content: '안녕하세요! 롤토체스 챌린저 전문가입니다. 무엇을 도와드릴까요? 궁금한 점을 분석해 드리고 게임에 대한 정보를 주시면 최선을 다해 답변드리겠습니다. TFTai.gg의 실시간 챌린저 통계 데이터를 바탕으로 최적의 전략을 제시해 드릴 수 있습니다.' }]);
    }
  }, []); // 컴포넌트 마운트 시 한 번만 실행되도록 빈 의존성 배열

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      setError('질문을 입력해주세요.');
      return;
    }

    const userMessage = { role: 'user', content: question };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setQuestion('');
    setLoading(true);
    setError(null);

    try {
      const historyToSend = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
      }));

      const response = await api.post('/api/ai/qna', { 
        question: question,
        history: historyToSend
      });
      
      // 백엔드 응답 구조에 따라 답변 추출
      console.log('AI 응답:', response);
      const aiAnswer = response?.answer || response?.data?.answer || '답변을 받지 못했습니다.';
      setMessages(prevMessages => [...prevMessages, { role: 'ai', content: aiAnswer }]);
    } catch (err) {
      console.error('AI QnA 에러:', err);
      
      let errorMessage = '답변을 불러오는데 실패했습니다.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setMessages(prev => [...prev.slice(0, -1), { 
        role: 'ai', 
        content: `죄송합니다. ${errorMessage} 다시 시도해주세요.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1008px] mx-auto px-4 pt-2 pb-4">
      {/* 모든 요소를 포함하는 하나의 패널 */}
      <div className="bg-background-card dark:bg-dark-background-base p-6 rounded-lg shadow-md">
        {/* 제목 */}
        <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2 text-center">챌린저 AI에게 질문하기</h1>
        <hr className="border-t border-border-light dark:border-dark-border-light mb-4" />
        {/* 안내사항 */}
        <p className="text-text-secondary dark:text-dark-text-secondary mb-4 text-center text-sm">
          롤토체스에 대한 어떤 질문이든 해주세요! 챌린저 전문가가 답변해 드립니다. (롤토체스 관련 질문이 아니면 답변을 거절할 수 있습니다.)
        </p>

        {/* 채팅 로그 영역 */}
        <div className="flex flex-col h-[calc(100vh-22rem)] ">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 pr-2 bg-gray-50 dark:bg-dark-background-base rounded-lg p-4 border border-gray-300">
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span
                  className={`inline-block p-3 max-w-[80%] ${msg.role === 'user'
                    ? 'bg-brand-mint text-white rounded-2xl rounded-br-md ml-auto'
                    : 'bg-white dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary rounded-2xl rounded-bl-md mr-auto'
                  }`}
                >
                  {msg.content}
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <span className="inline-block p-3 max-w-[80%] bg-white dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary rounded-2xl rounded-bl-md mr-auto">
                  답변 생성중...
                </span>
              </div>
            )}
            <div ref={chatAreaRef} />
          </div>

          {/* 채팅 입력 영역 */}
          <div className="flex border-t border-border-light dark:border-dark-border-light pt-4">
            <input
              type="text"
              className="flex-1 p-2 rounded-md border border-border-light dark:border-dark-border-light bg-gray-50 dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary outline-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) handleQuestionSubmit();
              }}
              placeholder="질문을 입력하세요..."
              disabled={loading}
            />
            <button
              onClick={handleQuestionSubmit}
              className={`ml-2 px-4 py-2 rounded-md bg-brand-mint text-white font-bold cursor-pointer transition-colors duration-200 ${loading ? 'bg-gray-400' : 'hover:bg-brand-mint'}`}
              disabled={loading}
            >
              {loading ? '전송중' : '질문하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}