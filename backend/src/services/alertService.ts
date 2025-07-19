// backend/src/services/alertService.ts

import { EventEmitter } from 'events';
import logger from '../config/logger';
import { StructuredError, ErrorSeverity, ErrorCategory } from './errorMonitor';

/**
 * 알림 채널 타입
 */
export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  DISCORD = 'discord'
}

/**
 * 알림 규칙 조건
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    severity?: ErrorSeverity[];
    category?: ErrorCategory[];
    occurrenceThreshold?: number;
    timeWindow?: number; // 분 단위
    messagePattern?: string;
    endpointPattern?: string;
  };
  channels: AlertChannel[];
  cooldown?: number; // 동일 알림 재전송 방지 시간 (분)
  escalation?: {
    delay: number; // 분 단위
    channels: AlertChannel[];
  };
}

/**
 * 알림 메시지
 */
export interface AlertMessage {
  id: string;
  ruleId: string;
  error: StructuredError;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  channels: AlertChannel[];
  status: 'pending' | 'sent' | 'failed' | 'escalated';
  attempts: number;
  lastAttempt?: Date;
  escalated?: boolean;
}

/**
 * 알림 채널 설정
 */
export interface AlertChannelConfig {
  [AlertChannel.EMAIL]: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    recipients: string[];
    from: string;
  };
  [AlertChannel.SLACK]: {
    webhookUrl: string;
    channel: string;
    username: string;
    iconEmoji: string;
  };
  [AlertChannel.WEBHOOK]: {
    url: string;
    method: 'POST' | 'PUT';
    headers: Record<string, string>;
    timeout: number;
  };
  [AlertChannel.SMS]: {
    provider: 'twilio' | 'aws_sns';
    apiKey: string;
    apiSecret: string;
    recipients: string[];
  };
  [AlertChannel.DISCORD]: {
    webhookUrl: string;
    username: string;
    avatarUrl?: string;
  };
}

/**
 * 알림 서비스 클래스
 */
export class AlertService extends EventEmitter {
  private static instance: AlertService;
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: AlertMessage[] = [];
  private cooldownCache: Map<string, Date> = new Map();
  private channelConfigs: Partial<AlertChannelConfig> = {};

  private constructor() {
    super();
    this.setupDefaultRules();
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * 기본 알림 규칙 설정
   */
  private setupDefaultRules(): void {
    // 치명적 에러 즉시 알림
    this.addRule({
      id: 'critical_errors',
      name: '치명적 에러 즉시 알림',
      description: '치명적 에러 발생 시 즉시 모든 채널로 알림',
      enabled: true,
      conditions: {
        severity: [ErrorSeverity.CRITICAL],
        occurrenceThreshold: 1
      },
      channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
      cooldown: 5,
      escalation: {
        delay: 15,
        channels: [AlertChannel.SMS]
      }
    });

    // 높은 심각도 에러 알림
    this.addRule({
      id: 'high_severity_errors',
      name: '높은 심각도 에러 알림',
      description: '높은 심각도 에러가 5분 내 3번 이상 발생 시 알림',
      enabled: true,
      conditions: {
        severity: [ErrorSeverity.HIGH],
        occurrenceThreshold: 3,
        timeWindow: 5
      },
      channels: [AlertChannel.SLACK],
      cooldown: 10
    });

    // 데이터베이스 에러 알림
    this.addRule({
      id: 'database_errors',
      name: '데이터베이스 에러 알림',
      description: '데이터베이스 관련 에러 발생 시 알림',
      enabled: true,
      conditions: {
        category: [ErrorCategory.DATABASE],
        occurrenceThreshold: 2,
        timeWindow: 10
      },
      channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
      cooldown: 15
    });

    // API 에러 급증 알림
    this.addRule({
      id: 'api_error_spike',
      name: 'API 에러 급증 알림',
      description: 'API 에러가 10분 내 20번 이상 발생 시 알림',
      enabled: true,
      conditions: {
        category: [ErrorCategory.API],
        occurrenceThreshold: 20,
        timeWindow: 10
      },
      channels: [AlertChannel.SLACK],
      cooldown: 30
    });

    // 보안 에러 알림
    this.addRule({
      id: 'security_errors',
      name: '보안 에러 알림',
      description: '보안 관련 에러 발생 시 즉시 알림',
      enabled: true,
      conditions: {
        category: [ErrorCategory.SECURITY],
        occurrenceThreshold: 1
      },
      channels: [AlertChannel.SLACK, AlertChannel.EMAIL],
      cooldown: 5
    });
  }

  /**
   * 알림 규칙 추가
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`알림 규칙 추가: ${rule.name}`, { ruleId: rule.id });
  }

  /**
   * 알림 규칙 제거
   */
  removeRule(ruleId: string): boolean {
    const success = this.rules.delete(ruleId);
    if (success) {
      logger.info(`알림 규칙 제거: ${ruleId}`);
    }
    return success;
  }

  /**
   * 알림 규칙 업데이트
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    logger.info(`알림 규칙 업데이트: ${ruleId}`, { updates });
    return true;
  }

  /**
   * 알림 규칙 목록 조회
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 채널 설정 업데이트
   */
  updateChannelConfig<T extends AlertChannel>(
    channel: T,
    config: AlertChannelConfig[T]
  ): void {
    this.channelConfigs[channel] = config;
    logger.info(`알림 채널 설정 업데이트: ${channel}`);
  }

  /**
   * 에러 발생 시 알림 처리
   */
  async processError(error: StructuredError): Promise<void> {
    try {
      const applicableRules = this.findApplicableRules(error);
      
      for (const rule of applicableRules) {
        if (this.shouldSkipDueToCooldown(rule.id, error.fingerprint)) {
          continue;
        }

        const alert = this.createAlert(rule, error);
        await this.sendAlert(alert);
      }
    } catch (err) {
      logger.error('알림 처리 중 오류 발생:', err);
    }
  }

  /**
   * 적용 가능한 알림 규칙 찾기
   */
  private findApplicableRules(error: StructuredError): AlertRule[] {
    const applicableRules: AlertRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const conditions = rule.conditions;
      let matches = true;

      // 심각도 조건 확인
      if (conditions.severity && !conditions.severity.includes(error.severity)) {
        matches = false;
      }

      // 카테고리 조건 확인
      if (conditions.category && !conditions.category.includes(error.category)) {
        matches = false;
      }

      // 메시지 패턴 조건 확인
      if (conditions.messagePattern) {
        const regex = new RegExp(conditions.messagePattern, 'i');
        if (!regex.test(error.message)) {
          matches = false;
        }
      }

      // 엔드포인트 패턴 조건 확인
      if (conditions.endpointPattern && error.context.endpoint) {
        const regex = new RegExp(conditions.endpointPattern, 'i');
        if (!regex.test(error.context.endpoint)) {
          matches = false;
        }
      }

      // 발생 횟수 및 시간 창 조건 확인
      if (conditions.occurrenceThreshold && conditions.timeWindow) {
        const threshold = conditions.occurrenceThreshold;
        const timeWindow = conditions.timeWindow * 60 * 1000; // 밀리초로 변환
        const cutoff = new Date(Date.now() - timeWindow);

        const recentOccurrences = this.alertHistory.filter(alert => 
          alert.error.fingerprint === error.fingerprint && 
          alert.timestamp >= cutoff
        ).length;

        if (recentOccurrences < threshold) {
          matches = false;
        }
      }

      if (matches) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * 쿨다운 확인
   */
  private shouldSkipDueToCooldown(ruleId: string, fingerprint: string): boolean {
    const cooldownKey = `${ruleId}:${fingerprint}`;
    const lastAlert = this.cooldownCache.get(cooldownKey);
    
    if (!lastAlert) return false;

    const rule = this.rules.get(ruleId);
    if (!rule || !rule.cooldown) return false;

    const cooldownPeriod = rule.cooldown * 60 * 1000; // 밀리초로 변환
    const timeSinceLastAlert = Date.now() - lastAlert.getTime();

    return timeSinceLastAlert < cooldownPeriod;
  }

  /**
   * 알림 메시지 생성
   */
  private createAlert(rule: AlertRule, error: StructuredError): AlertMessage {
    const severity = this.mapErrorSeverityToAlertSeverity(error.severity);
    const title = this.generateAlertTitle(rule, error);
    const message = this.generateAlertMessage(rule, error);

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      error,
      severity,
      title,
      message,
      timestamp: new Date(),
      channels: rule.channels,
      status: 'pending',
      attempts: 0
    };
  }

  /**
   * 에러 심각도를 알림 심각도로 매핑
   */
  private mapErrorSeverityToAlertSeverity(severity: ErrorSeverity): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'low';
      case ErrorSeverity.MEDIUM: return 'medium';
      case ErrorSeverity.HIGH: return 'high';
      case ErrorSeverity.CRITICAL: return 'critical';
      default: return 'medium';
    }
  }

  /**
   * 알림 제목 생성
   */
  private generateAlertTitle(rule: AlertRule, error: StructuredError): string {
    const severityEmoji = {
      [ErrorSeverity.LOW]: '🟡',
      [ErrorSeverity.MEDIUM]: '🟠',
      [ErrorSeverity.HIGH]: '🔴',
      [ErrorSeverity.CRITICAL]: '🚨'
    };

    return `${severityEmoji[error.severity]} [${error.category.toUpperCase()}] ${rule.name}`;
  }

  /**
   * 알림 메시지 생성
   */
  private generateAlertMessage(_rule: AlertRule, error: StructuredError): string {
    const lines = [
      `**에러 메시지:** ${error.message}`,
      `**심각도:** ${error.severity}`,
      `**카테고리:** ${error.category}`,
      `**발생 횟수:** ${error.occurrenceCount}회`,
      `**마지막 발생:** ${error.timestamp.toLocaleString('ko-KR')}`,
    ];

    if (error.context.endpoint) {
      lines.push(`**엔드포인트:** ${error.context.method || 'GET'} ${error.context.endpoint}`);
    }

    if (error.context.userId) {
      lines.push(`**사용자 ID:** ${error.context.userId}`);
    }

    if (error.context.ip) {
      lines.push(`**IP 주소:** ${error.context.ip}`);
    }

    lines.push(`**에러 ID:** ${error.fingerprint}`);
    lines.push(`**발생 시간:** ${error.timestamp.toISOString()}`);

    if (error.tags.length > 0) {
      lines.push(`**태그:** ${error.tags.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * 알림 전송
   */
  private async sendAlert(alert: AlertMessage): Promise<void> {
    alert.attempts++;
    alert.lastAttempt = new Date();
    alert.status = 'pending';

    try {
      const sendPromises = alert.channels.map(channel => 
        this.sendToChannel(channel, alert)
      );

      await Promise.allSettled(sendPromises);
      alert.status = 'sent';
      
      // 쿨다운 캐시 업데이트
      const cooldownKey = `${alert.ruleId}:${alert.error.fingerprint}`;
      this.cooldownCache.set(cooldownKey, new Date());

      logger.info(`알림 전송 완료: ${alert.id}`, {
        ruleId: alert.ruleId,
        channels: alert.channels,
        severity: alert.severity
      });

      // 에스컬레이션 설정이 있다면 스케줄링
      const rule = this.rules.get(alert.ruleId);
      if (rule?.escalation && alert.severity === 'critical') {
        this.scheduleEscalation(alert, rule.escalation);
      }

    } catch (error) {
      alert.status = 'failed';
      logger.error(`알림 전송 실패: ${alert.id}`, error);
    }

    // 히스토리에 추가
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 1000) {
      this.alertHistory.pop();
    }

    this.emit('alert_sent', alert);
  }

  /**
   * 특정 채널로 알림 전송
   */
  private async sendToChannel(channel: AlertChannel, alert: AlertMessage): Promise<void> {
    const config = this.channelConfigs[channel];
    if (!config) {
      logger.warn(`알림 채널 설정이 없습니다: ${channel}`);
      return;
    }

    try {
      switch (channel) {
        case AlertChannel.SLACK:
          await this.sendSlackMessage(config as AlertChannelConfig[AlertChannel.SLACK], alert);
          break;
        case AlertChannel.EMAIL:
          await this.sendEmailMessage(config as AlertChannelConfig[AlertChannel.EMAIL], alert);
          break;
        case AlertChannel.WEBHOOK:
          await this.sendWebhookMessage(config as AlertChannelConfig[AlertChannel.WEBHOOK], alert);
          break;
        case AlertChannel.DISCORD:
          await this.sendDiscordMessage(config as AlertChannelConfig[AlertChannel.DISCORD], alert);
          break;
        default:
          logger.warn(`지원하지 않는 알림 채널: ${channel}`);
      }
    } catch (error) {
      logger.error(`${channel} 알림 전송 실패:`, error);
      throw error;
    }
  }

  /**
   * Slack 메시지 전송 (예시)
   */
  private async sendSlackMessage(config: AlertChannelConfig[AlertChannel.SLACK], alert: AlertMessage): Promise<void> {
    logger.info(`Slack 알림 전송 시뮬레이션: ${alert.id}`, {
      channel: config.channel,
      title: alert.title
    });
  }

  /**
   * 이메일 메시지 전송 (예시)
   */
  private async sendEmailMessage(config: AlertChannelConfig[AlertChannel.EMAIL], alert: AlertMessage): Promise<void> {
    logger.info(`이메일 알림 전송 시뮬레이션: ${alert.id}`, {
      recipients: config.recipients,
      subject: alert.title
    });
  }

  /**
   * 웹훅 메시지 전송 (예시)
   */
  private async sendWebhookMessage(config: AlertChannelConfig[AlertChannel.WEBHOOK], alert: AlertMessage): Promise<void> {
    logger.info(`웹훅 알림 전송 시뮬레이션: ${alert.id}`, {
      url: config.url,
      method: config.method
    });
  }

  /**
   * Discord 메시지 전송 (예시)
   */
  private async sendDiscordMessage(config: AlertChannelConfig[AlertChannel.DISCORD], alert: AlertMessage): Promise<void> {
    logger.info(`Discord 알림 전송 시뮬레이션: ${alert.id}`, {
      webhookUrl: config.webhookUrl,
      username: config.username
    });
  }

  /**
   * 에스컬레이션 스케줄링
   */
  private scheduleEscalation(alert: AlertMessage, escalation: NonNullable<AlertRule['escalation']>): void {
    setTimeout(async () => {
      // 에러가 아직 해결되지 않은 경우에만 에스컬레이션
      if (!alert.error.resolved) {
        const escalatedAlert = {
          ...alert,
          id: `escalated_${alert.id}`,
          channels: escalation.channels,
          escalated: true,
          timestamp: new Date()
        };

        await this.sendAlert(escalatedAlert);
        logger.info(`알림 에스컬레이션 실행: ${alert.id}`);
      }
    }, escalation.delay * 60 * 1000);
  }

  /**
   * 알림 히스토리 조회
   */
  getAlertHistory(limit: number = 100): AlertMessage[] {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * 알림 통계 조회
   */
  getAlertStats(timeRange: { start: Date; end: Date }): {
    totalAlerts: number;
    alertsByChannel: Record<AlertChannel, number>;
    alertsBySeverity: Record<string, number>;
    alertsByRule: Record<string, number>;
  } {
    const filteredAlerts = this.alertHistory.filter(alert => 
      alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end
    );

    const alertsByChannel = {} as Record<AlertChannel, number>;
    const alertsBySeverity = {} as Record<string, number>;
    const alertsByRule = {} as Record<string, number>;

    Object.values(AlertChannel).forEach(channel => {
      alertsByChannel[channel] = 0;
    });

    filteredAlerts.forEach(alert => {
      alert.channels.forEach(channel => {
        alertsByChannel[channel]++;
      });

      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByRule[alert.ruleId] = (alertsByRule[alert.ruleId] || 0) + 1;
    });

    return {
      totalAlerts: filteredAlerts.length,
      alertsByChannel,
      alertsBySeverity,
      alertsByRule
    };
  }

  /**
   * 활성 알림 조회
   */
  getActiveAlerts(limit: number = 50): AlertMessage[] {
    return this.alertHistory
      .filter(alert => alert.status === 'pending' || alert.status === 'escalated')
      .slice(0, limit);
  }

  /**
   * 알림 해결 처리
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.status = 'sent';
    alert.error.resolved = true;
    logger.info(`알림 해결 처리: ${alertId}`);
    return true;
  }

  /**
   * 알림 규칙 설정 조회
   */
  getAlertConfigs(): AlertRule[] {
    return this.getRules();
  }

  /**
   * 알림 규칙 설정 업데이트
   */
  updateAlertConfig(ruleId: string, config: Partial<AlertRule>): boolean {
    return this.updateRule(ruleId, config);
  }

  /**
   * 메모리 정리
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7일 전
    
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
    
    for (const [key, timestamp] of this.cooldownCache.entries()) {
      if (timestamp < cutoff) {
        this.cooldownCache.delete(key);
      }
    }
  }
}

// 글로벌 알림 서비스 인스턴스
export const alertService = AlertService.getInstance();

export default alertService;