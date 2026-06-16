import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GeneratorService, GenerateDto } from './generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  runAction(@Body() body: { action: string; data: any }) {
    return this.generatorService.runAction(body.action, body.data);
  }
}
