import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { AIIntegrationService } from './ai-integration.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../../common/prisma.service';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [HttpModule, forwardRef(() => OrchestrationModule)],
  controllers: [AiController],
  providers: [AiService, AIIntegrationService, PrismaService],
  exports: [AiService, AIIntegrationService],
})
export class AiModule {}