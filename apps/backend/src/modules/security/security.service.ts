import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SecurityQueueService } from './queues/security-queue.service';
import { CreateScanDto, UpdateScanDto, VulnerabilityFilterDto, ScanFilterDto } from './dto/security.dto';

@Injectable()
export class SecurityService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: SecurityQueueService,
  ) {}

  async onModuleInit() {
    await this.processScheduledScans();
  }

  async createScan(dto: CreateScanDto, userId: string) {
    const scan = await this.prisma.securityScan.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        environmentId: dto.environmentId,
        userId,
        scanType: dto.scanType || 'QUICK',
        config: (dto.config || {}) as any,
        schedule: dto.schedule,
        isScheduled: dto.isScheduled || false,
        status: 'PENDING',
      },
      include: {
        project: true,
        environment: true,
      },
    });

    if (dto.isScheduled && dto.schedule) {
      await this.prisma.scanSchedule.create({
        data: {
          scanId: scan.id,
          cronExpr: dto.schedule,
          isActive: true,
        },
      });
    }

    return scan;
  }

  async startScan(scanId: string) {
    const scan = await this.prisma.securityScan.findUnique({
      where: { id: scanId },
      include: { environment: true } as any,
    });
    if (!scan) throw new NotFoundException('Scan not found');

    await this.queueService.addSecurityScanJob({
      scanId: scan.id,
      projectId: scan.projectId,
      environmentId: scan.environmentId,
      baseUrl: (scan as any).environment.baseUrl,
      config: (scan.config as any) || {},
      scanType: scan.scanType,
    });

    return { message: 'Scan queued' };
  }

  async getScans(filter: ScanFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.scanType) where.scanType = filter.scanType;

    const [scans, total] = await Promise.all([
      this.prisma.securityScan.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
          _count: { select: { vulnerabilities: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.offset || 0,
        take: filter.limit || 20,
      }),
      this.prisma.securityScan.count({ where }),
    ]);

    return { scans, total };
  }

  async getScanById(scanId: string) {
    const scan = await this.prisma.securityScan.findUnique({
      where: { id: scanId },
      include: {
        project: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true, baseUrl: true } },
        vulnerabilities: true,
      } as any,
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  async updateScan(scanId: string, dto: UpdateScanDto) {
    const data: any = { ...dto };
    if (dto.config) data.config = dto.config as any;
    
    return this.prisma.securityScan.update({
      where: { id: scanId },
      data,
    });
  }

  async cancelScan(scanId: string) {
    const scan = await this.prisma.securityScan.findUnique({ where: { id: scanId } });
    if (!scan) throw new NotFoundException('Scan not found');

    if (!['PENDING', 'QUEUED', 'RUNNING'].includes(scan.status)) {
      throw new Error('Cannot cancel scan in current status');
    }

    return this.prisma.securityScan.update({
      where: { id: scanId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async getVulnerabilities(filter: VulnerabilityFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.scanId) where.scanId = filter.scanId;
    if (filter.severity) where.severity = filter.severity;
    if (filter.status) where.status = filter.status;
    if (filter.owaspCategory) where.owaspCategory = filter.owaspCategory;

    const [vulnerabilities, total] = await Promise.all([
      this.prisma.vulnerability.findMany({
        where,
        include: {
          scan: { select: { id: true, name: true, projectId: true } },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: filter.offset || 0,
        take: filter.limit || 50,
      }),
      this.prisma.vulnerability.count({ where }),
    ]);

    return { vulnerabilities, total };
  }

  async updateVulnerabilityStatus(vulnId: string, status: string, reason?: string) {
    const data: Record<string, unknown> = { status };
    if (status === 'FALSE_POSITIVE' && reason) data.falsePositiveReason = reason;
    if (status === 'ACCEPTED' && reason) data.acceptedRisk = reason;
    if (status === 'REMEDIATED') data.resolvedAt = new Date();

    return this.prisma.vulnerability.update({
      where: { id: vulnId },
      data,
    });
  }

  async getDashboardStats(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const [
      totalScans,
      scansByStatus,
      vulnerabilitiesBySeverity,
      recentVulnerabilities,
      owaspStats,
      environmentStats,
    ] = await Promise.all([
      this.prisma.securityScan.count({ where }),
      this.prisma.securityScan.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.vulnerability.groupBy({
        by: ['severity'],
        _count: true,
      }),
      this.prisma.vulnerability.findMany({
        where: { scan: { projectId } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { scan: { select: { name: true, projectId: true } } },
      }),
      this.prisma.vulnerability.groupBy({
        by: ['owaspCategory'],
        _count: true,
      }),
      this.prisma.securityScan.groupBy({
        by: ['status'],
        where,
        _avg: { criticalCount: true, highCount: true, mediumCount: true },
      }),
    ]);

    const critical = vulnerabilitiesBySeverity.find((v) => v.severity === 'CRITICAL')?._count || 0;
    const high = vulnerabilitiesBySeverity.find((v) => v.severity === 'HIGH')?._count || 0;
    const medium = vulnerabilitiesBySeverity.find((v) => v.severity === 'MEDIUM')?._count || 0;
    const low = vulnerabilitiesBySeverity.find((v) => v.severity === 'LOW')?._count || 0;
    const info = vulnerabilitiesBySeverity.find((v) => v.severity === 'INFO')?._count || 0;

    return {
      totalScans,
      scansByStatus: Object.fromEntries(scansByStatus.map((s) => [s.status, s._count])),
      vulnerabilitiesBySeverity: { critical, high, medium, low, info },
      totalVulnerabilities: critical + high + medium + low + info,
      recentVulnerabilities,
      owaspStats: Object.fromEntries(owaspStats.map((o) => [o.owaspCategory, o._count])),
      environmentStats,
    };
  }

  async runDependencyScan(projectId: string, userId: string, packageManager: string) {
    const scan = await this.prisma.dependencyScan.create({
      data: {
        projectId,
        userId,
        packageManager,
        status: 'PENDING',
      },
    });

    await this.queueService.addDependencyScanJob({
      scanId: scan.id,
      projectId,
      packageManager,
    });

    return { message: 'Dependency scan queued', scanId: scan.id };
  }

  async getDependencyScans(projectId: string) {
    return this.prisma.dependencyScan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlerts(projectId: string, unreadOnly = false) {
    const where: Record<string, unknown> = { projectId };
    if (unreadOnly) where.isRead = false;

    return this.prisma.securityAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertRead(alertId: string) {
    return this.prisma.securityAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }

  async createAlert(projectId: string, data: {
    type: string;
    severity: string;
    title: string;
    message: string;
    scanId?: string;
    vulnerabilityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.securityAlert.create({
      data: {
        projectId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        scanId: data.scanId,
        vulnerabilityId: data.vulnerabilityId,
        metadata: data.metadata as any,
      },
    });
  }

  private async processScheduledScans() {
    const schedules = await this.prisma.scanSchedule.findMany({
      where: { isActive: true },
      include: { scan: { include: { environment: true } } },
    });

    for (const schedule of schedules) {
      if (schedule.nextRunAt && schedule.nextRunAt <= new Date()) {
        await this.startScan(schedule.scanId);

        const cron = require('cron-parser');
        const next = cron.parseExpression(schedule.cronExpr).next().toDate();
        await this.prisma.scanSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), nextRunAt: next },
        });
      }
    }
  }
}