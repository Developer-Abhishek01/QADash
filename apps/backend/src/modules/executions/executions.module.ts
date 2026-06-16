import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { PrismaService } from '../../common/prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'execution' })],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, PrismaService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}