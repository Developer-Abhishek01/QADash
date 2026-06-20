import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ExecutionsService } from '../../executions/executions.service';
import { QUEUES } from '../queue.constants';

@Processor(QUEUES.EXECUTION)
@Injectable()
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    private readonly executionsService: ExecutionsService,
  ) {
    super();
  }

  async process(job: Job<{ executionId: string; projectId: string; testIds: string[]; userId: string; triggerSource?: string }>): Promise<{ status: string; passed: number; failed: number }> {
    const { executionId, projectId, testIds, userId } = job.data;
    this.logger.log(`Processing execution ${executionId} from queue (attempt ${job.attemptsMade + 1})`);

    try {
      await this.executionsService.updateStatus(executionId, 'RUNNING');

      const passed = await this.executionsService.executeTestsInline(
        projectId, testIds, userId, executionId,
        (current, total) => job.updateProgress(Math.round((current / total) * 100)),
      );

      const failed = testIds.length - passed;
      const status = failed === 0 ? 'PASSED' : 'FAILED';
      this.logger.log(`Execution ${executionId} completed: ${passed} passed, ${failed} failed`);
      return { status, passed, failed };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Execution ${executionId} failed: ${errMsg}`);
      await this.executionsService.updateStatus(executionId, 'FAILED');
      throw error;
    }
  }
}
