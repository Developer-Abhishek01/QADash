import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { PrismaService } from '../../common/prisma.service';
import { ExecutionsModule } from '../executions/executions.module';

@Module({
  imports: [ExecutionsModule],
  controllers: [TestsController],
  providers: [TestsService, PrismaService],
  exports: [TestsService],
})
export class TestsModule {}