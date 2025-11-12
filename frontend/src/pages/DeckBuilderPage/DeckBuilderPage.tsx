import React, { useState, useCallback, useMemo, useContext, lazy, Suspense } from 'react';
import DynamicDndProvider from '../../components/common/DynamicDndProvider';
import { useTFTData } from '../../context/TFTDataContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Champion, Item, PowerSnax, PowerUp } from '../../types';
import { ChampionCardSkeleton } from '../../components/common/TFTSkeletons';

// 직접 Context import (디버깅용)
import { TFTDataContext } from '../../context/TFTDataContext';

// 🚀 패널 컴포넌트들을 lazy loading으로 최적화
const UnitPanel = lazy(() => import('./UnitPanel'));
const SynergyPanel = lazy(() => import('./SynergyPanel'));
const ItemPanel = lazy(() => import('./ItemPanel'));
const DetailPanel = lazy(() => import('./DetailPanel'));
const PowerSnaxPanel = lazy(() => import('./PowerSnaxPanel'));

// HexGrid는 핵심 컴포넌트이므로 일반 import 유지
import HexGrid, { Position } from './HexGrid';

// 타입 정의
interface PlacedUnit extends Champion {
  pos: Position;
  star: number;
  items: Item[];
}

interface PlacedUnits {
  [key: string]: PlacedUnit;
}

interface DraggedUnit {
  championApiName?: string;
  unit?: PlacedUnit;
  fromKey?: string;
}

export default function DeckBuilderPage() {
  console.log('DeckBuilderPage: 컴포넌트 렌더링 시작');
  
  // 직접 Context 접근 (디버깅)
  const directContext = useContext(TFTDataContext);
  if (import.meta.env.DEV) {
    console.log('DeckBuilderPage: 직접 Context 접근 결과:', directContext);
    console.log('DeckBuilderPage: 직접 Context 타입:', typeof directContext);
    console.log('DeckBuilderPage: 직접 Context 키들:', directContext ? Object.keys(directContext) : 'null');
  }
  
  // useTFTData 호출
  if (import.meta.env.DEV) {
    console.log('DeckBuilderPage: useTFTData 함수 타입:', typeof useTFTData);
  }
  
  let tftDataResult;
  try {
    tftDataResult = useTFTData();
    if (import.meta.env.DEV) {
      console.log('DeckBuilderPage: useTFTData 호출 성공:', tftDataResult);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('DeckBuilderPage: useTFTData 호출 에러:', error);
    }
    tftDataResult = null;
  }
  
  if (import.meta.env.DEV) {
    console.log('DeckBuilderPage: useTFTData 직접 호출 결과:', tftDataResult);
    console.log('DeckBuilderPage: context 타입:', typeof tftDataResult);
    console.log('DeckBuilderPage: context 키들:', tftDataResult ? Object.keys(tftDataResult) : 'null');
  }
  const champions = tftDataResult?.champions || [];
  const { t } = useTranslation();
  
  if (import.meta.env.DEV) {
    console.log('DeckBuilderPage: useTFTData 결과:', {
      tftDataResult: !!tftDataResult,
      tftDataResultType: typeof tftDataResult,
      loading: tftDataResult?.loading,
      error: tftDataResult?.error,
      champions: tftDataResult?.champions?.length || 0,
      showTooltip: typeof tftDataResult?.showTooltip,
      hideTooltip: typeof tftDataResult?.hideTooltip
    });
  }
  
  if (import.meta.env.DEV) {
    console.log('DeckBuilderPage 렌더링:', {
      tftDataResult: !!tftDataResult,
      champions: !!champions,
      championsCount: champions?.length || 0,
      loading: tftDataResult?.loading,
      error: tftDataResult?.error
    });
  }
  const [placedUnits, setPlacedUnits] = useState<PlacedUnits>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedPowerSnax, setSelectedPowerSnax] = useState<{ [round: string]: PowerUp | null }>({
    '1-3': null,
    '3-6': null
  });
  const navigate = useNavigate();

  const handleUnitAction = useCallback((draggedItem: DraggedUnit, targetPos: Position) => {
    if (import.meta.env.DEV) {
      console.log('handleUnitAction 호출됨:', { draggedItem, targetPos });
    }
    
    const toKey = `${targetPos.y}-${targetPos.x}`;
    const apiName = draggedItem.championApiName || draggedItem.unit?.apiName;
    const fromKey = draggedItem.fromKey;
    
    if (import.meta.env.DEV) {
      console.log('handleUnitAction 처리:', { toKey, apiName, fromKey, championsCount: champions.length });
    }
    
    setPlacedUnits(prev => {
      console.log('setPlacedUnits 호출됨, 이전 상태:', prev);
      
      const next = { ...prev };

      if (fromKey === toKey) {
        setSelectedKey(toKey);
        return prev;
      }

      if (fromKey && next[fromKey]) delete next[fromKey];
      if (next[toKey] && next[toKey].apiName !== apiName) delete next[toKey];

      // 개선된 챔피언 검색 로직 - 여러 방법으로 검색 시도
      const fullUnitData = champions.find(c => c.apiName === apiName) ||
                          champions.find(c => c.apiName?.toLowerCase() === apiName?.toLowerCase()) ||
                          champions.find(c => c.name === apiName);
      
      if (import.meta.env.DEV) {
        console.log('🔍 fullUnitData 찾기:', { 
          apiName, 
          found: !!fullUnitData, 
          fullUnitData: fullUnitData ? { 
            name: fullUnitData.name, 
            apiName: fullUnitData.apiName,
            traits: fullUnitData.traits,
            traitsCount: fullUnitData.traits?.length || 0
          } : null,
          availableChampionsCount: champions.length,
          sampleChampion: champions[0] ? { 
            name: champions[0].name, 
            apiName: champions[0].apiName, 
            traits: champions[0].traits 
          } : null
        });
      }
      
      if (!fullUnitData) {
        if (import.meta.env.DEV) {
          console.error('챔피언 데이터를 찾을 수 없음:', { 
            apiName, 
            availableChampions: champions.slice(0, 5).map(c => ({ name: c.name, apiName: c.apiName })) 
          });
        }
        return prev;
      }
      
      const newUnit = {
        ...fullUnitData,
        pos: { x: targetPos.x, y: targetPos.y },
        star: (fromKey && prev[fromKey]?.star) || draggedItem.unit?.star || 1,
        items: (fromKey && prev[fromKey]?.items) || draggedItem.unit?.items || [],
      };
      
      next[toKey] = newUnit;
      if (import.meta.env.DEV) {
        console.log('새로운 유닛 배치:', { toKey, newUnit });
      }
      
      return next;
    });
    setSelectedKey(toKey);
  }, [champions]);

  const handleUnitRemove = useCallback((pos: Position) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) setSelectedKey(null);
  }, [selectedKey]);

  const handleSelectUnit = useCallback((pos: Position | null) => {
    const key = pos ? `${pos.y}-${pos.x}` : null;
    if (pos && key && !placedUnits[key]) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(prev => (prev === key ? null : key));
  }, [placedUnits]);

  const handleChangeStar = useCallback((pos: Position, star: number) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      return { ...prev, [key]: { ...unit, star } };
    });
  }, []);

  const handleEquip = useCallback((pos: Position, item: Item) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      const existing = unit.items || [];
      if (existing.some(i => i.apiName === item.apiName)) return prev;
      if (existing.length >= 3) return prev;
      return { ...prev, [key]: { ...unit, items: [...existing, item] } };
    });
  }, []);

  const handleUnequip = useCallback((pos: Position, itemToRemove: Item) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      return { ...prev, [key]: { ...unit, items: (unit.items || []).filter(i => i.apiName !== itemToRemove.apiName) } };
    });
  }, []);

  const handleCreateGuide = useCallback(() => {
    navigate('/guides/new', { state: { initialDeck: placedUnits, powerSnax: selectedPowerSnax } });
  }, [navigate, placedUnits, selectedPowerSnax]);

  const handlePowerSnaxSelect = useCallback((round: '1-3' | '3-6', powerUp: PowerUp | null) => {
    setSelectedPowerSnax(prev => ({
      ...prev,
      [round]: powerUp
    }));
  }, []);

  const selectedUnit = selectedKey ? placedUnits[selectedKey] : null;
  const unitsForSynergy = useMemo(() => {
    console.log('DeckBuilderPage: unitsForSynergy 계산', { placedUnits, values: Object.values(placedUnits) });
    return placedUnits; // SynergyPanel에서 객체를 배열로 변환하도록 수정했으므로 객체 그대로 전달
  }, [placedUnits]);

  // 데이터가 로딩 중이면 로딩 화면 표시
  if (tftDataResult?.loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.16))] bg-background-base dark:bg-dark-background-page">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
          <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">{t('deckBuilder.loadingData')}</p>
        </div>
      </div>
    );
  }

  // 데이터가 없으면 에러 메시지 표시
  if (!tftDataResult || champions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.16))] bg-background-base dark:bg-dark-background-page">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-text-primary dark:text-dark-text-primary">{t('deckBuilder.failedToLoadData')}</p>
        </div>
      </div>
    );
  }

  return (
    <DynamicDndProvider>
      <div className="flex flex-col min-h-[calc(100vh-theme(space.16))] bg-background-base dark:bg-dark-background-page p-4 lg:p-6 relative z-0">
        <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg text-text-primary dark:text-dark-text-primary mb-4 shadow-md z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">{t('deckBuilder.title')}</h2>
            <button
              onClick={handleCreateGuide}
              className="bg-brand-mint hover:bg-brand-mint text-white px-4 py-2 rounded text-sm font-semibold"
            >
              {t('deckBuilder.createGuide')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[180px_minmax(720px,1fr)_240px] gap-5 mb-4 flex-grow">
          <aside className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md h-full z-10">
            <Suspense fallback={
              <div className="space-y-3">
                <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="space-y-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <SynergyPanel placedUnits={unitsForSynergy} />
            </Suspense>
          </aside>
          <main className="flex-grow flex justify-center items-center bg-background-card dark:bg-dark-background-card rounded-lg p-4 shadow-md z-10">
            <HexGrid placedUnits={placedUnits} onUnitAction={handleUnitAction} onSelectUnit={handleSelectUnit} onUnitRemove={handleUnitRemove} onItemDrop={handleEquip} selectedKey={selectedKey} />
          </main>
          <aside className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md h-full z-10">
            <Suspense fallback={
              <div className="space-y-3">
                <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="w-full h-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  <div className="w-full h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  <div className="w-full h-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            }>
              <DetailPanel selectedUnit={selectedUnit} onUnitRemove={handleUnitRemove} onChangeStar={handleChangeStar} onEquip={handleEquip} onUnequip={handleUnequip} selectedPowerSnax={selectedPowerSnax} />
            </Suspense>
          </aside>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6 bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md">
            <Suspense fallback={
              <div className="space-y-3">
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
            }>
              <UnitPanel />
            </Suspense>
          </div>
          <div className="col-span-3 bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md">
            <Suspense fallback={
              <div className="space-y-3">
                <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="grid gap-x-[3px] gap-y-2 pt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 32px)' }}>
                  {Array.from({ length: 30 }, (_, i) => (
                    <div key={i} className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            }>
              <ItemPanel />
            </Suspense>
          </div>
          <div className="col-span-3 bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md">
            <Suspense fallback={
              <div className="space-y-3">
                <div className="w-20 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="w-full h-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  <div className="w-full h-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            }>
              <PowerSnaxPanel selectedPowerSnax={selectedPowerSnax} onPowerSnaxSelect={handlePowerSnaxSelect} />
            </Suspense>
          </div>
        </div>
      </div>
    </DynamicDndProvider>
  );
}
