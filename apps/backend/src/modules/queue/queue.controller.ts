import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { QueueHealthService } from './queue-health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QUEUES } from './queue.constants';

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueHealthService: QueueHealthService,
  ) {}

  @Get('health')
  getHealth() {
    return this.queueHealthService.getHealthStatus();
  }

  @Get('metrics')
  getMetrics() {
    return this.queueHealthService.getMetrics();
  }

  @Get('metrics/:queue')
  getQueueMetrics(@Param('queue') queue: string) {
    return this.queueHealthService.getQueueMetrics(queue);
  }

  @Get('jobs/:queue')
  getJobs(@Param('queue') queue: string, @Query('status') status?: string, @Query('limit') limit = 50) {
    return this.queueHealthService.getJobs(queue, status, limit);
  }

  @Get('failed-jobs')
  getFailedJobs(@Query('queue') queue?: string, @Query('limit') limit = 20) {
    return this.queueHealthService.getFailedJobs(queue, limit);
  }

  @Post('retry/:queue/:jobId')
  retryJob(@Param('queue') queue: string, @Param('jobId') jobId: string) {
    return this.queueHealthService.retryJob(queue, jobId);
  }

  @Post('retry-all/:queue')
  retryAllFailed(@Param('queue') queue: string) {
    return this.queueHealthService.retryAllFailed(queue);
  }

  @Post('remove/:queue/:jobId')
  removeJob(@Param('queue') queue: string, @Param('jobId') jobId: string) {
    return this.queueService.removeJob(queue, jobId);
  }

  @Post('pause/:queue')
  pauseQueue(@Param('queue') queue: string) {
    return this.queueService.pauseQueue(queue);
  }

  @Post('resume/:queue')
  resumeQueue(@Param('queue') queue: string) {
    return this.queueService.resumeQueue(queue);
  }

  @Post('drain/:queue')
  drainQueue(@Param('queue') queue: string) {
    return this.queueService.drainQueue(queue);
  }

  @Get('workers')
  getWorkers() {
    return this.queueHealthService.getWorkerInfo();
  }

  @Post('scale-up')
  scaleUp(@Body() data: { workers: number }) {
    return { message: `Scaled up to ${data.workers} workers (manual scaling)` };
  }

  @Post('scale-down')
  scaleDown(@Body() data: { workers: number }) {
    return { message: `Scaled down to ${data.workers} workers (manual scaling)` };
  }
}