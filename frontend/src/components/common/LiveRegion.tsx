import React, { useEffect, useState } from 'react';

/**
 * 라이브 리전 컴포넌트
 * 동적 콘텐츠 변경사항을 스크린 리더에 알림
 */
interface LiveRegionProps {
  /** 알림 메시지 */
  message: string;
  /** 알림 레벨 ('polite' | 'assertive') */
  level?: 'polite' | 'assertive';
  /** 메시지 표시 시간 (ms) */
  duration?: number;
  /** 시각적으로 숨김 여부 */
  visuallyHidden?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  level = 'polite',
  duration = 0,
  visuallyHidden = true,
  className = ''
}) => {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    setDisplayMessage(message);

    if (duration > 0) {
      const timer = setTimeout(() => {
        setDisplayMessage('');
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!displayMessage) return null;

  return (
    <div
      aria-live={level}
      aria-atomic="true"
      className={`
        ${visuallyHidden ? 'sr-only' : ''}
        ${className}
      `}
    >
      {displayMessage}
    </div>
  );
};

/**
 * 라이브 리전 훅
 * 컴포넌트에서 라이브 알림을 쉽게 사용할 수 있도록 하는 훅
 */
export const useLiveRegion = () => {
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    message: string;
    level: 'polite' | 'assertive';
  }>>([]);

  const announce = (message: string, level: 'polite' | 'assertive' = 'polite') => {
    const id = `${Date.now()}-${Math.random()}`;
    setAnnouncements(prev => [...prev, { id, message, level }]);

    // 3초 후 자동 제거
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, 3000);
  };

  const LiveRegions = () => (
    <>
      {announcements.map(({ id, message, level }) => (
        <LiveRegion
          key={id}
          message={message}
          level={level}
          duration={3000}
        />
      ))}
    </>
  );

  return { announce, LiveRegions };
};

export default LiveRegion;