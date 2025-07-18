import React, { useState } from 'react';

export default function AIChat({ onSend }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 bg-background-card dark:bg-dark-background-card">
        {/* 메시지 목록 자리 */}
      </div>
      <div className="flex p-4 bg-background-card dark:bg-dark-background-card border-t border-border-light dark:border-dark-border-light">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="질문을 입력하세요..."
          className="flex-1 border rounded px-2 py-1 mr-2"
        />
        <button onClick={handleSend} className="bg-brand-mint text-white px-4 py-1 rounded-r-lg hover:bg-brand-mint">
          전송
        </button>
      </div>
    </div>
  );
}