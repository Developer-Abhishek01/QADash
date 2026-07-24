import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'scheduler' })],
  controllers: [SchedulerController],
  providers: [SchedulerService, PrismaService],
  exports: [SchedulerService],
})
export class SchedulerModule {}