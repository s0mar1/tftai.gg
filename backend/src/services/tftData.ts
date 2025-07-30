import axios from 'axios';
import { getExternalServicesConfig } from '../initialization/envLoader';
import logger from '../config/logger';
import { Champion, Item, Trait, Augment } from '../types/index';

export interface TFTData {
  items: {
    basic: Item[];
    completed: Item[];
    ornn: Item[];
    radiant: Item[];
    emblem: Item[];
    unknown: Item[];
  };
  augments: Augment[];
  champions: Champion[];
  traits: Trait[];
  traitMap: Map<string, Trait>;
  currentSet: string;
  krNameMap?: Map<string, string>;
  nameMap?: Map<string, string>;
  language?: string;
  locale?: string;
}

interface LocaleUrls {
  [key: string]: string;
}

interface LanguageToLocale {
  [key: string]: string;
}

// 사용하지 않는 인터페이스들 제거
// interface StyleOrder {
//   [key: string]: number;
// }

// interface Palette {
//   [key: string]: string;
// }

interface StyleNumberToVariant {
  [key: number]: string;
}

// TFT API의 실제 스타일 번호 매핑
// Style 1 = Bronze, Style 3 = Silver, Style 4 = Chromatic (5코스트 개인시너지), Style 5 = Gold, Style 6 = Prismatic
const STYLE_NUMBER_TO_VARIANT: StyleNumberToVariant = {
  0: 'inactive',
  1: 'bronze',
  3: 'silver',
  4: 'chromatic', // 5코스트 개인 시너지
  5: 'gold',
  6: 'prismatic'
};

const LANGUAGE_TO_LOCALE: LanguageToLocale = {
  'en': 'en_us',
  'ko': 'ko_kr',
  'ja': 'ja_jp',
  'zh': 'zh_cn',
};

const EN_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';

const LOCALE_URLS: LocaleUrls = {
  'en_us': 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json',
  'ko_kr': 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json',
  'ja_jp': 'https://raw.communitydragon.org/latest/cdragon/tft/ja_jp.json',
  'zh_cn': 'https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json',
};

const toPNG = (path: string) => {
    if (!path) return '';
    return path.toLowerCase()
        .replace('.dds', '.png')
        .replace('.tex', '.png');
}

const toAbsoluteURL = (path: string) => {
    if (!path) return '';
    
    // 이미 절대 URL인 경우 Community Dragon CDN 구조 수정
    if (path.startsWith('http://') || path.startsWith('https://')) {
        // Community Dragon URL 구조 수정: /cdragon/tft/assets/ -> /game/assets/
        if (path.includes('raw.communitydragon.org/latest/cdragon/tft/assets/')) {
            const fixedPath = path.replace('/cdragon/tft/assets/', '/game/assets/');
            logger.info(`URL Fixed: ${path} -> ${fixedPath}`);
            return fixedPath;
        }
        
        // 혹시 다른 잘못된 구조가 있을 수 있으니 추가 체크
        if (path.includes('raw.communitydragon.org/latest/cdragon/')) {
            const fixedPath = path.replace('/cdragon/', '/game/');
            logger.info(`URL Fixed (general): ${path} -> ${fixedPath}`);
            return fixedPath;
        }
        
        return path;
    }
    
    // Community Dragon 베이스 URL과 결합
    const baseURL = 'https://raw.communitydragon.org/latest/game/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return baseURL + cleanPath;
}

// 확장자 변환 + 절대 URL 생성을 한 번에 처리
const processImagePath = (path: string) => {
    if (!path) return '';
    const pngPath = toPNG(path);
    const absoluteUrl = toAbsoluteURL(pngPath);
    return absoluteUrl;
}

interface RawTFTData {
  sets: {
    [key: string]: {
      champions: any[];
      traits: any[];
    };
  };
  items: any[];
}

// 메모리 캐시 추가 (개선된 버전)
interface CacheEntry {
  data: TFTData;
  timestamp: number;
  accessCount: number;
}

class TFTDataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 10; // 최대 10개 언어 캐시
  private readonly TTL = 1000 * 60 * 30; // 30분 TTL
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 1000 * 60 * 10); // 10분마다 정리
  }

  private cleanup() {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        entriesToDelete.push(key);
      }
    }

    for (const key of entriesToDelete) {
      this.cache.delete(key);
    }

    // 캐시 크기가 초과되면 가장 오래된 것부터 제거
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toDelete = sortedEntries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      for (const [key] of toDelete) {
        this.cache.delete(key);
      }
    }

    logger.info(`TFT 데이터 캐시 정리 완료. 현재 캐시 크기: ${this.cache.size}`);
  }

  get(key: string): TFTData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    // 접근 횟수 증가
    entry.accessCount++;
    entry.timestamp = now; // 최근 접근 시간 갱신
    return entry.data;
  }

  set(key: string, data: TFTData) {
    // 캐시 크기 제한 확인
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      // 가장 적게 사용된 항목 제거 (LRU)
      const leastUsed = Array.from(this.cache.entries()).reduce((min, curr) => 
        curr[1].accessCount < min[1].accessCount ? curr : min
      );
      this.cache.delete(leastUsed[0]);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  clear() {
    this.cache.clear();
    logger.info('TFT 데이터 캐시가 수동으로 클리어되었습니다.');
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        accessCount: entry.accessCount
      }))
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

const tftDataCache = new TFTDataCache();

// 기본 fallback 데이터 (최소한의 서버 작동을 위함)
const createFallbackData = (language: string = 'ko'): TFTData => {
  logger.warn('fallback TFT 데이터를 생성합니다.');
  return {
    items: {
      basic: [],
      completed: [],
      ornn: [],
      radiant: [],
      emblem: [],
      unknown: []
    },
    augments: [],
    champions: [],
    traits: [],
    traitMap: new Map(),
    currentSet: 'Set15',
    krNameMap: new Map(),
    nameMap: new Map(),
    language,
    locale: LANGUAGE_TO_LOCALE[language] || 'ko_kr'
  };
};

// 캐시 클리어 함수
export const clearTFTDataCache = () => {
  tftDataCache.clear();
};

// 캐시 통계 조회 함수
export const getTFTDataCacheStats = () => {
  return tftDataCache.getStats();
};

// 캐시 정리 함수 (서버 종료 시 사용)
export const destroyTFTDataCache = () => {
  tftDataCache.destroy();
};

// 다국어 지원 TFT 데이터 가져오기 (캐싱 기능이 추가된 최종 버전)
export const getTFTDataWithLanguage = async (language: string = 'ko'): Promise<TFTData | null> => {
  // 캐시 확인 (성능 최적화)
  const cachedData = tftDataCache.get(language);
  if (cachedData) {
    logger.info(`캐시된 TFT 데이터를 반환합니다. (언어: ${language})`);
    return cachedData;
  }

  try {
    // 언어 코드를 데이터 드래곤 로케일로 변환
    let locale = LANGUAGE_TO_LOCALE[language] || 'ko_kr';
    
    logger.info(`TFT 데이터 서비스를 초기화합니다... (언어: ${language} -> 로케일: ${locale})`);
    
    if (!LOCALE_URLS[locale]) {
      logger.warn(`지원하지 않는 로케일: ${locale}, 한국어로 대체합니다.`);
      locale = 'ko_kr';
    }

    // 설정 기반 타임아웃 (기존 15초 기본값 유지)
    const config = getExternalServicesConfig();
    const requestTimeout = config.staticData?.loadTimeout || 15000; // 기존 기본값 보존
    
    // 재시도 로직을 포함한 API 호출
    const fetchWithRetry = async (url: string, maxRetries: number = 3): Promise<any> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Community Dragon API 호출 시도 ${attempt}/${maxRetries}: ${url}`);
          const response = await axios.get(url, { 
            timeout: requestTimeout, // 설정 기반 타임아웃 사용
            headers: {
              'User-Agent': 'TFT-Meta-Analyzer/1.0'
            }
          });
          return response;
        } catch (_error: any) {
          logger.warn(`API 호출 실패 (${attempt}/${maxRetries}): ${url}`, (_error as Error).message);
          if (attempt === maxRetries) throw _error;
          // 재시도 전 대기 (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    };

    const [enResponse, localeResponse] = await Promise.all([
      fetchWithRetry(EN_URL),
      fetchWithRetry(LOCALE_URLS[locale] || '')
    ]);

    const enData: RawTFTData = enResponse?.data;
    const localeData: RawTFTData = localeResponse?.data;
    
    const currentSetKey = Object.keys(enData.sets).sort((a, b) => parseInt(b) - parseInt(a))[0];
    const enSetData = currentSetKey ? enData?.sets?.[currentSetKey] : undefined;
    const localeSetData = currentSetKey ? localeData?.sets?.[currentSetKey] : undefined;

    const localeChampionNames = new Map(localeSetData?.champions?.map((c: any) => [c.apiName, c.name]) || []);
    const localeTraitNames = new Map(localeSetData?.traits?.map((t: any) => [t.apiName, t.name]) || []);
    // 한국어 특성 이름 -> API 이름 역방향 매핑 생성 (현재 미사용)
    // const _koreanToApiTraitNames = new Map(localeSetData?.traits?.map(t => [t.name, t.apiName]) || []);
    const localeItemNames = new Map();
    
    enData.items.forEach(enItem => {
        const localeFoundItem = localeData.items.find(localeIt => localeIt.apiName === enItem.apiName);
        if (localeFoundItem) {
            localeItemNames.set(enItem.apiName, localeFoundItem.name);
        } else {
            localeItemNames.set(enItem.apiName, enItem.name);
            if (language === 'ko') {
              logger.warn(`[데이터 불일치] 아이템 '${enItem.apiName}'의 한국어 이름을 찾지 못해 영어 이름으로 대체합니다.`);
            }
        }
    });

    const champions: Champion[] = enSetData?.champions || []
      ?.filter((champ: any) => {
        const apiName = champ.apiName.toLowerCase();
        
        // 디버깅 로그 추가
        if (apiName.includes('bluegolem') || apiName.includes('crab') || apiName.includes('krug')) {
          logger.info(`[DEBUG] 중성 유닛 필터링 테스트: ${champ.apiName} - cost: ${champ.cost}, traits: ${champ.traits?.length || 0}`);
        }
        
        // 1. 중성 유닛 및 시스템 유닛 먼저 제외 (최우선)
        const excludePatterns = [
          'tft_bluegolem',     // 골렘
          'tft_krug',          // 크룩
          'tft9_slime_crab',   // 바위 게 
          'tft_wolf',          // 늑대
          'tft_murkwolf',      // 늑대 (추가)
          'tft_razorbeak',     // 칼날 부리
          'tft_dragon',        // 드래곤
          'tft_baron',         // 바론
          'tft_trainingdummy', // 훈련용 더미
          'tft_voidspawn',     // 공허 소환물
          'tft_riftherald',    // 전령
          'tft_placeholder',   // 플레이스홀더
          'tft_debug',         // 디버그 유닛
          'tft_test',          // 테스트 유닛
          'tutorial',          // 튜토리얼
        ];
        
        // 제외 패턴에 해당하는 경우 즉시 false
        if (excludePatterns.some(pattern => apiName.includes(pattern))) {
          return false;
        }
        
        // 2. TFT15_ 패턴만 허용 (대소문자 구분 없음)
        if (!apiName.includes('tft15_')) {
          return false;
        }
        
        // 3. 기본 조건 강화 - traits 배열이 실제로 존재하고 비어있지 않아야 함
        if (champ.cost <= 0 || !champ.traits || !Array.isArray(champ.traits) || champ.traits.length === 0) {
          return false;
        }
        
        return true;
      })
      ?.map((enChamp: any) => {
          const champName = localeChampionNames.get(enChamp.apiName) || enChamp.name || enChamp.apiName || '미확인 챔피언';
          if (!localeChampionNames.has(enChamp.apiName) && language === 'ko') {
            logger.warn(`[데이터 불일치] 챔피언 '${enChamp.apiName}'의 한국어 이름을 찾지 못해 영어 이름으로 대체합니다.`);
          }
          
          const localeChamp = localeSetData?.champions?.find((c: any) => c.apiName === enChamp.apiName);

          const baseAbility = enChamp.ability || enChamp.abilities?.[0];
          let finalAbility = null;

          if (baseAbility) {
              finalAbility = JSON.parse(JSON.stringify(baseAbility));

              if (localeChamp) {
                  const localeAbility = localeChamp.ability || localeChamp.abilities?.[0];
                  if (localeAbility) {
                      finalAbility.name = localeAbility.name || finalAbility.name;
                      finalAbility.desc = localeAbility.desc || finalAbility.desc;
                      finalAbility.icon = processImagePath(localeAbility.icon) || processImagePath(baseAbility.icon);
                  }
              }
              if (!finalAbility.icon && baseAbility.icon) {
                  finalAbility.icon = processImagePath(baseAbility.icon);
              }
          }
          
          return {
              ...enChamp,
              ability: finalAbility,
              abilities: undefined,
              name: champName,
              icon: processImagePath(enChamp.icon),
              tileIcon: processImagePath(enChamp.tileIcon),
              image_url: processImagePath(enChamp.tileIcon || enChamp.icon),
              // 로케일에 맞는 특성 이름 사용 (한국어면 한국어로)
              traits: localeChamp 
                ? localeChamp.traits  // 한국어 특성 이름 그대로 사용
                : enChamp.traits,
          };
      });

    const traitMap = new Map<string, Trait>();
    const koreanToEnglishTraitMap = new Map<string, string>(); // 한국어 -> 영어 매핑
    
    enSetData?.traits?.forEach((trait: any) => {
        const localeName = localeTraitNames.get(trait.apiName);
        if (!localeName && language === 'ko') {
            logger.warn(`[데이터 불일치] 특성 '${trait.apiName}'의 한국어 이름을 찾지 못해 영어 이름으로 대체합니다.`);
        }
        
        // 원본 영어 이름 보존
        const englishName = trait.name || trait.apiName;
        const koreanName = localeName || trait.name || trait.apiName || '미확인 특성';
        
        // 더 안전한 fallback 처리
        trait.name = koreanName;
        trait.englishName = englishName; // 영어 이름 추가 보존
        trait.koreanName = koreanName;   // 한국어 이름 명시적 저장
        trait.icon = processImagePath(trait.icon); 
        
        const mapKey = trait.apiName.toLowerCase();

        let overallStyleVariant = 'none';
        if (trait.effects && trait.effects.length > 0) {
            const maxStyleNumber = Math.max(...trait.effects.map((effect: any) => effect.style || 0));
            overallStyleVariant = STYLE_NUMBER_TO_VARIANT[maxStyleNumber] || 'none';
        }
        trait.style = overallStyleVariant;

        // API 이름 기반으로 계열/직업 분류 (언어 독립적)
        const originsApiList = ['streetdemon', 'divinicorp', 'overlord', 'hotrod', 'animasquad', 'viegouniquetrait', 'netgod', 'virus', 'uniquetrait', 'cyberboss', 'mob', 'suits', 'edgerunner', 'immortal', 'ballistek'];
        const classesApiList = ['supercharge', 'bruiser', 'thirsty', 'marksman', 'armorclad', 'swift', 'controller', 'cutter', 'strong', 'vanguard', 'soulkiller', 'assassin', 'techie', 'sniper'];

        const traitApiName = trait.apiName.toLowerCase();
        if (originsApiList.some(origin => traitApiName.includes(origin))) {
            trait.type = 'origin';
        } else if (classesApiList.some(cls => traitApiName.includes(cls))) {
            trait.type = 'class';
        } else {
            // 기본값을 'class'로 설정하여 'unknown' 방지
            trait.type = 'class'; 
            logger.warn(`WARN: Unknown trait type for: ${trait.name} (${trait.apiName}). Assigned 'class' type as default.`);
        }

        // 영어 API 이름을 키로 하는 매핑
        traitMap.set(mapKey, trait);
        
        // 한국어 이름을 키로 하는 역방향 매핑 추가
        if (language === 'ko' && koreanName && koreanName !== trait.apiName) {
            koreanToEnglishTraitMap.set(koreanName, englishName);
            // 한국어 이름으로도 직접 접근 가능하도록 추가
            traitMap.set(koreanName.toLowerCase(), trait);
        }
    });

    const plainTraitMap: { [key: string]: Trait } = {};
    traitMap.forEach((value, key) => {
        plainTraitMap[key] = value;
    });

    const basicItems: Item[] = [];
    const completedItems: Item[] = [];
    const ornnItems: Item[] = [];
    const radiantItems: Item[] = [];
    const emblemItems: Item[] = [];
    const processedAugments: Augment[] = [];
    const unknownItems: Item[] = [];

    // Set 15 기본 컴포넌트 아이템 정의 (정확한 apiName 리스트)
    const SET15_BASIC_ITEMS = [
      'TFT_Item_BFSword',           // B.F. Sword
      'TFT_Item_ChainVest',         // Chain Vest  
      'TFT_Item_FryingPan',         // Frying Pan
      'TFT_Item_GiantsBelt',        // Giant's Belt
      'TFT_Item_NeedlesslyLargeRod', // Needlessly Large Rod
      'TFT_Item_NegatronCloak',     // Negatron Cloak
      'TFT_Item_RecurveBow',        // Recurve Bow
      'TFT_Item_SparringGloves',    // Sparring Gloves
      'TFT_Item_Spatula',           // Spatula
      'TFT_Item_TearOfTheGoddess'   // Tear of the Goddess
    ];

    // Set 15 래디언트 아이템 식별자
    const RADIANT_IDENTIFIERS = ['radiant', 'blessed', 'royal', 'rosethorn', 'spear_of_hirana', 'bulwarks_oath'];

    // Set 15 상징(emblem) 아이템 특성 목록
    const SET15_TRAITS_FOR_EMBLEMS = [
      'battleacademia', 'bastion', 'crystalgambit', 'duelist', 'edgelord', 
      'executioner', 'luchador', 'prodigy', 'protector', 'sniper', 
      'starguardian', 'soulfighter', 'strategist', 'supremecells', 'wraith'
    ];

    enData.items.forEach(item => {
        const apiName = item.apiName?.toLowerCase();
        const iconPath = item.icon?.toLowerCase();

        // Set 15 아이템 필터링 강화
        if (
            !item.icon ||
            iconPath.includes('_placeholder') || iconPath.includes('_debug') || iconPath.includes('_test') ||
            apiName.includes('_debug_') || apiName.includes('_test_') || apiName.includes('_placeholder_') ||
            apiName.includes('trainingdummy') ||
            // Set 15가 아닌 모든 TFT 세트 아이템 제외 (강화된 필터링)
            (apiName.match(/^tft\d+_/) && !apiName.includes('tft15_')) ||
            (apiName.match(/^tft[1-9][0-4]?_/) && !apiName.includes('tft15_')) ||
            // 특정 이전 세트 패턴들 제외
            apiName.includes('tft6_merc') || 
            apiName.includes('tft7_') ||
            apiName.includes('tft8_') ||
            apiName.includes('tft9_') ||
            apiName.includes('tft10_') ||
            apiName.includes('tft11_') ||
            apiName.includes('tft12_') ||
            apiName.includes('tft13_') ||
            apiName.includes('tft14_') ||
            // 기존 세트 필터링 로직 유지
            (apiName.includes('_set') && !apiName.includes('_set' + currentSetKey + '_') && !item.composition?.length && item.type !== 'Augment' && !item.isUnique && !(item.associatedTraits && item.associatedTraits.length > 0))
        ) {
            return;
        }

        const localeName = localeItemNames.get(item.apiName);
        const processedItem = {
            ...item,
            name: localeName || item.name || item.apiName || '미확인 아이템',
            icon: processImagePath(item.icon)
        };

        if (iconPath.includes('augments/') || apiName.includes('augments') || item.type === 'Augment') {
            processedAugments.push(processedItem);
            return;
        }

        // Set 15 아이템 분류 로직 (정확도 개선)
        
        // 1. 기본 컴포넌트 아이템 확인 (정확한 apiName 매칭)
        if (SET15_BASIC_ITEMS.includes(item.apiName)) {
            basicItems.push(processedItem);
        }
        // 2. 래디언트 아이템 확인 (아이콘 경로 + API 이름 + 식별자)
        else if (
            iconPath.includes('items/radiant/') || 
            iconPath.includes('/radiant/') ||
            RADIANT_IDENTIFIERS.some(identifier => apiName.includes(identifier)) ||
            apiName.includes('tft5_item_') || // 래디언트 아이템의 일반적 패턴
            item.name?.toLowerCase().includes('radiant') ||
            item.name?.toLowerCase().includes('blessed')
        ) {
            radiantItems.push(processedItem);
        }
        // 3. 아티팩트/오른 아이템 확인
        else if (
            iconPath.includes('items/artifacts/') || 
            iconPath.includes('/artifacts/') ||
            apiName.includes('ornn') || 
            apiName.includes('artifact') ||
            item.goldValue === 0 && item.composition && item.composition.length === 0 && !SET15_BASIC_ITEMS.includes(item.apiName)
        ) {
            ornnItems.push(processedItem);
        }
        // 4. 상징(emblem) 아이템 확인 (개선된 로직)
        else if (
            iconPath.includes('items/emblems/') || 
            iconPath.includes('/emblems/') ||
            (item.associatedTraits && item.associatedTraits.length > 0) ||
            SET15_TRAITS_FOR_EMBLEMS.some(trait => apiName.includes(trait)) ||
            apiName.includes('emblem') ||
            (item.name && item.name.toLowerCase().includes('emblem'))
        ) {
            emblemItems.push(processedItem);
        }
        // 5. 완성 아이템 확인 (composition이 있거나 골드 가치가 있는 일반 아이템)
        else if (
            (item.composition && item.composition.length > 0) ||
            (apiName.startsWith('tft_item_') && !apiName.includes('_component_') && item.goldValue > 0) ||
            (item.goldValue > 0 && !SET15_BASIC_ITEMS.includes(item.apiName))
        ) {
            completedItems.push(processedItem);
        }
        // 6. 기타 아이템
        else {
            unknownItems.push(processedItem);
        }
    });

    const localizedTftData: TFTData = {
      items: {
        basic: basicItems,
        completed: completedItems,
        ornn: ornnItems,
        radiant: radiantItems,
        emblem: emblemItems,
        unknown: unknownItems,
      },
      augments: processedAugments,
      champions: champions,
      traits: Object.values(plainTraitMap),
      traitMap: traitMap,
      currentSet: `Set${currentSetKey}`,
      language: language,
      locale: locale,
      // 프론트엔드 호환성을 위해 krNameMap도 추가 (API명 -> 한국어 이름만)
      krNameMap: new Map([
        // API명 -> 한국어 이름 매핑 (소문자 변환)
        ...Array.from(localeChampionNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value]),
        ...Array.from(localeTraitNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value]),
        ...Array.from(localeItemNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value])
      ] as any),
      nameMap: new Map([
        // 기존 매핑: apiName -> 한국어 이름
        ...Array.from(localeChampionNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value]),
        ...Array.from(localeTraitNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value]),
        ...Array.from(localeItemNames.entries()).map(([key, value]: [string, string]) => [key.toLowerCase(), value]),
        // 역방향 매핑: 한국어 특성 이름 -> API 이름 (대소문자 유지)
        ...Array.from(localeTraitNames.entries()).map(([apiName, koreanName]: [string, string]) => [koreanName, apiName])
      ] as any),
      // 특성 전용 한국어 -> 영어 매핑 추가 (프론트엔드 매핑 지원)
      // koreanToEnglishTraitMap: koreanToEnglishTraitMap  // 임시 주석 처리
    };
    
    // 데이터 구조 확인을 위한 디버깅 로그
    logger.info(`[getTFTDataWithLanguage] 최종 데이터 구조 확인:`, {
      hasChampions: !!localizedTftData.champions,
      championsCount: localizedTftData.champions?.length,
      hasTraits: !!localizedTftData.traits,
      traitsCount: localizedTftData.traits?.length,
      hasTraitMap: !!localizedTftData.traitMap,
      traitMapSize: localizedTftData.traitMap?.size,
      hasItems: !!localizedTftData.items,
      itemsKeys: localizedTftData.items ? Object.keys(localizedTftData.items) : null,
      hasNameMap: !!localizedTftData.nameMap,
      nameMapSize: localizedTftData.nameMap?.size,
      objectKeys: Object.keys(localizedTftData)
    });
    
    const totalItemCount = basicItems.length + completedItems.length + ornnItems.length + 
                           radiantItems.length + emblemItems.length + unknownItems.length;
    logger.info(`TFT 데이터 초기화 완료! (언어: ${language}, 로케일: ${locale}, 시즌: ${localizedTftData.currentSet}, 챔피언 ${localizedTftData.champions.length}개, 아이템 ${totalItemCount}개, 증강체 ${localizedTftData.augments.length}개)`);
    
    // 2. 성공 시 캐시에 저장
    tftDataCache.set(language, localizedTftData);
    
    return localizedTftData;

  } catch (_error: any) {
    logger.error(`TFT 데이터 서비스 초기화 실패 (언어: ${language}): ${_error.message}`);
    
    // 타임아웃 에러의 경우 상세한 로깅
    if (_error.code === 'ECONNABORTED' || _error.message.includes('timeout')) {
      logger.error(`Community Dragon API 타임아웃 발생. URL: ${_error.config?.url || 'unknown'}`);
    }
    
    // 네트워크 에러의 경우
    if (_error.code === 'ECONNRESET' || _error.code === 'ENOTFOUND') {
      logger.error(`Community Dragon API 네트워크 에러: ${_error.code}`);
    }
    
    // 캐시에서 이전 데이터 확인 (stale-while-revalidate 패턴)
    const staleData = tftDataCache.get(language);
    if (staleData) {
      logger.warn(`API 호출 실패로 인해 캐시된 데이터를 반환합니다. (언어: ${language})`);
      return staleData;
    }
    
    // 최후의 수단: fallback 데이터 생성
    logger.error('모든 시도 실패. fallback 데이터를 생성하여 서버가 멈추지 않도록 합니다.');
    const fallbackData = createFallbackData(language);
    tftDataCache.set(language, fallbackData);
    return fallbackData;
  }
};

// getTFTData 함수는 이제 사용되지 않으므로 삭제합니다.
// export default getTFTData;
