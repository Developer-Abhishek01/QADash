import { Injectable, Logger } from '@nestjs/common';

import { OrchestrationJob } from '../orchestration.service';
import { QueueService } from '../services/queue.service';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

@Injectable()
export class RetryStrategy {
  private readonly logger = new Logger(RetryStrategy.name);

  constructor(private readonly queueService: QueueService) {}

  async executeWithRetry(
    job: OrchestrationJob,
    config: RetryConfig = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
  ): Promise<{ success: boolean; jobId: string; attempts: number; error?: string }> {
    let lastError: string | undefined;
    let attempts = 0;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      attempts = attempt;
      try {
        const jobId = await this.queueService.enqueue(job);
        this.logger.log(`Job ${job.id} succeeded on attempt ${attempt}`);
        return { success: true, jobId, attempts };
      } catch (error) {
        lastError = error.message;
        this.logger.warn(`Job ${job.id} failed on attempt ${attempt}/${config.maxRetries}: ${error.message}`);

        if (attempt < config.maxRetries) {
          const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return { success: false, jobId: job.id, attempts, error: lastError };
  }
}
