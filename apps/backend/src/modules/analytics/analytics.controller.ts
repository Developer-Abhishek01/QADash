import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardStats() { return this.analyticsService.getDashboardStats(); }

  @Get('overview')
  getOverview() { return this.analyticsService.getOverview(); }

  @Get('trends')
  getTrends(@Query('projectId') projectId?: string, @Query('days') days?: string) {
    return this.analyticsService.getTrends({ projectId, days: days ? parseInt(days, 10) : undefined });
  }

  @Get('flaky')
  getFlakyTests(@Query('projectId') projectId?: string, @Query('threshold') threshold?: string) {
    return this.analyticsService.getFlakyTests({ projectId, threshold: threshold ? parseInt(threshold, 10) : undefined });
  }

  @Get('coverage')
  getCoverage(@Query('projectId') projectId?: string) {
    return this.analyticsService.getCoverage({ projectId });
  }

  @Get('projects/:projectId')
  getProjectStats(@Param('projectId') projectId: string) { return this.analyticsService.getProjectStats(projectId); }
}
