import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) { return this.schedulerService.findAll(projectId); }
  @Get(':id')
  findOne(@Param('id') id: string) { return this.schedulerService.findById(id); }
  @Post()
  create(@Body() data: { name: string; projectId: string; type: string; schedule?: string; config?: object }, @Request() req: any) {
    return this.schedulerService.create({ ...data, userId: req.user.id });
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: { name?: string; schedule?: string; config?: object; status?: string }) {
    return this.schedulerService.update(id, data);
  }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.schedulerService.delete(id); }
}