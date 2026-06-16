import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUES } from './queue.constants';

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  queues: Record<string, QueueMetrics>;
  redis: { status: string; connected: boolean };
  workers: { active: number; idle: number };
}

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    @InjectQueue(QUEUES.EXECUTION) private executionQueue: Queue,
    @InjectQueue(QUEUES.REPORT) private reportQueue: Queue,
    @InjectQueue(QUEUES.AI) private aiQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QUEUES.RETRY) private retryQueue: Queue,
    @InjectQueue(QUEUES.DEAD_LETTER) private deadLetterQueue: Queue,
  ) {}

  private getQueue(name: string): Queue {
    const queues: Record<string, Queue> = {
      [QUEUES.EXECUTION]: this.executionQueue,
      [QUEUES.REPORT]: this.reportQueue,
      [QUEUES.AI]: this.aiQueue,
      [QUEUES.NOTIFICATION]: this.notificationQueue,
      [QUEUES.RETRY]: this.retryQueue,
      [QUEUES.DEAD_LETTER]: this.deadLetterQueue,
    };
    return queues[name];
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const metrics = await this.getMetrics();
    const allQueues = Object.keys(metrics.queues);
    const failedQueues = allQueues.filter(q => metrics.queues[q].failed > 100);
    const highFailedRate = allQueues.some(q => {
      const m = metrics.queues[q];
      const total = m.waiting + m.active + m.completed + m.failed;
      return total > 0 && m.failed / total > 0.2;
    });

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failedQueues.length > 0 || highFailedRate) status = 'unhealthy';
    else if (allQueues.some(q => metrics.queues[q].failed > 10)) status = 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      queues: metrics.queues,
      redis: { status: 'connected', connected: true },
      workers: { active: 0, idle: 0 },
    };
  }

  async getMetrics() {
    const queueNames = Object.values(QUEUES);
    const queueMetrics: Record<string, QueueMetrics> = {};

    for (const name of queueNames) {
      const queue = this.getQueue(name);
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

      queueMetrics[name] = { name, waiting, active, completed, failed, delayed, paused };
    }

    return { queues: queueMetrics };
  }

  async getQueueMetrics(queueName: string) {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed, paused, jobCounts] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
      queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed', 'paused'),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      jobCounts: jobCounts as Record<string, number>,
    };
  }

  async getJobs(queueName: string, status: string = 'waiting', limit = 50) {
    const queue = this.getQueue(queueName);
    const jobs = await queue.getJobs(status as any, 0, limit);

    return Promise.all(jobs.map(async job => ({
      id: job.id,
      name: job.name,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      attempts: job.attemptsMade,
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
    })));
  }

  async getFailedJobs(queueName?: string, limit = 20) {
    if (queueName) {
      const queue = this.getQueue(queueName);
      const jobs = await queue.getFailed(0, limit);
      return Promise.all(jobs.map(j => this.formatJob(j)));
    }

    const allFailed: any[] = [];
    for (const name of Object.values(QUEUES)) {
      if (name === QUEUES.DEAD_LETTER) continue;
      const queue = this.getQueue(name);
      const jobs = await queue.getFailed(0, limit / Object.values(QUEUES).length);
      const formatted = await Promise.all(jobs.map(async j => ({ ...await this.formatJob(j), queue: name })));
      allFailed.push(...formatted);
    }
    return allFailed;
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found in ${queueName}`);
    await job.retry();
    return { message: `Retried job ${jobId}` };
  }

  async retryAllFailed(queueName: string) {
    const queue = this.getQueue(queueName);
    const failed = await queue.getFailed(0, 100);
    let retried = 0;
    for (const job of failed) {
      if (job.attemptsMade < 3) {
        await job.retry();
        retried++;
      }
    }
    return { message: `Retried ${retried} jobs from ${queueName}` };
  }

  getWorkerInfo() {
    return {
      workers: [],
      scaling: { min: 1, max: 10, current: 1 },
      autoScale: false,
    };
  }

  private async formatJob(job: Job) {
    return {
      id: job.id,
      name: job.name,
      status: await job.getState(),
      data: job.data,
      attempts: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
    };
  }
}