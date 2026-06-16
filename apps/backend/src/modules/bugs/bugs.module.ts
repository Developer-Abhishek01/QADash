import { Module } from '@nestjs/common';
import { BugsService } from './bugs.service';
import { BugsController } from './bugs.controller';
import { PrismaService } from '../../common/prisma.service';
import { ExcelIntegration } from './integrations/excel.integration';
import { ConfigService } from '@nestjs/config';
import { JiraIntegration } from './integrations/jira.integration';

@Module({
  controllers: [BugsController],
  providers: [
    BugsService,
    PrismaService,
    ExcelIntegration,
    { provide: JiraIntegration, useFactory: (config: ConfigService) => new JiraIntegration(config), inject: [ConfigService] },
  ],
  exports: [BugsService],
})
export class BugsModule {}