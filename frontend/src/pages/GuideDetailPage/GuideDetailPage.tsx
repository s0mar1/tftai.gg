import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/fetchApi';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import HexGrid from '../DeckBuilderPage/HexGrid'; // 덱 빌더의 HexGrid 재사용
import SynergyPanel from '../DeckBuilderPage/SynergyPanel'; // 시너지 패널 재사용
import { useTFTData } from '../../context/TFTDataContext';
import { decodeDeck } from '../../utils/deckCode';
import { createComponentLogger } from '../../utils/logger';
import { processImagePath } from '../../utils/imageUtils';

const logger = createComponentLogger('GuideDetailPage');

interface LevelBoard {
  level: number;
  board: string;
  notes?: string;
}

interface Guide {
  title: string;
  difficulty: string;
  level_boards: LevelBoard[];
  play_tips: string[];
  recommended_items: string[];
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export default function GuideDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate(); // useNavigate 훅 추가
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<number>(8);
  const { champions, items, traitMap, allItems } = useTFTData();

  // 임시 관리자 권한 (실제 구현 시에는 사용자 인증 시스템과 연동)
  const [isAdmin, setIsAdmin] = useState<boolean>(true);

  const handleDeleteGuide = async (): Promise<void> => {
    if (window.confirm('정말로 이 공략을 삭제하시겠습니까?')) {
      try {
        await api.delete(`/api/guides/${id}`);
        logger.info('공략 삭제 성공', { guideId: id });
        alert('공략이 성공적으로 삭제되었습니다.');
        navigate('/guides'); // 공략 목록 페이지로 이동
      } catch (err) {
        const error = err as ApiError;
        logger.error('공략 삭제 실패', error as Error, { guideId: id });
        alert('공략 삭제에 실패했습니다.');
      }
    }
  };

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const response = await api.get(`/api/guides/${id}`);
        setGuide(response.data);
        const defaultLevel = response.data.level_boards.find(b => b.level === 8) ? 8 : response.data.level_boards[0]?.level;
        setActiveLevel(defaultLevel);
      } catch (err) {
        setError('공략을 불러오는 데 실패했습니다.');
      }
      setLoading(false);
    };

    if (champions.length > 0) {
        fetchGuide();
    }
  }, [id, champions]);

  if (loading) return <div className="text-center p-8">공략 상세 정보를 불러오는 중...</div>;
  if (error) return <div className="text-center p-8 text-error-red">{error}</div>;
  if (!guide) return <div className="text-center p-8">해당 공략을 찾을 수 없습니다.</div>;

  const activeBoard = guide.level_boards.find(b => b.level === activeLevel);
  const placedUnits = activeBoard ? decodeDeck(activeBoard.board, champions, allItems) : {};

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 text-text-primary dark:text-dark-text-primary space-y-8">
        {/* 상단 헤더 */}
        <header className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">{guide.title}</h1>
            {isAdmin && (
              <button
                onClick={handleDeleteGuide}
                className="bg-error-red hover:bg-error-red text-white px-4 py-2 rounded-md text-sm font-semibold"
              >
                공략 삭제
              </button>
            )}
          </div>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-2">난이도: {guide.difficulty}</p>
        </header>

        {/* 덱 빌더 뷰 */}
        <section>
          <h2 className="text-2xl font-bold mb-4">레벨별 배치</h2>
          <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-md">
            <div className="flex justify-center gap-2 mb-4">
              {guide.level_boards.map(board => (
                <button 
                  key={board.level} 
                  onClick={() => setActiveLevel(board.level)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md ${activeLevel === board.level ? 'bg-brand-mint' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card'}`}>
                  레벨 {board.level}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[200px_1fr] gap-6">
              <aside><SynergyPanel placedUnits={placedUnits} /></aside>
              <main className="flex justify-center"><HexGrid placedUnits={placedUnits} onUnitAction={() => {}} /></main>
            </div>
            {activeBoard.notes && <p className="mt-4 text-center text-text-primary dark:text-dark-text-primary p-2 bg-background-base dark:bg-dark-background-base rounded">{activeBoard.notes}</p>}
          </div>
        </section>

        {/* 플레이 팁 */}
        <section>
          <h2 className="text-2xl font-bold mb-4">운영 팁</h2>
          <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md space-y-3">
            {guide.play_tips.map((tip, index) => (
              <p key={index} className="text-text-primary dark:text-dark-text-primary leading-relaxed">- {tip}</p>
            ))}
          </div>
        </section>

        {/* 추천 아이템 */}
        <section>
          <h2 className="text-2xl font-bold mb-4">핵심 아이템</h2>
          <div className="bg-background-card dark:bg-dark-background-card p-6 rounded-lg shadow-md flex flex-wrap gap-4">
            {guide.recommended_items.map(itemName => {
                const itemData = items.find(i => i.apiName === itemName);
                if (!itemData) return null;
                return (
                    <div key={itemData.apiName} className="flex items-center gap-2 bg-background-base dark:bg-dark-background-base p-2 rounded-md">
                        <img src={processImagePath(itemData.icon)} alt={itemData.name} className="w-10 h-10"/>
                        <span className="font-semibold">{itemData.name}</span>
                    </div>
                )
            })}
          </div>
        </section>
      </div>
    </DndProvider>
  );
}