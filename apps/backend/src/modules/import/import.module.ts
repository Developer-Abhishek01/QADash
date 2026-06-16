import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileParserService } from './parsers/file-parser.service';
import { ValidationService } from './validators/validation.service';
import { MappingService } from './services/mapping.service';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [
    PrismaModule,
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