import { Controller, Get, Post, Body, Param, Query, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,
  ) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  }

  @Get('metrics/json')
  async getMetricsJSON(): Promise<Record<string, unknown>> {
    return this.metricsService.getMetricsAsJSON();
  }

  @Post('metrics/custom')
  recordCustomMetric(
    @Body() body: { name: string; value: number; labels?: Record<string, string> },
  ): { success: boolean } {
    return { success: true };
  }

  @Get('health')
  async getHealth(): Promise<Record<string, unknown>> {
    return this.healthService.getHealthStatus();
  }

  @Get('health/detailed')
  async getDetailedHealth(): Promise<Record<string, unknown>> {
    return this.healthService.getDetailedHealth();
  }

  @Get('health/ready')
  async getReadiness(): Promise<Record<string, unknown>> {
    return this.healthService.getReadiness();
  }

  @Get('health/live')
  async getLiveness(): Promise<Record<string, unknown>> {
    return this.healthService.getLiveness();
  }

  @Get('status')
  async getStatus(): Promise<Record<string, unknown>> {
    return this.healthService.getSystemStatus();
  }

  @Get('system')
  async getSystemInfo(): Promise<Record<string, unknown>> {
    return this.healthService.getSystemInfo();
  }

  @Get('queue')
  async getQueueStats(): Promise<Record<string, unknown>> {
    return this.healthService.getQueueStats();
  }

  @Get('queue/:name')
  async getQueueByName(@Param('name') name: string): Promise<Record<string, unknown>> {
    return this.healthService.getQueueStatsByName(name);
  }

  @Get('executions/stats')
  async getExecutionStats(@Query('period') period?: string): Promise<Record<string, unknown>> {
    return this.healthService.getExecutionStats(period);
  }

  @Get('ai/stats')
  async getAIStats(@Query('period') period?: string): Promise<Record<string, unknown>> {
    return this.healthService.getAIStats(period);
  }

  @Get('workers')
  async getWorkersStats(): Promise<Record<string, unknown>> {
    return this.healthService.getWorkersStats();
  }

  @Get('infrastructure')
  async getInfrastructureHealth(): Promise<Record<string, unknown>> {
    return this.healthService.getInfrastructureHealth();
  }
}