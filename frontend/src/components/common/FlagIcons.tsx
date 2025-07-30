/**
 * SVG 기반 국기 아이콘 컴포넌트
 * 브라우저별 이모지 호환성 문제 해결
 */
import React from 'react';

interface FlagIconProps {
  className?: string;
  size?: number;
}

// 한국 국기 (태극기)
export const KoreaFlag: React.FC<FlagIconProps> = ({ className = '', size = 20 }) => (
  <svg 
    width={size} 
    height={size * 0.67} 
    viewBox="0 0 36 24" 
    className={className}
    role="img"
    aria-label="한국 국기"
  >
    <rect width="36" height="24" fill="#ffffff" />
    
    {/* 태극 - 중앙 */}
    <g transform="translate(18,12)">
      <circle cx="0" cy="0" r="5" fill="#cd2e3a" />
      <path d="M 0,-5 A 5,5 0 0,1 0,5 A 2.5,2.5 0 0,1 0,0 A 2.5,2.5 0 0,0 0,-5 Z" fill="#0047a0" />
      <circle cx="0" cy="-2.5" r="2.5" fill="#cd2e3a" />
      <circle cx="0" cy="2.5" r="2.5" fill="#0047a0" />
    </g>
    
    {/* 건 (☰) - 좌상 */}
    <g transform="translate(4,3) rotate(-33.69 3 2.5)">
      <rect x="0" y="0" width="6" height="0.8" fill="#000000" />
      <rect x="0" y="2" width="6" height="0.8" fill="#000000" />
      <rect x="0" y="4" width="6" height="0.8" fill="#000000" />
    </g>
    
    {/* 곤 (☷) - 우하 */}
    <g transform="translate(32,21) rotate(-33.69 -3 -2.5)">
      <rect x="-6" y="-5" width="2.5" height="0.8" fill="#000000" />
      <rect x="-3" y="-5" width="2.5" height="0.8" fill="#000000" />
      <rect x="-6" y="-3" width="2.5" height="0.8" fill="#000000" />
      <rect x="-3" y="-3" width="2.5" height="0.8" fill="#000000" />
      <rect x="-6" y="-1" width="2.5" height="0.8" fill="#000000" />
      <rect x="-3" y="-1" width="2.5" height="0.8" fill="#000000" />
    </g>
    
    {/* 감 (☵) - 우상 */}
    <g transform="translate(32,3) rotate(33.69 -3 2.5)">
      <rect x="-6" y="-1" width="2.5" height="0.8" fill="#000000" />
      <rect x="-3" y="-1" width="2.5" height="0.8" fill="#000000" />
      <rect x="-6" y="1" width="6" height="0.8" fill="#000000" />
      <rect x="-6" y="3" width="2.5" height="0.8" fill="#000000" />
      <rect x="-3" y="3" width="2.5" height="0.8" fill="#000000" />
    </g>
    
    {/* 리 (☲) - 좌하 */}
    <g transform="translate(4,21) rotate(33.69 3 -2.5)">
      <rect x="0" y="-5" width="6" height="0.8" fill="#000000" />
      <rect x="0" y="-3" width="2.5" height="0.8" fill="#000000" />
      <rect x="3.5" y="-3" width="2.5" height="0.8" fill="#000000" />
      <rect x="0" y="-1" width="6" height="0.8" fill="#000000" />
    </g>
  </svg>
);

// 미국 국기 (성조기)
export const USAFlag: React.FC<FlagIconProps> = ({ className = '', size = 20 }) => (
  <svg 
    width={size} 
    height={size * 0.53} 
    viewBox="0 0 30 16" 
    className={className}
    role="img"
    aria-label="미국 국기"
  >
    {/* 빨간 줄무늬 */}
    <rect width="30" height="16" fill="#b22234" />
    
    {/* 흰 줄무늬 */}
    {[1, 3, 5, 7, 9, 11].map(i => (
      <rect key={i} x="0" y={i * 16/13} width="30" height={16/13} fill="#ffffff" />
    ))}
    
    {/* 파란 사각형 */}
    <rect x="0" y="0" width="12" height={7 * 16/13} fill="#3c3b6e" />
    
    {/* 별들 (간소화) */}
    <g fill="#ffffff">
      {/* 9개 행 */}
      {[0.8, 2.4, 4.0, 5.6, 7.2, 8.8].map((y, rowIndex) => (
        <g key={rowIndex}>
          {rowIndex % 2 === 0 ? (
            // 6개 별
            [1.2, 3.0, 4.8, 6.6, 8.4, 10.2].map((x, colIndex) => (
              <circle key={colIndex} cx={x} cy={y} r="0.3" />
            ))
          ) : (
            // 5개 별
            [2.1, 3.9, 5.7, 7.5, 9.3].map((x, colIndex) => (
              <circle key={colIndex} cx={x} cy={y} r="0.3" />
            ))
          )}
        </g>
      ))}
    </g>
  </svg>
);

// 일본 국기 (히노마루)
export const JapanFlag: React.FC<FlagIconProps> = ({ className = '', size = 20 }) => (
  <svg 
    width={size} 
    height={size * 0.67} 
    viewBox="0 0 30 20" 
    className={className}
    role="img"
    aria-label="일본 국기"
  >
    <rect width="30" height="20" fill="#ffffff" />
    <circle cx="15" cy="10" r="6" fill="#bc002d" />
  </svg>
);

// 중국 국기 (오성홍기)
export const ChinaFlag: React.FC<FlagIconProps> = ({ className = '', size = 20 }) => (
  <svg 
    width={size} 
    height={size * 0.67} 
    viewBox="0 0 30 20" 
    className={className}
    role="img"
    aria-label="중국 국기"
  >
    <rect width="30" height="20" fill="#de2910" />
    
    {/* 큰 별 */}
    <polygon 
      points="7.5,3 8.2,5.2 10.5,5.2 8.7,6.6 9.4,8.8 7.5,7.4 5.6,8.8 6.3,6.6 4.5,5.2 6.8,5.2" 
      fill="#ffde00" 
    />
    
    {/* 작은 별들 */}
    <polygon 
      points="12,2 12.3,2.6 13,2.6 12.4,3 12.7,3.6 12,3.2 11.3,3.6 11.6,3 11,2.6 11.7,2.6" 
      fill="#ffde00" 
    />
    <polygon 
      points="13.5,4 13.8,4.6 14.5,4.6 13.9,5 14.2,5.6 13.5,5.2 12.8,5.6 13.1,5 12.5,4.6 13.2,4.6" 
      fill="#ffde00" 
    />
    <polygon 
      points="13.5,7 13.8,7.6 14.5,7.6 13.9,8 14.2,8.6 13.5,8.2 12.8,8.6 13.1,8 12.5,7.6 13.2,7.6" 
      fill="#ffde00" 
    />
    <polygon 
      points="12,9 12.3,9.6 13,9.6 12.4,10 12.7,10.6 12,10.2 11.3,10.6 11.6,10 11,9.6 11.7,9.6" 
      fill="#ffde00" 
    />
  </svg>
);

// 국기 매핑 객체
export const FlagComponents = {
  ko: KoreaFlag,
  en: USAFlag,
  ja: JapanFlag,
  zh: ChinaFlag,
} as const;

// 제네릭 국기 컴포넌트
export interface FlagProps extends FlagIconProps {
  countryCode: keyof typeof FlagComponents;
}

export const Flag: React.FC<FlagProps> = ({ countryCode, ...props }) => {
  const FlagComponent = FlagComponents[countryCode];
  
  if (!FlagComponent) {
    // 폴백: 국가 코드 텍스트 표시
    return (
      <div 
        className={`inline-flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded ${props.className}`}
        style={{ 
          width: props.size || 20, 
          height: (props.size || 20) * 0.67,
          minWidth: props.size || 20
        }}
        role="img"
        aria-label={`${countryCode} 국기`}
      >
        {countryCode.toUpperCase()}
      </div>
    );
  }
  
  return <FlagComponent {...props} />;
};

export default Flag;