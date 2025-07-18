// 알림 시스템 타입 정의
export interface AlertConfig {
  id: string;
  name: string;
  type: 'error_rate' | 'performance' | 'cache_efficiency' | 'api_health';
  threshold: number;
  enabled: boolean;
  cooldownMinutes: number;
  channels: AlertChannel[];
  conditions: AlertCondition[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  timeWindowMinutes: number;
}

export interface AlertChannel {
  type: 'console' | 'email' | 'webhook' | 'slack';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  configId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
  status: 'active' | 'resolved' | 'suppressed';
}

export interface AlertNotification {
  alert: Alert;
  channels: AlertChannel[];
  retryCount: number;
  lastSentAt?: Date;
  nextRetryAt?: Date;
}

export interface AlertHistory {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: Alert[];
  resolved: Alert[];
}

export interface DashboardData {
  timestamp: Date;
  uptime: number;
  system: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  performance: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowRequests: number;
    performanceScore: number;
  };
  cache: {
    totalHitRate: number;
    memoryUsage: number;
    evictionRate: number;
    efficiency: number;
  };
  api: {
    totalCalls: number;
    successRate: number;
    avgLatency: number;
    circuitBreakers: Record<string, string>;
  };
  alerts: {
    active: Alert[];
    recentCount: number;
    criticalCount: number;
    history: AlertHistory;
  };
}