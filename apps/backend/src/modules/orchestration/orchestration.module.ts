import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestrationController } from './orchestration.controller';
import { OrchestrationService } from './orchestration.service';
import { QueueService } from './services/queue.service';
import { EventHubService } from './services/event-hub.service';
import { JobCoordinatorService } from './services/job-coordinator.service';
import { ServiceRegistryService } from './services/service-registry.service';
import { ExecutionsModule } from '../executions/executions.module';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { ReportsModule } from '../reports/reports.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BugsModule } from '../bugs/bugs.module';
import { SecurityModule } from '../security/security.module';
import { PerformanceModule } from '../performance/performance.module';
import { AccessibilityModule } from '../accessibility/accessibility.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

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
  ],
  exports: [
    OrchestrationService,
    EventHubService,
    JobCoordinatorService,
    ServiceRegistryService,
  ],
})
export class OrchestrationModule {}