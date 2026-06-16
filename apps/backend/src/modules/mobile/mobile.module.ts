import { Module } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';
import { DeviceManagementService } from './device-management.service';
import { AppiumService } from './appium.service';
import { MobileExecutionService } from './mobile-execution.service';
import { MobileReportService } from './mobile-report.service';
import { PrismaModule } from '../../common/prisma.module';
import { LoggerModule } from '../../common/logging';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, LoggerModule, MonitoringModule],
  controllers: [MobileController],
  providers: [
    MobileService,
    DeviceManagementService,
    AppiumService,
    MobileExecutionService,
    MobileReportService,
  ],
  exports: [
    MobileService,
    DeviceManagementService,
    AppiumService,
    MobileExecutionService,
    MobileReportService,
  ],
})
export class MobileModule {}