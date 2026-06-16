import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ExecutionsService } from '../../executions/executions.service';

@Injectable()
export class ExecutionProcessor {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionsService: ExecutionsService,
  ) {
    this.logger.log('ExecutionProcessor initialized - test execution handled by automation worker');
  }
}
