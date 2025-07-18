// 알림 채널 구현
import { AlertChannel, Alert } from '../types/alerts';
import logger from '../config/logger';

export interface NotificationResult {
  success: boolean;
  channel: string;
  message?: string;
  error?: string;
}

export class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.registerChannel('console', new ConsoleChannel());
    this.registerChannel('email', new EmailChannel());
    this.registerChannel('webhook', new WebhookChannel());
    this.registerChannel('slack', new SlackChannel());
  }

  registerChannel(type: string, channel: NotificationChannel): void {
    this.channels.set(type, channel);
  }

  async sendNotification(alert: Alert, channels: AlertChannel[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channelConfig of channels) {
      if (!channelConfig.enabled) {
        continue;
      }

      const channel = this.channels.get(channelConfig.type);
      if (!channel) {
        results.push({
          success: false,
          channel: channelConfig.type,
          error: `Channel type ${channelConfig.type} not found`
        });
        continue;
      }

      try {
        const result = await channel.send(alert, channelConfig.config);
        results.push({
          success: true,
          channel: channelConfig.type,
          message: result
        });
      } catch (error) {
        results.push({
          success: false,
          channel: channelConfig.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

export interface NotificationChannel {
  send(alert: Alert, config: Record<string, any>): Promise<string>;
}

export class ConsoleChannel implements NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<string> {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };

    const message = `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}`;
    
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.error(message, alert.metadata);
    } else if (alert.severity === 'medium') {
      logger.warn(message, alert.metadata);
    } else {
      logger.info(message, alert.metadata);
    }

    return 'Console notification sent';
  }
}

export class EmailChannel implements NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<string> {
    // 실제 이메일 전송 로직을 구현할 수 있습니다
    // 여기서는 시뮬레이션만 합니다
    logger.info(`이메일 전송 시뮬레이션: ${config.to}`, {
      subject: `[TFT Meta Analyzer] ${alert.title}`,
      body: alert.message,
      severity: alert.severity
    });

    return `Email sent to ${config.to}`;
  }
}

export class WebhookChannel implements NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<string> {
    // 실제 웹훅 전송 로직을 구현할 수 있습니다
    // 여기서는 시뮬레이션만 합니다
    logger.info(`웹훅 전송 시뮬레이션: ${config.url}`, {
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp
      }
    });

    return `Webhook sent to ${config.url}`;
  }
}

export class SlackChannel implements NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<string> {
    // 실제 Slack 전송 로직을 구현할 수 있습니다
    // 여기서는 시뮬레이션만 합니다
    const colorMap = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    };

    logger.info(`Slack 전송 시뮬레이션: ${config.channel}`, {
      channel: config.channel,
      attachments: [{
        color: colorMap[alert.severity],
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Timestamp', value: alert.timestamp.toISOString(), short: true }
        ]
      }]
    });

    return `Slack message sent to ${config.channel}`;
  }
}

export const notificationManager = new NotificationManager();