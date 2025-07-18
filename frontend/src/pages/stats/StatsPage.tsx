import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import ResponsiveContainer, { ResponsiveGrid } from '../../components/common/ResponsiveContainer';
import { StatsPageSkeleton } from '../../components/common/TFTSkeletons';

interface StatsFilters {
  type: string;
  sortBy: string;
  order: 'asc' | 'desc';
  minGames: number;
}

interface StatItem {
  id: string;
  name: string;
  winRate: number;
  pickRate: number;
  avgPlacement: number;
  games: number;
}

const StatsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('items');
  
  // 성능 모니터링 훅 추가
  const { performanceData } = usePerformanceMonitor('StatsPage', {
    threshold: 75,
    trackReRenders: true,
    trackMemory: true
  });
  const [itemStats, setItemStats] = useState<StatItem[]>([]);
  const [traitStats, setTraitStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<StatsFilters>({
    type: 'all',
    sortBy: 'winRate',
    order: 'desc',
    minGames: 10
  });

  const fetchStats = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'items' ? 'items' : 'traits';
      const params = new URLSearchParams(filters as any);
      
      const response = await fetch(`/api/stats/${endpoint}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        if (activeTab === 'items') {
          setItemStats(data.data);
        } else {
          setTraitStats(data.data);
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const renderStatCard = (stat, type) => {
    const isItem = type === 'item';
    const name = isItem ? stat.itemName : stat.traitName;
    const icon = isItem ? stat.itemIcon : stat.traitIcon;
    
    return (
      <div key={stat._id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          {icon && (
            <img 
              src={icon} 
              alt={name}
              className="w-8 h-8 rounded"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
          <div>
            <h3 className="text-white font-medium text-sm">{name}</h3>
            <span className="text-gray-400 text-xs">
              {t('stats.games', { count: stat.totalGames })}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-400 font-bold">{stat.winRate}%</div>
            <div className="text-gray-400">{t('stats.winRate')}</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-bold">{stat.top4Rate}%</div>
            <div className="text-gray-400">{t('stats.top4Rate')}</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-bold">{stat.averagePlacement}</div>
            <div className="text-gray-400">{t('stats.averagePlacement')}</div>
          </div>
        </div>
      </div>
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const currentStats = activeTab === 'items' ? itemStats : traitStats;

  if (loading) {
    return (
      <ResponsiveContainer maxWidth="7xl" padding="responsive">
        <StatsPageSkeleton />
      </ResponsiveContainer>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('stats.title')}</h1>
          <p className="text-gray-400">{t('stats.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'items'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('stats.itemStats')}
            </button>
            <button
              onClick={() => setActiveTab('traits')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'traits'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('stats.traitStats')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">📊 {t('stats.filters')}:</span>
            </div>
            
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              <option value="all">{t('stats.all')}</option>
              {activeTab === 'items' ? (
                <>
                  <option value="completed">{t('stats.itemTypes.completed')}</option>
                  <option value="basic">{t('stats.itemTypes.basic')}</option>
                  <option value="ornn">{t('stats.itemTypes.ornn')}</option>
                  <option value="radiant">{t('stats.itemTypes.radiant')}</option>
                  <option value="emblem">{t('stats.itemTypes.emblem')}</option>
                </>
              ) : (
                <>
                  <option value="origin">{t('stats.traitTypes.origin')}</option>
                  <option value="class">{t('stats.traitTypes.class')}</option>
                </>
              )}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              <option value="winRate">{t('stats.winRate')}</option>
              <option value="top4Rate">{t('stats.top4Rate')}</option>
              <option value="averagePlacement">{t('stats.averagePlacement')}</option>
              <option value="totalGames">{t('stats.totalGames')}</option>
            </select>

            <select
              value={filters.order}
              onChange={(e) => handleFilterChange('order', e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              <option value="desc">{t('stats.highToLow')}</option>
              <option value="asc">{t('stats.lowToHigh')}</option>
            </select>

            <select
              value={filters.minGames}
              onChange={(e) => handleFilterChange('minGames', e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              <option value="5">{t('stats.minGames')} 5+</option>
              <option value="10">{t('stats.minGames')} 10+</option>
              <option value="25">{t('stats.minGames')} 25+</option>
              <option value="50">{t('stats.minGames')} 50+</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentStats.map(stat => 
              renderStatCard(stat, activeTab === 'items' ? 'item' : 'trait')
            )}
          </div>
        )}

        {currentStats.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-400">{t('stats.noStatsFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPage;