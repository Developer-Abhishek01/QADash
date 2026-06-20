import { Module, forwardRef } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { PrismaService } from '../../common/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'execution' }), forwardRef(() => GatewayModule)],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, PrismaService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}