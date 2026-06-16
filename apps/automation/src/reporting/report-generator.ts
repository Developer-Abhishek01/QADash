import { Logger } from '../utils/logger';
import { ExecutionResult, TestExecution } from '../orchestration/execution-engine';

export interface ReportConfig {
  title: string;
  projectId: string;
  executionId: string;
  includeScreenshots: boolean;
  includeVideos: boolean;
  includeTraces: boolean;
  includeTimeline: boolean;
  includeRetryHistory: boolean;
  includeEnvironmentDetails: boolean;
  includeBrowserDetails: boolean;
  includeAiInsights: boolean;
}

export interface TestReport {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'broken';
  duration: number;
  retries: number;
  error?: string;
  stackTrace?: string;
  screenshots?: string[];
  videos?: string[];
  traces?: string[];
  logs?: string;
}

export interface EnvironmentDetails {
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  resolution: string;
  nodeVersion: string;
  timestamp: string;
  timezone: string;
  locale: string;
}

export interface TimelineEvent {
  timestamp: string;
  type: 'test_started' | 'test_completed' | 'retry' | 'error' | 'suite_started' | 'suite_completed';
  testId?: string;
  testName?: string;
  duration?: number;
  status?: string;
}

export interface ReportData {
  config: ReportConfig;
  execution: ExecutionResult;
  environment: EnvironmentDetails;
  tests: TestReport[];
  timeline: TimelineEvent[];
  statistics: ReportStatistics;
  aiInsights?: AiInsights;
}

export interface ReportStatistics {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  broken: number;
  passRate: number;
  avgDuration: number;
  totalDuration: number;
  slowestTests: { testId: string; testName: string; duration: number }[];
  flakyTests: { testId: string; testName: string; retryCount: number }[];
  errorCategories: { category: string; count: number }[];
}

export interface AiInsights {
  summary: string;
  recommendations: string[];
  flakyTests: string[];
  timingIssues: string[];
  patterns: string[];
}

export class ReportGenerator {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ReportGenerator');
  }

  generate(config: ReportConfig, execution: ExecutionResult): ReportData {
    this.logger.info(`Generating report for execution: ${config.executionId}`);

    const tests = this.buildTestReports(execution.tests);
    const timeline = this.buildTimeline(execution);
    const statistics = this.calculateStatistics(tests, execution);
    const environment = this.getEnvironmentDetails();

    const reportData: ReportData = {
      config,
      execution,
      environment,
      tests,
      timeline,
      statistics,
    };

    if (config.includeAiInsights) {
      reportData.aiInsights = this.generateAiInsights(tests, statistics);
    }

    this.logger.info(`Report generated: ${statistics.totalTests} tests, ${statistics.passRate}% pass rate`);
    return reportData;
  }

  private buildTestReports(testExecutions: TestExecution[]): TestReport[] {
    return testExecutions.map(test => ({
      id: test.testId,
      name: test.testName,
      status: this.mapStatus(test.status),
      duration: test.duration || 0,
      retries: test.retryAttempt || 0,
      error: test.error,
      stackTrace: test.error,
      screenshots: [],
      videos: [],
      traces: [],
      logs: '',
    }));
  }

  private mapStatus(status: string): TestReport['status'] {
    switch (status) {
      case 'passed': return 'passed';
      case 'failed': return 'failed';
      case 'skipped': return 'skipped';
      default: return 'broken';
    }
  }

  private buildTimeline(execution: ExecutionResult): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    events.push({
      timestamp: execution.startTime.toISOString(),
      type: 'suite_started',
      testName: execution.executionId,
      duration: 0,
    });

    execution.tests.forEach(test => {
      if (test.startTime) {
        events.push({
          timestamp: test.startTime.toISOString(),
          type: 'test_started',
          testId: test.testId,
          testName: test.testName,
        });
      }

      if (test.endTime) {
        events.push({
          timestamp: test.endTime.toISOString(),
          type: 'test_completed',
          testId: test.testId,
          testName: test.testName,
          duration: test.duration,
          status: test.status,
        });
      }

      if (test.retryAttempt && test.retryAttempt > 0) {
        events.push({
          timestamp: test.startTime?.toISOString() || '',
          type: 'retry',
          testId: test.testId,
          testName: test.testName,
        });
      }
    });

    if (execution.endTime) {
      events.push({
        timestamp: execution.endTime.toISOString(),
        type: 'suite_completed',
        testName: execution.executionId,
        duration: execution.duration,
        status: execution.status,
      });
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private calculateStatistics(tests: TestReport[], execution: ExecutionResult): ReportStatistics {
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;
    const broken = tests.filter(t => t.status === 'broken').length;
    const total = tests.length;

    const slowestTests = tests
      .map(t => ({ testId: t.id, testName: t.name, duration: t.duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const flakyTests = tests
      .filter(t => t.retries > 0)
      .map(t => ({ testId: t.id, testName: t.name, retryCount: t.retries }))
      .sort((a, b) => b.retryCount - a.retryCount);

    const errorCategories = this.categorizeErrors(tests);

    return {
      totalTests: total,
      passed,
      failed,
      skipped,
      broken,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgDuration: tests.length > 0 ? tests.reduce((sum, t) => sum + t.duration, 0) / tests.length : 0,
      totalDuration: execution.duration || 0,
      slowestTests,
      flakyTests,
      errorCategories,
    };
  }

  private categorizeErrors(tests: TestReport[]): { category: string; count: number }[] {
    const errors = tests.filter(t => t.error);
    const categories: Record<string, number> = {};

    errors.forEach(test => {
      const category = this.categorizeError(test.error || '');
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'Timeout';
    if (error.includes('assertion')) return 'Assertion Failed';
    if (error.includes('network') || error.includes('fetch')) return 'Network Error';
    if (error.includes('element') || error.includes('locator')) return 'Element Not Found';
    if (error.includes('permission') || error.includes('access')) return 'Permission Error';
    if (error.includes('crash') || error.includes('fatal')) return 'Crash';
    return 'Other';
  }

  private getEnvironmentDetails(): EnvironmentDetails {
    return {
      os: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
      osVersion: process.env.OS_VERSION || 'Unknown',
      browser: 'Chromium',
      browserVersion: 'Latest',
      resolution: '1920x1080',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    };
  }

  private generateAiInsights(tests: TestReport[], statistics: ReportStatistics): AiInsights {
    const flakyTests = tests.filter(t => t.retries > 0).map(t => t.id);
    const slowTests = tests.filter(t => t.duration > 30000).map(t => t.id);

    const recommendations: string[] = [];
    if (flakyTests.length > 0) recommendations.push('Add retry logic for flaky tests');
    if (slowTests.length > 0) recommendations.push('Optimize slow-running tests');
    if (statistics.errorCategories.length > 3) recommendations.push('Address top error categories');

    return {
      summary: `Analysis of ${statistics.totalTests} tests shows ${statistics.passRate}% pass rate`,
      recommendations,
      flakyTests,
      timingIssues: slowTests,
      patterns: this.identifyPatterns(tests),
    };
  }

  private identifyPatterns(tests: TestReport[]): string[] {
    const patterns: string[] = [];
    const locatorIssues = tests.filter(t => t.error?.includes('locator') || t.error?.includes('element')).length;
    const assertionIssues = tests.filter(t => t.error?.includes('assertion')).length;
    const timeoutIssues = tests.filter(t => t.error?.includes('timeout')).length;

    if (locatorIssues > tests.length * 0.1) patterns.push('Frequent locator issues - consider using better selectors');
    if (assertionIssues > tests.length * 0.1) patterns.push('High assertion failures - review test assertions');
    if (timeoutIssues > tests.length * 0.1) patterns.push('Timeout issues - increase wait times or optimize logic');

    return patterns;
  }
}

export const reportGenerator = new ReportGenerator();