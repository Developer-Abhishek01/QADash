import * as fs from 'fs';
import { Logger } from '../utils/logger';
import { StoredReport, ReportStorage } from './report-storage';
import { ExportFormat } from './export-service';

export interface DashboardMetrics {
  totalExecutions: number;
  totalTests: number;
  passRate: number;
  avgDuration: number;
  flakyTestsCount: number;
  errorCategories: { category: string; count: number }[];
}

export interface TrendData {
  date: string;
  executions: number;
  passRate: number;
  avgDuration: number;
}

export interface DashboardConfig {
  apiUrl: string;
  refreshInterval: number;
  maxHistoricalDays: number;
}

export class DashboardIntegration {
  private logger: Logger;
  private reportStorage: ReportStorage;
  private config: DashboardConfig;

  constructor(config?: Partial<DashboardConfig>, logger?: Logger) {
    this.logger = logger || new Logger('DashboardIntegration');
    this.reportStorage = new ReportStorage();
    this.config = {
      apiUrl: config?.apiUrl || 'http://localhost:3001/api/v1',
      refreshInterval: config?.refreshInterval || 30000,
      maxHistoricalDays: config?.maxHistoricalDays || 30,
    };
  }

  async generateDashboardMetrics(projectId?: string): Promise<DashboardMetrics> {
    const reports = projectId 
      ? this.reportStorage.getReportsByProject(projectId)
      : this.reportStorage.getAllReports();

    if (reports.length === 0) {
      return {
        totalExecutions: 0,
        totalTests: 0,
        passRate: 0,
        avgDuration: 0,
        flakyTestsCount: 0,
        errorCategories: [],
      };
    }

    let totalTests = 0;
    let totalPassed = 0;
    let totalDuration = 0;

    reports.forEach(report => {
      if (report.formats.includes('json')) {
        try {
          const filePath = report.filePaths['json'];
          if (filePath && fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            totalTests += data.statistics?.totalTests || data.tests?.length || 0;
            totalPassed += data.statistics?.passed || 0;
            totalDuration += data.statistics?.duration || 0;
            return;
          }
        } catch {}
      }
      totalTests += 0;
    });

    const avgDuration = totalDuration / reports.length;
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return {
      totalExecutions: reports.length,
      totalTests,
      passRate: Math.round(passRate),
      avgDuration: Math.round(avgDuration),
      flakyTestsCount: 0,
      errorCategories: [],
    };
  }

  async getExecutionTimeline(projectId: string, days = 7): Promise<TrendData[]> {
    const reports = this.reportStorage.getReportsByProject(projectId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const trends: Map<string, TrendData> = new Map();

    reports.forEach(report => {
      const reportDate = new Date(report.generatedAt);
      if (reportDate >= cutoffDate) {
        const dateKey = reportDate.toISOString().split('T')[0];
        
        if (!trends.has(dateKey)) {
          trends.set(dateKey, { date: dateKey, executions: 0, passRate: 0, avgDuration: 0 });
        }

        const existing = trends.get(dateKey)!;
        existing.executions++;
      }
    });

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopFlakyTests(projectId: string, limit = 10): Promise<{ testId: string; testName: string; failureCount: number }[]> {
    const reports = this.reportStorage.getReportsByProject(projectId);
    const testCounts: Record<string, { name: string; count: number }> = {};

    reports.forEach(report => {
      if (report.formats.includes('json')) {
        try {
          const filePath = report.filePaths['json'];
          if (filePath && fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.tests?.forEach((test: any) => {
              if (test.status === 'failed') {
                if (!testCounts[test.id]) {
                  testCounts[test.id] = { name: test.name, count: 0 };
                }
                testCounts[test.id].count++;
              }
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to parse report: ${report.id}`);
        }
      }
    });

    return Object.entries(testCounts)
      .map(([testId, info]) => ({ testId, testName: info.name, failureCount: info.count }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, limit);
  }

  async getProjectHealth(projectId: string): Promise<{ score: number; status: string; issues: string[] }> {
    const metrics = await this.generateDashboardMetrics(projectId);
    const issues: string[] = [];

    if (metrics.passRate < 70) issues.push('Low pass rate');
    if (metrics.flakyTestsCount > 5) issues.push('High number of flaky tests');
    if (metrics.avgDuration > 60000) issues.push('Long test execution times');

    let score = 100;
    if (metrics.passRate < 90) score -= 20;
    if (metrics.passRate < 70) score -= 30;
    if (metrics.flakyTestsCount > 0) score -= metrics.flakyTestsCount * 5;
    if (metrics.avgDuration > 30000) score -= 10;

    let status = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 75) status = 'warning';

    return { score: Math.max(0, score), status, issues };
  }

  async generateReportSummary(executionId: string): Promise<{
    title: string;
    status: string;
    passRate: number;
    duration: string;
    timestamp: string;
    link: string;
  }> {
    const report = this.reportStorage.getReportByExecution(executionId);
    
    if (!report) {
      return {
        title: 'Report not found',
        status: 'unknown',
        passRate: 0,
        duration: '0s',
        timestamp: '',
        link: '',
      };
    }

    return {
      title: report.title,
      status: report.formats.length > 0 ? 'completed' : 'pending',
      passRate: 0,
      duration: `${report.size / 1024 / 1024}MB`,
      timestamp: report.generatedAt,
      link: `${this.config.apiUrl}/reports/${report.id}`,
    };
  }

  getRecentReports(projectId?: string, limit = 10): StoredReport[] {
    if (projectId) {
      return this.reportStorage.getReportsByProject(projectId).slice(0, limit);
    }
    return this.reportStorage.getAllReports(limit);
  }

  async getComparisonReport(executionIds: string[]): Promise<{
    executions: any[];
    comparison: { executionId: string; passRate: number; duration: number; changes: string[] }[];
  }> {
    const executions: any[] = [];
    const comparison: any[] = [];

    for (const executionId of executionIds) {
      const report = this.reportStorage.getReportByExecution(executionId);
      if (report) {
        executions.push(report);
        
        comparison.push({
          executionId,
          passRate: 0,
          duration: 0,
          changes: [],
        });
      }
    }

    return { executions, comparison };
  }

  async triggerReportGeneration(executionId: string, _formats: ExportFormat[]): Promise<string> {
    const report = this.reportStorage.getReportByExecution(executionId);
    if (report) {
      return report.id;
    }

    return `Report generation queued for: ${executionId}`;
  }
}

export const dashboardIntegration = new DashboardIntegration();