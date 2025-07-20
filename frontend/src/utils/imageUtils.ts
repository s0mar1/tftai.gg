/**
 * 이미지 URL 처리 유틸리티 함수들
 * 백엔드의 tftData.ts와 동일한 로직을 프론트엔드에서 사용하기 위해 생성
 */

/**
 * .tex와 .dds 확장자를 .png로 변환
 * 백엔드의 toPNG 함수와 동일한 로직
 */
export const toPNG = (path: string): string => {
    if (!path) return '';
    return path.toLowerCase()
        .replace('.dds', '.png')
        .replace('.tex', '.png');
};

/**
 * 상대 경로를 절대 URL로 변환
 * 백엔드의 toAbsoluteURL 함수와 동일한 로직
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
 * 확장자 변환 + 절대 URL 생성을 한 번에 처리
 * 백엔드의 processImagePath 함수와 동일한 로직
 */
export const processImagePath = (path: string): string => {
    if (!path) return '';
    const pngPath = toPNG(path);
    const absoluteUrl = toAbsoluteURL(pngPath);
    return absoluteUrl;
};

/**
 * 안전한 이미지 경로 처리 함수
 * 이미 절대 URL인 경우 그대로 반환, 상대 경로인 경우에만 processImagePath 적용
 */
export const safeProcessImagePath = (path: string): string => {
    if (!path) return '';
    
    // 이미 절대 URL인 경우 그대로 반환
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    // 상대 경로인 경우에만 processImagePath 적용
    return processImagePath(path);
};

/**
 * 챔피언 스킬 아이콘 URL 생성 (기존 ChampionTooltip 로직 개선)
 * .tex 확장자 변환을 포함하여 처리
 */
export const getAbilityIconUrl = (iconPath: string | undefined): string => {
    if (!iconPath) return '';

    // 1. 확장자 변환 (.tex와 .dds를 .png로)
    let cleanedPath = toPNG(iconPath);

    // 2. 잘못된 전체 URL 접두사를 제거
    const incorrectPrefix = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
    if (cleanedPath.startsWith(incorrectPrefix)) {
        cleanedPath = cleanedPath.substring(incorrectPrefix.length);
    }

    // 3. 경로가 'assets/characters/'로 시작하는지 확인하고, 그렇지 않다면 올바른 구조를 만듦
    if (!cleanedPath.startsWith('assets/characters/')) {
        let championName = '';
        // 경로에서 챔피언 이름 (예: tft14_renekton)을 추출
        const championNameMatch = cleanedPath.match(/(tft\d+_[a-zA-Z]+)/);
        if (championNameMatch && championNameMatch[1]) {
            championName = championNameMatch[1];
        } else {
            // 챔피언 이름을 추출할 수 없는 경우 빈 문자열을 반환
            return ''; 
        }

        if (championName) {
            cleanedPath = `assets/characters/${championName}/hud/icons2d/${cleanedPath}`;
        }
    }

    return `https://raw.communitydragon.org/latest/game/${cleanedPath}`;
};

/**
 * 특성(Trait) 아이콘 URL 생성
 * MatchCard.tsx의 로직을 개선하여 통합
 */
export const getTraitIconUrl = (apiName: string, fallbackSet: string = 'tft14'): string => {
    if (!apiName) return '';
    
    const baseIconName = apiName.toLowerCase()
        .replace('set11_', '')
        .replace('.tex', '')
        .replace('.png', '');
    
    return `https://raw.communitydragon.org/latest/game/assets/traits/icon_${fallbackSet}_${baseIconName}.png`;
};

/**
 * 이미지 프리로딩 함수 (성능 최적화)
 */
const imageCache = new Map<string, Promise<string>>();

export const preloadImage = (url: string): Promise<string> => {
    if (imageCache.has(url)) {
        return imageCache.get(url)!;
    }
    
    const promise = new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(url); // 오류 발생 시에도 resolve
        img.src = url;
    });
    
    imageCache.set(url, promise);
    return promise;
};