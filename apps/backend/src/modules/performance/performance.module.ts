import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AlertService } from './alerts/alert.service';
import { K6ExecutionService } from './engine/k6-execution.service';
import { MetricsCollectorService } from './metrics/metrics-collector.service';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      { name: 'performance-test' },
      { name: 'performance-metrics' },
    ),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    K6ExecutionService,
    MetricsCollectorService,
    AlertService,
  ],
  exports: [
    PerformanceService,
    K6ExecutionService,
    MetricsCollectorService,
    AlertService,
  ],
})
export class PerformanceModule {}