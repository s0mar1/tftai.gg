import { getAccountByRiotId, getSummonerByPuuid, getLeagueEntriesByPuuid, getMatchIdsByPUUID, getMatchDetail } from '../services/riotApi';
import cacheManager from '../services/cacheManager';
import Match from '../models/Match';
import { DEFAULT_MATCH_COUNT } from '../services/constants';
import { ControllerHandler, SummonerQuery, SummonerResponse } from '../types/express';

const getSummonerData: ControllerHandler = async (_req, _res, _next): Promise<void> => {
  const { region, gameName, tagLine, forceRefresh }: SummonerQuery = _req.query;

  try {
    const account = await getAccountByRiotId(gameName!, tagLine!);
    if (!account) {
      _res.status(404).json({ _error: '소환사를 찾을 수 없습니다.' });
      return;
    }

    const { puuid } = account;

    // 1. 쿨다운 확인 (forceRefresh 시에만) - 간소화
    const cooldownKey = `summoner_cooldown_${puuid}`;
    if (forceRefresh === 'true') {
      const isInCooldown = cacheManager.get(cooldownKey);
      if (await isInCooldown) {
        _res.status(429).json({ _error: '너무 잦은 갱신 요청입니다. 2분 후에 다시 시도해주세요.' });
        return;
      }
    }

    // 2. 캐시 확인 (forceRefresh가 아닐 때)
    const cacheKey = `summoner_data_${puuid}`;
    if (forceRefresh !== 'true') {
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData) {
        _res.json(cachedData);
        return;
      }
    }

    // 3. 캐시 없거나 forceRefresh 시, API 호출
    await getSummonerByPuuid(puuid, region as any);
    const league = await getLeagueEntriesByPuuid(puuid, region as any);
    const matchIdsFromRiot = await getMatchIdsByPUUID(puuid, DEFAULT_MATCH_COUNT, region as any);
    const newMatchIdsToFetch: string[] = [];
    const existingMatchIdsToFetchFromDB: string[] = [];
    let foundExistingMatch = false;

    for (const matchId of matchIdsFromRiot) {
      if (foundExistingMatch) {
        // Once an existing match is found, all subsequent matches from Riot's list
        // are assumed to be in our DB. Add them to the list to fetch from DB.
        existingMatchIdsToFetchFromDB.push(matchId);
      } else {
        const existingMatch = await Match.findOne({ 'metadata.match_id': matchId });
        if (existingMatch) {
          foundExistingMatch = true;
          existingMatchIdsToFetchFromDB.push(matchId);
        } else {
          newMatchIdsToFetch.push(matchId);
        }
      }
    }

    // Fetch new match details from Riot API
    const newMatchDetails = await Promise.all(newMatchIdsToFetch.map(id => getMatchDetail(id, region as any)));

    // Fetch existing match details from our DB
    const existingMatchDetails = await Match.find({ 'metadata.match_id': { $in: existingMatchIdsToFetchFromDB } });

    // Combine and sort by gameCreation to maintain chronological order
    const allMatchDetails = [...newMatchDetails, ...existingMatchDetails].sort((a, b) => b.info.game_creation - a.info.game_creation);

    const processedMatches = allMatchDetails.map(match => {
      const me = match.info.participants.find((p: any) => p.puuid === puuid);
      if (!me) {
        throw new Error(`참가자 데이터를 찾을 수 없습니다: ${puuid}`);
      }
      return {
        matchId: match.metadata.match_id,
        gameCreation: match.info.game_creation,
        gameLength: match.info.game_length,
        myParticipant: me,
        participants: match.info.participants,
      };
    });

    const responseData: SummonerResponse = {
      account,
      league: Array.isArray(league) ? league : [],
      matches: processedMatches,
    };

    // 4. 새로운 데이터를 캐시에 저장하고 쿨다운 시작
    cacheManager.set(cacheKey, responseData, 300); // 5분 캐시
    if (forceRefresh === 'true') {
      cacheManager.set(cooldownKey, true, 120); // 2분 쿨다운
    }

    _res.json(responseData);

  } catch (_error) {
    _next(_error);
  }
};

export { getSummonerData };