import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { OrchestrationController } from './orchestration.controller';
import { OrchestrationService } from './orchestration.service';
import { EventHubService } from './services/event-hub.service';
import { JobCoordinatorService } from './services/job-coordinator.service';
import { QueueService } from './services/queue.service';
import { ServiceRegistryService } from './services/service-registry.service';
import { ConditionalExecutionStrategy } from './strategies/conditional-execution.strategy';
import { ParallelExecutionStrategy } from './strategies/parallel-execution.strategy';
import { RetryStrategy } from './strategies/retry-strategy';
import { SequentialExecutionStrategy } from './strategies/sequential-execution.strategy';
import { AccessibilityModule } from '../accessibility/accessibility.module';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BugsModule } from '../bugs/bugs.module';
import { ExecutionsModule } from '../executions/executions.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PerformanceModule } from '../performance/performance.module';
import { QueueModule } from '../queue/queue.module';
import { ReportsModule } from '../reports/reports.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'orchestration',
    }),
    ExecutionsModule,
    forwardRef(() => AiModule),
    QueueModule,
    ReportsModule,
    AnalyticsModule,
    BugsModule,
    SecurityModule,
    PerformanceModule,
    AccessibilityModule,
    MonitoringModule,
    SchedulerModule,
  ],
  controllers: [OrchestrationController],
  providers: [
    OrchestrationService,
    QueueService,
    EventHubService,
    JobCoordinatorService,
    ServiceRegistryService,
    ParallelExecutionStrategy,
    SequentialExecutionStrategy,
    ConditionalExecutionStrategy,
    RetryStrategy,
  ],
  exports: [
    OrchestrationService,
    EventHubService,
    JobCoordinatorService,
    ServiceRegistryService,
    ParallelExecutionStrategy,
    SequentialExecutionStrategy,
    ConditionalExecutionStrategy,
    RetryStrategy,
  ],
})
export class OrchestrationModule {}