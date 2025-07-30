import React, { useState } from 'react';
import { UnitRole } from '../../api/index';

interface UnitRoleCardProps {
  unitRole: UnitRole;
  isActive?: boolean;
  onClick?: () => void;
}

const UnitRoleCard: React.FC<UnitRoleCardProps> = ({ 
  unitRole, 
  isActive = false, 
  onClick 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'tank': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300';
      case 'fighter': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300';
      case 'assassin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300';
      case 'caster': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-300';
      case 'specialist': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300';
      case 'marksman': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300';
    }
  };

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case 'tank':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
          </svg>
        );
      case 'fighter':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.92 5L5.5 3.58L6.92 2.16L8.34 3.58L6.92 5M16 12L18 14H22V16H18L16 14V18A2 2 0 0 1 14 20H4A2 2 0 0 1 2 18V12A2 2 0 0 1 4 10H14A2 2 0 0 1 16 12M14 12H4V18H14V12Z"/>
          </svg>
        );
      case 'assassin':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.84 12.17L15.83 8.17L21 9M1 9L6.17 4.83L7.58 6.25L2.41 11.41L1 9M8.42 12.58L6.17 17L1 15V17L7.58 22.42L13 17L8.42 12.58Z"/>
          </svg>
        );
      case 'caster':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.66 19.5 12.33 19.5 12C19.5 11.67 19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.49 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.51 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12C4.5 12.33 4.53 12.65 4.57 12.97L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.03 4.95 18.95L7.44 17.94C7.96 18.34 8.52 18.68 9.13 18.93L9.51 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.49 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"/>
          </svg>
        );
      case 'specialist':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2M8 17.5L9.5 16L11 17.5L9.5 19L8 17.5M4.5 12.5L6 11L7.5 12.5L6 14L4.5 12.5M16.5 12.5L18 11L19.5 12.5L18 14L16.5 12.5M13 19.5L14.5 18L16 19.5L14.5 21L13 19.5Z"/>
          </svg>
        );
      case 'marksman':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2A2 2 0 0 1 14 4A2 2 0 0 1 12 6A2 2 0 0 1 10 4A2 2 0 0 1 12 2M6 8V6H4V8H6M4 10V14H6V10H4M6 16V18H4V16H6M8 18V20H6V18H8M10 20V18H8V20H10M12 18V20H10V18H12M14 20V18H12V20H14M16 18V20H14V18H16M18 20V18H16V20H18M20 18V16H18V18H20M20 16V14H18V16H20M20 14V10H18V14H20M20 10V8H18V10H20M18 8V6H20V8H18M16 6V8H18V6H16M14 8V6H16V8H14M12 6V8H14V6H12M10 8V6H12V8H10M8 6V8H10V6H8M6 8V10H8V8H6M8 10V14H10V10H8M10 14V16H8V14H10M12 16V14H10V16H12M14 14V16H12V14H14M16 16V14H14V16H16M16 14V10H14V14H16M14 10V8H16V10H14M12 8V10H14V8H12M10 10V8H12V10H10"/>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
          </svg>
        );
    }
  };

  return (
    <div 
      className={`bg-background-card dark:bg-dark-background-card rounded-lg shadow-md border-2 transition-all duration-200 ${
        isActive 
          ? `${getRoleColor(unitRole.id)} shadow-lg` 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getRoleColor(unitRole.id)}`}>
              {unitRole.icon ? (
                <img 
                  src={unitRole.icon} 
                  alt={unitRole.name}
                  className="w-6 h-6"
                />
              ) : (
                getRoleIcon(unitRole.id)
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                {unitRole.name}
              </h3>
              <p className="text-text-secondary dark:text-dark-text-secondary text-sm">
                {unitRole.description}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary"
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Passive Effect */}
        <div className="bg-background-base dark:bg-dark-background-base rounded-lg p-3">
          <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
            Passive Effect:
          </h4>
          <p className="text-text-secondary dark:text-dark-text-secondary text-sm">
            {unitRole.passive}
          </p>
        </div>

        {/* Champions List */}
        {showDetails && unitRole.champions && unitRole.champions.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
              Champions with this role:
            </h4>
            <div className="flex flex-wrap gap-2">
              {unitRole.champions.map((championApiName, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-background-base dark:bg-dark-background-base rounded text-xs text-text-primary dark:text-dark-text-primary"
                >
                  {championApiName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitRoleCard;