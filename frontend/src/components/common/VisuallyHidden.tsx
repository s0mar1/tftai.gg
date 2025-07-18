import React from 'react';

/**
 * 시각적으로는 숨기되 스크린 리더에는 읽히는 컴포넌트
 * sr-only 클래스를 사용하여 구현
 */
interface VisuallyHiddenProps {
  /** 숨길 콘텐츠 */
  children: React.ReactNode;
  /** HTML 요소 타입 (기본값: span) */
  as?: keyof JSX.IntrinsicElements;
  /** 추가 CSS 클래스 */
  className?: string;
}

const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  as: Component = 'span',
  className = ''
}) => {
  return (
    <Component className={`sr-only ${className}`}>
      {children}
    </Component>
  );
};

export default VisuallyHidden;