import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';

import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateImportDto, SaveMappingsDto, ProcessImportDto, ImportFilterDto } from './dto/import.dto';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';


@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file for import' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('projectId') projectId: string,
    @Request() req: { user: { id: string } },
  ) {
    if (!file) throw new Error('No file uploaded');
    return this.importService.uploadFile(projectId, req.user.id, file);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create import with parsed file' })
  async createImport(
    @Body() dto: CreateImportDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.importService.createImport(dto, req.user.id, { filename: '', originalname: '', mimetype: '', size: 0 } as any);
  }

  @Post(':id/parse')
  @ApiOperation({ summary: 'Parse uploaded file' })
  async parseFile(@Param('id') id: string) {
    return this.importService.parseFile(id);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all imports' })
  async getImports(@Query() filter: ImportFilterDto) {
    return this.importService.getImports(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get import by ID' })
  async getImportById(@Param('id') id: string) {
    return this.importService.getImportById(id);
  }

  @Post('mappings/save')
  @ApiOperation({ summary: 'Save field mappings' })
  async saveMappings(@Body() dto: SaveMappingsDto) {
    return this.importService.saveMappings(dto);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process import with mappings' })
  async processImport(@Param('id') id: string) {
    return this.importService.processImport(id);
  }

  @Post(':id/process-ai')
  @ApiOperation({ summary: 'Process import with AI pipeline - auto generate test cases' })
  async processImportWithAI(@Param('id') id: string, @Request() req: any) {
    return this.importService.processImportWithAI(id, req.user.id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Get preview data' })
  async getPreviewData(
    @Param('id') id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importService.getPreviewData(
      id,
      offset ? parseInt(offset, 10) : 0,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id/errors')
  @ApiOperation({ summary: 'Get import errors' })
  async getErrors(@Param('id') id: string) {
    return this.importService.getErrors(id);
  }

  @Put('errors/:id/resolve')
  @ApiOperation({ summary: 'Resolve an error' })
  async resolveError(@Param('id') id: string) {
    return this.importService.resolveError(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete import' })
  async deleteImport(@Param('id') id: string) {
    return this.importService.deleteImport(id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get import templates' })
  async getTemplates(@Query('projectId') projectId: string) {
    return this.importService.getTemplates(projectId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create import template' })
  async createTemplate(@Body() body: CreateTemplateDto) {
    return this.importService.createTemplate(body);
  }
}