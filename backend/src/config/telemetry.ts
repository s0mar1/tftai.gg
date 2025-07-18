// backend/src/config/telemetry.ts - OpenTelemetry 설정
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import logger from './logger';

// 환경 변수 설정
const serviceName = process.env.OTEL_SERVICE_NAME || 'tft-meta-analyzer-backend';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';
const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
const prometheusPort = parseInt(process.env.PROMETHEUS_PORT || '9090', 10);

// OpenTelemetry 리소스 정의
const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion,
  'service.environment': environment,
  'service.instance.id': process.env.HOSTNAME || 'localhost',
  'tft.analyzer.region': process.env.TFT_REGION || 'kr',
  'tft.analyzer.patch': process.env.TFT_PATCH || 'current',
});

// 트레이스 익스포터 설정
const traceExporter = new OTLPTraceExporter({
  url: jaegerEndpoint,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 메트릭 익스포터 설정
const prometheusExporter = new PrometheusExporter({
  port: prometheusPort,
  preventServerStart: false,
}, () => {
  logger.info(`🔍 Prometheus metrics server started on port ${prometheusPort}`);
});

// Prometheus 익스포터 초기화 (실제 사용)
prometheusExporter.startServer();

// OTLP 메트릭 익스포터 (선택적)
const otlpMetricExporter = new OTLPMetricExporter({
  url: process.env.OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

// 메트릭 리더 설정
const metricReader = new PeriodicExportingMetricReader({
  exporter: otlpMetricExporter,
  exportIntervalMillis: 5000, // 5초마다 메트릭 내보내기
});

// SDK 초기화
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        requestHook: (span, requestInfo) => {
          // Express 요청에 추가 정보 설정
          span.setAttributes({
            'http.route': requestInfo.route || 'unknown',
            'tft.endpoint.category': getTFTEndpointCategory(requestInfo.route),
          });
        },
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span: any, requestInfo: any) => {
          // HTTP 요청에 외부 API 분류 정보 추가
          const url = requestInfo?.url;
          if (url && typeof url === 'string') {
            if (url.includes('riotgames.com')) {
              span.setAttributes({
                'tft.api.type': 'riot',
                'tft.api.region': extractRegionFromUrl(url),
              });
            } else if (url.includes('googleapis.com')) {
              span.setAttributes({
                'tft.api.type': 'google_ai',
                'tft.ai.model': extractModelFromUrl(url),
              });
            }
          }
        },
      },
      '@opentelemetry/instrumentation-mongoose': {
        enabled: true,
        // Remove requestHook as it's not supported in the current version
      },
      '@opentelemetry/instrumentation-ioredis': {
        enabled: true,
        requestHook: (span: any, requestInfo: any) => {
          // Redis 캐시에 TFT 캐시 레이어 정보 추가
          const command = requestInfo?.command;
          const args = requestInfo?.args;
          span.setAttributes({
            'tft.cache.layer': command === 'get' ? 'L2' : 'L2',
            'tft.cache.key_type': getCacheKeyType(args?.[0] || ''),
          });
        },
      },
      '@opentelemetry/instrumentation-winston': {
        enabled: true,
      },
    }),
  ],
});

// 헬퍼 함수들
function getTFTEndpointCategory(route?: string): string {
  if (!route) return 'unknown';
  
  if (route.includes('/summoner')) return 'summoner';
  if (route.includes('/ai')) return 'ai_analysis';
  if (route.includes('/match')) return 'match_data';
  if (route.includes('/tierlist')) return 'tierlist';
  if (route.includes('/ranking')) return 'ranking';
  if (route.includes('/static-data')) return 'static_data';
  if (route.includes('/cache')) return 'cache_management';
  if (route.includes('/health')) return 'health_check';
  
  return 'other';
}

function extractRegionFromUrl(url: string): string {
  const match = url.match(/https:\/\/([^.]+)\.api\.riotgames\.com/);
  return match?.[1] || 'unknown';
}

function extractModelFromUrl(url: string): string {
  if (url.includes('gemini')) return 'gemini';
  if (url.includes('gpt')) return 'gpt';
  return 'unknown';
}

function getCacheKeyType(key: string): string {
  if (key.includes('summoner')) return 'summoner_data';
  if (key.includes('match')) return 'match_data';
  if (key.includes('ai_analysis')) return 'ai_analysis';
  if (key.includes('tierlist')) return 'tierlist';
  if (key.includes('meta')) return 'meta_data';
  if (key.includes('translation')) return 'translation';
  if (key.includes('tft_data')) return 'tft_static_data';
  
  return 'other';
}

// SDK 초기화
export function initializeTelemetry(): void {
  try {
    sdk.start();
    logger.info('🔍 OpenTelemetry SDK initialized successfully');
    logger.info(`📊 Service: ${serviceName}@${serviceVersion} (${environment})`);
    logger.info(`🔍 Prometheus metrics: http://localhost:${prometheusPort}/metrics`);
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry SDK:', error);
    throw error;
  }
}

// 애플리케이션 종료 시 정리
export function shutdownTelemetry(): Promise<void> {
  return sdk.shutdown();
}

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  shutdownTelemetry()
    .then(() => logger.info('OpenTelemetry SDK shutdown complete'))
    .catch(error => logger.error('Error during OpenTelemetry SDK shutdown:', error));
});

export default sdk;