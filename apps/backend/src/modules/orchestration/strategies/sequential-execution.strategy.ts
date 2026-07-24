import { Injectable, Logger } from '@nestjs/common';

import { IExecutionStrategy, ExecutionResult } from './execution-strategy.interface';
import { OrchestrationJob } from '../orchestration.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class SequentialExecutionStrategy implements IExecutionStrategy {
  readonly name = 'sequential';
  private readonly logger = new Logger(SequentialExecutionStrategy.name);

  constructor(private readonly queueService: QueueService) {}

  async execute(jobs: OrchestrationJob[]): Promise<ExecutionResult[]> {
    this.logger.log(`Executing ${jobs.length} jobs sequentially`);
    const results: ExecutionResult[] = [];

    for (const job of jobs) {
      const startTime = Date.now();
      try {
        const jobId = await this.queueService.enqueue(job);
        results.push({ jobId, success: true, duration: Date.now() - startTime });
      } catch (error) {
        results.push({
          jobId: job.id,
          success: false,
          error: error.message,
          duration: Date.now() - startTime,
        });
        break;
      }
    }

    return results;
  }
}
