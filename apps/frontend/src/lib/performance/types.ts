export type PerformanceTestType = 'LOAD' | 'STRESS' | 'SPIKE' | 'SOAK' | 'SMOKE';
export type PerformanceTestStatus = 'DRAFT' | 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PerformanceTest {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  environmentId: string;
  userId: string;
  testType: PerformanceTestType;
  status: PerformanceTestStatus;
  script: string;
  scriptPath?: string;
  config?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  tags: string[];
  isScheduled: boolean;
  schedule?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  totalIterations: number;
  totalRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgThroughput: number;
  errorRate: number;
  maxVus: number;
  reportUrl?: string;
  summary?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  environment?: { id: string; name: string };
}

export interface PerformanceMetric {
  id: string;
  testId: string;
  timestamp: string;
  metricType: string;
  metricName: string;
  value: number;
  tags?: Record<string, string>;
}

export interface ThresholdAlert {
  id: string;
  testId?: string;
  projectId: string;
  name: string;
  metricType: string;
  condition: string;
  threshold: number;
  comparison: string;
  severity: string;
  isEnabled: boolean;
  lastTriggered?: string;
  triggeredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  testId?: string;
  projectId: string;
  metricValue: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  alert?: { name: string; metricType: string; severity: string };
}

export interface DashboardStats {
  totalTests: number;
  testsByStatus: Record<PerformanceTestStatus, number>;
  testsByType: Record<string, { count: number; avgResponse: number; avgError: number }>;
  recentTests: PerformanceTest[];
  activeTests: PerformanceTest[];
  overallStats: { avgResponseTime: number; avgErrorRate: number };
}

export interface CreateTestDto {
  name: string;
  description?: string;
  projectId: string;
  environmentId: string;
  testType?: PerformanceTestType;
  script: string;
  config?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  tags?: string[];
  isScheduled?: boolean;
  schedule?: string;
}