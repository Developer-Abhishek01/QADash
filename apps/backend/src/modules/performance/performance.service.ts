import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { K6ExecutionService } from './engine/k6-execution.service';
import { MetricsCollectorService } from './metrics/metrics-collector.service';
import { AlertService } from './alerts/alert.service';
import { CreatePerformanceTestDto, UpdatePerformanceTestDto, TestFilterDto, CreateAlertDto, UpdateAlertDto } from './dto/performance.dto';

@Injectable()
export class PerformanceService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly k6Service: K6ExecutionService,
    private readonly metricsService: MetricsCollectorService,
    private readonly alertService: AlertService,
  ) {}

  async onModuleInit() {
    await this.processScheduledTests();
  }

  async createTest(dto: CreatePerformanceTestDto, userId: string) {
    const test = await this.prisma.performanceTest.create({
      data: {
        name: dto.name,
        description: dto.description,
        projectId: dto.projectId,
        environmentId: dto.environmentId,
        userId,
        testType: dto.testType || 'LOAD',
        script: dto.script,
        config: (dto.config || {}) as any,
        thresholds: (dto.thresholds || {}) as any,
        tags: dto.tags || [],
        isScheduled: dto.isScheduled || false,
        schedule: dto.schedule,
        status: 'DRAFT',
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, baseUrl: true } },
      },
    });

    if (dto.isScheduled && dto.schedule) {
      await this.prisma.performanceSchedule.create({
        data: {
          testId: test.id,
          cronExpr: dto.schedule,
          isActive: true,
        },
      });
    }

    return test;
  }

  async runTest(testId: string) {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id: testId },
      include: { environment: true, project: true },
    });

    if (!test) throw new NotFoundException('Test not found');

    await this.prisma.performanceTest.update({
      where: { id: testId },
      data: { status: 'QUEUED', startedAt: new Date() },
    });

    await this.k6Service.executeTest(test as any);
    return { message: 'Test queued successfully', testId };
  }

  async cancelTest(testId: string) {
    const test = await this.prisma.performanceTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');

    if (!['PENDING', 'QUEUED', 'RUNNING'].includes(test.status)) {
      throw new Error('Cannot cancel test in current status');
    }

    await this.k6Service.cancelTest(testId);

    return this.prisma.performanceTest.update({
      where: { id: testId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async getTests(filter: TestFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.testType) where.testType = filter.testType;

    const [tests, total] = await Promise.all([
      this.prisma.performanceTest.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.offset || 0,
        take: filter.limit || 20,
      }),
      this.prisma.performanceTest.count({ where }),
    ]);

    return { tests, total };
  }

  async getTestById(testId: string) {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id: testId },
      include: {
        project: true,
        environment: true,
        schedules: true,
      },
    });

    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async updateTest(testId: string, dto: UpdatePerformanceTestDto) {
    return this.prisma.performanceTest.update({
      where: { id: testId },
      data: {
        ...dto,
        config: dto.config ? (dto.config as any) : undefined,
        thresholds: dto.thresholds ? (dto.thresholds as any) : undefined,
      },
    });
  }

  async deleteTest(testId: string) {
    await this.prisma.performanceTest.delete({ where: { id: testId } });
    return { message: 'Test deleted successfully' };
  }

  async getTestMetrics(testId: string, options?: { metricType?: string; startTime?: number; endTime?: number; limit?: number }) {
    return this.metricsService.getTestMetrics(testId, options);
  }

  async getRealtimeMetrics(testId: string) {
    return this.metricsService.getRealtimeMetrics(testId);
  }

  async createAlert(dto: CreateAlertDto) {
    return this.alertService.createAlert(dto);
  }

  async updateAlert(alertId: string, dto: UpdateAlertDto) {
    return this.alertService.updateAlert(alertId, dto);
  }

  async deleteAlert(alertId: string) {
    return this.alertService.deleteAlert(alertId);
  }

  async getAlerts(projectId: string, testId?: string) {
    return this.alertService.getAlerts(projectId, testId);
  }

  async getAlertEvents(projectId: string, unreadOnly?: boolean) {
    return this.alertService.getAlertEvents(projectId, unreadOnly);
  }

  async markAlertRead(alertId: string) {
    return this.alertService.markAlertRead(alertId);
  }

  async getDashboardStats(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const [
      totalTests,
      testsByStatus,
      testsByType,
      recentTests,
      activeTests,
    ] = await Promise.all([
      this.prisma.performanceTest.count({ where }),
      this.prisma.performanceTest.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.performanceTest.groupBy({
        by: ['testType'],
        where,
        _avg: { avgResponseTime: true, errorRate: true },
        _count: true,
      }),
      this.prisma.performanceTest.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      this.prisma.performanceTest.findMany({
        where: { ...where, status: 'RUNNING' },
        include: { project: { select: { name: true } } },
      }),
    ]);

    const avgResponseTime = testsByType.reduce((sum, t) => sum + (t._avg.avgResponseTime || 0), 0) / (testsByType.length || 1);
    const avgErrorRate = testsByType.reduce((sum, t) => sum + (t._avg.errorRate || 0), 0) / (testsByType.length || 1);

    return {
      totalTests,
      testsByStatus: Object.fromEntries(testsByStatus.map((t) => [t.status, t._count])),
      testsByType: Object.fromEntries(testsByType.map((t) => [t.testType, { count: t._count, avgResponse: t._avg.avgResponseTime, avgError: t._avg.errorRate }])),
      recentTests,
      activeTests,
      overallStats: { avgResponseTime, avgErrorRate },
    };
  }

  async getHistoricalAnalytics(projectId: string, timeRange: '24h' | '7d' | '30d' | '90d') {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    const completedTests = await this.prisma.performanceTest.findMany({
      where: {
        projectId,
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        name: true,
        completedAt: true,
        avgResponseTime: true,
        p95ResponseTime: true,
        p99ResponseTime: true,
        avgThroughput: true,
        errorRate: true,
        totalRequests: true,
        maxVus: true,
      },
    });

    const metrics = await this.prisma.performanceMetric.findMany({
      where: {
        test: { projectId },
        timestamp: { gte: startDate },
        metricType: 'HTTP_REQ_DURATION',
      },
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });

    return { completedTests, metrics };
  }

  private async processScheduledTests() {
    const schedules = await this.prisma.performanceSchedule.findMany({
      where: { isActive: true },
      include: { test: { include: { environment: true } } },
    });

    for (const schedule of schedules) {
      if (schedule.nextRunAt && schedule.nextRunAt <= new Date()) {
        await this.runTest(schedule.testId);

        const cron = require('cron-parser');
        const next = cron.parseExpression(schedule.cronExpr).next().toDate();
        await this.prisma.performanceSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), nextRunAt: next },
        });
      }
    }
  }
}