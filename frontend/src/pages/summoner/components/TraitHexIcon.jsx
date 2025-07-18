// frontend/src/pages/summoner/components/TraitHexIcon.jsx
//---------------------------------------------------------------
import React from "react";
import classNames from "classnames";

/**
 * TFT 특성 육각 아이콘
 *  - variant : none | bronze | silver | gold | chromatic | prismatic
 *  - size    : 한 변 길이(px)           (viewBox 0 0 100 115 기준)
 */
export default function TraitHexIcon({ variant = "none", size = 32, className = "" }) {
  /* ───────────────────────────────────────── viewBox 상수 ────────────────── */
  const HEX_PATH = "M50 0 L100 29 L100 86 L50 115 L0 86 L0 29 Z";
  const OUTER_STROKE = 4.5;   // 검은 외곽선 두께
  const INNER_STROKE = 3;     // 밝은색 2차 테두리

  /* ────────────────────────────────────── 색상 preset 정의 ───────────────── */
  const colorConfigs = {
    none:       { fill: "#1F2428",   stroke: "#BDBDBD", gradient: null },
    bronze:     { gradient: "url(#grad_bronze)",  stroke: "#CFA37B" },
    silver:     { gradient: "url(#grad_silver)",  stroke: "#D4D9DF" },
    gold:       { gradient: "url(#grad_gold)",    stroke: "#F0D06C" },
    chromatic:  { gradient: "url(#grad_chroma)",  stroke: "#F3C26E" },
    prismatic:  { gradient: "url(#grad_prism_body)", stroke: "url(#grad_prism_stroke)" },
  };
  
  const cfg = colorConfigs[variant] ?? colorConfigs.none;

  /* ─────────────────────────────────────────── <defs> ────────────────────── */
  const Defs = () => (
    <defs>
      {/* BRONZE */}
      <linearGradient id="grad_bronze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#E1A675" />
        <stop offset="40%"  stopColor="#C18454" />
        <stop offset="100%" stopColor="#8A5A32" />
      </linearGradient>

      {/* SILVER */}
      <linearGradient id="grad_silver" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#E3E8EC" />
        <stop offset="40%"  stopColor="#C4CBD2" />
        <stop offset="100%" stopColor="#9299A3" />
      </linearGradient>

      {/* GOLD */}
      <linearGradient id="grad_gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFE791" />
        <stop offset="40%"  stopColor="#F3C960" />
        <stop offset="100%" stopColor="#C49A2C" />
      </linearGradient>

      {/* CHROMATIC (오렌지-옐로우) */}
      <linearGradient id="grad_chroma" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#FF8165" />
        <stop offset="50%"  stopColor="#FFB24A" />
        <stop offset="100%" stopColor="#D26910" />
      </linearGradient>

      {/* PRISMATIC – 바디/스트로크 따로 */}
      <linearGradient id="grad_prism_body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#ff4d6b" />
        <stop offset="16.6%" stopColor="#ff9966" />
        <stop offset="33.3%" stopColor="#ffeb3b" />
        <stop offset="50%"  stopColor="#7bdcb5" />
        <stop offset="66.6%" stopColor="#4dd0e1" />
        <stop offset="83.3%" stopColor="#7a6bff" />
        <stop offset="100%" stopColor="#da6bff" />
      </linearGradient>
      <linearGradient id="grad_prism_stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#ff4d6b" />
        <stop offset="12.5%" stopColor="#ff9966" />
        <stop offset="25%"  stopColor="#ffeb3b" />
        <stop offset="37.5%" stopColor="#7bdcb5" />
        <stop offset="50%"  stopColor="#4dd0e1" />
        <stop offset="62.5%" stopColor="#7a6bff" />
        <stop offset="75%"  stopColor="#da6bff" />
        <stop offset="100%" stopColor="#ff4d6b" />
        {/* 무한 회전 애니메이션 */}
        <animateTransform attributeName="gradientTransform"
          type="rotate" from="0 0.5 0.5" to="360 0.5 0.5"
          dur="8s" repeatCount="indefinite" />
      </linearGradient>
      <radialGradient id="grad_prism_highlight" fx=".5" fy=".45" r=".8">
        <stop offset="0%"   stopColor="#ffffff" stopOpacity=".98" />
        <stop offset="65%"  stopColor="#f5faff" stopOpacity=".70" />
        <stop offset="100%" stopColor="#f5faff" stopOpacity="0" />
      </radialGradient>

      {/* 공통 글로스 하이라이트 */}
      <linearGradient id="grad_gloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFFFFF" stopOpacity=".85" />
        <stop offset="55%"  stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity=".35" />
      </linearGradient>
    </defs>
  );

  /* ─────────────────────────────────────────── Render ────────────────────── */
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      className={classNames("select-none transition-transform duration-200 hover:scale-105", className)}
      style={{ overflow: "visible" }}
    >
      <Defs />

      {/* 1. 검정 외곽선 */}
      <path d={HEX_PATH} fill="none" stroke="#000" strokeWidth={OUTER_STROKE} />

      {/* 2. 밝은색 2차 테두리 */}
      <path d={HEX_PATH} fill="none" stroke={cfg.stroke} strokeWidth={INNER_STROKE} />

      {/* 3. 내부 채우기 (gradient or solid) */}
      <path d={HEX_PATH} fill={cfg.gradient || cfg.fill} />

      {/* 4. 글로스(위쪽 광택) */}
      {variant !== "none" && (
        <path d={HEX_PATH} fill="url(#grad_gloss)" style={{ mixBlendMode: "screen" }} />
      )}

      {/* 5. subtle inner shadow */}
      <path d={HEX_PATH} fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="1" />

      {/* 6. 프리즘 특유 중앙 하이라이트 */}
      {variant === "prismatic" && (
        <path
          d={HEX_PATH}
          fill="url(#grad_prism_highlight)"
          transform="scale(0.86)"
          style={{ 
            mixBlendMode: "screen",
            transformOrigin: "50% 50%"
          }}
        />
      )}
    </svg>
  );
}
