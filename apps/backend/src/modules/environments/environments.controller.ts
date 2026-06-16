import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('environments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) { return this.environmentsService.findAll(projectId); }
  @Get(':id')
  findOne(@Param('id') id: string) { return this.environmentsService.findById(id); }
  @Post()
  create(@Body() data: { name: string; projectId: string; type: string; baseUrl: string; variables?: object }) {
    return this.environmentsService.create(data);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: { name?: string; type?: string; baseUrl?: string; variables?: object; isActive?: boolean }) {
    return this.environmentsService.update(id, data);
  }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.environmentsService.delete(id); }
}