import cron from 'node-cron';
import { collectTopRankerMatches } from '../jobs/matchCollector';
import { analyzeAndCacheDeckTiers } from '../jobs/deckAnalyzer';
import { analyzePlayerStats } from '../jobs/playerStatsAnalyzer';
import { getTFTDataWithLanguage } from './tftData';
import { isMongoConnected } from '../config/db';
import logger from '../config/logger';

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
            cron.schedule('0 */6 * * *', async () => { 
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

            // 2. 덱 티어 분석 작업 (6시간마다, 30분 후)
            cron.schedule('30 */6 * * *', async () => { 
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

            // 3. 랭커 통계 분석 작업 (6시간마다, 1시간 후)
            cron.schedule('0 1,7,13,19 * * *', async () => {
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

            // 4. 패치 데이터 비교 분석
            cron.schedule('20 */12 * * *', () => {
                logger.info('정기 패치 데이터 비교 분석을 시작합니다.');
                compareAndGeneratePatchNotes();
            }, { scheduled: true, timezone: "Asia/Seoul" } as any);

            logger.info('✅ 모든 정기 데이터 수집 작업이 성공적으로 설정되었습니다.');
            logger.info('📊 스케줄: 랭커 데이터(6시간마다) → 덱 분석(30분 후) → 통계 분석(1시간 후)');
        } catch (jobError) {
            logger.error('작업 스케줄링 중 오류:', jobError);
            logger.warn('기본 스케줄러만 활성화됩니다.');
        }
        
        // 개발 환경에서 즉시 테스트 실행
        if (process.env.NODE_ENV === 'development') {
            logger.info('개발 환경: 30초 후 테스트 작업을 실행합니다.');
            setTimeout(() => {
                testSchedulerJobs();
            }, 30000); // 30초 후 실행
        }
        
    } catch (_error) {
        logger.error('예약 작업 설정 중 오류 발생:', _error);
        // 에러를 던지지 말고 경고만 출력
        logger.warn('스케줄러 초기화 실패, 서버는 계속 실행됩니다.');
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