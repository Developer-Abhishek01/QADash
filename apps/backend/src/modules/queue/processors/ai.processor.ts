import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AiJobData } from '../queue.service';
import { PrismaService } from '../../../common/prisma.service';

@Processor('ai', {
  concurrency: 2,
  limiter: { max: 3, duration: 10000 },
})
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AiJobData>): Promise<any> {
    const { jobId, type, projectId, payload } = job.data;

    this.logger.log(`Processing AI job ${jobId} type: ${type}`);

    let result: any;

    switch (type) {
      case 'ANALYZE_TEST':
        result = await this.analyzeTest(payload);
        break;
      case 'GENERATE_TESTS':
        result = await this.generateTests(payload);
        break;
      case 'ANALYZE_EXECUTION':
        result = await this.analyzeExecution(payload);
        break;
      case 'SUGGEST_FIXES':
        result = await this.suggestFixes(payload);
        break;
      case 'GET_INSIGHTS':
        result = await this.getInsights(projectId);
        break;
      default:
        throw new Error(`Unknown AI job type: ${type}`);
    }

    this.logger.log(`AI job ${jobId} completed successfully`);
    return result;
  }

  private async analyzeTest(payload: any) {
    await this.simulateProcessing(1500);
    return {
      suggestions: ['Add more edge case tests', 'Use data-driven approach', 'Add explicit assertions'],
      complexity: 'medium',
      coverage: 72,
      patterns: ['Page Object Model', 'Factory Pattern'],
    };
  }

  private async generateTests(payload: any) {
    await this.simulateProcessing(2000);
    return {
      testCases: [
        { name: 'Verify login with valid credentials', priority: 'high', type: 'positive' },
        { name: 'Verify login with invalid password', priority: 'high', type: 'negative' },
        { name: 'Verify password reset flow', priority: 'medium', type: 'positive' },
        { name: 'Verify session timeout', priority: 'medium', type: 'negative' },
      ],
    };
  }

  private async analyzeExecution(payload: any) {
    await this.simulateProcessing(1000);
    const execution = await this.prisma.execution.findUnique({ where: { id: payload.executionId } });
    return {
      insights: execution?.failedTests ? [`${execution.failedTests} tests failed`, 'Timing issues detected'] : ['All tests passed'],
      recommendations: ['Add explicit waits', 'Use retry mechanism for flaky tests'],
      trends: { passRate: 85, trend: 'stable' },
    };
  }

  private async suggestFixes(payload: any) {
    await this.simulateProcessing(800);
    return {
      possibleCauses: ['Element not visible', 'Race condition', 'Timing issue'],
      fixes: [
        { action: 'Add explicit wait for element', confidence: 85 },
        { action: 'Increase timeout', confidence: 70 },
        { action: 'Use retry decorator', confidence: 65 },
      ],
    };
  }

  private async getInsights(projectId: string) {
    const [tests, executions, bugs] = await Promise.all([
      this.prisma.test.count({ where: { projectId } }),
      this.prisma.execution.findMany({ where: { projectId } }),
      this.prisma.bug.count({ where: { projectId, status: { not: 'CLOSED' } } }),
    ]);

    const failed = executions.filter(e => e.status === 'FAILED').length;
    const total = executions.length;

    return {
      health: total > 0 ? Math.round(((total - failed) / total) * 100) : 100,
      testCoverage: Math.min(100, tests * 8),
      openBugs: bugs,
      recommendations: ['Add more integration tests', 'Fix flaky tests', 'Increase test data variety'],
    };
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`AI job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`AI job ${job.id} failed: ${error.message}`);
  }
}