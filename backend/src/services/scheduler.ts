import * as cron from 'node-cron';
import { collectTopRankerMatches } from '../jobs/matchCollector';
import { analyzeAndCacheDeckTiers } from '../jobs/deckAnalyzer';
import { analyzePlayerStats } from '../jobs/playerStatsAnalyzer';
import { getTFTDataWithLanguage } from './tftData';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';

// 스케줄러 작업 참조 저장
const scheduledTasks: cron.ScheduledTask[] = [];
let initialDataTimeout: NodeJS.Timeout | null = null;
let testTimeout: NodeJS.Timeout | null = null;

// 패치 노트 비교 함수 (추후 구현 예정)
const compareAndGeneratePatchNotes = (): void => {
    logger.info('패치 노트 비교 기능은 추후 구현 예정입니다.');
};

// 스케줄러 시작 함수 export
export const startScheduler = async (): Promise<void> => {
    logger.info('🚀 스케줄러 초기화를 시작합니다...');
    
    try {
        // 정기 데이터 수집 작업 활성화
        try {
            // 1. 랭커 및 매치 데이터 수집 작업 (6시간마다)
            const rankerDataTask = cron.schedule('0 */6 * * *', async () => { 
                try {
                    if (!isMongoConnected()) {
                        logger.warn('🔄 [Scheduler] MongoDB 연결이 끊어진 상태로 랭커 데이터 수집을 건너뜁니다.');
                        return;
                    }
                    logger.info('🔄 정기 랭커 및 매치 데이터 수집을 시작합니다.');
                    await collectTopRankerMatches();
                    logger.info('✅ 랭커 및 매치 데이터 수집이 완료되었습니다.');
                } catch (_error) {
                    logger.error('❌ 랭커 및 매치 데이터 수집 중 오류:', _error);
                }
            }, { scheduled: true, timezone: "Asia/Seoul" } as any);
            scheduledTasks.push(rankerDataTask);

            // 2. 덱 티어 분석 작업 (6시간마다, 30분 후)
            const deckAnalysisTask = cron.schedule('30 */6 * * *', async () => { 
                try {
                    if (!isMongoConnected()) {
                        logger.warn('🔄 [Scheduler] MongoDB 연결이 끊어진 상태로 덱 티어 분석을 건너뜁니다.');
                        return;
                    }
                    logger.info('🔄 정기 덱 티어 분석을 시작합니다.');
                    await analyzeAndCacheDeckTiers();
                    logger.info('✅ 덱 티어 분석이 완료되었습니다.');
                } catch (_error) {
                    logger.error('❌ 덱 티어 분석 중 오류:', _error);
                }
            }, { scheduled: true, timezone: "Asia/Seoul" } as any);
            scheduledTasks.push(deckAnalysisTask);

            // 3. 랭커 통계 분석 작업 (6시간마다, 1시간 후)
            const playerStatsTask = cron.schedule('0 1,7,13,19 * * *', async () => {
                try {
                    if (!isMongoConnected()) {
                        logger.warn('🔄 [Scheduler] MongoDB 연결이 끊어진 상태로 랭커 통계 분석을 건너뜁니다.');
                        return;
                    }
                    logger.info('🔄 정기 랭커 통계 분석을 시작합니다.');
                    await analyzePlayerStats();
                    logger.info('✅ 랭커 통계 분석이 완료되었습니다.');
                } catch (_error) {
                    logger.error('❌ 랭커 통계 분석 중 오류:', _error);
                }
            }, { scheduled: true, timezone: "Asia/Seoul" } as any);
            scheduledTasks.push(playerStatsTask);

            // 4. 패치 데이터 비교 분석
            const patchAnalysisTask = cron.schedule('20 */12 * * *', () => {
                logger.info('정기 패치 데이터 비교 분석을 시작합니다.');
                compareAndGeneratePatchNotes();
            }, { scheduled: true, timezone: "Asia/Seoul" } as any);
            scheduledTasks.push(patchAnalysisTask);

            logger.info('✅ 모든 정기 데이터 수집 작업이 성공적으로 설정되었습니다.');
            logger.info('📊 스케줄: 랭커 데이터(6시간마다) → 덱 분석(30분 후) → 통계 분석(1시간 후)');
        } catch (jobError) {
            logger.error('작업 스케줄링 중 오류:', jobError);
            logger.warn('기본 스케줄러만 활성화됩니다.');
        }
        
        // 서버 시작 시 즉시 정기 데이터 수집 작업 실행
        logger.info('🚀 서버 시작 시 정기 데이터 수집 작업을 즉시 실행합니다...');
        initialDataTimeout = setTimeout(() => {
            runInitialDataCollection();
        }, 10000); // 10초 후 실행 (서버 완전 시작 대기)
        
        // 개발 환경에서 추가 테스트 실행
        if (process.env.NODE_ENV === 'development') {
            logger.info('개발 환경: 30초 후 테스트 작업을 실행합니다.');
            testTimeout = setTimeout(() => {
                testSchedulerJobs();
            }, 30000); // 30초 후 실행
        }
        
    } catch (_error) {
        logger.error('예약 작업 설정 중 오류 발생:', _error);
        // 에러를 던지지 말고 경고만 출력
        logger.warn('스케줄러 초기화 실패, 서버는 계속 실행됩니다.');
    }
};

// 서버 시작 시 실행할 초기 데이터 수집 함수
const runInitialDataCollection = async (): Promise<void> => {
    try {
        logger.info('🚀 초기 데이터 수집 작업을 시작합니다...');
        
        if (!isMongoConnected()) {
            logger.warn('🔄 MongoDB 연결이 끊어진 상태로 초기 데이터 수집을 건너뜁니다.');
            return;
        }
        
        // 1. 랭커 및 매치 데이터 수집
        try {
            logger.info('🔄 [초기 작업] 랭커 및 매치 데이터 수집을 시작합니다.');
            await collectTopRankerMatches();
            logger.info('✅ [초기 작업] 랭커 및 매치 데이터 수집이 완료되었습니다.');
            
            // 2. 랭커 데이터 수집 완료 후 즉시 덱 티어 분석
            logger.info('🔄 [초기 작업] 덱 티어 분석을 시작합니다.');
            await analyzeAndCacheDeckTiers();
            logger.info('✅ [초기 작업] 덱 티어 분석이 완료되었습니다.');
            
            // 3. 덱 티어 분석 완료 후 즉시 랭커 통계 분석
            logger.info('🔄 [초기 작업] 랭커 통계 분석을 시작합니다.');
            await analyzePlayerStats();
            logger.info('✅ [초기 작업] 랭커 통계 분석이 완료되었습니다.');
            
            logger.info('🎉 모든 초기 데이터 수집 및 분석 작업이 완료되었습니다!');
            
        } catch (_error) {
            logger.error('❌ [초기 작업] 데이터 수집 및 분석 중 오류:', _error);
        }
        
        logger.info('🎯 모든 초기 데이터 수집 작업이 스케줄되었습니다.');
        
    } catch (_error) {
        logger.error('❌ 초기 데이터 수집 중 오류:', _error);
    }
};

// 테스트 함수
const testSchedulerJobs = async (): Promise<void> => {
    try {
        logger.info('🧪 스케줄러 테스트 실행을 시작합니다...');
        
        // TFT 데이터 로딩 테스트
        logger.info('📊 TFT 데이터 로딩 테스트...');
        const tftData = await getTFTDataWithLanguage('ko');
        if (tftData && tftData.champions.length > 0) {
            logger.info(`✅ TFT 데이터 로딩 성공: 챔피언 ${tftData.champions.length}개 로드됨`);
        } else {
            logger.warn('⚠️ TFT 데이터 로딩 실패 또는 데이터 없음');
        }
        
        logger.info('📈 스케줄러 테스트 완료');
    } catch (_error) {
        logger.error('❌ 스케줄러 테스트 중 오류:', _error);
    }
};

// 스케줄러 정리 함수 - 메모리 누수 방지
export const stopScheduler = (): void => {
    logger.info('🛑 스케줄러 정리를 시작합니다...');
    
    // 모든 cron 작업 정리
    scheduledTasks.forEach((task, index) => {
        try {
            task.stop();
            task.destroy();
            logger.info(`✅ 스케줄 작업 ${index + 1} 정리 완료`);
        } catch (error) {
            logger.error(`❌ 스케줄 작업 ${index + 1} 정리 중 오류:`, error);
        }
    });
    
    // 배열 초기화
    scheduledTasks.length = 0;
    
    // 타임아웃 정리
    if (initialDataTimeout) {
        clearTimeout(initialDataTimeout);
        initialDataTimeout = null;
        logger.info('✅ 초기 데이터 수집 타임아웃 정리 완료');
    }
    
    if (testTimeout) {
        clearTimeout(testTimeout);
        testTimeout = null;
        logger.info('✅ 테스트 타임아웃 정리 완료');
    }
    
    logger.info('🏁 스케줄러 정리 완료');
};

// 프로세스 종료 시 자동 정리
process.on('SIGTERM', () => {
    logger.info('SIGTERM 신호 수신, 스케줄러 정리 중...');
    stopScheduler();
});

process.on('SIGINT', () => {
    logger.info('SIGINT 신호 수신, 스케줄러 정리 중...');
    stopScheduler();
});

// 예상치 못한 에러 시 정리
process.on('uncaughtException', (error) => {
    logger.error('예상치 못한 에러 발생:', error);
    stopScheduler();
});

process.on('unhandledRejection', (reason, _promise) => {
    logger.error('처리되지 않은 Promise 거부:', reason);
    stopScheduler();
});