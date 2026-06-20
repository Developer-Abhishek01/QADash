import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrchestrationService, OrchestrationJob, ServiceHealth } from './orchestration.service';
import { QueueService } from './services/queue.service';
import { EventHubService } from './services/event-hub.service';
import { ExecuteOptionsDto } from './dto/execute-options.dto';
import { ScaleServiceDto } from './dto/scale-service.dto';

@ApiTags('Orchestration')
@Controller('api/v1/orchestration')
export class OrchestrationController {
  constructor(
    private readonly orchestrationService: OrchestrationService,
    private readonly queueService: QueueService,
    private readonly eventHubService: EventHubService,
  ) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Submit a new orchestration job' })
  @ApiResponse({ status: 201, description: 'Job submitted successfully' })
  async submitJob(@Body() job: OrchestrationJob) {
    const jobId = await this.orchestrationService.submitJob(job);
    return { jobId, status: 'queued' };
  }

  @Post('jobs/batch')
  @ApiOperation({ summary: 'Submit multiple jobs as a batch' })
  @ApiResponse({ status: 201, description: 'Batch submitted successfully' })
  async submitBatch(@Body() jobs: OrchestrationJob[]) {
    const jobIds = await this.orchestrationService.submitBatch(jobs);
    return { jobIds, count: jobs.length, status: 'queued' };
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  async getJobStatus(@Param('id') id: string) {
    const status = await this.orchestrationService.getJobStatus(id);
    return status;
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(@Param('id') id: string) {
    const cancelled = await this.orchestrationService.cancelJob(id);
    return { cancelled };
  }

  @Post('execute/:executionId')
  @ApiOperation({ summary: 'Orchestrate a full execution with multiple test types' })
  @ApiResponse({ status: 201, description: 'Execution orchestrated successfully' })
  async orchestrateExecution(
    @Param('executionId') executionId: string,
    @Body() options: ExecuteOptionsDto,
  ) {
    const result = await this.orchestrationService.orchestrateExecution(executionId, options as any);
    return result;
  }

  @Get('services/health')
  @ApiOperation({ summary: 'Get health status of all services' })
  @ApiResponse({ status: 200, description: 'Service health retrieved' })
  async getServiceHealth(): Promise<ServiceHealth[]> {
    return this.orchestrationService.getServiceHealth();
  }

  @Post('services/:name/scale')
  @ApiOperation({ summary: 'Scale a service' })
  @ApiQuery({ name: 'replicas', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Service scaling initiated' })
  async scaleService(@Param('name') name: string, @Body() body: ScaleServiceDto) {
    await this.orchestrationService.scaleService(name, body.replicas);
    return { service: name, replicas: body.replicas, status: 'scaling' };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEvents(@Query('limit') limit = 100) {
    return this.eventHubService.getRecentEvents(limit);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    return this.queueService.getStats();
  }
}