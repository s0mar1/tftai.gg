// src/api/index.ts
import { SummonerData, ApiResponse, Match, Deck } from '../types';
import { api } from '../utils/fetchApi';

export const fetchSummonerDataAPI = async (region: string, rawName: string): Promise<ApiResponse<SummonerData>> => {
  const [gameName, tagLine] = rawName.split('#');
  if (!gameName || !tagLine) {
    throw new Error('Invalid summoner name format. Use: GameName#TagLine');
  }
  
  const response = await fetch(`/api/summoner?region=${region}&gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'API Error');
  }
  return response.json();
};

export const fetchMatchHistoryAPI = async (region: string, puuid: string): Promise<ApiResponse<Match[]>> => {
  const response = await fetch(`/api/matches?region=${region}&puuid=${encodeURIComponent(puuid)}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch match history');
  }
  return response.json();
};

export const fetchDeckTiersAPI = async (language: string = 'ko'): Promise<ApiResponse<Deck[]>> => {
  const data = await api.get<Deck[]>(`/api/tierlist/decks/${language}`);
  return { data }; // ApiResponse 형태로 래핑
};

export const fetchRankingAPI = async (region?: string): Promise<ApiResponse<Ranker[]>> => {
  const params = region ? `?region=${region}` : '';
  const response = await fetch(`/api/ranking${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch ranking');
  }
  return response.json();
};

export const fetchStatsAPI = async (type: 'items' | 'traits', filters?: Record<string, string | number | boolean>): Promise<ApiResponse<(ItemStats | TraitStats)[]>> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await fetch(`/api/stats/${type}?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch stats');
  }
  return response.json();
};

export const invalidateCacheAPI = async (cacheKey: string): Promise<ApiResponse<void>> => {
  const response = await fetch(`/api/cache/invalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: cacheKey }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to invalidate cache');
  }
  return response.json();
};

// Set 15 새로운 API 엔드포인트들

export interface PowerSnax {
  id: string;
  name: string;
  description: string;
  icon?: string;
  round: '1-3' | '3-6';
  powerUps: PowerUp[];
}

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: 'stats' | 'ability' | 'trait' | 'special';
  effects: PowerUpEffect[];
}

export interface PowerUpEffect {
  stat?: string;
  value?: number | string;
  description?: string;
  duration?: 'permanent' | 'combat' | number;
}

export interface UnitRole {
  id: string;
  name: string;
  description: string;
  icon?: string;
  passive: string;
  champions?: string[];
}

export const fetchPowerSnaxAPI = async (round?: '1-3' | '3-6', language: string = 'ko'): Promise<ApiResponse<PowerSnax[]>> => {
  const params = new URLSearchParams();
  if (round) params.append('round', round);
  params.append('language', language);
  
  const response = await fetch(`/api/power-snax?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch Power Snax');
  }
  return response.json();
};

export const fetchPowerUpsAPI = async (powerSnaxId: string, language: string = 'ko'): Promise<ApiResponse<PowerUp[]>> => {
  const params = new URLSearchParams();
  params.append('language', language);
  
  const response = await fetch(`/api/power-snax/${powerSnaxId}/power-ups?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch Power Ups');
  }
  return response.json();
};

export const fetchUnitRolesAPI = async (language: string = 'ko'): Promise<ApiResponse<UnitRole[]>> => {
  const params = new URLSearchParams();
  params.append('language', language);
  
  const response = await fetch(`/api/unit-roles?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch Unit Roles');
  }
  return response.json();
};

export const fetchUnitRoleAPI = async (roleId: string, language: string = 'ko'): Promise<ApiResponse<UnitRole>> => {
  const params = new URLSearchParams();
  params.append('language', language);
  
  const response = await fetch(`/api/unit-roles/${roleId}?${params}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch Unit Role');
  }
  return response.json();
};