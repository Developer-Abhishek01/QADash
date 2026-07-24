import { Module } from '@nestjs/common';

import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { LoggerModule } from '../../common/logging';
import { PrismaModule } from '../../common/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule, LoggerModule],
  controllers: [MonitoringController],
  providers: [MetricsService, HealthService],
  exports: [MetricsService, HealthService],
})
export class MonitoringModule {}