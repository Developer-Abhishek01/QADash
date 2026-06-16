import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getProjectStats(projectId: string) {
    const [tests, executions, bugs] = await Promise.all([
      this.prisma.test.count({ where: { projectId } }),
      this.prisma.execution.findMany({ where: { projectId } }),
      this.prisma.bug.count({ where: { projectId, status: { not: 'CLOSED' } } }),
    ]);

    const passedExecutions = executions.filter(e => e.status === 'PASSED').length;
    const totalExecutions = executions.length;

    return {
      totalTests: tests,
      totalExecutions,
      passRate: totalExecutions ? Math.round((passedExecutions / totalExecutions) * 100) : 0,
      openBugs: bugs,
      recentTrends: executions.slice(0, 10).map(e => ({ date: e.startedAt, status: e.status, passed: e.passedTests, failed: e.failedTests })),
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
}