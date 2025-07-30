import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  fetchPowerSnaxAPI, 
  fetchUnitRolesAPI, 
  PowerSnax, 
  UnitRole,
  ApiResponse 
} from '../api/index';
import PowerSnaxCard from '../components/set15/PowerSnaxCard';
import UnitRoleCard from '../components/set15/UnitRoleCard';
import Skeleton from '../components/common/Skeleton';
import ErrorMessage from '../components/common/ErrorMessage';

const Set15FeaturesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [powerSnaxData, setPowerSnaxData] = useState<PowerSnax[]>([]);
  const [unitRolesData, setUnitRolesData] = useState<UnitRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'power-snax' | 'unit-roles'>('power-snax');
  const [selectedRound, setSelectedRound] = useState<'all' | '1-3' | '3-6'>('all');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [i18n.language]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [powerSnaxResponse, unitRolesResponse] = await Promise.all([
        fetchPowerSnaxAPI(undefined, i18n.language),
        fetchUnitRolesAPI(i18n.language)
      ]);

      if (powerSnaxResponse.success && powerSnaxResponse.data) {
        setPowerSnaxData(powerSnaxResponse.data);
      }

      if (unitRolesResponse.success && unitRolesResponse.data) {
        setUnitRolesData(unitRolesResponse.data);
      }
    } catch (err) {
      console.error('Failed to load Set 15 features:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Set 15 features');
    } finally {
      setLoading(false);
    }
  };

  const filteredPowerSnax = selectedRound === 'all' 
    ? powerSnaxData 
    : powerSnaxData.filter(ps => ps.round === selectedRound);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ErrorMessage 
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
          TFT Set 15: K.O. Coliseum Features
        </h1>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          Explore the new Power Snax system and Unit Roles introduced in Set 15
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('power-snax')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'power-snax'
              ? 'text-brand-mint border-brand-mint'
              : 'text-text-secondary dark:text-dark-text-secondary border-transparent hover:text-text-primary dark:hover:text-dark-text-primary'
          }`}
        >
          Power Snax System
        </button>
        <button
          onClick={() => setActiveTab('unit-roles')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'unit-roles'
              ? 'text-brand-mint border-brand-mint'
              : 'text-text-secondary dark:text-dark-text-secondary border-transparent hover:text-text-primary dark:hover:text-dark-text-primary'
          }`}
        >
          Unit Roles
        </button>
      </div>

      {/* Power Snax Tab */}
      {activeTab === 'power-snax' && (
        <div>
          {/* Round Filter */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-3">
              Power Snax Options
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRound('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRound === 'all'
                    ? 'bg-brand-mint text-white'
                    : 'bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary hover:bg-background-base dark:hover:bg-dark-background-base'
                }`}
              >
                All Rounds
              </button>
              <button
                onClick={() => setSelectedRound('1-3')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRound === '1-3'
                    ? 'bg-brand-mint text-white'
                    : 'bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary hover:bg-background-base dark:hover:bg-dark-background-base'
                }`}
              >
                Round 1-3
              </button>
              <button
                onClick={() => setSelectedRound('3-6')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRound === '3-6'
                    ? 'bg-brand-mint text-white'
                    : 'bg-background-card dark:bg-dark-background-card text-text-primary dark:text-dark-text-primary hover:bg-background-base dark:hover:bg-dark-background-base'
                }`}
              >
                Round 3-6
              </button>
            </div>
          </div>

          {/* Power Snax Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredPowerSnax.map((powerSnax) => (
              <PowerSnaxCard
                key={powerSnax.id}
                powerSnax={powerSnax}
                onPowerUpSelect={(powerUp) => {
                  console.log('Selected Power Up:', powerUp);
                }}
              />
            ))}
          </div>

          {filteredPowerSnax.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary dark:text-dark-text-secondary">
                No Power Snax options available for the selected round.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Unit Roles Tab */}
      {activeTab === 'unit-roles' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-3">
              Unit Role System
            </h2>
            <p className="text-text-secondary dark:text-dark-text-secondary mb-4">
              Every champion now has one of six roles, each providing unique passive effects.
            </p>
          </div>

          {/* Unit Role Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unitRolesData.map((unitRole) => (
              <UnitRoleCard
                key={unitRole.id}
                unitRole={unitRole}
                isActive={selectedRole === unitRole.id}
                onClick={() => setSelectedRole(
                  selectedRole === unitRole.id ? null : unitRole.id
                )}
              />
            ))}
          </div>

          {unitRolesData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary dark:text-dark-text-secondary">
                No unit roles data available.
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-8 bg-background-card dark:bg-dark-background-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-3">
              About Unit Roles
            </h3>
            <div className="space-y-3 text-text-secondary dark:text-dark-text-secondary">
              <p>
                Set 15 introduces a new Unit Role system where every champion is assigned one of six roles:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Tank:</strong> Generate 2 Mana when taking damage and are more likely to be targeted</li>
                <li><strong>Fighter:</strong> Have Omnivamp that scales with game stage (8-20%)</li>
                <li><strong>Assassin:</strong> Less likely to be targeted by enemies</li>
                <li><strong>Caster:</strong> Generate 2 Mana per second</li>
                <li><strong>Specialist:</strong> Generate resources in unique ways specific to each champion</li>
                <li><strong>Marksman:</strong> Gain Attack Speed after each attack, stacking up to 5 times</li>
              </ul>
              <p>
                These roles provide passive effects that help define each champion's playstyle and strategic value.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Set15FeaturesPage;