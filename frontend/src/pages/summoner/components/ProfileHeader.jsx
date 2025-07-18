// frontend/src/pages/SummonerPage/components/ProfileHeader.jsx

import React from 'react';
import classNames from 'classnames';

const ProfileHeader = ({ account, region, onRefresh, isRefreshing, refreshCooldownMessage }) => {
  if (!account) return null;

  const accountIcon = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`;

  return (
    <div className="flex items-center justify-between bg-background-card dark:bg-dark-background-card p-5 rounded-lg shadow-md mb-6">
      <div className="flex items-center gap-4">
        <img 
          src={accountIcon} 
          alt="profile" 
          className="w-14 h-14 rounded-full" 
          onError={e => { e.currentTarget.style.display = 'none'; }} 
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{account.gameName}#{account.tagLine}</h2>
            <span className="bg-background-base dark:bg-dark-background-base text-text-secondary dark:text-dark-text-secondary text-xs font-bold py-1 px-2 rounded-md">{region?.toUpperCase()}</span>
          </div>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">최근 업데이트: 4시간 전 (API 추가 필요)</p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || !!refreshCooldownMessage}
          className={classNames(
            'bg-brand-mint',
            'text-white',
            'font-bold',
            'py-2.5',
            'px-5',
            'rounded-lg',
            'border-none',
            'cursor-pointer',
            'transition-opacity',
            'duration-200',
            'text-sm',
            (isRefreshing || !!refreshCooldownMessage) && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isRefreshing ? '갱신 중...' : '전적 갱신'}
        </button>
        <p className={classNames(
          'text-error-red',
          'text-xs',
          'mt-1.5',
          'min-h-[1.2em]',
          'transition-opacity',
          'duration-300',
          refreshCooldownMessage ? 'opacity-100' : 'opacity-0'
        )}>
          {refreshCooldownMessage}
        </p>
      </div>
    </div>
  );
};

export default ProfileHeader;
