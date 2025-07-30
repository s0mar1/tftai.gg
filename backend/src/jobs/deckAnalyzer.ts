// backend/src/jobs/deckAnalyzer.ts
import Match from '../models/Match';
import DeckTier from '../models/DeckTier';
import { getTFTDataWithLanguage } from '../services/tftData';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';
import { withTransaction, withBatchTransaction, transactionStats } from '../utils/transactionWrapper';
import { ClientSession } from 'mongoose';

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

// 🚀 Week 2 Phase 2: 트랜잭션 기반 덱 분석 함수 (기존 함수 완전 보존)

/**
 * 환경변수로 트랜잭션 모드를 제어
 * ENABLE_DECK_TRANSACTIONS=true 시 트랜잭션 함수 사용
 */
const isTransactionModeEnabled = (): boolean => {
  return process.env.ENABLE_DECK_TRANSACTIONS === 'true';
};

/**
 * 트랜잭션 기반 덱 티어리스트 분석 함수
 * 기존 analyzeAndCacheDeckTiers() 로직을 트랜잭션으로 래핑
 * 
 * 장점:
 * - 데이터 일관성 보장
 * - 중간 실패 시 전체 롤백
 * - 배치 업데이트 최적화
 */
export const analyzeAndCacheDeckTiersWithTransaction = async (): Promise<void> => {
    // MongoDB 연결 상태 확인
    if (!isMongoConnected()) {
        logger.warn('[Deck Analyzer TX] MongoDB 연결이 끊어진 상태입니다. 작업을 건너뜁니다.');
        return;
    }

    logger.info('[Deck Analyzer TX] 🚀 트랜잭션 기반 덱 티어리스트 분석 시작');

    try {
        // Step 1: 데이터 준비 (읽기 작업 - 트랜잭션 외부에서 수행)
        const { deckDataAggregator, tftDataMap } = await prepareDeckAnalysisData();
        
        if (Object.keys(deckDataAggregator).length === 0) {
            logger.info('[Deck Analyzer TX] 분석할 덱 데이터가 없습니다.');
            return;
        }

        // Step 2: 트랜잭션으로 배치 업데이트 수행
        const updateOperations = createDeckTierUpdateOperations(deckDataAggregator, tftDataMap);
        
        const result = await withBatchTransaction(updateOperations, {
            maxRetries: 3,
            retryDelay: 2000,
            timeoutMs: 60000, // 1분
            logLevel: 'info'
        });

        if (result.success) {
            logger.info(`[Deck Analyzer TX] ✅ 트랜잭션 성공 - ${updateOperations.length}개 덱 업데이트 완료 (${result.executionTime}ms)`);
            
            // 통계 로깅
            const stats = transactionStats.getStats();
            logger.info('[Deck Analyzer TX] 📊 트랜잭션 통계', {
                totalTransactions: stats.totalTransactions,
                successRate: `${((stats.successfulTransactions / stats.totalTransactions) * 100).toFixed(1)}%`,
                avgExecutionTime: `${Math.round(stats.averageExecutionTime)}ms`
            });
        } else {
            logger.error(`[Deck Analyzer TX] ❌ 트랜잭션 실패: ${result.error?.message}`);
            
            // 트랜잭션 실패 시 기존 함수로 폴백
            logger.info('[Deck Analyzer TX] 🔄 기존 함수로 폴백 실행');
            await analyzeAndCacheDeckTiers();
        }

    } catch (error: any) {
        logger.error('[Deck Analyzer TX] 예상치 못한 에러:', error.message);
        
        // 예외 발생 시 기존 함수로 폴백
        logger.info('[Deck Analyzer TX] 🔄 예외 발생으로 기존 함수 폴백 실행');
        await analyzeAndCacheDeckTiers();
    }
};

/**
 * 덱 분석 데이터 준비 (읽기 작업)
 * 트랜잭션 외부에서 수행하여 트랜잭션 시간 최소화
 */
async function prepareDeckAnalysisData() {
    // 1. 모든 언어의 TFT 데이터 로드
    const tftDataMap = await loadAllLanguageTFTData();
    const koTftData = tftDataMap.get('ko');
    
    if (!koTftData) {
        throw new Error('기준이 되는 한국어 TFT 데이터를 불러오지 못했습니다.');
    }

    // 2. 매치 데이터 조회 및 분석
    const allMatches = await Match.find({});
    const deckDataAggregator: Record<string, DeckDataAggregator> = {};
    
    logger.info(`[Deck Analyzer TX] 📊 ${allMatches.length}개 매치 분석 시작`);

    // 기존 로직과 동일한 분석 과정
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
                    const traitInfo = koTftData.traitMap.get(t.name.toLowerCase());
                    return traitInfo ? { ...t, name: traitInfo.apiName } : null;
                })
                .filter(Boolean);

            if (!traits.length) return;

            const mainTrait = [...traits].sort((a: any, b: any) => (b.style || 0) - (a.style || 0))[0];
            if (!mainTrait) return;
            
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

    logger.info(`[Deck Analyzer TX] 📈 ${Object.keys(deckDataAggregator).length}개 덱 발견`);
    
    return { deckDataAggregator, tftDataMap };
}

/**
 * DeckTier 업데이트 작업들을 생성
 * 각 작업은 트랜잭션 내에서 실행됨
 */
function createDeckTierUpdateOperations(
    deckDataAggregator: Record<string, DeckDataAggregator>,
    tftDataMap: Map<SupportedLanguage, any>
) {
    const operations: Array<(session: ClientSession) => Promise<any>> = [];
    const koTftData = tftDataMap.get('ko')!;

    for (const key in deckDataAggregator) {
        const d = deckDataAggregator[key];
        if (!d) continue;
        const totalGames = d.placements.length;
        if (totalGames < 3) continue;

        // 덱 데이터 처리 (기존 로직과 동일)
        const coreUnits = Object.entries(d.unitOccurrences)
            .sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([apiName, u]) => {
                const champInfo = koTftData.champions.find((c: any) => c.apiName && apiName && c.apiName.toLowerCase() === apiName.toLowerCase());
                const itemCounts = u.items.reduce((acc: Record<string, number>, n: string) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});

                const recommendedItems = Object.entries(itemCounts)
                    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([itemApi]) => {
                        const itemInfo = koTftData.items.completed.find((i: any) => i.apiName && itemApi && i.apiName.toLowerCase() === itemApi.toLowerCase());
                        return {
                            name: createLocaleNameObject(itemApi, tftDataMap),
                            image_url: itemInfo?.icon || null
                        };
                    });

                return {
                    name: createLocaleNameObject(apiName, tftDataMap),
                    apiName: champInfo?.apiName,
                    image_url: champInfo?.tileIcon,
                    cost: u.cost,
                    tier: u.tier,
                    traits: champInfo?.traits || [],
                    recommendedItems,
                };
            });

        const avg = d.placements.reduce((s, p) => s + p, 0) / totalGames;
        const top4 = d.placements.filter(p => p <= 4).length / totalGames;
        const tier = calculateTierRank(avg, top4);

        // 트랜잭션 내에서 실행될 업데이트 작업 생성
        const updateOperation = async (session: ClientSession) => {
            return await DeckTier.findOneAndUpdate(
                { deckKey: key },
                {
                    mainTraitName: createLocaleNameObject(d.mainTraitApiName, tftDataMap),
                    carryChampionName: createLocaleNameObject(d.carryChampionApiName, tftDataMap),
                    coreUnits,
                    totalGames,
                    top4Count: d.placements.filter(p => p <= 4).length,
                    winCount: d.placements.filter(p => p === 1).length,
                    averagePlacement: avg,
                    tierRank: tier.rank,
                    tierOrder: tier.order,
                },
                { 
                    upsert: true, 
                    new: true,
                    session // 트랜잭션 세션 전달
                }
            );
        };

        operations.push(updateOperation);
    }

    return operations;
}

/**
 * 통합된 덱 분석 함수 (환경변수로 모드 선택)
 * 기본적으로는 기존 함수 사용, ENABLE_DECK_TRANSACTIONS=true 시 트랜잭션 함수 사용
 */
export const analyzeAndCacheDeckTiersUnified = async (): Promise<void> => {
    if (isTransactionModeEnabled()) {
        logger.info('[Deck Analyzer] 🔄 트랜잭션 모드로 실행');
        await analyzeAndCacheDeckTiersWithTransaction();
    } else {
        logger.info('[Deck Analyzer] 🔄 일반 모드로 실행');
        await analyzeAndCacheDeckTiers();
    }
};