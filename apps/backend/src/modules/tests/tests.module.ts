import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { PrismaService } from '../../common/prisma.service';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [ExecutionsModule, HttpModule],
  controllers: [TestsController],
  providers: [TestsService, PrismaService],
  exports: [TestsService],
})
export class TestsModule {}