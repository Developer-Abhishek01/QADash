import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExecutionDto } from './dto/create-execution.dto';

@ApiTags('executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.executionsService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.executionsService.findById(id);
  }

  @Post()
  create(@Body() data: CreateExecutionDto, @Request() req: any) {
    return this.executionsService.create({ ...data, userId: req.user.id });
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.executionsService.start(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.executionsService.cancel(id);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.retry(id, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.executionsService.delete(id);
  }

  @Get(':id/live-preview')
  getLivePreview(@Param('id') id: string) {
    const preview = this.executionsService.getLivePreview(id);
    if (!preview) {
      return null;
    }
    return preview;
  }
}