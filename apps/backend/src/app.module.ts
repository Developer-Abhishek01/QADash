import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { OrchestrationModule } from './modules/orchestration/orchestration.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { TestsModule } from './modules/tests/tests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BugsModule } from './modules/bugs/bugs.module';
import { SecurityModule } from './modules/security/security.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { AccessibilityModule } from './modules/accessibility/accessibility.module';
import { QueueModule } from './modules/queue/queue.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { ValidationModule } from './modules/validation/validation.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ImportModule } from './modules/import/import.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { GeneratorModule } from './modules/generator/generator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    OrchestrationModule,
    GatewayModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ExecutionsModule,
    TestsModule,
    ReportsModule,
    AnalyticsModule,
    BugsModule,
    SecurityModule,
    PerformanceModule,
    AccessibilityModule,
    QueueModule,
    SchedulerModule,
    MonitoringModule,
    NotificationsModule,
    AiModule,
    UploadsModule,
    EnvironmentsModule,
    ValidationModule,
    RbacModule,
    ImportModule,
    MobileModule,
    GeneratorModule,
  ],
})
export class AppModule {}