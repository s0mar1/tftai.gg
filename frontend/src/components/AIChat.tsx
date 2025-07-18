import React, { useState } from 'react';
import { validateChatMessage, escapeHtml } from '../utils/inputValidation';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('AIChat');

interface AIChatProps {
  onSend: (message: string) => Promise<void>;
}

export default function AIChat({ onSend }: AIChatProps): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = async (): Promise<void> => {
    if (isLoading) return;
    
    const validation = validateChatMessage(input);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    logger.userAction('메시지 전송', { messageLength: input.length });
    
    try {
      const sanitizedInput = escapeHtml(input.trim());
      await onSend(sanitizedInput);
      setInput('');
    } catch (error) {
      logger.error('메시지 전송 실패', error as Error);
      setError('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 bg-background-card dark:bg-dark-background-card">
        {/* 메시지 목록 자리 */}
      </div>
      <div className="flex flex-col p-4 bg-background-card dark:bg-dark-background-card border-t border-border-light dark:border-dark-border-light">
        {error && (
          <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="질문을 입력하세요..."
            className="flex-1 border rounded px-2 py-1 mr-2"
            disabled={isLoading}
            maxLength={1000}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            className="bg-brand-mint text-white px-4 py-1 rounded-r-lg hover:bg-brand-mint disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}