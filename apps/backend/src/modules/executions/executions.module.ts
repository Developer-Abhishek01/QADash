import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { PrismaService } from '../../common/prisma.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'execution' }), forwardRef(() => GatewayModule)],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, PrismaService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}