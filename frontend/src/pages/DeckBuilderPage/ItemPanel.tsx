import React, { useMemo, useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';
import { useTranslation } from 'react-i18next';
import { Item } from '../../types';

interface DraggableItemProps {
  item: Item;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ITEM,
    item: { item },
    collect: m => ({ isDragging: m.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      title={item.name}
      style={{
        width: 36,
        height: 36,
        margin: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <img
        src={item.icon || '/item_fallback.png'}
        alt={item.name}
        onError={e => (e.currentTarget.src = '/item_fallback.png')}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

interface ItemPanelProps {
  mini?: boolean;
}

interface Tab {
  id: string;
  label: string;
  items: Item[];
}

const ItemPanel: React.FC<ItemPanelProps> = ({ mini = false }) => {
  if (import.meta.env.DEV) {
    console.log('ItemPanel: 컴포넌트 렌더링 시작');
  }
  const tftDataResult = useTFTData();
  const { t } = useTranslation();
  
  if (import.meta.env.DEV) {
    console.log('ItemPanel: useTFTData 결과:', {
      tftDataResult: !!tftDataResult,
      tftDataResultType: typeof tftDataResult,
      loading: tftDataResult?.loading,
      error: tftDataResult?.error,
      itemsByCategory: tftDataResult?.itemsByCategory ? Object.keys(tftDataResult.itemsByCategory).length : 0
    });
  }
  
  // 안전한 구조분해 할당
  const itemsByCategory = tftDataResult?.itemsByCategory || {};
  const loading = tftDataResult?.loading || false;
  const error = tftDataResult?.error || null;
  
  // 디버깅 정보 추가
  if (import.meta.env.DEV) {
    console.log('ItemPanel 디버깅:', {
      tftDataResult: !!tftDataResult,
      itemsByCategory: !!itemsByCategory,
      itemsByCategoryKeys: Object.keys(itemsByCategory || {}),
      loading,
      error,
      itemsByCategoryEntries: Object.entries(itemsByCategory || {}).map(([key, items]) => ({ key, count: items?.length || 0 })),
      tftDataResultKeys: tftDataResult ? Object.keys(tftDataResult) : null
    });
  }

  const tabs: Tab[] = useMemo(() => {
    if (!itemsByCategory) return [];
    return Object.entries(itemsByCategory)
      .filter(([, list]) => list?.length)
      .map(([id, list]) => {
        let label = id.replace(/\s*\(\d+\)\s*$/, '');
        
        // 아이템 카테고리 라벨 정리
        if (label.endsWith(t('items.category.item')) || label.endsWith(' ' + t('items.category.item'))) {
          label = label.replace(new RegExp(`\\s*${t('items.category.item')}$`), '').trim();
        }
        
        if (label.includes('엑소테크')) {
          label = t('items.category.exotech');
        }
        
        return { id, label, items: list };
      });
  }, [itemsByCategory, t]);

  const [active, setActive] = useState('');
  useEffect(() => {
    if (!active && tabs.length) setActive(tabs[0].id);
  }, [tabs, active]);

  if (loading) return <p className="text-text-primary dark:text-dark-text-primary">{t('common.loading')}</p>;
  if (error)   return <p className="text-error-red">{t('errors.dataLoadError')}: {error.toString()}</p>;
  
  // 데이터가 아직 로드되지 않았다면 기다림 (조건 완화)
  if (Object.keys(itemsByCategory).length === 0) {
    return <p className="text-text-primary dark:text-dark-text-primary">{t('deckBuilder.itemsLoadingData')}</p>;
  }
  
  if (!tabs.length) return <p className="text-text-primary dark:text-dark-text-primary">{t('common.noData')}</p>;

  if (mini) {
    return (
      <div className="h-full overflow-y-auto">
        {tabs.map(t => (
          <div key={t.id} className={active === t.id ? 'block' : 'hidden'}>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(auto-fill, 24px)' }}
            >
              {t.items.map(it => (
                <div 
                  key={it.apiName}
                  className="w-6 h-6 rounded-sm overflow-hidden shadow-md"
                  title={it.name}
                >
                  <img src={it.icon || '/item_fallback.png'} alt={it.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary flex flex-col h-full">
      <h2 className="text-xl font-bold mb-3">{t('deckBuilder.items')}</h2>
      <div className="flex flex-wrap border-b border-gray-300 mb-3">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            title={`${t.label} (${t.items.length})`}
            className={`px-2 py-1 text-sm whitespace-nowrap ${
              active === t.id
                ? 'text-brand-mint border-b-2 border-brand-mint'
                : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-y-auto overflow-x-hidden">
        {tabs.map(t => (
          <div key={t.id} className={active === t.id ? 'block' : 'hidden'}>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(auto-fill, 36px)' }}
            >
              {t.items.map(it => (
                <DraggableItem key={it.apiName} item={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ItemPanel;