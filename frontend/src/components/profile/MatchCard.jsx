// frontend/src/components/profile/MatchCard.jsx
// ... (생략) ...

const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostBorderStyle = (cost) => ({ border: `2px solid ${costColors[cost] || costColors[1]}` });
const getCostColor = (cost) => costColors[cost] || costColors[1];

const styles = {
  unitWrapper: { position: 'relative', textAlign: 'center', width: '50px' },
  carryStars: { position: 'absolute', top: '-5px', left: '50%', transform: 'translateX(-50%)', zIndex: 1, textShadow: '1px 1px 2px black' },
  unitImage: { width: '100%', borderRadius: '4px' },
  unitItems: { display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' },
  unitItemImage: { width: '16px', height: '16px', borderRadius: '2px', border: '1px solid #555' },
  unitName: { fontSize: '10px', color: '#ccc', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' },
};

// 시너지 활성화 단계에 따른 배경색 클래스 (HEX 코드로 직접 정의)
const getTraitHexColor = (style) => {
    switch (style) {
        case 1: return '#CD7F32'; // 브론즈 등급 (image.png 참조)
        case 2: return '#C0C0C0'; // 실버 등급 (image.png 참조)
        case 3: return '#FFD700'; // 골드 등급 (image.png 참조)
        case 4: return '#B9F2FF'; // 프리즘 등급 (image.png 참조)
        // style 0은 활성화 안 됨. style 5 이상은 프리즘과 동일하게 처리하거나 추가 색상 정의 필요
        default: return '#CD7F32'; // 기본값 (브론즈)
    }
};

// Unit 컴포넌트 (변경 없음)
const Unit = ({ unit }) => {
    return (
        <div style={styles.unitWrapper}>
            {/* 기물 위에 별 등급 (코스트 색상) */}
            {unit.tier > 0 && (
                <div style={{ ...styles.carryStars, color: getCostColor(unit.cost) }}>
                    {'★'.repeat(unit.tier)}
                </div>
            )}
            <img
                src={unit.image_url}
                alt={unit.name}
                title={unit.name}
                style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }}
            />
            <div style={styles.unitItems}>
                {unit.items && unit.items.slice(0, 3).map((item, index) =>
                    item.image_url && <img key={index} src={item.image_url} alt={item.name} title={item.name} style={styles.unitItemImage} />
                )}
            </div>
            {/* 기물 아래 한국어 이름 표시 */}
            <span style={styles.unitName}>{unit.name}</span>
        </div>
    );
};

// PlayerCard 컴포넌트 (변경 없음)
const PlayerCard = ({ participant, getCostBorderStyle, getCostColor, getTraitBackgroundColor }) => {
    // ... (기존 코드 동일) ...
};

// MatchCard 컴포넌트
export default function MatchCard({ match, userPuuid, isExpanded }) {
  // ... (생략) ...
  const placement = match.placement || 0;
  const cardBorderColorClass = placement === 1 ? 'border-l-yellow-400' : placement <= 4 ? 'border-l-blue-400' : 'border-l-gray-500';

  return (
    <div className={`bg-background-card dark:bg-dark-background-card rounded shadow-sm hover:shadow-md transition-shadow mb-3`}>
      {/* 카드 상단 요약 정보 */}
      <div className={`flex items-center p-4 border-l-4 ${cardBorderColorClass}`}>
        {/* 등수 및 시간 정보 */}
        {/* ... (생략) ... */}

        {/* 특성 및 유닛 정보 */}
        <div className="flex-1 px-3">
          {/* 모든 시너지 표시, 시너지 색상 적용 및 등급별 정렬 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {match.traits && match.traits
              .filter(t => t && t.style > 0)
              .sort((a, b) => (b.tier_current || 0) - (a.tier_current || 0)) // 등급(tier_current) 기준으로 내림차순 정렬
              .map((trait, index) => (
              trait && trait.image_url && (
                <div
                  key={index}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white`} // Tailwind 클래스 제거
                  style={{ backgroundColor: getTraitHexColor(trait.style) }} // HEX 색상 직접 적용
                  title={`${trait.name || 'Unknown'} (${trait.tier_current || 0}단계)`}
                >
                  {/* 시너지 등급 아이콘 (백엔드에서 받은 등급별 URL 시도) */}
                  {/* onError를 추가하여 등급별 아이콘이 없을 경우 기본 아이콘으로 대체 */}
                  <img
                    src={trait.image_url}
                    alt={trait.name || 'Unknown'}
                    className="w-4 h-4"
                    onError={(e) => {
                      // 등급별 아이콘이 없을 경우 기본 아이콘 URL로 대체 (백엔드에서 기본 아이콘 URL도 같이 넘겨주는 것이 좋음)
                      // 현재 백엔드는 등급별 아이콘만 시도하므로, 없을 경우 이미지가 깨질 수 있습니다.
                      // 여기서는 임시로 기본 아이콘의 경로를 유추하여 대체합니다.
                      if (trait.apiName) {
                        const baseIconName = trait.apiName.toLowerCase().replace('set11_', '').replace('.tex', '').replace('.png', '');
                        e.target.src = `https://raw.communitydragon.org/latest/game/assets/traits/icon_tft11_${baseIconName}.png`; // 기본 아이콘 URL 예시
                      }
                      e.target.onerror = null; // 무한 루프 방지
                    }}
                  />
                  <span>{trait.tier_current || 0}</span>
                </div>
              )
            ))}
          </div>
          {/* 유닛 이미지, 아이템, 별 등급, 한국어 이름 표시 */}
          {/* ... (생략) ... */}
        </div>
        
        {/* 상세보기 버튼 (펼치기/접기) */}
        {/* ... (생략) ... */}
      </div>

      {/* 상세보기 영역 (클릭 시 펼쳐짐) */}
      {isExpanded && (
        <div className="p-4 border-t border-border-light dark:border-dark-border-light bg-background-card dark:bg-dark-background-card">
          {/* 탭 네비게이션 */}
          {/* ... (생략) ... */}

          {/* 탭 내용 */}
          {/* ... (생략) ... */}

          {/* 매치 상세 페이지로 이동 링크 - 이제 각 탭 내용 하단에 배치 */}
          {/* ... (생략) ... */}
        </div>
      )}
    </div>
  );
}