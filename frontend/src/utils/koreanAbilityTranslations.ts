/**
 * 스킬 이름과 설명의 한국어 번역 매핑
 * Community Dragon Korean API 데이터를 기반으로 한 번역 매핑
 */

// 스킬 이름 한국어 매핑 (Set 15 기준)
const abilityNameTranslations: Record<string, string> = {
  // Set 15 주요 챔피언들
  'Beat Drop': '유대옥',
  'Encore': '앙코르', 
  'Powder Keg': '화약통',
  'Trial by Fire': '화약고',
  'Cannon Barrage': '포격',
  'Despair': '절망',
  'Bandage Toss': '붕대 던지기',
  'Curse of the Sad Mummy': '슬픈 미라의 저주',
  'Glacial Storm': '혹한의 폭풍',
  'Flash Frost': '급속 냉동',
  'Volley': '일제 사격',
  'Enchanted Crystal Arrow': '마법의 수정 화살',
  'Unbreakable': '불굴',
  "Winter's Bite": '겨울의 저주',
  'Stand Behind Braum': '브라움 뒤로!',
  'Cocoon': '거미줄',
  'Spider Form': '거미 변신',
  'Neurotoxin': '신경독',
  'Judgment': '심판',
  'Decisive Strike': '결정타',
  'Courage': '용기',
  'Demacian Justice': '데마시아의 정의',
  'Drunken Rage': '술 취한 분노',
  'Body Slam': '몸통 박치기',
  'Explosive Cask': '폭발 술통',
  'Barrel Roll': '술통 굴리기',
  'Cataclysm': '천붕지열',
  'Dragon Strike': '용 일격',
  'Golden Aegis': '황금 방패술',
  "Demacian Standard": '데마시아의 깃발',
  'Fishbones': '피쉬본',
  'Pow-Pow': '파우파우',
  'Zap!': '찌릿!',
  'Flame Chompers!': '화염 덫!',
  'Super Mega Death Rocket!': '초강력 초고속 로켓!',
  'Get Excited!': '신나는데!',
  'Rend': '뽑아찢기',
  'Pierce': '관통',
  "Fate's Call": '운명의 부름',
  'Sentinel': '파수꾼',
  'Nether Blade': '황천의 검',
  'Null Sphere': '공허구',
  'Force Pulse': '역장 파동',
  'Riftwalk': '균열 이동',
  'Death Lotus': '죽음의 연꽃',
  'Bouncing Blade': '튕기는 칼날',
  'Preparation': '준비',
  'Shunpo': '순보',
  'Bio-Arcane Barrage': '생체마법 폭격',
  'Void Ooze': '공허 분비물',
  'Living Artillery': '살아있는 포격',
  'Caustic Spittle': '부식성 침',
  'Sonic Wave': '음파',
  'Safeguard': '방호',
  'Tempest': '강풍',
  "Dragon's Rage": '용의 분노',
  'Resonating Strike': '공명격',
  'Iron Will': '강철의 의지',
  'Lightslinger': '빛의 사수',
  'Piercing Light': '꿰뚫는 빛',
  'Ardent Blaze': '타오르는 열정',
  'Relentless Pursuit': '끈질긴 추적',
  'The Culling': '정화',
  'Unstoppable Force': '멈출 수 없는 힘',
  'Seismic Shard': '지진 파편',
  'Brutal Strikes': '잔혹한 일격',
  'Ground Slam': '지면 강타',
  'Death Metal': '데스 메탈',
  'Mace of Spades': '스페이드 철퇴',
  'Creeping Death': '기어오는 죽음',
  'Children of the Grave': '무덤의 아이들',
  'Realm of Death': '죽음의 세계',
  'Aqua Prison': '물의 감옥',
  'Ebb and Flow': '밀물과 썰물',
  'Tidecaller\'s Blessing': '파도소환사의 축복',
  'Tidal Wave': '해일',
  'Hyper': '분노',
  'Boomerang Throw': '부메랑 던지기',
  'Wallop': '강타',
  'Hop': '깡충',
  'GNAR!': '나르!',
  'Boulder Toss': '바위 던지기',
  'Crunch': '박살내기',
  'Berserker Rage': '광전사의 분노',
  'Tough It Out': '버텨내기',
  'Reckless Swing': '무모한 강타',
  'Ragnarok': '라그나로크',
  'Blinding Assault': '눈멀게 하는 공격',
  'Heightened Senses': '고조된 감각',
  'Vault': '도약',
  'Behind Enemy Lines': '적진 침투',
  'Flamespitter': '화염방사기',
  'Scrap Shield': '고철 보호막',
  'Electro Harpoon': '전기 작살',
  'The Equalizer': '이퀄라이저',
  "Dragon's Descent": '용의 강림',
  'Twin Bite': '쌍둥이 송곳니',
  'Burnout': '연소',
  'Flame Breath': '화염 숨결',
  'Nevermore': '결코 다시는',
  'Decrepify': '쇠약',
  'Torment': '고문',
  'Ravenous Flock': '굶주린 무리',
  'Demonic Ascension': '악마의 승천',
  'Wild Cards': '와일드 카드',
  'Pick A Card': '카드 선택',
  'Stacked Deck': '카드 뭉치',
  'Destiny': '운명',
  'Gate': '관문',
  'Primal Surge': '원시의 파도',
  'Tiger Stance': '호랑이 자세',
  'Turtle Stance': '거북이 자세',
  'Bear Stance': '곰 자세',
  'Phoenix Stance': '불사조 자세',
  'Monkey\'s Agility': '원숭이의 민첩성',
  'Piercing Arrow': '꿰뚫는 화살',
  'Hail of Arrows': '화살비',
  'Chain of Corruption': '부패의 사슬',
  'Blighted Quiver': '역병 화살통',
  'Denting Blows': '움푹 패이는 일격',
  'Vault Breaker': '금고 뚫기',
  'Excessive Force': '과도한 힘',
  'Assault and Battery': '돌격 체포',
  'Infinite Duress': '무한의 구속',
  'Hungering Strike': '굶주린 일격',
  'Hunters Call': '사냥꾼의 부름',
  'Blood Scent': '피 냄새',
  'Garden of Thorns': '가시의 정원',
  'Deadly Bloom': '치명적인 꽃',
  'Grasping Roots': '뿌리 감옥',
  'Stranglethorns': '목졸라 가시',
  'Rise of the Thorns': '가시의 봉기'
};

// 스킬 설명 키워드 번역 매핑
const descriptionKeywordTranslations: Record<string, string> = {
  // 데미지 관련
  'damage': '피해',
  'physical damage': '물리 피해',
  'magic damage': '마법 피해',
  'true damage': '고정 피해',
  'bonus damage': '추가 피해',
  'increased damage': '증가한 피해',
  'reduced damage': '감소한 피해',
  'maximum damage': '최대 피해',
  'minimum damage': '최소 피해',
  
  // 상태이상
  'stun': '기절',
  'slow': '둔화',
  'root': '속박',
  'silence': '침묵',
  'blind': '실명',
  'fear': '공포',
  'charm': '매혹',
  'taunt': '도발',
  'suppress': '제압',
  'knock up': '에어본',
  'knock back': '넉백',
  'disarm': '무장해제',
  
  // 버프/디버프
  'shield': '보호막',
  'heal': '회복',
  'healing': '회복량',
  'regeneration': '재생',
  'armor': '방어력',
  'magic resist': '마법 저항력',
  'attack damage': '공격력',
  'ability power': '주문력',
  'attack speed': '공격 속도',
  'movement speed': '이동 속도',
  'critical strike': '치명타',
  'life steal': '생명력 흡수',
  'spell vamp': '마법 흡혈',
  
  // 시간 관련
  'duration': '지속시간',
  'cooldown': '재사용 대기시간',
  'cast time': '시전 시간',
  'channel': '정신 집중',
  'seconds': '초',
  'for': '동안',
  
  // 거리/범위
  'range': '사거리',
  'radius': '반경',
  'area': '범위',
  'nearby': '근처의',
  'closest': '가장 가까운',
  'farthest': '가장 먼',
  'adjacent': '인접한',
  'hex': '칸',
  'hexes': '칸',
  
  // 대상
  'enemy': '적',
  'enemies': '적들',
  'ally': '아군',
  'allies': '아군들',
  'champion': '챔피언',
  'unit': '유닛',
  'units': '유닛들',
  'target': '대상',
  'targets': '대상들',
  
  // 확률
  'chance': '확률',
  '% chance': '% 확률로',
  'critical': '치명타',
  'proc': '발동',
  
  // 자원
  'mana': '마나',
  'health': '체력',
  'gold': '골드',
  'experience': '경험치',
  
  // 액션
  'cast': '시전',
  'activate': '활성화',
  'trigger': '발동',
  'gain': '획득',
  'lose': '잃음',
  'deal': '입힘',
  'take': '받음',
  'restore': '회복',
  'reduce': '감소',
  'increase': '증가',
  'immune': '면역',
  'block': '차단',
  'reflect': '반사',
  
  // 효과 설명
  'on hit': '공격 시',
  'on death': '처치 시',
  'when killed': '처치당할 때',
  'at the start': '시작 시',
  'at the end': '종료 시',
  'while': '하는 동안',
  'after': '이후',
  'before': '이전',
  'if': '만약',
  'when': '때',
  'whenever': '할 때마다',
  
  // 특수 키워드
  'passive': '패시브',
  'active': '액티브',
  'unique': '고유',
  'stackable': '중첩 가능',
  'refreshes': '갱신됨',
  'resets': '초기화됨'
};

/**
 * 스킬 이름을 한국어로 번역
 */
export function translateAbilityName(englishName: string): string {
  if (!englishName) return '';
  
  // 직접 매핑된 번역이 있으면 사용
  const directTranslation = abilityNameTranslations[englishName];
  if (directTranslation) {
    return directTranslation;
  }
  
  // 부분 매칭 시도 (대소문자 무시)
  const lowerName = englishName.toLowerCase();
  const partialMatch = Object.entries(abilityNameTranslations).find(([english, korean]) => {
    return english.toLowerCase().includes(lowerName) || lowerName.includes(english.toLowerCase());
  });
  
  if (partialMatch) {
    return partialMatch[1];
  }
  
  // 매핑되지 않은 경우 콘솔에 로그 남기고 원본 반환
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🔍 번역되지 않은 스킬명: "${englishName}" - 번역 추가 필요`);
  }
  
  return englishName;
}

/**
 * 스킬 설명을 한국어로 번역 (키워드 기반)
 */
export function translateAbilityDescription(englishDesc: string): string {
  if (!englishDesc) return '';
  
  let translatedDesc = englishDesc;
  
  // 키워드 번역 적용
  Object.entries(descriptionKeywordTranslations).forEach(([english, korean]) => {
    // 단어 경계를 고려한 정규식 사용
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedDesc = translatedDesc.replace(regex, korean);
  });
  
  return translatedDesc;
}

/**
 * 통합 번역 함수 (스킬 이름 + 설명)
 */
export function translateAbility(ability: any): {name: string, description: string} {
  if (!ability) {
    return {
      name: '알 수 없는 스킬',
      description: '설명이 없습니다'
    };
  }
  
  return {
    name: translateAbilityName(ability.name || ''),
    description: translateAbilityDescription(ability.desc || ability.description || '')
  };
}

/**
 * 변수 이름 한국어 레이블 매핑
 */
export const variableLabelTranslations: Record<string, string> = {
  'damage': '피해량',
  'heal': '회복량',
  'shield': '보호막',
  'duration': '지속시간',
  'slow': '둔화',
  'stun': '기절 시간',
  'mana': '마나',
  'cooldown': '재사용 대기시간',
  'range': '사거리',
  'radius': '반경',
  'attackdamage': '공격력',
  'abilitypower': '주문력',
  'health': '체력',
  'armor': '방어력',
  'magicresist': '마법 저항력',
  'attackspeed': '공격 속도',
  'movementspeed': '이동 속도',
  'criticalstrike': '치명타',
  'lifesteal': '생명력 흡수'
};

/**
 * 변수 이름을 한국어 레이블로 변환
 */
export function getKoreanVariableLabel(variableName: string): string {
  const cleanName = variableName.toLowerCase().replace(/@/g, '').replace(/\d+/g, '');
  
  // 직접 매핑 확인
  if (variableLabelTranslations[cleanName]) {
    return variableLabelTranslations[cleanName];
  }
  
  // 부분 매칭 시도
  for (const [english, korean] of Object.entries(variableLabelTranslations)) {
    if (cleanName.includes(english) || english.includes(cleanName)) {
      return korean;
    }
  }
  
  // 매핑되지 않은 경우 원본 반환
  return variableName;
}