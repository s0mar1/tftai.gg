// backend/src/jobs/deckAnalyzer.ts
import Match from '../models/Match';
import DeckTier from '../models/DeckTier';
import { getTFTDataWithLanguage } from '../services/tftData';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';

const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface TierRank {
  rank: string;
  order: number;
}

interface LocaleNameObject {
  [key: string]: string;
}

interface DeckDataAggregator {
  mainTraitApiName: string;
  carryChampionApiName: string;
  placements: number[];
  unitOccurrences: Record<string, {
    count: number;
    items: string[];
    cost: number;
    tier: number;
  }>;
}

/**
 * 티어 랭크 계산 함수 (변경 없음)
 */
const calculateTierRank = (averagePlacement: number, top4Rate: number): TierRank => {
    if (averagePlacement <= 4.15 && top4Rate >= 0.58) return { rank: 'S', order: 1 };
    if (averagePlacement <= 4.35 && top4Rate >= 0.53) return { rank: 'A', order: 2 };
    if (averagePlacement <= 4.55 && top4Rate >= 0.50) return { rank: 'B', order: 3 };
    if (averagePlacement <= 4.75 && top4Rate >= 0.45) return { rank: 'C', order: 4 };
    return { rank: 'D', order: 5 };
};

/**
 * 모든 지원 언어의 TFT 데이터를 미리 로드하는 헬퍼 함수
 */
const loadAllLanguageTFTData = async (): Promise<Map<SupportedLanguage, any>> => {
    const tftDataMap = new Map<SupportedLanguage, any>();
    for (const lang of SUPPORTED_LANGUAGES) {
        const data = await getTFTDataWithLanguage(lang);
        if (!data) {
            throw new Error(`${lang} 언어의 TFT 데이터를 불러오는 데 실패했습니다.`);
        }
        tftDataMap.set(lang, data);
    }
    return tftDataMap;
};

/**
 * apiName을 기반으로 모든 언어의 이름을 찾아주는 헬퍼 함수
 */
const createLocaleNameObject = (apiName: string, tftDataMap: Map<SupportedLanguage, any>): LocaleNameObject => {
    const nameObject: LocaleNameObject = {};
    for (const lang of SUPPORTED_LANGUAGES) {
        const tftData = tftDataMap.get(lang);
        // nameMap에서 apiName으로 이름을 찾고, 없으면 기본값으로 apiName 사용
        nameObject[lang] = tftData?.nameMap?.get(apiName?.toLowerCase()) || apiName;
    }
    return nameObject;
};

export const analyzeAndCacheDeckTiers = async (): Promise<void> => {
    // MongoDB 연결 상태 확인
    if (!isMongoConnected()) {
        logger.warn('[Deck Analyzer] MongoDB 연결이 끊어진 상태입니다. 작업을 건너뜁니다.');
        return;
    }

    logger.info('[Deck Analyzer] 덱 티어리스트 분석 작업 시작 - MongoDB 연결 확인됨');
    try {
        // 1. 모든 언어의 TFT 데이터 로드
        const tftDataMap = await loadAllLanguageTFTData();
        const koTftData = tftDataMap.get('ko'); // 기준 데이터로 한국어 사용
        if (!koTftData) {
            console.error('기준이 되는 한국어 TFT 데이터를 불러오지 못해 분석을 중단합니다.');
            return;
        }

        const allMatches = await Match.find({});
        const deckDataAggregator: Record<string, DeckDataAggregator> = {};
        console.log(`총 ${allMatches.length}개의 매치를 분석합니다.`);

        allMatches.forEach(match => {
            if (!match?.info?.participants) return;

            match.info.participants.forEach((p: any) => {
                if (!p?.units || !p?.traits) return;

                const findChampInfo = (id: string) => koTftData.champions.find((c: any) => c.apiName && id && c.apiName.toLowerCase() === id.toLowerCase());

                const enrichedUnits = p.units.map((u: any) => ({ ...u, cost: findChampInfo(u.character_id)?.cost || 0 }));

                let carryUnit =
                    enrichedUnits.find((u: any) => u.tier === 3 && u.itemNames?.length >= 2) ||
                    enrichedUnits.find((u: any) => ((u.cost === 4 || u.cost === 5) && u.tier >= 2 && u.itemNames?.length >= 2)) ||
                    [...enrichedUnits].sort((a: any, b: any) => (b.itemNames?.length || 0) - (a.itemNames?.length || 0))[0];

                if (!carryUnit || !carryUnit.character_id) return;
                const carryInfo = findChampInfo(carryUnit.character_id);
                if (!carryInfo) return;

                const traits = p.traits
                    .map((t: any) => {
                        // Riot API에서 온 trait.name은 apiName과 같음
                        const traitInfo = koTftData.traitMap.get(t.name.toLowerCase());
                        return traitInfo ? { ...t, name: traitInfo.apiName } : null;
                    })
                    .filter(Boolean);

                if (!traits.length) return;

                const mainTrait = [...traits].sort((a: any, b: any) => (b.style || 0) - (a.style || 0))[0];
                if (!mainTrait) return;
                
                // deckKey는 언어에 독립적인 apiName을 사용
                const deckKey = `${mainTrait.name} ${carryInfo.apiName}`;

                if (!deckDataAggregator[deckKey]) {
                    deckDataAggregator[deckKey] = {
                        mainTraitApiName: mainTrait.name,
                        carryChampionApiName: carryInfo.apiName,
                        placements: [],
                        unitOccurrences: {},
                    };
                }
                const agg = deckDataAggregator[deckKey];
                agg.placements.push(p.placement);

                enrichedUnits.forEach((u: any) => {
                    if (!u.character_id) return;
                    if (!agg.unitOccurrences[u.character_id]) {
                        agg.unitOccurrences[u.character_id] = { count: 0, items: [], cost: u.cost, tier: u.tier };
                    }
                    const entry = agg.unitOccurrences[u.character_id];
                    if (entry) {
                        entry.count++;
                        if (u.itemNames) entry.items.push(...u.itemNames);
                    }
                });
            });
        });

        console.log(`[다국어] 분석 완료. ${Object.keys(deckDataAggregator).length}개 덱 발견.`);

        for (const key in deckDataAggregator) {
            const d = deckDataAggregator[key];
            if (!d) continue;
            const totalGames = d.placements.length;
            if (totalGames < 3) continue;

            const coreUnits = Object.entries(d.unitOccurrences)
                .sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([apiName, u]) => {
                    const champInfo = koTftData.champions.find((c: any) => c.apiName && apiName && c.apiName.toLowerCase() === apiName.toLowerCase());
                    const itemCounts = u.items.reduce((acc: Record<string, number>, n: string) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});

                    const recommendedItems = Object.entries(itemCounts)
                        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([itemApi]) => {
                            const itemInfo = koTftData.items.completed.find((i: any) => i.apiName && itemApi && i.apiName.toLowerCase() === itemApi.toLowerCase());
                            return {
                                name: createLocaleNameObject(itemApi, tftDataMap), // 다국어 아이템 이름
                                image_url: itemInfo?.icon || null
                            };
                        });

                    return {
                        name: createLocaleNameObject(apiName, tftDataMap), // 다국어 챔피언 이름
                        apiName: champInfo?.apiName,
                        image_url: champInfo?.tileIcon,
                        cost: u.cost,
                        tier: u.tier,
                        traits: champInfo?.traits || [], // 챔피언의 특성 API 이름들
                        recommendedItems,
                    };
                });

            const avg = d.placements.reduce((s, p) => s + p, 0) / totalGames;
            const top4 = d.placements.filter(p => p <= 4).length / totalGames;
            const tier = calculateTierRank(avg, top4);

            await DeckTier.findOneAndUpdate(
                { deckKey: key },
                {
                    mainTraitName: createLocaleNameObject(d.mainTraitApiName, tftDataMap), // 다국어 특성 이름
                    carryChampionName: createLocaleNameObject(d.carryChampionApiName, tftDataMap), // 다국어 챔피언 이름
                    coreUnits,
                    totalGames,
                    top4Count: d.placements.filter(p => p <= 4).length,
                    winCount: d.placements.filter(p => p === 1).length,
                    averagePlacement: avg,
                    tierRank: tier.rank,
                    tierOrder: tier.order,
                },
                { upsert: true },
            );
        }
        console.log('--- [다국어] 덱 티어리스트 통계 계산 및 DB 저장 완료 ---');
    } catch (err) {
        const error = err as Error;
        console.error('[다국어] 덱 티어리스트 분석 중 에러:', error.message, error.stack);
    }
};