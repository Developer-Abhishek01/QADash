import { Logger } from '../utils/logger';

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TrendData {
  period: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  avgDuration: number;
}

export interface ExecutionMetrics {
  executionId: string;
  projectId: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  browser: string;
  environment: string;
}

export interface DefectData {
  testId: string;
  testName: string;
  errorType: string;
  errorMessage: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface BrowserAnalytics {
  browser: string;
  version?: string;
  totalExecutions: number;
  passRate: number;
  avgDuration: number;
  failureReasons: { reason: string; count: number }[];
}

export interface EnvironmentAnalytics {
  environment: string;
  type: string;
  totalExecutions: number;
  passRate: number;
  avgDuration: number;
  reliability: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
  tests: number;
}

export interface AiInsight {
  type: 'flaky' | 'slow' | 'pattern' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  affectedTests: string[];
  suggestedAction?: string;
}

export class AnalyticsDataClient {
  private logger: Logger;
  private backendUrl: string;
  private apiKey?: string;

  constructor(backendUrl?: string, _logger?: Logger) {
    this.logger = _logger || new Logger('AnalyticsClient');
    this.backendUrl = backendUrl || process.env.ANALYTICS_API_URL || '';
    this.apiKey = process.env.ANALYTICS_API_KEY;
    if (!this.backendUrl) {
      this.logger.warn('ANALYTICS_API_URL not set. Set it to point to the backend /api/v1/analytics endpoint.');
    }
  }

  private async request<T>(path: string, options?: { params?: Record<string, unknown>; signal?: AbortSignal }): Promise<T> {
    if (!this.backendUrl) {
      throw new Error('ANALYTICS_API_URL not configured. Set ANALYTICS_API_URL env var to enable analytics.');
    }
    const url = new URL(path, this.backendUrl);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}) },
      signal: options?.signal,
    });
    if (!res.ok) {
      throw new Error(`Analytics API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getPassFailTrends(projectId: string, days = 30): Promise<TrendData[]> {
    return this.request<TrendData[]>('analytics/trends', { params: { projectId, days } });
  }

  async getExecutionTrends(projectId: string, days = 30): Promise<TimeSeriesDataPoint[]> {
    return this.request<TimeSeriesDataPoint[]>('analytics/execution-trends', { params: { projectId, days } });
  }

  async getDefectDensity(projectId: string, days = 30): Promise<DefectData[]> {
    return this.request<DefectData[]>('analytics/defects', { params: { projectId, days } });
  }

  async getBrowserAnalytics(projectId: string): Promise<BrowserAnalytics[]> {
    return this.request<BrowserAnalytics[]>('analytics/browsers', { params: { projectId } });
  }

  async getEnvironmentAnalytics(projectId: string): Promise<EnvironmentAnalytics[]> {
    return this.request<EnvironmentAnalytics[]>('analytics/environments', { params: { projectId } });
  }

  async getExecutionHeatmap(projectId: string): Promise<HeatmapCell[]> {
    return this.request<HeatmapCell[]>('analytics/heatmap', { params: { projectId } });
  }

  async getAiInsights(projectId: string): Promise<AiInsight[]> {
    return this.request<AiInsight[]>('analytics/ai-insights', { params: { projectId } });
  }

  async getExecutionDetails(executionId: string): Promise<ExecutionMetrics | null> {
    return this.request<ExecutionMetrics | null>(`analytics/executions/${executionId}`);
  }

  async getTopFailures(projectId: string, limit = 10): Promise<{ testName: string; failureCount: number; trend: 'up' | 'down' | 'stable' }[]> {
    return this.request<{ testName: string; failureCount: number; trend: 'up' | 'down' | 'stable' }[]>('analytics/top-failures', { params: { projectId, limit } });
  }

  async getTestCoverage(projectId: string): Promise<{ feature: string; covered: number; total: number; percentage: number }[]> {
    return this.request<{ feature: string; covered: number; total: number; percentage: number }[]>('analytics/coverage', { params: { projectId } });
  }

  async getReliabilityScore(projectId: string): Promise<{ score: number; grade: string; factors: { name: string; impact: number }[] }> {
    return this.request<{ score: number; grade: string; factors: { name: string; impact: number }[] }>('analytics/reliability', { params: { projectId } });
  }
}

export const analyticsClient = new AnalyticsDataClient();
