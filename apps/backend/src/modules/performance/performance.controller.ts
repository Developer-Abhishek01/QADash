import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import {
  CreatePerformanceTestDto,
  UpdatePerformanceTestDto,
  TestFilterDto,
  CreateAlertDto,
  UpdateAlertDto,
  MetricsQueryDto,
} from './dto/performance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('tests')
  @ApiOperation({ summary: 'Create a new performance test' })
  async createTest(@Body() dto: CreatePerformanceTestDto, @Request() req: { user: { id: string } }) {
    return this.performanceService.createTest(dto, req.user.id);
  }

  @Post('tests/:id/run')
  @ApiOperation({ summary: 'Run a performance test' })
  async runTest(@Param('id') id: string) {
    return this.performanceService.runTest(id);
  }

  @Post('tests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a running test' })
  async cancelTest(@Param('id') id: string) {
    return this.performanceService.cancelTest(id);
  }

  @Get('tests')
  @ApiOperation({ summary: 'Get all performance tests' })
  async getTests(@Query() filter: TestFilterDto) {
    return this.performanceService.getTests(filter);
  }

  @Get('tests/:id')
  @ApiOperation({ summary: 'Get performance test by ID' })
  async getTestById(@Param('id') id: string) {
    return this.performanceService.getTestById(id);
  }

  @Put('tests/:id')
  @ApiOperation({ summary: 'Update performance test' })
  async updateTest(@Param('id') id: string, @Body() dto: UpdatePerformanceTestDto) {
    return this.performanceService.updateTest(id, dto);
  }

  @Delete('tests/:id')
  @ApiOperation({ summary: 'Delete performance test' })
  async deleteTest(@Param('id') id: string) {
    return this.performanceService.deleteTest(id);
  }

  @Get('tests/:id/metrics')
  @ApiOperation({ summary: 'Get test metrics' })
  async getTestMetrics(@Param('id') id: string, @Query() query: MetricsQueryDto) {
    return this.performanceService.getTestMetrics(id, {
      metricType: query.metricType,
      startTime: query.startTime,
      endTime: query.endTime,
      limit: query.limit,
    });
  }

  @Get('tests/:id/realtime')
  @ApiOperation({ summary: 'Get realtime metrics' })
  async getRealtimeMetrics(@Param('id') id: string) {
    return this.performanceService.getRealtimeMetrics(id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get performance dashboard stats' })
  async getDashboardStats(@Query('projectId') projectId?: string) {
    return this.performanceService.getDashboardStats(projectId);
  }

  @Get('analytics/historical')
  @ApiOperation({ summary: 'Get historical analytics' })
  async getHistoricalAnalytics(
    @Query('projectId') projectId: string,
    @Query('timeRange') timeRange: '24h' | '7d' | '30d' | '90d' = '7d',
  ) {
    return this.performanceService.getHistoricalAnalytics(projectId, timeRange);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create threshold alert' })
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.performanceService.createAlert(dto);
  }

  @Put('alerts/:id')
  @ApiOperation({ summary: 'Update threshold alert' })
  async updateAlert(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.performanceService.updateAlert(id, dto);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete threshold alert' })
  async deleteAlert(@Param('id') id: string) {
    return this.performanceService.deleteAlert(id);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get threshold alerts' })
  async getAlerts(@Query('projectId') projectId: string, @Query('testId') testId?: string) {
    return this.performanceService.getAlerts(projectId, testId);
  }

  @Get('alerts/events')
  @ApiOperation({ summary: 'Get alert events' })
  async getAlertEvents(@Query('projectId') projectId: string, @Query('unreadOnly') unreadOnly?: boolean) {
    return this.performanceService.getAlertEvents(projectId, unreadOnly === true);
  }

  @Put('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  async markAlertRead(@Param('id') id: string) {
    return this.performanceService.markAlertRead(id);
  }
}