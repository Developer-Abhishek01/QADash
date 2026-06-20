import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GeneratorService, GenerateDto } from './generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RunActionDto } from './dto/run-action.dto';

@ApiTags('generator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('generator')
export class GeneratorController {
  constructor(private readonly generatorService: GeneratorService) {}

  @Post('generate')
  generate(@Body() dto: GenerateDto) {
    return this.generatorService.generate(dto);
  }

  @Post('action')
  runAction(@Body() body: RunActionDto) {
    return this.generatorService.runAction(body.action, body.data);
  }
}
