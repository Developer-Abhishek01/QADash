import { Injectable, Logger } from '@nestjs/common';

import { IExecutionStrategy, ExecutionResult } from './execution-strategy.interface';
import { OrchestrationJob } from '../orchestration.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class ConditionalExecutionStrategy implements IExecutionStrategy {
  readonly name = 'conditional';
  private readonly logger = new Logger(ConditionalExecutionStrategy.name);

  constructor(private readonly queueService: QueueService) {}

  async execute(jobs: OrchestrationJob[]): Promise<ExecutionResult[]> {
    this.logger.log(`Executing ${jobs.length} jobs with conditional logic`);
    const results: ExecutionResult[] = [];
    const completed = new Set<string>();

    const sorted = [...jobs].sort((a, b) => {
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });

    for (const job of sorted) {
      if (job.dependencies && job.dependencies.length > 0) {
        const allDepsCompleted = job.dependencies.every((depId) => completed.has(depId));
        if (!allDepsCompleted) {
          this.logger.warn(`Skipping job ${job.id} — dependencies not met: ${job.dependencies.join(', ')}`);
          results.push({ jobId: job.id, success: false, error: 'Dependencies not met', duration: 0 });
          continue;
        }
      }

      const startTime = Date.now();
      try {
        const jobId = await this.queueService.enqueue(job);
        results.push({ jobId, success: true, duration: Date.now() - startTime });
        completed.add(jobId);
      } catch (error) {
        results.push({ jobId: job.id, success: false, error: error.message, duration: Date.now() - startTime });
      }
    }

    return results;
  }
}
