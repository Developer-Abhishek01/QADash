import { AnalyticsDataClient, TrendData, DefectData, BrowserAnalytics, EnvironmentAnalytics, HeatmapCell, AiInsight, ExecutionMetrics } from './analytics-client';
import { Logger } from '../utils/logger';

export interface FilterOptions {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  browser?: string;
  environment?: string;
  testStatus?: string;
  minDuration?: number;
  maxDuration?: number;
}

export interface DrillDownParams {
  level: 'project' | 'execution' | 'test';
  parentId: string;
  filters?: FilterOptions;
}

export interface AnalyticsQuery {
  type: 'trends' | 'defects' | 'browsers' | 'environments' | 'heatmap' | 'ai' | 'coverage' | 'reliability';
  filters?: FilterOptions;
  limit?: number;
  offset?: number;
}

export class AnalyticsService {
  private logger: Logger;
  private dataClient: AnalyticsDataClient;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('AnalyticsService');
    this.dataClient = new AnalyticsDataClient();
  }

  async query(analyticsQuery: AnalyticsQuery): Promise<unknown> {
    const cacheKey = JSON.stringify(analyticsQuery);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const result = await this.executeQuery(analyticsQuery);
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  private async executeQuery(query: AnalyticsQuery): Promise<unknown> {
    const filters = query.filters || {};

    switch (query.type) {
      case 'trends':
        return this.getTrends(filters, query.limit);
      case 'defects':
        return this.getDefects(filters, query.limit);
      case 'browsers':
        return this.getBrowserAnalytics(filters);
      case 'environments':
        return this.getEnvironmentAnalytics(filters);
      case 'heatmap':
        return this.getHeatmap(filters);
      case 'ai':
        return this.getAiInsights(filters);
      case 'coverage':
        return this.getCoverage(filters);
      case 'reliability':
        return this.getReliability(filters);
      default:
        throw new Error(`Unknown query type: ${query.type}`);
    }
  }

  private async getTrends(filters: FilterOptions, limit?: number): Promise<TrendData[]> {
    const trends = await this.dataClient.getPassFailTrends(filters.projectId || '', 30);
    return limit ? trends.slice(-limit) : trends;
  }

  private async getDefects(filters: FilterOptions, limit?: number): Promise<DefectData[]> {
    const defects = await this.dataClient.getDefectDensity(filters.projectId || '', 30);
    return limit ? defects.slice(0, limit) : defects;
  }

  private async getBrowserAnalytics(filters: FilterOptions): Promise<BrowserAnalytics[]> {
    return this.dataClient.getBrowserAnalytics(filters.projectId || '');
  }

  private async getEnvironmentAnalytics(filters: FilterOptions): Promise<EnvironmentAnalytics[]> {
    return this.dataClient.getEnvironmentAnalytics(filters.projectId || '');
  }

  private async getHeatmap(filters: FilterOptions): Promise<HeatmapCell[]> {
    return this.dataClient.getExecutionHeatmap(filters.projectId || '');
  }

  private async getAiInsights(filters: FilterOptions): Promise<AiInsight[]> {
    return this.dataClient.getAiInsights(filters.projectId || '');
  }

  private async getCoverage(filters: FilterOptions): Promise<{ feature: string; covered: number; total: number; percentage: number }[]> {
    return this.dataClient.getTestCoverage(filters.projectId || '');
  }

  private async getReliability(filters: FilterOptions): Promise<{ score: number; grade: string; factors: { name: string; impact: number }[] }> {
    return this.dataClient.getReliabilityScore(filters.projectId || '');
  }

  async drillDown(params: DrillDownParams): Promise<unknown> {
    this.logger.info(`Drilling down: ${params.level} - ${params.parentId}`);

    switch (params.level) {
      case 'project':
        return this.getProjectDrillDown(params.parentId, params.filters);
      case 'execution':
        return this.getExecutionDrillDown(params.parentId);
      case 'test':
        return this.getTestDrillDown(params.parentId);
      default:
        throw new Error(`Unknown drill-down level: ${params.level}`);
    }
  }

  private async getProjectDrillDown(projectId: string, _filters?: FilterOptions): Promise<unknown> {
    const [trends, browsers, environments, defects] = await Promise.all([
      this.query({ type: 'trends', filters: { projectId } }),
      this.query({ type: 'browsers', filters: { projectId } }),
      this.query({ type: 'environments', filters: { projectId } }),
      this.query({ type: 'defects', filters: { projectId } }),
    ]);

    return {
      summary: {
        totalExecutions: Array.isArray(trends) ? trends.length : 0,
        totalTests: 0,
        avgPassRate: 0,
      },
      trends,
      browsers,
      environments,
      topDefects: Array.isArray(defects) ? defects.slice(0, 10) : [],
    };
  }

  private async getExecutionDrillDown(executionId: string): Promise<ExecutionMetrics | null> {
    const execution = await this.dataClient.getExecutionDetails(executionId);
    return execution;
  }

  private async getTestDrillDown(testId: string): Promise<{ testId: string; name: string; recentRuns: unknown[]; errorHistory: unknown[] }> {
    return {
      testId,
      name: `Test ${testId}`,
      recentRuns: [],
      errorHistory: [],
    };
  }

  filterResults(data: Record<string, unknown>[], filters: FilterOptions): Record<string, unknown>[] {
    let filtered = [...data];

    if (filters.browser) {
      filtered = filtered.filter((item) => item.browser === filters.browser);
    }

    if (filters.environment) {
      filtered = filtered.filter((item) => item.environment === filters.environment);
    }

    if (filters.testStatus) {
      filtered = filtered.filter((item) => item.status === filters.testStatus);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter((item) => new Date(item.date as string) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter((item) => new Date(item.date as string) <= end);
    }

    return filtered;
  }

  async exportData(query: AnalyticsQuery, format: 'json' | 'csv' | 'pdf'): Promise<string> {
    const data = await this.query(query);

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCsv(data);
      case 'pdf':
        return 'PDF export requires additional library';
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCsv(data: unknown): string {
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as Record<string, unknown>;
      const headers = Object.keys(first);
      const rows = (data as Record<string, unknown>[]).map(item =>
        headers.map(h => JSON.stringify(item[h] || '')).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
    return '';
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.info('Analytics cache cleared');
  }

  optimizeForLargeDataset(data: unknown[], limit = 1000, page = 1): { data: unknown[]; total: number; pageCount: number } {
    const total = data.length;
    const pageCount = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: data.slice(start, end),
      total,
      pageCount,
    };
  }

  async getRealTimeUpdates(_projectId: string): Promise<unknown> {
    try {
      return await this.dataClient.getExecutionDetails('latest');
    } catch {
      return { activeExecutions: 0, queuedJobs: 0, recentResults: [], lastUpdated: new Date().toISOString() };
    }
  }
}

export const analyticsService = new AnalyticsService();