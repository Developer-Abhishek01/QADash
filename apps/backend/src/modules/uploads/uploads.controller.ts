import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.uploadsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.uploadsService.findById(id);
  }

  @Post()
  create(@Body() data: { filename: string; originalName: string; mimeType: string; size: number; path: string; userId: string }) {
    return this.uploadsService.create(data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.uploadsService.delete(id);
  }
}
