import React from 'react';

/**
 * 스킵 링크 컴포넌트
 * 키보드 사용자가 메인 콘텐츠로 바로 이동할 수 있도록 하는 접근성 컴포넌트
 */
interface SkipLinkProps {
  /** 이동할 대상 요소의 ID */
  targetId: string;
  /** 링크에 표시될 텍스트 */
  children: React.ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId, 
  children, 
  className = '' 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-50
        focus:px-4
        focus:py-2
        focus:bg-brand-mint
        focus:text-white
        focus:rounded
        focus:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-white
        focus:ring-offset-2
        focus:ring-offset-brand-mint
        ${className}
      `}
    >
      {children}
    </a>
  );
};

export default SkipLink;