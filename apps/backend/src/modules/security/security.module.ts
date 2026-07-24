import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { SecurityQueueService } from './queues/security-queue.service';
import { ReportModule } from './reports/report.module';
import { ScannerModule } from './scanners/scanner.module';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScannerModule,
    ReportModule,
    BullModule.registerQueue(
      { name: 'security-scan' },
      { name: 'dependency-scan' },
      { name: 'scheduled-scan' },
    ),
  ],
  controllers: [SecurityController],
  providers: [SecurityService, SecurityQueueService],
  exports: [SecurityService, SecurityQueueService],
})
export class SecurityModule {}