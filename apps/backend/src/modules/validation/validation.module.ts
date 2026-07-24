import { Module } from '@nestjs/common';

import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { ApiValidator } from './validators/api.validator';
import { BusinessValidator } from './validators/business.validator';
import { DynamicValidator } from './validators/dynamic.validator';
import { FormValidator } from './validators/form.validator';
import { SchemaValidator } from './validators/schema.validator';
import { PrismaModule } from '../../common/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ValidationController],
  providers: [
    ValidationService,
    FormValidator,
    ApiValidator,
    SchemaValidator,
    BusinessValidator,
    DynamicValidator,
  ],
  exports: [
    ValidationService,
    FormValidator,
    ApiValidator,
    SchemaValidator,
    BusinessValidator,
    DynamicValidator,
  ],
})
export class ValidationModule {}