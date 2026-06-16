import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from './queue.constants';

export interface ExecutionJobData {
  executionId: string;
  projectId: string;
  testIds: string[];
  environmentId?: string;
  userId: string;
  config?: Record<string, unknown>;
}

export interface ReportJobData {
  reportId: string;
  projectId: string;
  type: 'TEST_SUMMARY' | 'COVERAGE' | 'PERFORMANCE' | 'FLAKY_TESTS';
  dateRange?: { start: Date; end: Date };
  userId: string;
}

export interface AiJobData {
  jobId: string;
  type: 'ANALYZE_TEST' | 'GENERATE_TESTS' | 'ANALYZE_EXECUTION' | 'SUGGEST_FIXES' | 'GET_INSIGHTS';
  projectId: string;
  payload: Record<string, unknown>;
  userId: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  link?: string;
  email?: boolean;
}

export interface RetryJobData {
  originalQueue: string;
  originalJobId: string;
  originalData: Record<string, unknown>;
  originalAttempts: number;
  error: string;
  strategy: 'exponential' | 'linear' | 'fixed';
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUES.EXECUTION) private executionQueue: Queue<ExecutionJobData>,
    @InjectQueue(QUEUES.REPORT) private reportQueue: Queue<ReportJobData>,
    @InjectQueue(QUEUES.AI) private aiQueue: Queue<AiJobData>,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQueue: Queue<NotificationJobData>,
    @InjectQueue(QUEUES.RETRY) private retryQueue: Queue<RetryJobData>,
    @InjectQueue(QUEUES.DEAD_LETTER) private deadLetterQueue: Queue<RetryJobData>,
    private readonly configService: ConfigService,
  ) {}

  async addExecutionJob(data: ExecutionJobData, options?: JobsOptions) {
    const job = await this.executionQueue.add('run-tests', data, {
      ...options,
      jobId: `exec-${data.executionId}`,
    });
    this.logger.log(`Added execution job: ${job.id} for execution ${data.executionId}`);
    return job;
  }

  async addExecutionBulk(jobs: { name: string; data: ExecutionJobData; opts?: JobsOptions }[]) {
    return this.executionQueue.addBulk(jobs);
  }

  async addReportJob(data: ReportJobData, options?: JobsOptions) {
    const job = await this.reportQueue.add('generate-report', data, {
      ...options,
      jobId: `report-${data.reportId}`,
    });
    this.logger.log(`Added report job: ${job.id} for report ${data.reportId}`);
    return job;
  }

  async addScheduledReport(data: ReportJobData, cronExpression: string) {
    const job = await this.reportQueue.add('scheduled-report', data, {
      repeat: { pattern: cronExpression },
      jobId: `scheduled-report-${data.projectId}`,
    });
    this.logger.log(`Added scheduled report job: ${job.id} with cron ${cronExpression}`);
    return job;
  }

  async addAiJob(data: AiJobData, options?: JobsOptions) {
    const job = await this.aiQueue.add(data.type, data, {
      ...options,
      jobId: `ai-${data.jobId}`,
    });
    this.logger.log(`Added AI job: ${job.id} type ${data.type}`);
    return job;
  }

  async addAiJobDelayed(data: AiJobData, delayMs: number) {
    const job = await this.aiQueue.add(data.type, data, {
      delay: delayMs,
      jobId: `ai-delayed-${data.jobId}`,
    });
    this.logger.log(`Added delayed AI job: ${job.id} with delay ${delayMs}ms`);
    return job;
  }

  async addNotificationJob(data: NotificationJobData, options?: JobsOptions) {
    const job = await this.notificationQueue.add('send-notification', data, {
      ...options,
      jobId: `notif-${Date.now()}-${data.userId}`,
    });
    this.logger.log(`Added notification job: ${job.id} for user ${data.userId}`);
    return job;
  }

  async addNotificationBulk(users: string[], data: Omit<NotificationJobData, 'userId'>): Promise<void> {
    const jobs = users.map((userId) => ({
      name: 'send-notification',
      data: { ...data, userId } as NotificationJobData,
      opts: { jobId: `notif-${Date.now()}-${userId}` },
    }));
    await this.notificationQueue.addBulk(jobs);
  }

  async addRetryJob(data: RetryJobData, options?: JobsOptions) {
    const job = await this.retryQueue.add('retry-job', data, {
      ...options,
      delay: this.calculateRetryDelay(data),
    });
    this.logger.log(`Added retry job: ${job.id} for original ${data.originalJobId}`);
    return job;
  }

  async addToDeadLetter(data: RetryJobData) {
    const job = await this.deadLetterQueue.add('dead-letter', data, {
      jobId: `dlq-${Date.now()}`,
    });
    this.logger.warn(`Moved to dead letter: ${job.id}`);
    return job;
  }

  private calculateRetryDelay(data: RetryJobData): number {
    switch (data.strategy) {
      case 'exponential':
        return Math.pow(2, data.originalAttempts) * 1000;
      case 'linear':
        return data.originalAttempts * 1000;
      case 'fixed':
        return 5000;
      default:
        return 2000;
    }
  }

  async removeJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed job: ${jobId} from queue ${queueName}`);
    }
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.warn(`Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  async drainQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.drain();
    this.logger.warn(`Drained queue: ${queueName}`);
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case QUEUES.EXECUTION: return this.executionQueue;
      case QUEUES.REPORT: return this.reportQueue;
      case QUEUES.AI: return this.aiQueue;
      case QUEUES.NOTIFICATION: return this.notificationQueue;
      case QUEUES.RETRY: return this.retryQueue;
      case QUEUES.DEAD_LETTER: return this.deadLetterQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }
}