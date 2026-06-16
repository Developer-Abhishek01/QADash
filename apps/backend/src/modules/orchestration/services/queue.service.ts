import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { OrchestrationJob } from '../orchestration.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('orchestration') private readonly orchestrationQueue: Queue,
  ) {}

  async enqueue(job: OrchestrationJob): Promise<string> {
    const jobId = job.id || uuidv4();

    await this.orchestrationQueue.add(job.type, job, {
      jobId,
      priority: this.getPriorityValue(job.priority),
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 5000,
      },
    });

    this.logger.log(`Job ${jobId} enqueued with type ${job.type}`);
    return jobId;
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = await this.orchestrationQueue.getJob(jobId);
    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (state === 'active') {
      await job.moveToFailed(new Error('Job cancelled by user'), 'cancelled');
    } else {
      await job.remove();
    }

    this.logger.log(`Job ${jobId} cancelled`);
    return true;
  }

  async getStatus(jobId: string) {
    const job = await this.orchestrationQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found', jobId };
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async getStats() {
    const counts = await this.orchestrationQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  }

  async getFailedJobs(): Promise<Job[]> {
    return this.orchestrationQueue.getFailed();
  }

  async retryFailed() {
    const failedJobs = await this.getFailedJobs();
    await Promise.all(failedJobs.map(job => job.retry()));
    this.logger.log(`Retried ${failedJobs.length} failed jobs`);
    return failedJobs.length;
  }

  private getPriorityValue(priority: string): number {
    const priorities: Record<string, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };
    return priorities[priority] || 3;
  }
}