import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

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
  create(@Body() data: CreateScheduleDto, @Request() req: any) {
    return this.schedulerService.create({ ...data, userId: req.user.id });
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateScheduleDto) { return this.schedulerService.update(id, data); }
  @Delete(':id')
  delete(@Param('id') id: string) { return this.schedulerService.delete(id); }
}