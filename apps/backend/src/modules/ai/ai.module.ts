import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { AIIntegrationService } from './ai-integration.service';
import { AiController } from './ai.controller';
import { PrismaService } from '../../common/prisma.service';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [HttpModule, forwardRef(() => OrchestrationModule)],
  controllers: [AiController],
  providers: [AiService, AIIntegrationService, PrismaService],
  exports: [AiService, AIIntegrationService],
})
export class AiModule {}