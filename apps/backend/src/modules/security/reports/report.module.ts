import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { PrismaModule } from '../../../common/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}