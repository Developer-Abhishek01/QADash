import { Module } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService, PrismaService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}