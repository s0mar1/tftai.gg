/**
 * 통합 이미지 URL 처리 유틸리티 함수들
 * 로컬 플레이스홀더 이미지 폴백 지원
 */

// 플레이스홀더 이미지 경로
const PLACEHOLDER_IMAGES = {
  champion: '/images/placeholders/champion-placeholder.svg',
  trait: '/images/placeholders/trait-placeholder.svg',
  item: '/images/placeholders/item-placeholder.svg'
} as const;

type PlaceholderType = keyof typeof PLACEHOLDER_IMAGES;

/**
 * 이미지 로드 테스트 함수
 */
const testImageLoad = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // 5초 타임아웃
    setTimeout(() => resolve(false), 5000);
  });
};

/**
 * .tex와 .dds 확장자를 .png로 변환
 */
export const toPNG = (path: string): string => {
  if (!path) return '';
  return path.toLowerCase()
    .replace('.dds', '.png')
    .replace('.tex', '.png');
};

/**
 * 상대 경로를 절대 URL로 변환 (CDN 구조 수정 포함)
 */
export const toAbsoluteURL = (path: string): string => {
  if (!path) return '';
  
  // 이미 절대 URL인 경우 Community Dragon CDN 구조 수정
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Community Dragon URL 구조 수정: /cdragon/tft/assets/ -> /game/assets/
    if (path.includes('raw.communitydragon.org/latest/cdragon/tft/assets/')) {
      return path.replace('/cdragon/tft/assets/', '/game/assets/');
    }
    
    // 혹시 다른 잘못된 구조가 있을 수 있으니 추가 체크
    if (path.includes('raw.communitydragon.org/latest/cdragon/')) {
      return path.replace('/cdragon/', '/game/');
    }
    
    return path;
  }
  
  // Community Dragon 베이스 URL과 결합
  const baseURL = 'https://raw.communitydragon.org/latest/game/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return baseURL + cleanPath;
};

/**
 * 통합 이미지 처리 함수 (폴백 지원)
 * CDN 실패 시 로컬 플레이스홀더 이미지로 폴백
 */
export const processImagePath = async (
  path: string, 
  placeholderType: PlaceholderType = 'champion'
): Promise<string> => {
  if (!path) {
    return PLACEHOLDER_IMAGES[placeholderType];
  }
  
  // 이미 로컬 플레이스홀더인 경우 그대로 반환
  if (path.startsWith('/images/placeholders/')) {
    return path;
  }
  
  try {
    // 1. PNG 변환 + 절대 URL 생성
    const processedUrl = toAbsoluteURL(toPNG(path));
    
    // 2. 이미지 로드 테스트
    const isLoadable = await testImageLoad(processedUrl);
    
    if (isLoadable) {
      return processedUrl;
    } else {
      console.warn(`이미지 로드 실패: ${processedUrl}, 플레이스홀더 사용`);
      return PLACEHOLDER_IMAGES[placeholderType];
    }
  } catch (error) {
    console.error('이미지 처리 중 오류:', error);
    return PLACEHOLDER_IMAGES[placeholderType];
  }
};

/**
 * 동기적 이미지 처리 함수 (즉시 폴백)
 * 이미지 로드 테스트 없이 즉시 결과 반환
 */
export const processImagePathSync = (
  path: string, 
  placeholderType: PlaceholderType = 'champion'
): string => {
  if (!path) {
    return PLACEHOLDER_IMAGES[placeholderType];
  }
  
  // 이미 로컬 플레이스홀더인 경우 그대로 반환
  if (path.startsWith('/images/placeholders/')) {
    return path;
  }
  
  try {
    // PNG 변환 + 절대 URL 생성
    return toAbsoluteURL(toPNG(path));
  } catch (error) {
    console.error('이미지 처리 중 오류:', error);
    return PLACEHOLDER_IMAGES[placeholderType];
  }
};

/**
 * 챔피언 이미지 URL 수정 (기존 호환성 유지)
 */
export const fixChampionImageUrl = (url: string): string => {
  return processImagePathSync(url, 'champion');
};

/**
 * 이미지 에러 핸들러 (React에서 사용)
 */
export const createImageErrorHandler = (placeholderType: PlaceholderType = 'champion') => {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    
    // 이미 플레이스홀더인 경우 더 이상 시도하지 않음
    if (img.src === PLACEHOLDER_IMAGES[placeholderType] || img.src.includes('placeholder')) {
      return;
    }
    
    // 특성 이미지의 경우 대체 URL들을 시도
    if (placeholderType === 'trait' && img.src.includes('trait_icon_')) {
      const currentUrl = img.src;
      const traitNameMatch = currentUrl.match(/trait_icon_([^.]+)\.png/);
      
      if (traitNameMatch) {
        const apiName = traitNameMatch[1];
        const alternativeUrls = [
          `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/set12/trait_icon_${apiName}.png`,
          `https://raw.communitydragon.org/latest/game/assets/characters/tft/traiticons/trait_icon_${apiName}.png`,
          `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/tft-trait/${apiName}.png`
        ];
        
        // 현재 시도 중인 URL이 어느 것인지 확인
        const currentIndex = alternativeUrls.findIndex(url => url === currentUrl);
        const nextIndex = currentIndex + 1;
        
        // 다음 대체 URL이 있으면 시도
        if (nextIndex < alternativeUrls.length) {
          console.warn(`🔄 특성 이미지 로드 실패: ${currentUrl}`);
          console.warn(`🔄 대체 URL 시도 (${nextIndex + 1}/${alternativeUrls.length}): ${alternativeUrls[nextIndex]}`);
          img.src = alternativeUrls[nextIndex];
          return;
        } else {
          console.warn(`❌ 모든 특성 이미지 URL 시도 실패 for ${apiName}:`, alternativeUrls);
        }
      }
    }
    
    // 모든 대체 URL 실패 시 플레이스홀더 사용
    console.warn(`이미지 로드 실패: ${img.src}, 플레이스홀더로 교체`);
    img.src = PLACEHOLDER_IMAGES[placeholderType];
  };
};

/**
 * 특성 이미지 URL 처리 (특성 전용)
 */
export const processTraitImageUrl = (traitName: string): string => {
  if (!traitName) return PLACEHOLDER_IMAGES.trait;
  
  // 디버깅 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 processTraitImageUrl called with:', traitName, 'type:', typeof traitName);
  }
  
  // 한국어 특성명과 공백 포함 특성명을 API명으로 매핑
  const traitNameMap: Record<string, string> = {
    // 한국어 특성명
    '사기꾼': 'rogue',
    '마법사': 'mage', 
    '암살자': 'assassin',
    '요들': 'yordle',
    '기계': 'automata',
    '전사': 'warrior',
    '수호자': 'guardian',
    '마법학자': 'scholar',
    '강인함': 'bruiser',
    '조련사': 'trainer',
    '술객': 'drunkard',
    '사수': 'marksman',
    '닌자': 'ninja',
    '스나이퍼': 'sniper',
    // 영어 특성명 (공백 포함)
    'anima squad': 'animasquad',
    'k/da': 'kda',
    'true damage': 'truedamage',
    'pentakill': 'pentakill',
    'heartsteel': 'heartsteel',
    'country': 'country',
    'hyperpop': 'hyperpop',
    'mixmaster': 'mixmaster',
    'punk': 'punk',
    'wildcard': 'wildcard',
    'big shot': 'bigshot',
    'spellsword': 'spellsword',
    // 일반적인 TFT 특성들 (정확한 매핑)
    'marksman': 'marksman',
    'bruiser': 'bruiser',
    'guardian': 'guardian',
    'mystic': 'mystic',
    'sniper': 'sniper',
    'rogue': 'rogue',
    'mage': 'mage',
    'assassin': 'assassin',
    'yordle': 'yordle',
    'ninja': 'ninja',
    'automata': 'automata',
    'warrior': 'warrior',
    'scholar': 'scholar',
    'trainer': 'trainer',
    'drunkard': 'drunkard',
    // 추가 특성들
    'sentinel': 'sentinel',
    'invoker': 'invoker',
    'rebel': 'rebel',
    'gunner': 'gunner',
    'spatula': 'spatula',
    'placebo': 'placebo',
    // Set 12 특성들
    'virus': 'virus',
    'watcher': 'watcher',
    'honeymancer': 'honeymancer',
    'shapeshifter': 'shapeshifter',
    'blaster': 'blaster',
    'vanguard': 'vanguard',
    'duelist': 'duelist',
    'multistriker': 'multistriker',
    'dryad': 'dryad',
    'fated': 'fated',
    'sage': 'sage',
    'fortune': 'fortune',
    'umbral': 'umbral',
    'mythic': 'mythic',
    'porcelain': 'porcelain',
    'altruist': 'altruist',
    'reaper': 'reaper',
    'pyro': 'pyro',
    'behemoth': 'behemoth',
    'exalted': 'exalted',
    'dragonlord': 'dragonlord',
    'inkshadow': 'inkshadow',
    'storyweaver': 'storyweaver',
    'heavenly': 'heavenly',
    'arcanist': 'arcanist',
    'trickshot': 'trickshot'
  };
  
  // API명으로 변환 시도 (대소문자 무시하고 검색)
  const lowerTraitName = traitName.toLowerCase();
  let apiName = traitNameMap[lowerTraitName] || traitNameMap[traitName];
  
  // 매핑되지 않은 경우 공백 제거 및 소문자 변환
  if (!apiName) {
    apiName = traitName.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
  }
  
  // 여러 URL 패턴 시도
  const urlPatterns = [
    // 1. 기본 패턴 (현재 Community Dragon 구조)
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_${apiName}.png`,
    // 2. Set 별 경로 시도 (Set 12, 11, 10)
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/set12/trait_icon_${apiName}.png`,
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/set11/trait_icon_${apiName}.png`,
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/set10/trait_icon_${apiName}.png`,
    // 3. 다른 경로 구조들
    `https://raw.communitydragon.org/latest/game/assets/characters/tft/traiticons/trait_icon_${apiName}.png`,
    `https://raw.communitydragon.org/latest/game/assets/ux/tft/traiticons/trait_icon_${apiName}.png`,
    // 4. 이전 CDN 구조 (혹시 복원된 경우)
    `https://raw.communitydragon.org/latest/cdragon/tft/assets/ux/traiticons/trait_icon_${apiName}.png`,
    // 5. Riot Dragon 시도 (다양한 버전)
    `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/tft-trait/${apiName}.png`,
    `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/tft-trait/${apiName}.png`,
    // 6. 대체 확장자 시도
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/${apiName}.png`,
    `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_${apiName}.png`
  ];
  
  // 첫 번째 URL 시도
  const primaryUrl = urlPatterns[0];
  const finalUrl = processImagePathSync(primaryUrl, 'trait');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Trait image URL generated:', finalUrl, 'for apiName:', apiName);
    console.log('🔍 All URL patterns to try:', urlPatterns);
    console.log('🔍 Mapped trait name:', traitName, '->', apiName);
  }
  
  return finalUrl;
};

/**
 * 아이템 이미지 URL 처리 (아이템 전용)
 */
export const processItemImageUrl = (itemPath: string): string => {
  return processImagePathSync(itemPath, 'item');
};

/**
 * 챔피언 스킬 아이콘 URL 처리 (스킬 전용)
 */
export const getAbilityIconUrl = (iconPath: string): string => {
  if (!iconPath) return PLACEHOLDER_IMAGES.champion;
  
  // 스킬 아이콘 경로 처리
  return processImagePathSync(iconPath, 'champion');
};

/**
 * 안전한 이미지 경로 처리 (동기적)
 * ChampionTooltip 호환성을 위한 별칭 함수
 */
export const safeProcessImagePath = (path: string): string => {
  return processImagePathSync(path, 'champion');
};

/**
 * 이미지 사전 로딩 함수
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
    
    // 5초 타임아웃
    setTimeout(() => reject(new Error(`Image preload timeout: ${url}`)), 5000);
  });
};

/**
 * 특성 아이콘 URL 처리 (기존 호환성)
 * @deprecated processTraitImageUrl 사용을 권장합니다
 */
export const getTraitIconUrl = (traitName: string): string => {
  return processTraitImageUrl(traitName);
};

/**
 * 챔피언 이미지 URL 처리 (기존 호환성)
 * @deprecated fixChampionImageUrl 사용을 권장합니다
 */
export const getChampionImageUrl = (url: string): string => {
  return fixChampionImageUrl(url);
};