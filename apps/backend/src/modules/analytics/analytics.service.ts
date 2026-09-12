import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getProjectStats(projectId: string) {
    const [tests, passedExecutions, totalExecutions, bugs, recentExecutions] = await Promise.all([
      this.prisma.test.count({ where: { projectId } }),
      this.prisma.execution.count({ where: { projectId, status: 'PASSED' } }),
      this.prisma.execution.count({ where: { projectId } }),
      this.prisma.bug.count({ where: { projectId, status: { not: 'CLOSED' } } }),
      this.prisma.execution.findMany({ where: { projectId }, orderBy: { startedAt: 'desc' }, take: 10 }),
    ]);

    return {
      totalTests: tests,
      totalExecutions,
      passRate: totalExecutions ? Math.round((passedExecutions / totalExecutions) * 100) : 0,
      openBugs: bugs,
      recentTrends: recentExecutions.map(e => ({ date: e.startedAt, status: e.status, passed: e.passedTests, failed: e.failedTests })),
    };
  }

  async getDashboardStats() {
    const [totalProjects, totalTests, totalExecutions, totalBugs] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.test.count(),
      this.prisma.execution.count(),
      this.prisma.bug.count({ where: { status: { not: 'CLOSED' } } }),
    ]);
    return { totalProjects, totalTests, totalExecutions, openBugs: totalBugs };
  }

  async getOverview() {
    return this.getDashboardStats();
  }

  async getTrends(params?: { projectId?: string; days?: number }) {
    const days = params?.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const whereFilter = params?.projectId ? { projectId: params.projectId, startedAt: { gte: since } } : { startedAt: { gte: since } };
    const executions = await this.prisma.execution.findMany({ where: whereFilter, orderBy: { startedAt: 'asc' } });
    const dailyStats: Record<string, { date: string; total: number; passed: number; failed: number }> = {};
    for (const e of executions) {
      const date = e.startedAt?.toISOString().split('T')[0] || 'unknown';
      if (!dailyStats[date]) dailyStats[date] = { date, total: 0, passed: 0, failed: 0 };
      dailyStats[date].total++;
      if (e.status === 'PASSED') dailyStats[date].passed += e.passedTests || 0;
      if (e.status === 'FAILED') dailyStats[date].failed += e.failedTests || 0;
    }
    return { trends: Object.values(dailyStats) };
  }

  async getFlakyTests(params?: { projectId?: string; threshold?: number }) {
    const threshold = params?.threshold || 3;
    const runs = await this.prisma.testRun.groupBy({
      by: ['testId'],
      _count: { id: true },
      where: { status: 'FAILED' },
    });
    const allRuns = await this.prisma.testRun.groupBy({
      by: ['testId'],
      _count: { id: true },
    });
    const failMap = new Map(runs.map(r => [r.testId, r._count.id]));
    const totalMap = new Map(allRuns.map(r => [r.testId, r._count.id]));
    const testIds = [...new Set([...failMap.keys(), ...totalMap.keys()])];
    const tests = await this.prisma.test.findMany({
      where: params?.projectId ? { projectId: params.projectId, id: { in: testIds } } : { id: { in: testIds } },
    });
    const flaky = tests.filter(t => {
      const total = totalMap.get(t.id) || 0;
      if (total < 5) return false;
      const failed = failMap.get(t.id) || 0;
      const rate = failed / total;
      return rate > 0.2 && rate < 0.8;
    }).map(t => ({
      id: t.id,
      name: t.name,
      executions: totalMap.get(t.id) || 0,
      flakinessScore: Math.round((1 - Math.abs(0.5 - (failMap.get(t.id) || 0) / Math.max(totalMap.get(t.id) || 1, 1))) * 100),
    }));
    return { flakyTests: flaky.slice(0, threshold > 0 ? threshold : 10) };
  }

  async getCoverage(params?: { projectId?: string }) {
    const where = params?.projectId ? { projectId: params.projectId } : {};
    const total = await this.prisma.test.count({ where });
    const automated = await this.prisma.test.count({ where: { ...where, code: { not: null } } });
    return { totalTestCases: total, automatedTestCases: automated, coveragePercent: total ? Math.round((automated / total) * 100) : 0 };
  }
}