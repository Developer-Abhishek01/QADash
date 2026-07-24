import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileParserService } from './parsers/file-parser.service';
import { MappingService } from './services/mapping.service';
import { ValidationService } from './validators/validation.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({ name: 'file-import' }),
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    FileParserService,
    ValidationService,
    MappingService,
  ],
  exports: [ImportService, FileParserService, ValidationService, MappingService],
})
export class ImportModule {}