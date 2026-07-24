import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';
import { ExcelIntegration } from './integrations/excel.integration';
import { JiraIntegration } from './integrations/jira.integration';
import { PrismaService } from '../../common/prisma.service';

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