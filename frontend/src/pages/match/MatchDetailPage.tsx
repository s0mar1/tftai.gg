import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Match, Trait as TraitType, Champion as UnitType, Item as ItemType } from '../../types';

const getPlacementColor = (placement: number): string => {
  if (placement === 1) return '#FFD700';
  if (placement <= 4) return '#63B3ED';
  return '#A0AEC0';
};

const costColors: { [key: number]: string } = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostBorderStyle = (cost: number) => ({ border: `2px solid ${costColors[cost] || costColors[1]}` });
const getCostColor = (cost: number) => costColors[cost] || costColors[1];

const Trait: React.FC<{ trait: TraitType }> = ({ trait }) => (
  <div className="flex items-center gap-1 bg-background-card dark:bg-dark-background-card p-1.5 rounded-md text-xs">
    <img src={trait.icon} alt={trait.name} className="w-4 h-4" title={trait.name} />
    <span>{trait.tier_current}</span>
  </div>
);

const Item: React.FC<{ item: ItemType }> = ({ item }) => (
  <img src={item.image_url} alt={item.name} className="w-6 h-6 rounded-sm border border-gray-700" title={item.name} />
);

const Unit: React.FC<{ unit: UnitType }> = ({ unit }) => (
  <div className="relative w-12 pt-2">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex text-lg font-bold text-white text-shadow-sm" style={{ color: getCostColor(unit.cost) }}>
      {'★'.repeat(unit.tier || 1)}
    </div>
    <img src={unit.image_url} alt={unit.name} className="w-full rounded-sm block" style={getCostBorderStyle(unit.cost)} title={unit.name} />
    <div className="flex justify-center gap-0.5 mt-0.5">
      {unit.items?.map((item, index) => item.image_url && <img key={index} src={item.image_url} alt={item.name} className="w-4 h-4 rounded-sm border border-border-light dark:border-dark-border-light" />)}
    </div>
  </div>
);

const PlayerCard: React.FC<{ participant: Match['participants'][0] }> = ({ participant }) => (
  <div className="flex mb-2.5 bg-gray-800 p-2.5 rounded-md" style={{ borderLeft: `5px solid ${getPlacementColor(participant.placement)}` }}>
    <div className="flex-shrink-0 w-36 mr-4">
      <div className="font-bold text-lg" style={{ color: getPlacementColor(participant.placement) }}>#{participant.placement}</div>
      <div className="text-xs break-all">{participant.puuid}</div>
    </div>
    <div className="flex-1">
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {participant.traits.map((trait, index) => trait.icon && <Trait key={index} trait={trait} />)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {participant.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)}
      </div>
    </div>
  </div>
);

const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<Match | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setError('매치 ID가 없습니다.');
      return;
    }

    const fetchMatchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/match/${matchId}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || '매치 정보를 불러오는데 실패했습니다.');
        }
        result.info.participants.sort((a: any, b: any) => a.placement - b.placement);
        setMatchData(result);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId]);

  if (loading) return <div className="p-5 max-w-4xl mx-auto">매치 상세 정보를 불러오는 중입니다...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-gray-800 rounded-lg">에러: {error}</div>;
  if (!matchData) return <div className="p-5 max-w-4xl mx-auto">매치 정보가 없습니다.</div>;

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <header className="mb-5 pb-2.5 border-b border-gray-700">
        <h3 className="text-xl font-bold">매치 상세 정보</h3>
        <p>게임 시간: {new Date(matchData.info.game_datetime).toLocaleString()}</p>
      </header>
      <section>
        {matchData.info.participants.map(p => (
          <PlayerCard key={p.puuid} participant={p} />
        ))}
      </section>
    </div>
  );
}

export default MatchDetailPage;