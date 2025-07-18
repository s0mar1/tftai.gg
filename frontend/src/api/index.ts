// src/api/index.ts
import { SummonerData, ApiResponse, Match, Deck } from '../types';

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
  const response = await fetch(`/api/tierlist/decks/${language}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch tier list');
  }
  return response.json();
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