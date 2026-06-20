import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

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
  create(@Body() data: CreateEnvironmentDto) { return this.environmentsService.create(data); }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateEnvironmentDto) { return this.environmentsService.update(id, data); }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.environmentsService.delete(id); }
}