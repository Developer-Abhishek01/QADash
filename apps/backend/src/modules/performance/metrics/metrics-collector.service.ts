import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface MetricData {
  metricType: string;
  metricName: string;
  value: number;
  timestamp?: Date;
  tags?: Record<string, string>;
}

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private realtimeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private recentMetrics: Map<string, MetricData[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async recordMetric(testId: string, data: MetricData): Promise<void> {
    try {
      await this.prisma.performanceMetric.create({
        data: {
          testId,
          timestamp: data.timestamp || new Date(),
          metricType: data.metricType as any,
          metricName: data.metricName,
          value: data.value,
          tags: data.tags || {},
        },
      });

      this.addToRecentMetrics(testId, data);

      this.eventEmitter.emit('metrics.recorded', {
        testId,
        metric: data,
      });
    } catch (error) {
      this.logger.error(`Failed to record metric for test ${testId}: ${error}`);
    }
  }

  async recordBatchMetrics(testId: string, metrics: MetricData[]): Promise<void> {
    if (metrics.length === 0) return;

    try {
      const data = metrics.map((m) => ({
        testId,
        timestamp: m.timestamp || new Date(),
        metricType: m.metricType as any,
        metricName: m.metricName,
        value: m.value,
        tags: m.tags || {},
      }));

      await this.prisma.performanceMetric.createMany({
        data,
      });

      for (const metric of metrics) {
        this.addToRecentMetrics(testId, metric);
      }
    } catch (error) {
      this.logger.error(`Failed to record batch metrics for test ${testId}: ${error}`);
    }
  }

  async getTestMetrics(
    testId: string,
    options?: {
      metricType?: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ) {
    const where: Record<string, unknown> = { testId };

    if (options?.metricType) {
      where.metricType = options.metricType;
    }

    if (options?.startTime || options?.endTime) {
      where.timestamp = {};
      if (options.startTime) {
        (where.timestamp as Record<string, Date>).gte = new Date(options.startTime);
      }
      if (options.endTime) {
        (where.timestamp as Record<string, Date>).lte = new Date(options.endTime);
      }
    }

    const metrics = await this.prisma.performanceMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 1000,
    });

    return metrics;
  }

  async getAggregatedMetrics(testId: string, interval: '1s' | '1m' | '5m' | '15m' = '1m') {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id: testId },
      select: { startedAt: true, completedAt: true },
    });

    if (!test) return [];

    const startTime = test.startedAt;
    const endTime = test.completedAt || new Date();

    const intervalMs = {
      '1s': 1000,
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
    }[interval];

    const intervals: { start: Date; end: Date }[] = [];
    let current = startTime;
    while (current < endTime) {
      intervals.push({
        start: current,
        end: new Date(current.getTime() + intervalMs),
      });
      current = new Date(current.getTime() + intervalMs);
    }

    const results = await Promise.all(
      intervals.map(async (intervalData) => {
        const metrics = await this.prisma.performanceMetric.findMany({
          where: {
            testId,
            timestamp: {
              gte: intervalData.start,
              lt: intervalData.end,
            },
          },
        });

        const httpDuration = metrics.filter((m) => m.metricName === 'http_req_duration');
        const avgResponseTime = httpDuration.length > 0
          ? httpDuration.reduce((sum, m) => sum + m.value, 0) / httpDuration.length
          : 0;

        const p95ResponseTime = this.calculatePercentile(httpDuration.map((m) => m.value), 95);
        const p99ResponseTime = this.calculatePercentile(httpDuration.map((m) => m.value), 99);

        const requests = metrics.filter((m) => m.metricName === 'http_reqs');
        const totalRequests = requests.length;

        const failed = metrics.filter((m) => m.metricName === 'http_req_failed' && m.value > 0);
        const errorRate = totalRequests > 0 ? (failed.length / totalRequests) * 100 : 0;

        const vus = metrics.filter((m) => m.metricName === 'vus');
        const maxVus = Math.max(...vus.map((m) => m.value), 0);

        return {
          timestamp: intervalData.start,
          avgResponseTime,
          p95ResponseTime,
          p99ResponseTime,
          totalRequests,
          errorRate,
          maxVus,
        };
      }),
    );

    return results;
  }

  getRealtimeMetrics(testId: string) {
    const recent = this.recentMetrics.get(testId) || [];
    const now = Date.now();
    const last30s = recent.filter((m) => now - new Date(m.timestamp || new Date()).getTime() < 30000);

    const byMetric: Record<string, { values: number[]; latest: number }> = {};

    for (const metric of last30s) {
      if (!byMetric[metric.metricName]) {
        byMetric[metric.metricName] = { values: [], latest: 0 };
      }
      byMetric[metric.metricName].values.push(metric.value);
      byMetric[metric.metricName].latest = metric.value;
    }

    const aggregated: Record<string, unknown> = {};
    for (const [name, data] of Object.entries(byMetric)) {
      aggregated[name] = {
        latest: data.latest,
        avg: data.values.reduce((a, b) => a + b, 0) / data.values.length,
        min: Math.min(...data.values),
        max: Math.max(...data.values),
        count: data.values.length,
      };
    }

    return {
      timestamp: new Date(),
      metrics: aggregated,
      active: this.realtimeIntervals.has(testId),
    };
  }

  startRealtimeCollection(testId: string): void {
    if (this.realtimeIntervals.has(testId)) {
      return;
    }

    const interval = setInterval(async () => {
      const realtimeMetrics = this.getRealtimeMetrics(testId);
      if (realtimeMetrics.active) {
        this.eventEmitter.emit('performance.realtime', {
          testId,
          metrics: realtimeMetrics,
        });
      }
    }, 2000);

    this.realtimeIntervals.set(testId, interval);
    this.logger.log(`Started realtime metrics collection for test ${testId}`);
  }

  stopRealtimeCollection(testId: string): void {
    const interval = this.realtimeIntervals.get(testId);
    if (interval) {
      clearInterval(interval);
      this.realtimeIntervals.delete(testId);
      this.recentMetrics.delete(testId);
      this.logger.log(`Stopped realtime metrics collection for test ${testId}`);
    }
  }

  private addToRecentMetrics(testId: string, data: MetricData): void {
    const existing = this.recentMetrics.get(testId) || [];
    const maxRecent = 500;
    const updated = [...existing, data].slice(-maxRecent);
    this.recentMetrics.set(testId, updated);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
}