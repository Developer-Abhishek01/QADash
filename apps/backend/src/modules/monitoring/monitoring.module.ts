import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';
import { MonitoringController } from './monitoring.controller';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../../common/prisma.module';
import { LoggerModule } from '../../common/logging';

@Module({
  imports: [PrismaModule, QueueModule, LoggerModule],
  controllers: [MonitoringController],
  providers: [MetricsService, HealthService],
  exports: [MetricsService, HealthService],
})
export class MonitoringModule {}