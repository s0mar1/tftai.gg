// backend/src/services/itemDatabase.ts
import fs from 'fs';
import { getTFTDataWithLanguage } from './tftData';
import logger from '../config/logger';
import { Item } from '../types/index';
import { getDataFilePath } from '../utils/pathUtils';

// ESM 호환 방식으로 data 파일 경로 생성
const itemsDataPath = getDataFilePath(import.meta.url, 'tft14_items_index.json');

interface TFTItem {
  apiName: string;
  name: string;
  icon: string;
  category: string;
}

interface CustomItem {
  api_name: string;
  korean_name: string;
  icon_path?: string;
}

interface CustomItemData {
  [category: string]: CustomItem[];
}

interface TFTData {
  items: {
    [key: string]: Item[];
  };
}

interface ItemDatabase {
  categorizedItems: { [category: string]: TFTItem[] };
  itemMap: Map<string, TFTItem>;
}

let itemDatabase: ItemDatabase | null = null;

const initializeItemDatabase = async (): Promise<ItemDatabase> => {
  if (itemDatabase) {
    return itemDatabase;
  }

  logger.info('통합 아이템 데이터베이스 생성을 시작합니다...');
  
  // 1. tftData.js로부터 실시간 아이템 정보를 가져옵니다.
  const tftData = await getTFTDataWithLanguage() as TFTData;
  const liveItems = tftData.items;
  
  // 모든 아이템 카테고리를 하나의 배열로 합칩니다.
  const allLiveItems: Item[] = [];
  Object.values(liveItems).forEach(categoryItems => {
    allLiveItems.push(...categoryItems);
  });
  
  const liveItemMap = new Map(allLiveItems.map(item => [(item as any).apiName || item.id, item]));

  // 2. 우리가 관리하는 JSON 파일을 "설계도"로 사용합니다.
  const customItemData: CustomItemData = JSON.parse(fs.readFileSync(itemsDataPath, 'utf8'));

  const allItems: TFTItem[] = [];
  const finalCategorizedItems: { [category: string]: TFTItem[] } = {};

  // 3. "설계도"를 기준으로 최종 아이템 목록을 만듭니다.
  for (const category in customItemData) {
    if (Object.hasOwnProperty.call(customItemData, category)) {
      finalCategorizedItems[category] = [];
      for (const customItem of (customItemData[category] || [])) {
        // 4. "부품 공급처"에 해당 부품(아이템)이 있는지 확인합니다.
        const liveItem = liveItemMap.get(customItem.api_name);

        // 5. 최종 아이템 객체를 조립합니다.
        const perfectItem: TFTItem = {
          apiName: customItem.api_name, // 설계도의 api_name을 기준으로 삼습니다.
          name: customItem.korean_name, // 설계도의 한글 이름을 사용합니다.
          // 아이콘은 live 데이터에 있으면 그것을 쓰고(신뢰도 높음), 
          // 없으면(tftData.js의 버그) 우리 JSON의 것을 대체재로 사용합니다.
          icon: liveItem?.icon || (customItem.icon_path || '').toLowerCase(),
          category: category,
        };
        
        allItems.push(perfectItem);
        finalCategorizedItems[category].push(perfectItem);
      }
    }
  }

  itemDatabase = {
    categorizedItems: finalCategorizedItems,
    itemMap: new Map(allItems.map(item => [item.apiName, item])),
  };
  
  logger.info(`통합 아이템 데이터베이스 생성 완료! 총 ${itemDatabase.itemMap.size}개 아이템 로드.`);
  return itemDatabase;
};

const dbPromise = initializeItemDatabase();

export default dbPromise;