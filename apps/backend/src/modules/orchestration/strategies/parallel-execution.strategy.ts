import { Injectable, Logger } from '@nestjs/common';

import { IExecutionStrategy, ExecutionResult } from './execution-strategy.interface';
import { OrchestrationJob } from '../orchestration.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class ParallelExecutionStrategy implements IExecutionStrategy {
  readonly name = 'parallel';
  private readonly logger = new Logger(ParallelExecutionStrategy.name);

  constructor(private readonly queueService: QueueService) {}

  async execute(jobs: OrchestrationJob[]): Promise<ExecutionResult[]> {
    this.logger.log(`Executing ${jobs.length} jobs in parallel`);

    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const startTime = Date.now();
        try {
          const jobId = await this.queueService.enqueue(job);
          return {
            jobId,
            success: true,
            duration: Date.now() - startTime,
          } as ExecutionResult;
        } catch (error) {
          return {
            jobId: job.id,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          } as ExecutionResult;
        }
      }),
    );

    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : { jobId: 'unknown', success: false, error: r.reason?.message, duration: 0 },
    );
  }
}
