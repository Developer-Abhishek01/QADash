import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateAlertDto, UpdateAlertDto } from '../dto/performance.dto';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAlert(dto: CreateAlertDto) {
    const alert = await this.prisma.thresholdAlert.create({
      data: {
        name: dto.name,
        testId: dto.testId,
        projectId: dto.projectId,
        metricType: dto.metricType,
        condition: dto.condition,
        threshold: dto.threshold,
        comparison: dto.condition,
        severity: dto.severity || 'WARNING',
        isEnabled: true,
      },
    });

    return alert;
  }

  async updateAlert(alertId: string, dto: UpdateAlertDto) {
    return this.prisma.thresholdAlert.update({
      where: { id: alertId },
      data: {
        name: dto.name,
        threshold: dto.threshold,
        condition: dto.condition,
        isEnabled: dto.isEnabled,
        severity: dto.severity,
      },
    });
  }

  async deleteAlert(alertId: string) {
    await this.prisma.thresholdAlert.delete({ where: { id: alertId } });
    return { message: 'Alert deleted successfully' };
  }

  async getAlerts(projectId: string, testId?: string) {
    const where: Record<string, unknown> = { projectId };
    if (testId) where.testId = testId;

    return this.prisma.thresholdAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlertEvents(projectId: string, unreadOnly?: boolean) {
    const where: Record<string, unknown> = { projectId };
    if (unreadOnly) where.isRead = false;

    return this.prisma.alertEvent.findMany({
      where,
      include: {
        alert: { select: { name: true, metricType: true, severity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertRead(alertId: string) {
    return this.prisma.alertEvent.updateMany({
      where: { alertId },
      data: { isRead: true },
    });
  }

  async checkThresholds(testId: string): Promise<void> {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id: testId },
      include: {
        environment: true,
        project: { select: { id: true, name: true } },
      },
    });

    if (!test) return;

    const alerts = await this.prisma.thresholdAlert.findMany({
      where: {
        OR: [{ testId }, { testId: null }],
        projectId: test.projectId,
        isEnabled: true,
      },
    });

    for (const alert of alerts) {
      const value = this.getMetricValue(test, alert.metricType);

      if (value !== null && this.shouldTrigger(value, alert.threshold, alert.comparison)) {
        await this.triggerAlert(alert, test, value);
      }
    }
  }

  private getMetricValue(test: any, metricType: string): number | null {
    switch (metricType) {
      case 'avg_response_time':
        return test.avgResponseTime;
      case 'p95_response_time':
        return test.p95ResponseTime;
      case 'p99_response_time':
        return test.p99ResponseTime;
      case 'error_rate':
        return test.errorRate;
      case 'avg_throughput':
        return test.avgThroughput;
      case 'max_vus':
        return test.maxVus;
      default:
        return null;
    }
  }

  private shouldTrigger(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt':
      case '>':
        return value > threshold;
      case 'gte':
      case '>=':
        return value >= threshold;
      case 'lt':
      case '<':
        return value < threshold;
      case 'lte':
      case '<=':
        return value <= threshold;
      case 'eq':
      case '==':
        return value === threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: any, test: any, metricValue: number): Promise<void> {
    const severityLabels: Record<string, string> = {
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'critical',
    };

    const event = await this.prisma.alertEvent.create({
      data: {
        alertId: alert.id,
        testId: test.id,
        projectId: test.projectId,
        metricValue,
        message: `Threshold exceeded: ${alert.metricType} = ${metricValue.toFixed(2)} (threshold: ${alert.threshold})`,
      },
    });

    await this.prisma.thresholdAlert.update({
      where: { id: alert.id },
      data: {
        lastTriggered: new Date(),
        triggeredCount: { increment: 1 },
      },
    });

    this.eventEmitter.emit('performance.alert', {
      alertId: alert.id,
      testId: test.id,
      projectId: test.projectId,
      severity: severityLabels[alert.severity] || 'warning',
      title: alert.name,
      message: `Threshold exceeded in test "${test.name}": ${alert.metricType} = ${metricValue.toFixed(2)} (threshold: ${alert.threshold})`,
      metricType: alert.metricType,
      metricValue,
      threshold: alert.threshold,
    });

    this.logger.warn(`Alert triggered: ${alert.name} for test ${test.id} (value: ${metricValue}, threshold: ${alert.threshold})`);
  }
}