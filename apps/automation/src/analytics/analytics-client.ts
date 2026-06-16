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
  constructor(_baseUrl?: string, _logger?: Logger) {
  }

  async getPassFailTrends(_projectId: string, days = 30): Promise<TrendData[]> {
    const trends: TrendData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      trends.push({
        period: dateStr,
        total: Math.floor(Math.random() * 50) + 10,
        passed: Math.floor(Math.random() * 40) + 5,
        failed: Math.floor(Math.random() * 10),
        skipped: Math.floor(Math.random() * 3),
        passRate: Math.floor(Math.random() * 20) + 70,
        avgDuration: Math.floor(Math.random() * 30000) + 10000,
      });
    }

    return trends;
  }

  async getExecutionTrends(_projectId: string, days = 30): Promise<TimeSeriesDataPoint[]> {
    const data: TimeSeriesDataPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        timestamp: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 20) + 5,
      });
    }

    return data;
  }

  async getDefectDensity(_projectId: string, _days = 30): Promise<DefectData[]> {
    const defects: DefectData[] = [
      { testId: 't1', testName: 'Login Test', errorType: 'Assertion Failed', errorMessage: 'Expected title to be Dashboard', occurrences: 15, firstSeen: '2024-01-01', lastSeen: '2024-01-15', severity: 'high' },
      { testId: 't2', testName: 'Payment Flow', errorType: 'Timeout', errorMessage: 'Element not found within 30s', occurrences: 8, firstSeen: '2024-01-05', lastSeen: '2024-01-14', severity: 'critical' },
      { testId: 't3', testName: 'User Profile', errorType: 'Network Error', errorMessage: 'Failed to fetch user data', occurrences: 12, firstSeen: '2024-01-08', lastSeen: '2024-01-15', severity: 'medium' },
      { testId: 't4', testName: 'Search Function', errorType: 'Element Not Found', errorMessage: 'Search input not visible', occurrences: 6, firstSeen: '2024-01-10', lastSeen: '2024-01-15', severity: 'low' },
      { testId: 't5', testName: 'Logout Test', errorType: 'Permission Error', errorMessage: 'Access denied', occurrences: 3, firstSeen: '2024-01-12', lastSeen: '2024-01-14', severity: 'medium' },
    ];

    return defects;
  }

  async getBrowserAnalytics(_projectId: string): Promise<BrowserAnalytics[]> {
    return [
      { browser: 'Chromium', version: '120', totalExecutions: 450, passRate: 85, avgDuration: 25000, failureReasons: [{ reason: 'Element not found', count: 25 }, { reason: 'Timeout', count: 15 }] },
      { browser: 'Firefox', version: '121', totalExecutions: 320, passRate: 82, avgDuration: 28000, failureReasons: [{ reason: 'Assertion failed', count: 20 }, { reason: 'Network error', count: 12 }] },
      { browser: 'WebKit', version: '17', totalExecutions: 280, passRate: 78, avgDuration: 32000, failureReasons: [{ reason: 'Element not visible', count: 18 }, { reason: 'Timeout', count: 14 }] },
      { browser: 'Mobile Chrome', version: '120', totalExecutions: 150, passRate: 75, avgDuration: 45000, failureReasons: [{ reason: 'Touch events', count: 12 }, { reason: 'Viewport', count: 8 }] },
    ];
  }

  async getEnvironmentAnalytics(_projectId: string): Promise<EnvironmentAnalytics[]> {
    return [
      { environment: 'Production', type: 'prod', totalExecutions: 200, passRate: 90, avgDuration: 20000, reliability: 98 },
      { environment: 'Staging', type: 'staging', totalExecutions: 350, passRate: 85, avgDuration: 22000, reliability: 95 },
      { environment: 'Development', type: 'dev', totalExecutions: 500, passRate: 75, avgDuration: 25000, reliability: 88 },
      { environment: 'QA', type: 'qa', totalExecutions: 400, passRate: 80, avgDuration: 23000, reliability: 92 },
    ];
  }

  async getExecutionHeatmap(_projectId: string): Promise<HeatmapCell[]> {
    const cells: HeatmapCell[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = Math.floor(Math.random() * 100);
        const tests = Math.floor(Math.random() * 10);
        
        cells.push({ day, hour, value, tests });
      }
    }

    return cells;
  }

  async getAiInsights(_projectId: string): Promise<AiInsight[]> {
    return [
      { type: 'flaky', title: 'Flaky Tests Detected', description: '5 tests show inconsistent results across multiple runs', confidence: 92, affectedTests: ['t1', 't2', 't3', 't4', 't5'], suggestedAction: 'Add retry logic and explicit waits' },
      { type: 'slow', title: 'Slow Test Suite', description: 'Average execution time 40% higher than baseline', confidence: 88, affectedTests: ['t10', 't11', 't12'], suggestedAction: 'Optimize database queries and reduce wait times' },
      { type: 'pattern', title: 'Authentication Pattern Issue', description: 'Multiple auth tests fail after 10pm', confidence: 75, affectedTests: ['t1', 't5', 't8'], suggestedAction: 'Review session timeout configuration' },
      { type: 'recommendation', title: 'Test Data Optimization', description: 'Tests using hardcoded data should use fixtures', confidence: 85, affectedTests: ['t15', 't16', 't17'], suggestedAction: 'Implement test data factories' },
    ];
  }

  async getExecutionDetails(executionId: string): Promise<ExecutionMetrics | null> {
    return {
      executionId,
      projectId: 'proj-001',
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 60000,
      totalTests: 50,
      passed: 42,
      failed: 5,
      skipped: 3,
      passRate: 84,
      browser: 'chromium',
      environment: 'staging',
    };
  }

  async getTopFailures(_projectId: string, _limit = 10): Promise<{ testName: string; failureCount: number; trend: 'up' | 'down' | 'stable' }[]> {
    return [
      { testName: 'Login with invalid credentials', failureCount: 25, trend: 'up' },
      { testName: 'Payment checkout flow', failureCount: 18, trend: 'stable' },
      { testName: 'User profile update', failureCount: 15, trend: 'down' },
      { testName: 'Search functionality', failureCount: 12, trend: 'up' },
      { testName: 'API health check', failureCount: 10, trend: 'stable' },
    ];
  }

  async getTestCoverage(_projectId: string): Promise<{ feature: string; covered: number; total: number; percentage: number }[]> {
    return [
      { feature: 'Authentication', covered: 45, total: 50, percentage: 90 },
      { feature: 'User Management', covered: 30, total: 40, percentage: 75 },
      { feature: 'Payment', covered: 25, total: 35, percentage: 71 },
      { feature: 'Search', covered: 20, total: 25, percentage: 80 },
      { feature: 'Reports', covered: 15, total: 30, percentage: 50 },
    ];
  }

  async getReliabilityScore(_projectId: string): Promise<{ score: number; grade: string; factors: { name: string; impact: number }[] }> {
    return {
      score: 82,
      grade: 'B',
      factors: [
        { name: 'Pass Rate', impact: 30 },
        { name: 'Flaky Tests', impact: -15 },
        { name: 'Execution Time', impact: 10 },
        { name: 'Coverage', impact: 20 },
      ],
    };
  }
}

export const analyticsClient = new AnalyticsDataClient();