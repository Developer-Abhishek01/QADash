import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AccessibilityController } from './accessibility.controller';
import { AccessibilityService } from './accessibility.service';
import { AxeExecutionService } from './engine/axe-execution.service';
import { AccessibilityReportService } from './reports/accessibility-report.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'accessibility-scan' }),
  ],
  controllers: [AccessibilityController],
  providers: [AccessibilityService, AxeExecutionService, AccessibilityReportService],
  exports: [AccessibilityService, AxeExecutionService, AccessibilityReportService],
})
export class AccessibilityModule {}