import React from 'react';

export default function ProfileHeader({ gameName, tagLine, tier }) {
  return (
    <div className="flex items-center space-x-4 p-4 bg-background-card dark:bg-dark-background-card shadow rounded">
      <div className="w-16 h-16 bg-background-card dark:bg-dark-background-card rounded-full flex-shrink-0" />
      <div>
        <h1 className="text-xl font-semibold">{gameName}#{tagLine}</h1>
        <p className="text-text-secondary dark:text-dark-text-secondary">티어: {tier || 'Unranked'}</p>
      </div>
    </div>
  );
}
