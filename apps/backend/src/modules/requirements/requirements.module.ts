import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';
import { PrismaModule } from '../../common/prisma.module';
import { TestsModule } from '../tests/tests.module';

@Module({
  imports: [PrismaModule, HttpModule, TestsModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
