import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../utils/fetchApi';
import { useTFTData } from '../../context/TFTDataContext';
import { encodeDeck } from '../../utils/deckCode';
import { createComponentLogger } from '../../utils/logger';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import HexGrid from '../DeckBuilderPage/HexGrid';

// Dynamic imports for better code splitting
const SynergyPanel = React.lazy(() => import('../DeckBuilderPage/SynergyPanel'));
const UnitPanel = React.lazy(() => import('../DeckBuilderPage/UnitPanel'));
const ItemPanel = React.lazy(() => import('../DeckBuilderPage/ItemPanel'));
const DetailPanel = React.lazy(() => import('../DeckBuilderPage/DetailPanel'));

const logger = createComponentLogger('GuideEditorPage');

interface Position {
  x: number;
  y: number;
}

interface LocationState {
  initialDeck?: Record<string, any>;
}

type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export default function GuideEditorPage(): JSX.Element {
  const location = useLocation() as { state: LocationState };
  const navigate = useNavigate();
  const { champions, items, augments, traitMap } = useTFTData();

  const [title, setTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Easy');
  const [playTips, setPlayTips] = useState<string[]>(['']);
  const [recommendedAugments, setRecommendedAugments] = useState<string[]>(['']);
  const [levelBoards, setLevelBoards] = useState<Record<number, any>>({});
  const [activeLevel, setActiveLevel] = useState<number>(8);
  const [initialDeckLevel, setInitialDeckLevel] = useState<number>(8); // State for the level of the initial deck
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (location.state && location.state.initialDeck) {
      const initialDeck = location.state.initialDeck;
      // Initialize levelBoards with the initialDeck at the default initialDeckLevel
      setLevelBoards({ [initialDeckLevel]: initialDeck });
      setActiveLevel(initialDeckLevel);
    }
  }, [location.state, initialDeckLevel]);

  const handleSelectUnit = useCallback((pos: Position | null) => {
    const key = `${pos?.y}-${pos?.x}`;
    const currentBoard = levelBoards[activeLevel] || {};
    if (pos && !currentBoard[key]) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(prev => (prev === key ? null : key));
  }, [levelBoards, activeLevel]);

  // Handlers for HexGrid actions to update the active level's board
  const handleUnitAction = useCallback((draggedItem, targetPos) => {
    const toKey = `${targetPos.y}-${targetPos.x}`;
    setLevelBoards(prev => {
      const nextLevelBoards = { ...prev };
      const currentBoard = { ...(nextLevelBoards[activeLevel] || {}) };
      const apiName = draggedItem.championApiName || draggedItem.unit?.apiName;
      const fromKey = draggedItem.fromKey;

      if (fromKey === toKey) {
        return prev;
      }

      if (fromKey && currentBoard[fromKey]) delete currentBoard[fromKey];
      if (currentBoard[toKey] && currentBoard[toKey].apiName !== apiName) delete currentBoard[toKey];

      const fullUnitData = champions.find(c => c.apiName === apiName);
      if (!fullUnitData) {
        return prev;
      }

      currentBoard[toKey] = {
        ...fullUnitData,
        pos: { x: targetPos.x, y: targetPos.y },
        star: fromKey && prev[activeLevel] && prev[activeLevel][fromKey] ? prev[activeLevel][fromKey].star : draggedItem.unit?.star || 1,
        items: fromKey && prev[activeLevel] && prev[activeLevel][fromKey] ? prev[activeLevel][fromKey].items : draggedItem.unit?.items || [],
      };
      nextLevelBoards[activeLevel] = currentBoard;
      return nextLevelBoards;
    });
  }, [activeLevel, champions]);

  const handleUnitRemove = useCallback(pos => {
    const key = `${pos.y}-${pos.x}`;
    setLevelBoards(prev => {
      const nextLevelBoards = { ...prev };
      const currentBoard = { ...(nextLevelBoards[activeLevel] || {}) };
      delete currentBoard[key];
      nextLevelBoards[activeLevel] = currentBoard;
      return nextLevelBoards;
    });
  }, [activeLevel]);

  const handleChangeStar = useCallback((pos, star) => {
    const key = `${pos.y}-${pos.x}`;
    setLevelBoards(prev => {
      const nextLevelBoards = { ...prev };
      const currentBoard = { ...(nextLevelBoards[activeLevel] || {}) };
      const unit = currentBoard[key];
      if (!unit) return prev;
      currentBoard[key] = { ...unit, star };
      nextLevelBoards[activeLevel] = currentBoard;
      return nextLevelBoards;
    });
  }, [activeLevel]);

  const handleEquip = useCallback((pos, item) => {
    const key = `${pos.y}-${pos.x}`;
    setLevelBoards(prev => {
      const nextLevelBoards = { ...prev };
      const currentBoard = { ...(nextLevelBoards[activeLevel] || {}) };
      const unit = currentBoard[key];
      if (!unit) return prev;
      const existing = unit.items || [];
      if (existing.some(i => i.apiName === item.apiName)) return prev;
      if (existing.length >= 3) return prev;
      currentBoard[key] = { ...unit, items: [...existing, item] };
      nextLevelBoards[activeLevel] = currentBoard;
      return nextLevelBoards;
    });
  }, [activeLevel]);

  const handleUnequip = useCallback((pos, itemToRemove) => {
    const key = `${pos.y}-${pos.x}`;
    setLevelBoards(prev => {
      const nextLevelBoards = { ...prev };
      const currentBoard = { ...(nextLevelBoards[activeLevel] || {}) };
      const unit = currentBoard[key];
      if (!unit) return prev;
      currentBoard[key] = { ...unit, items: (unit.items || []).filter(i => i.apiName !== itemToRemove.apiName) };
      nextLevelBoards[activeLevel] = currentBoard;
      return nextLevelBoards;
    });
  }, [activeLevel]);

  const handleAddPlayTip = () => setPlayTips([...playTips, '']);
  const handlePlayTipChange = (index, value) => {
    const newTips = [...playTips];
    newTips[index] = value;
    setPlayTips(newTips);
  };
  const handleRemovePlayTip = (index) => {
    const newTips = playTips.filter((_, i) => i !== index);
    setPlayTips(newTips);
  };

  const handleAddRecommendedAugment = () => setRecommendedAugments([...recommendedAugments, '']);
  const handleRecommendedAugmentChange = (index, value) => {
    const newAugments = [...recommendedAugments];
    newAugments[index] = value;
    setRecommendedAugments(newAugments);
  };
  const handleRemoveRecommendedAugment = (index) => {
    const newAugments = recommendedAugments.filter((_, i) => i !== index);
    setRecommendedAugments(newAugments);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedLevelBoards = Object.entries(levelBoards).map(([level, board]) => ({
      level: parseInt(level),
      board: encodeDeck(board), // Encode the board data
      notes: '', // Add notes field if needed
    }));

    const guideData = {
      title,
      difficulty,
      initialDeckLevel, // initialDeckLevel 추가
      level_boards: formattedLevelBoards,
      play_tips: playTips.filter(tip => tip.trim() !== ''),
      recommended_augments: recommendedAugments.filter(augment => augment.trim() !== ''),
      // Add other fields as needed (e.g., recommended_items, etc.)
    };

    try {
      const response = await api.post('/api/guides', guideData);
      alert('공략이 성공적으로 저장되었습니다!');
      navigate(`/guides/${response.data._id}`);
    } catch (err) {
      alert('공략 저장에 실패했습니다.');
    }
  };

  const activeBoard = levelBoards[activeLevel] || {};
  const selectedUnit = selectedKey ? activeBoard[selectedKey] : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 text-text-primary dark:text-dark-text-primary">
        <h1 className="text-3xl font-bold mb-6">새 공략 작성</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap -mx-3 mb-6">
          {/* 기본 정보 */}
          <div className="w-full lg:w-3/5 px-3 mb-6 lg:mb-0">
            <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md h-full">
              <h2 className="text-2xl font-bold mb-4">기본 정보</h2>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">덱이름</label>
                <input
                  type="text"
                  id="title"
                  className="w-full p-3 rounded-md bg-background-base dark:bg-dark-background-base border border-border-light dark:border-dark-border-light text-text-primary dark:text-dark-text-primary focus:ring focus:ring-brand-mint focus:border-brand-mint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="difficulty" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">난이도</label>
                <select
                  id="difficulty"
                  className="w-full p-3 rounded-md bg-background-base dark:bg-dark-background-base border border-border-light dark:border-dark-border-light text-text-primary dark:text-dark-text-primary focus:ring focus:ring-brand-mint focus:border-brand-mint"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Easy">쉬움</option>
                  <option value="Medium">보통</option>
                  <option value="Hard">어려움</option>
                </select>
              </div>
            </div>
          </div>

          {/* 초기 덱 레벨 설정 */}
          <div className="w-full lg:w-2/5 px-3">
            <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md h-full">
              <h2 className="text-2xl font-bold mb-4">초기 덱 레벨 설정</h2>
              <div className="mb-4">
                <label htmlFor="initialDeckLevel" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">이 덱의 완성 레벨은?</label>
                <select
                  id="initialDeckLevel"
                  className="w-full p-3 rounded-md bg-background-base dark:bg-dark-background-base border border-border-light dark:border-dark-border-light text-text-primary dark:text-dark-text-primary focus:ring focus:ring-brand-mint focus:border-brand-mint"
                  value={initialDeckLevel}
                  onChange={(e) => setInitialDeckLevel(parseInt(e.target.value))}
                >
                  {[5, 6, 7, 8, 9, 10].map(level => (
                    <option key={level} value={level}>Lv. {level}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 레벨별 덱 구성 */}
        <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">레벨별 추천 빌드업,덱 구성</h2>
          <div className="flex gap-2 mb-4">
            {[4, 5, 6, 7, 8, 9, 10].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setActiveLevel(level)}
                className={`px-4 py-2 rounded-md text-sm font-semibold ${activeLevel === level ? 'bg-brand-mint' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card'}`}
              >
                Lv. {level}
              </button>
            ))}
          </div>
          {/* 중앙 영역 */}
          <div className="flex gap-3 mb-4">
            {/* 왼쪽 시너지 */}
            <aside className="bg-background-card dark:bg-dark-background-card p-2 rounded-lg shadow-md h-full w-[150px]">
              <React.Suspense fallback={<div className="animate-pulse bg-gray-300 h-32 rounded"></div>}>
                <SynergyPanel placedUnits={Object.values(activeBoard)} />
              </React.Suspense>
            </aside>
            {/* 보드 */}
            <main className="flex-grow flex justify-center items-center bg-background-card dark:bg-dark-background-card rounded-lg p-2 shadow-md w-[480px]">
              <HexGrid placedUnits={activeBoard} onUnitAction={handleUnitAction} onSelectUnit={handleSelectUnit} onUnitRemove={handleUnitRemove} onItemDrop={handleEquip} selectedKey={selectedKey} />
            </main>
            {/* 상세 */}
            <aside className="bg-background-card dark:bg-dark-background-card p-2 rounded-lg shadow-md h-full w-[220px]">
              <React.Suspense fallback={<div className="animate-pulse bg-gray-300 h-32 rounded"></div>}>
                <DetailPanel selectedUnit={selectedUnit} onUnitRemove={handleUnitRemove} onChangeStar={handleChangeStar} onEquip={handleEquip} onUnequip={handleUnequip} />
              </React.Suspense>
            </aside>
          </div>

          {/* 하단 패널 */}
          <div className="bg-background-card dark:bg-dark-background-card p-2 rounded-lg shadow-md">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-8">
                <React.Suspense fallback={<div className="animate-pulse bg-gray-300 h-64 rounded"></div>}>
                  <UnitPanel />
                </React.Suspense>
              </div>
              <div className="col-span-4">
                <React.Suspense fallback={<div className="animate-pulse bg-gray-300 h-64 rounded"></div>}>
                  <ItemPanel />
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* 플레이 팁 */}
        <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">플레이 팁</h2>
          {playTips.map((tip, index) => (
            <div key={index} className="flex items-center mb-3">
              <textarea
                className="w-full p-3 rounded-md bg-background-base dark:bg-dark-background-base border border-border-light dark:border-dark-border-light text-text-primary dark:text-dark-text-primary focus:ring focus:ring-brand-mint focus:border-brand-mint resize-y"
                rows="3"
                value={tip}
                onChange={(e) => handlePlayTipChange(index, e.target.value)}
                placeholder="팁을 입력하세요..."
              />
              {playTips.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePlayTip(index)}
                  className="ml-3 p-2 bg-error-red hover:bg-error-red rounded-md text-white text-sm"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddPlayTip}
            className="mt-4 px-4 py-2 bg-brand-mint hover:bg-brand-mint rounded-md text-white text-sm font-semibold"
          >
            팁 추가
          </button>
        </div>

        {/* 추천 증강체 */}
        <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">추천 증강체</h2>
          {recommendedAugments.map((augment, index) => (
            <div key={index} className="flex items-center mb-3">
              <input
                type="text"
                className="w-full p-3 rounded-md bg-background-base dark:bg-dark-background-base border border-border-light dark:border-dark-border-light text-text-primary dark:text-dark-text-primary focus:ring focus:ring-brand-mint focus:border-brand-mint"
                value={augment}
                onChange={(e) => handleRecommendedAugmentChange(index, e.target.value)}
                placeholder="증강체 이름을 입력하세요..."
              />
              {recommendedAugments.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRecommendedAugment(index)}
                  className="ml-3 p-2 bg-error-red hover:bg-error-red rounded-md text-white text-sm"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddRecommendedAugment}
            className="mt-4 px-4 py-2 bg-brand-mint hover:bg-brand-mint rounded-md text-white text-sm font-semibold"
          >
            증강체 추가
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="w-48 p-3 bg-brand-mint hover:bg-brand-mint rounded-md text-white text-lg font-bold transition-colors duration-200"
          >
            공략 저장
          </button>
        </div>
      </form>
    </div>
    </DndProvider>
  );
}