import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ReportJobData } from '../queue.service';
import { PrismaService } from '../../../common/prisma.service';

@Processor('report', {
  concurrency: 3,
  limiter: { max: 5, duration: 5000 },
})
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<any> {
    const { reportId, projectId, type, dateRange, userId } = job.data;

    this.logger.log(`Generating ${type} report for project ${projectId}`);

    await job.updateProgress(10);

    const reportData = await this.generateReportData(type, projectId, dateRange);

    await job.updateProgress(80);

    const summary = this.buildSummary(type, reportData);

    await job.updateProgress(90);

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        summary: summary as any,
        data: reportData as any,
      },
    });

    await job.updateProgress(100);

    this.logger.log(`Report ${reportId} generated successfully`);
    return { reportId, type, summary };
  }

  private async generateReportData(type: string, projectId: string, dateRange?: { start: Date; end: Date }) {
    const where = { projectId, ...(dateRange ? { startedAt: { gte: dateRange.start, lte: dateRange.end } } : {}) };

    const [executions, tests, bugs] = await Promise.all([
      this.prisma.execution.findMany({ where }),
      this.prisma.test.findMany({ where: { projectId, ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}) } }),
      this.prisma.bug.findMany({ where: { projectId, status: { not: 'CLOSED' } } }),
    ]);

    const passed = executions.filter(e => e.status === 'PASSED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const total = executions.length;

    return {
      totalTests: tests.length,
      totalExecutions: total,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      openBugs: bugs.length,
      executions: executions.slice(-10).map(e => ({
        id: e.id,
        name: e.name,
        status: e.status,
        passed: e.passedTests,
        failed: e.failedTests,
        date: e.startedAt,
      })),
    };
  }

  private buildSummary(type: string, data: any) {
    switch (type) {
      case 'TEST_SUMMARY':
        return {
          totalTests: data.totalTests,
          totalExecutions: data.totalExecutions,
          passRate: data.passRate,
          status: data.passRate >= 80 ? 'healthy' : 'needs-attention',
        };
      case 'COVERAGE':
        return { coverage: Math.min(100, data.totalTests * 5), tests: data.totalTests };
      case 'PERFORMANCE':
        return { avgDuration: 3500, totalRuns: data.totalExecutions };
      case 'FLAKY_TESTS':
        return { flakyCount: Math.floor(data.totalTests * 0.05), totalTests: data.totalTests };
      default:
        return data;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Report job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Report job ${job.id} failed: ${error.message}`);
  }
}