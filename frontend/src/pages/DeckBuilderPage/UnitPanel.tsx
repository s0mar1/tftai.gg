import React, { useState, useMemo, useContext } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';
import { useTranslation } from 'react-i18next';
import { Champion, Trait } from '../../types';
import { ChampionCardSkeleton } from '../../components/common/TFTSkeletons';
import { processImagePath } from '../../utils/imageUtils';

const COST_COLORS: { [key: number]: string } = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };

interface DraggableUnitProps {
  champion: Champion;
}

const DraggableUnit: React.FC<DraggableUnitProps> = ({ champion }) => {
  const tftDataResult = useTFTData();
  const { showTooltip, hideTooltip } = tftDataResult || {};
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.UNIT,
    item: () => {
      if (import.meta.env.DEV) {
        console.log('드래그 시작:', champion.name, champion.apiName);
      }
      return { championApiName: champion.apiName };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        if (import.meta.env.DEV) {
          console.log('드롭 성공:', champion.name);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('드롭 실패:', champion.name);
        }
      }
    }
  }), [champion]);

  // 툴팁 표시 지연을 위한 타이머 ref
  const tooltipTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  if (!champion?.tileIcon) return null;
  const borderColor = COST_COLORS[champion.cost] || COST_COLORS[1];

  const handleMouseEnter = (e: React.MouseEvent) => {
    // 기존 타이머 클리어
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    
    // 200ms 지연 후 툴팁 표시 (UX 개선)
    tooltipTimerRef.current = setTimeout(() => {
      if (showTooltip && typeof showTooltip === 'function') {
        showTooltip(champion, e);
      } else {
        console.warn('showTooltip 함수가 없습니다:', { showTooltip, champion });
      }
    }, 200);
  };

  const handleMouseLeave = () => {
    // 타이머 클리어하여 툴팁 표시 취소
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    
    if (hideTooltip && typeof hideTooltip === 'function') {
      hideTooltip();
    } else {
      console.warn('hideTooltip 함수가 없습니다:', { hideTooltip });
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={drag} 
      className="flex flex-col items-center w-[52px] gap-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`rounded-md overflow-hidden shadow-md cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        style={{ width: 52, height: 52, border: `2px solid ${borderColor}` }}
        title={champion.name}
      >
        <img src={processImagePath(champion.tileIcon)} alt={champion.name} className="w-full h-full object-cover" />
      </div>
      <span className="block w-full text-center text-[0.55rem] leading-tight truncate">
        {champion.name}
      </span>
    </div>
  );
}

interface UnitPanelProps {
  mini?: boolean;
}

const UnitPanel: React.FC<UnitPanelProps> = ({ mini = false }) => {
  console.log('UnitPanel: 컴포넌트 렌더링 시작');
  const tftDataResult = useTFTData();
  const { t } = useTranslation();
  
  console.log('UnitPanel: useTFTData 결과:', {
    tftDataResult: !!tftDataResult,
    tftDataResultType: typeof tftDataResult,
    loading: tftDataResult?.loading,
    error: tftDataResult?.error,
    champions: tftDataResult?.champions?.length || 0,
    traits: tftDataResult?.traits?.length || 0,
    showTooltip: typeof tftDataResult?.showTooltip,
    hideTooltip: typeof tftDataResult?.hideTooltip
  });
  
  // 안전한 구조분해 할당
  const champions = tftDataResult?.champions || [];
  const traits = tftDataResult?.traits || [];
  const loading = tftDataResult?.loading || false;
  
  // 디버깅 정보 추가
  console.log('UnitPanel 디버깅:', {
    tftDataResult: !!tftDataResult,
    tftDataResultType: typeof tftDataResult,
    champions: !!champions,
    championsCount: champions?.length || 0,
    traits: !!traits,
    traitsCount: traits?.length || 0,
    loading,
    sampleChampion: champions?.[0],
    willRender: champions.length > 0
  });
  const [filterTrait, setFilterTrait] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cost' | 'origin' | 'class'>('cost');

  const filtered = useMemo(() => {
    if (!champions) return [];
    let currentChampions = [...champions];
    if (search) {
      const lowerCaseSearch = search.toLowerCase();
      currentChampions = currentChampions.filter(c => {
        const name = c.name || '';
        return name.toLowerCase().includes(lowerCaseSearch);
      });
    }
    if (activeTab === 'cost') {
      return currentChampions.sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        // null 값 안전 처리
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'ko');
      });
    }
    if (filterTrait) {
      currentChampions = currentChampions.filter(c => c.traits.includes(filterTrait));
    }
    return currentChampions;
  }, [champions, filterTrait, search, activeTab]);

  const origins = useMemo(() => (traits || []).filter(t => t.type === 'origin'), [traits]);
  const classes = useMemo(() => (traits || []).filter(t => t.type === 'class'), [traits]);

  const groupedChampions = useMemo(() => {
    if (activeTab === 'cost') return null;
    
    console.log('🔍 UnitPanel groupedChampions 계산 시작:', {
      activeTab,
      originsCount: origins.length,
      classesCount: classes.length,
      filteredCount: filtered.length,
      sampleOrigins: origins.slice(0, 3).map(t => ({ apiName: t.apiName, name: t.name })),
      sampleClasses: classes.slice(0, 3).map(t => ({ apiName: t.apiName, name: t.name })),
      sampleChampions: filtered.slice(0, 3).map(c => ({ name: c.name, traits: c.traits }))
    });
    
    const groupMap = new Map<string, { trait: Trait; champions: Champion[] }>();
    const targetTraits = activeTab === 'origin' ? origins : classes;
    
    // 특성 이름 매핑 헬퍼 함수 (useTraitProcessing과 동일한 로직)
    const findTraitByName = (traitNameOrApiName: string): Trait | null => {
      // 1. 한국어 이름으로 직접 찾기
      let trait = targetTraits.find(t => t.name === traitNameOrApiName);
      if (trait) return trait;
      
      // 2. API 이름으로 찾기 (대소문자 구분 없음)
      trait = targetTraits.find(t => 
        t.apiName?.toLowerCase() === traitNameOrApiName.toLowerCase()
      );
      if (trait) return trait;
      
      // 3. 부분 매칭 시도 (API 이름에서 접두사 제거)
      const cleanApiName = traitNameOrApiName.toLowerCase()
        .replace(/^tft\d+_/, '')  // tft14_ 같은 접두사 제거
        .replace(/^set\d+_/, ''); // set14_ 같은 접두사 제거
      
      trait = targetTraits.find(t => 
        t.apiName?.toLowerCase().includes(cleanApiName) ||
        cleanApiName.includes(t.apiName?.toLowerCase() || '')
      );
      if (trait) return trait;
      
      return null;
    };
    
    filtered.forEach(champion => {
      console.log(`🧩 ${champion.name} 특성 매칭 시작:`, champion.traits);
      
      champion.traits.forEach(traitName => {
        const foundTrait = findTraitByName(traitName);
        
        console.log('🔄 특성 매칭 결과:', {
          championName: champion.name,
          originalTraitName: traitName,
          foundTrait: foundTrait ? { apiName: foundTrait.apiName, name: foundTrait.name } : null
        });
        
        if (foundTrait) {
          if (!groupMap.has(foundTrait.apiName)) {
            groupMap.set(foundTrait.apiName, { trait: foundTrait, champions: [] });
          }
          groupMap.get(foundTrait.apiName)?.champions.push(champion);
        } else {
          console.warn(`❌ UnitPanel: ${champion.name}의 특성 "${traitName}"을 찾을 수 없음`);
        }
      });
    });
    
    groupMap.forEach(group => {
      group.champions.sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        // null 값 안전 처리
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'ko');
      });
    });
    
    const result = Array.from(groupMap.values()).sort((a, b) => {
      // null 값 안전 처리
      const nameA = a.trait.name || '';
      const nameB = b.trait.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });
    
    console.log('✅ UnitPanel groupedChampions 계산 완료:', {
      groupCount: result.length,
      groups: result.map(g => ({ 
        traitName: g.trait.name, 
        championCount: g.champions.length,
        championNames: g.champions.map(c => c.name).slice(0, 3)
      }))
    });
    
    return result;
  }, [filtered, activeTab, origins, classes]);

  if (loading) {
    return (
      <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary h-full overflow-y-auto space-y-3">
        <div className="flex justify-between items-center">
          <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="w-32 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="flex border-b border-gray-300 mb-3">
          <div className="w-12 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mr-4"></div>
          <div className="w-12 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mr-4"></div>
          <div className="w-12 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-x-[3px] gap-y-2 pt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}>
          {Array.from({ length: 20 }, (_, i) => (
            <ChampionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  // 데이터가 아직 로드되지 않았다면 기다림 (조건 완화)
  if (champions.length === 0) {
    return (
      <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary h-full overflow-y-auto space-y-3">
        <div className="flex justify-between items-center">
          <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="w-32 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-x-[3px] gap-y-2 pt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}>
          {Array.from({ length: 20 }, (_, i) => (
            <ChampionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (mini) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="grid gap-x-[2px] gap-y-1" style={{ gridTemplateColumns: 'repeat(auto-fill, 32px)' }}>
          {filtered.map((ch) => (
            <div key={ch.apiName} className="w-8 h-8 rounded-md overflow-hidden shadow-md" title={ch.name}>
              <img src={processImagePath(ch.tileIcon)} alt={ch.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary h-full overflow-y-auto space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl text-text-primary dark:text-dark-text-primary">{t('deckBuilder.unit')}</h2>
        <input type="text" placeholder={t('deckBuilder.searchByName')} value={search} onChange={(e) => setSearch(e.target.value)} className="p-1 text-text-primary dark:text-dark-text-primary rounded bg-background-base dark:bg-dark-background-base text-xs" style={{ width: '150px' }} />
      </div>
      <div className="flex border-b border-gray-300 mb-3">
        <button onClick={() => { setActiveTab('cost'); setFilterTrait(null); }} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'cost' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'}`}>{t('deckBuilder.cost')}</button>
        <button onClick={() => setActiveTab('origin')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'origin' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'}`}>{t('stats.traitTypes.origin')}</button>
        <button onClick={() => setActiveTab('class')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'class' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'}`}>{t('stats.traitTypes.class')}</button>
      </div>
      {activeTab === 'origin' && <div className="space-y-2"><FilterGroup title={t('stats.traitTypes.origin')} items={origins} selected={filterTrait} onSelect={setFilterTrait} /></div>}
      {activeTab === 'class' && <div className="space-y-2"><FilterGroup title={t('stats.traitTypes.class')} items={classes} selected={filterTrait} onSelect={setFilterTrait} /></div>}
      {activeTab === 'cost' ? (
        <div className="grid gap-x-[3px] gap-y-2 pt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}>
          {filtered.map((ch) => (<DraggableUnit key={ch.apiName} champion={ch} />))}
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {groupedChampions && groupedChampions.map(group => (
            <div key={group.trait.apiName}>
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                {group.trait.icon && <img src={group.trait.icon} alt={group.trait.name} className="w-6 h-6" />}
                {group.trait.name}
              </h3>
              <div className="grid gap-x-[3px] gap-y-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}>
                {group.champions.map((ch) => (<DraggableUnit key={ch.apiName} champion={ch} />))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterGroupProps {
  title: string;
  items: Trait[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ items, selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const isSelected = selected === item.name;
        return (
          <button
            key={item.name}
            onClick={() => onSelect(isSelected ? null : item.name)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors duration-200 ${isSelected ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary hover:text-text-primary'}`}>
            {item.icon && <img src={item.icon} alt={item.name} className="w-4 h-4" />}
            <span>{item.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export default UnitPanel;