import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AxeExecutionService } from './engine/axe-execution.service';
import { AccessibilityReportService } from './reports/accessibility-report.service';
import { CreateAccessibilityTestDto, UpdateAccessibilityTestDto, AccessibilityTestFilterDto, IssueFilterDto, ResolveIssueDto, CreateBaselineDto } from './dto/accessibility.dto';

@Injectable()
export class AccessibilityService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly axeService: AxeExecutionService,
    private readonly reportService: AccessibilityReportService,
  ) {}

  async onModuleInit() {
    await this.processScheduledTests();
  }

  async createTest(dto: CreateAccessibilityTestDto, userId: string) {
    const test = await this.prisma.accessibilityTest.create({
      data: {
        name: dto.name,
        description: dto.description,
        projectId: dto.projectId,
        environmentId: dto.environmentId,
        userId,
        urls: dto.urls,
        wcagLevel: dto.wcagLevel || 'AA',
        config: (dto.config || {}) as any,
        isScheduled: dto.isScheduled || false,
        schedule: dto.schedule,
        status: 'PENDING',
      },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, baseUrl: true } },
      },
    });

    if (dto.isScheduled && dto.schedule) {
      await this.prisma.accessibilitySchedule.create({
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
    const test = await this.prisma.accessibilityTest.findUnique({
      where: { id: testId },
      include: { environment: true, project: true },
    });

    if (!test) throw new NotFoundException('Test not found');

    await this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: { status: 'QUEUED', startedAt: new Date() },
    });

    await this.axeService.executeAccessibilityScan(test);
    return { message: 'Test queued successfully', testId };
  }

  async cancelTest(testId: string) {
    const test = await this.prisma.accessibilityTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');

    if (!['PENDING', 'QUEUED', 'RUNNING'].includes(test.status)) {
      throw new Error('Cannot cancel test in current status');
    }

    return this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async getTests(filter: AccessibilityTestFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;

    const [tests, total] = await Promise.all([
      this.prisma.accessibilityTest.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
          _count: { select: { issues: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.offset || 0,
        take: filter.limit || 20,
      }),
      this.prisma.accessibilityTest.count({ where }),
    ]);

    return { tests, total };
  }

  async getTestById(testId: string) {
    const test = await this.prisma.accessibilityTest.findUnique({
      where: { id: testId },
      include: {
        project: true,
        environment: true,
        issues: { orderBy: { impact: 'desc' } },
        schedules: true,
      },
    });

    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async updateTest(testId: string, dto: UpdateAccessibilityTestDto) {
    return this.prisma.accessibilityTest.update({
      where: { id: testId },
      data: {
        name: dto.name,
        description: dto.description,
        urls: dto.urls,
        wcagLevel: dto.wcagLevel,
        config: dto.config as any,
      },
    });
  }

  async deleteTest(testId: string) {
    await this.prisma.accessibilityTest.delete({ where: { id: testId } });
    return { message: 'Test deleted successfully' };
  }

  async getIssues(filter: IssueFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.testId) where.testId = filter.testId;
    if (filter.impact) where.impact = filter.impact;
    if (filter.isResolved !== undefined) where.isResolved = filter.isResolved;
    if (filter.category) where.category = filter.category;

    const issues = await this.prisma.accessibilityIssue.findMany({
      where,
      include: {
        test: { select: { name: true, projectId: true } },
      },
      orderBy: [{ impact: 'desc' }, { createdAt: 'desc' }],
    });

    return issues;
  }

  async resolveIssue(issueId: string, dto: ResolveIssueDto) {
    return this.prisma.accessibilityIssue.update({
      where: { id: issueId },
      data: {
        isResolved: dto.isResolved,
        resolutionNote: dto.resolutionNote,
        resolvedAt: dto.isResolved ? new Date() : null,
      },
    });
  }

  async createBaseline(dto: CreateBaselineDto) {
    const test = dto.testId
      ? await this.prisma.accessibilityTest.findUnique({ where: { id: dto.testId } })
      : null;

    const issues = await this.prisma.accessibilityIssue.findMany({
      where: { testId: dto.testId },
    });

    const issuesByImpact = {
      CRITICAL: issues.filter((i) => i.impact === 'CRITICAL').length,
      SERIOUS: issues.filter((i) => i.impact === 'SERIOUS').length,
      MODERATE: issues.filter((i) => i.impact === 'MODERATE').length,
      MINOR: issues.filter((i) => i.impact === 'MINOR').length,
    };

    const wcagCoverage: Record<string, number> = {};
    for (const issue of issues) {
      for (const criterion of issue.wcagCriteria || []) {
        wcagCoverage[criterion] = (wcagCoverage[criterion] || 0) + 1;
      }
    }

    return this.prisma.accessibilityBaseline.create({
      data: {
        projectId: dto.projectId,
        testId: dto.testId,
        name: dto.name,
        score: test?.score || 0,
        issuesByImpact,
        wcagCoverage,
        snapshot: { issueCount: issues.length, urls: test?.urls || [] },
      },
    });
  }

  async getBaselines(projectId: string) {
    return this.prisma.accessibilityBaseline.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardStats(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const [
      totalTests,
      testsByStatus,
      issuesByImpact,
      recentTests,
      activeTests,
      avgScore,
    ] = await Promise.all([
      this.prisma.accessibilityTest.count({ where }),
      this.prisma.accessibilityTest.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.accessibilityIssue.groupBy({
        by: ['impact'],
        where: { test: where },
        _count: true,
      }),
      this.prisma.accessibilityTest.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { name: true } } },
      }),
      this.prisma.accessibilityTest.findMany({
        where: { ...where, status: 'RUNNING' },
        include: { project: { select: { name: true } } },
      }),
      this.prisma.accessibilityTest.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { score: true },
      }),
    ]);

    const critical = issuesByImpact.find((i) => i.impact === 'CRITICAL')?._count || 0;
    const serious = issuesByImpact.find((i) => i.impact === 'SERIOUS')?._count || 0;
    const moderate = issuesByImpact.find((i) => i.impact === 'MODERATE')?._count || 0;
    const minor = issuesByImpact.find((i) => i.impact === 'MINOR')?._count || 0;

    return {
      totalTests,
      testsByStatus: Object.fromEntries(testsByStatus.map((t) => [t.status, t._count])),
      issuesByImpact: { critical, serious, moderate, minor },
      totalIssues: critical + serious + moderate + minor,
      recentTests,
      activeTests,
      avgScore: avgScore._avg.score || 0,
    };
  }

  async generateReport(testId: string, format: 'json' | 'html' | 'pdf') {
    return this.reportService.generateReport(testId, format);
  }

  private async processScheduledTests() {
    const schedules = await this.prisma.accessibilitySchedule.findMany({
      where: { isActive: true },
      include: { test: { include: { environment: true } } },
    });

    for (const schedule of schedules) {
      if (schedule.nextRunAt && schedule.nextRunAt <= new Date()) {
        await this.runTest(schedule.testId);

        const cron = require('cron-parser');
        const next = cron.parseExpression(schedule.cronExpr).next().toDate();
        await this.prisma.accessibilitySchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), nextRunAt: next },
        });
      }
    }
  }
}