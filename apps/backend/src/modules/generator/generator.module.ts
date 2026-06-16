import { Module } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { GeneratorController } from './generator.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [GeneratorController],
  providers: [GeneratorService, PrismaService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
