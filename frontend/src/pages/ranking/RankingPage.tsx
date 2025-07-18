import React, { useState, useEffect } from 'react';
import { api } from '../../utils/fetchApi';
import { useSearchParams, useNavigate, Link, useParams } from 'react-router-dom';
import { Ranker } from '../../types';

interface RankerRowProps {
  ranker: Ranker;
  rank: number;
}

const RankerRow: React.FC<RankerRowProps> = ({ ranker, rank }) => {
  const { lang } = useParams<{ lang: string }>();
  const totalGames = ranker.wins + ranker.losses;
  const top4Rate = totalGames > 0 ? ((ranker.wins / totalGames) * 100).toFixed(1) : "0.0";
  
  const winRate = totalGames > 0 && (ranker as any).firstPlaceWins > 0 
      ? (((ranker as any).firstPlaceWins / totalGames) * 100).toFixed(1) 
      : "0.0"; 

  const profileIconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${ranker.profileIconId}.jpg`;

  const getTierIconUrl = (tier: string) => {
    if (!tier || typeof tier !== 'string') return ''; 
    const mainTier = tier.split(' ')[0];
    const formattedTier = mainTier.charAt(0).toUpperCase() + mainTier.slice(1).toLowerCase();
    const LATEST_DDRAGON_VERSION = '14.12.1';
    return `https://ddragon.leagueoflegends.com/cdn/${LATEST_DDRAGON_VERSION}/img/tft-regalia/TFT_Regalia_${formattedTier}.png`;
  };

  return (
    <tr className="border-b border-border-light dark:border-dark-border-light hover:bg-background-base dark:hover:bg-dark-background-base transition-colors">
      <td className="p-4 text-center font-bold text-lg text-text-secondary dark:text-dark-text-secondary">{rank}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={profileIconUrl} 
            alt={ranker.gameName} 
            className="w-10 h-10 rounded-md" 
            onError={(e) => { 
              (e.target as HTMLImageElement).onerror = null; 
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNjM2MzYzIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VVNFUjwvdGV4dD4KPC9zdmc+'; 
            }}
          />
          <Link 
            to={`/${lang || 'ko'}/summoner/kr/${encodeURIComponent(`${ranker.gameName}#${ranker.tagLine}`)}`} 
            className="font-bold text-text-primary dark:text-dark-text-primary hover:text-brand-mint transition-colors"
          >
            {ranker.gameName}
          </Link>
        </div>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <img 
            src={getTierIconUrl(ranker.tier)} 
            alt={ranker.tier} 
            className="w-8 h-8 mb-1" 
            onError={(e) => { 
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTUiIGZpbGw9IiNGRkQ3MDAiIHN0cm9rZT0iI0Y5QTgwOSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjE2IiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJibGFjayIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlQ8L3RleHQ+Cjwvc3ZnPg==';
            }}
          />
          <span className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary">{ranker.tier}</span>
        </div>
      </td>
      <td className="p-4 text-center font-bold text-brand-mint">{ranker.leaguePoints.toLocaleString()} LP</td>
      <td className="p-4 text-center font-bold dark:text-gray-300">{top4Rate}%</td>
      <td className="p-4 text-center font-semibold text-red-400 dark:text-red-200">{totalGames} 게임</td>
      <td className="p-4 text-center font-bold dark:text-gray-300">{winRate}%</td>
    </tr>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);

      if (currentPage - 2 > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage + 2 < totalPages - 1) pages.push('...');
      
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded bg-background-card dark:bg-dark-background-card border border-border-light dark:border-dark-border-light disabled:opacity-50 hover:bg-background-base dark:hover:bg-dark-background-base"> 이전 </button>
      {pageNumbers.map((number, index) => 
        typeof number === 'number' ? (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`px-3 py-1 rounded ${currentPage === number ? 'bg-brand-mint text-white border-brand-mint' : 'bg-background-card dark:bg-dark-background-card border border-border-light dark:border-dark-border-light hover:bg-background-base dark:hover:bg-dark-background-base'}`}
          >
            {number}
          </button>
        ) : (
          <span key={`dots-${index}`} className="px-3 py-1">...</span>
        )
      )}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded bg-background-card dark:bg-dark-background-card border border-border-light dark:border-dark-border-light disabled:opacity-50 hover:bg-background-base dark:hover:bg-dark-background-base"> 다음 </button>
    </div>
  );
};

const RankingPage: React.FC = () => {
  const [rankers, setRankers] = useState<Ranker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;

  useEffect(() => {
    const fetchRankers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get(`/api/ranking?page=${currentPage}`);
        console.log('RankingPage: API 응답:', data);
        setRankers(data.rankers || []);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        console.error('RankingPage: API 에러:', err);
        setError(err.message || '랭킹 정보를 불러오는 데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };
    fetchRankers();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      navigate(`/ranking?page=${page}`);
    }
  };

  if (error) return <div className="p-8 text-center text-error-red dark:text-dark-error-red">{error}</div>;

  return (
    <div className="bg-background-card dark:bg-dark-background-card shadow-md rounded-lg p-6 my-8">
      <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-6">랭크게임 순위표</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b-2 border-border-light dark:border-dark-border-light">
            <tr>
              <th className="p-3 text-center w-16 font-bold text-text-secondary dark:text-dark-text-secondary">#</th>
              <th className="p-3 text-left font-bold text-text-secondary dark:text-dark-text-secondary">소환사</th>
              <th className="p-3 text-center w-32 font-bold text-text-secondary dark:text-dark-text-secondary">티어</th>
              <th className="p-3 text-center w-32 font-bold text-text-secondary dark:text-dark-text-secondary">LP</th>
              <th className="p-3 text-center w-28 font-bold text-text-secondary dark:text-dark-text-secondary">순방률<br />(Top 4)</th>
              <th className="p-3 text-center w-32 font-bold text-text-secondary dark:text-dark-text-secondary">총 게임 수</th>
              <th className="p-3 text-center w-28 font-bold text-text-secondary dark:text-dark-text-secondary">승률 (1위)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className="border-b border-border-light dark:border-dark-border-light animate-pulse">
                  <td className="p-4 text-center"><div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded mx-auto"></div></td>
                  <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-md"></div><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div></div></td>
                  <td className="p-4 text-right"><div className="flex items-center justify-end gap-3"><div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div><div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div></div></td>
                  <td className="p-4 text-center"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto"></div></td>
                  <td className="p-4 text-center"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12 mx-auto"></div></td>
                  <td className="p-4 text-center"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-14 mx-auto"></div></td>
                  <td className="p-4 text-center"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12 mx-auto"></div></td>
                </tr>
              ))
            ) : (
              rankers.map((ranker, index) => (
                <RankerRow key={(ranker as any).puuid} ranker={ranker} rank={(currentPage - 1) * 50 + index + 1} />
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
    </div>
  );
}

export default RankingPage;