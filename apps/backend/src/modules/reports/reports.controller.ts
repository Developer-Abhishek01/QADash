import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) { return this.reportsService.findAll(projectId); }
  @Get(':id')
  findOne(@Param('id') id: string) { return this.reportsService.findById(id); }
  @Post()
  create(@Body() data: CreateReportDto, @Request() req: any) {
    return this.reportsService.create({ ...data, userId: req.user.id });
  }
  @Delete('bulk')
  bulkDelete(@Query('ids') ids: string) { return this.reportsService.bulkDelete(ids.split(',')); }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.reportsService.delete(id); }
}