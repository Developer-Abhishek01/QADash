import { Controller, Post, Get, Delete, Body, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

import { RequirementsService } from './requirements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseDocumentDto, GenerateTestsDto, RequirementsListDto, RequirementAnalysisDto } from './dto/requirements.dto';

@ApiTags('requirements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(@UploadedFile() file: Express.Multer.File, @Body('documentType') documentType: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.requirementsService.uploadDocument(file, documentType || 'FRD');
  }

  @Post('parse')
  parseDocument(@Body() dto: ParseDocumentDto) {
    return this.requirementsService.parseDocument(dto);
  }

  @Get(':id/analysis')
  @ApiOperation({ summary: 'Get full document analysis with all extracted entities' })
  @ApiOkResponse({ type: RequirementAnalysisDto })
  getDocumentAnalysis(@Param('id') id: string) {
    return this.requirementsService.getDocumentAnalysis(id);
  }

  @Post('generate-tests')
  generateTests(@Body() dto: GenerateTestsDto, @Request() req: { user: { id: string } }): Promise<Record<string, unknown>> {
    return this.requirementsService.generateTests({ ...dto, userId: req.user.id });
  }

  @Get()
  findAll(@Query() query: RequirementsListDto) {
    return this.requirementsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }
}
