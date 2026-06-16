import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { MetricsCollectorService } from '../metrics/metrics-collector.service';
import { AlertService } from '../alerts/alert.service';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

interface K6TestConfig {
  vus?: number;
  duration?: number;
  iterations?: number;
  rps?: number;
  rampUpDuration?: number;
  rampDownDuration?: number;
  thresholds?: Record<string, unknown>;
}

interface PerformanceTest {
  id: string;
  name: string;
  script: string;
  config: K6TestConfig;
  thresholds: Record<string, unknown>;
  environment: { baseUrl: string; name: string };
  project: { id: string; name: string };
}

@Injectable()
export class K6ExecutionService {
  private readonly logger = new Logger(K6ExecutionService.name);
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private k6Binary: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsCollectorService,
    private readonly alertService: AlertService,
  ) {
    this.k6Binary = process.env.K6_BIN || 'k6';
  }

  async executeTest(test: PerformanceTest): Promise<void> {
    const testId = test.id;
    const workDir = path.join(process.cwd(), '.k6-tests', testId);
    await fs.mkdir(workDir, { recursive: true });

    await this.prisma.performanceTest.update({
      where: { id: testId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const scriptContent = this.enrichScript(test);
    const scriptPath = path.join(workDir, 'test.js');
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');

    const config = (test.config as K6TestConfig) || {};
    const k6Args = this.buildK6Arguments(testId, scriptPath, config, test.thresholds);

    this.logger.log(`Starting k6 execution: k6 ${k6Args.join(' ')}`);

    const proc = spawn(this.k6Binary, k6Args, {
      cwd: workDir,
      env: {
        ...process.env,
        K6_OUTFINAL_METRICS_JSON: path.join(workDir, 'results.json'),
        K6_NO_USAGE_REPORT: 'true',
        BASE_URL: test.environment.baseUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.runningProcesses.set(testId, proc);

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      this.logger.debug(`K6 [${testId}]: ${output}`);
      this.parseK6Output(testId, output);
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      this.logger.warn(`K6 [${testId}] error: ${output}`);
    });

    proc.on('close', async (code) => {
      this.runningProcesses.delete(testId);
      await this.handleTestCompletion(testId, code || 0, workDir);
    });

    proc.on('error', async (error) => {
      this.logger.error(`K6 [${testId}] process error: ${error.message}`);
      this.runningProcesses.delete(testId);
      await this.prisma.performanceTest.update({
        where: { id: testId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
    });

    setTimeout(() => {
      this.metricsService.startRealtimeCollection(testId);
    }, 2000);
  }

  async cancelTest(testId: string): Promise<void> {
    const proc = this.runningProcesses.get(testId);
    if (proc) {
      proc.kill('SIGTERM');
      this.runningProcesses.delete(testId);

      await this.prisma.performanceTest.update({
        where: { id: testId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
    }
  }

  private enrichScript(test: PerformanceTest): string {
    const baseScript = test.script;

    const enriched = baseScript.replace(
      /__BASE_URL__/g,
      test.environment.baseUrl,
    );

    return enriched;
  }

  private buildK6Arguments(
    testId: string,
    scriptPath: string,
    config: K6TestConfig,
    thresholds: Record<string, unknown>,
  ): string[] {
    const args = ['run', '--verbose'];

    if (config.rps) {
      args.push('--rps', String(config.rps));
    }

    if (config.rampUpDuration) {
      args.push('--stage', `0s:${config.vus || 1},${config.rampUpDuration}s:${config.vus || 10}`);
    }

    if (config.duration) {
      args.push('--duration', `${config.duration}s`);
    }

    if (config.iterations) {
      args.push('--iterations', String(config.iterations));
    }

    if (config.vus) {
      args.push('--vus', String(config.vus));
    }

    const thresholdsFile = path.join(path.dirname(scriptPath), 'thresholds.json');
    if (Object.keys(thresholds).length > 0) {
      args.push('--threshold', JSON.stringify(thresholds));
    }

    args.push('--out', 'json', path.join(path.dirname(scriptPath), 'metrics.jsonl'));
    args.push(scriptPath);

    return args;
  }

  private parseK6Output(testId: string, output: string): void {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('metrics:') || line.includes('vus:') || line.includes('iterations:')) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'Point' && data.data) {
            this.metricsService.recordMetric(testId, {
              metricType: data.data.metric,
              metricName: data.data.metric,
              value: data.data.value,
              timestamp: new Date(data.data.time),
              tags: data.data.tags || {},
            });
          }
        } catch {
          // Not JSON, ignore
        }
      }
    }
  }

  private async handleTestCompletion(testId: string, exitCode: number, workDir: string): Promise<void> {
    this.metricsService.stopRealtimeCollection(testId);

    try {
      const resultsPath = path.join(workDir, 'results.json');
      let summary: Record<string, unknown> = {};

      try {
        const resultsContent = await fs.readFile(resultsPath, 'utf-8');
        summary = JSON.parse(resultsContent);
      } catch {
        this.logger.warn(`No results file found for test ${testId}`);
      }

      const metrics = await this.prisma.performanceMetric.findMany({
        where: { testId },
        orderBy: { timestamp: 'asc' },
      });

      const httpMetrics = metrics.filter((m) => m.metricType === 'HTTP_REQ_DURATION');
      const sortedDurations = httpMetrics.map((m) => m.value).sort((a, b) => a - b);
      const avgResponseTime = sortedDurations.length > 0
        ? sortedDurations.reduce((a, b) => a + b, 0) / sortedDurations.length
        : 0;
      const p95Index = Math.floor(sortedDurations.length * 0.95);
      const p99Index = Math.floor(sortedDurations.length * 0.99);
      const p95ResponseTime = sortedDurations[p95Index] || 0;
      const p99ResponseTime = sortedDurations[p99Index] || 0;

      const httpReqMetrics = metrics.filter((m) => m.metricName === 'http_reqs');
      const totalRequests = httpReqMetrics.length;
      const totalDuration = (summary['test_run_duration_ms'] as number) || 0;
      const avgThroughput = totalDuration > 0 ? (totalRequests / (totalDuration / 1000)) : 0;

      const failedMetrics = metrics.filter((m) =>
        m.metricName === 'http_req_failed' && m.value > 0,
      );
      const errorRate = totalRequests > 0 ? (failedMetrics.length / totalRequests) * 100 : 0;

      const vuMetrics = metrics.filter((m) => m.metricType === 'VUS');
      const maxVus = Math.max(...vuMetrics.map((m) => m.value), 0);

      const duration = await this.prisma.performanceTest.findUnique({
        where: { id: testId },
        select: { startedAt: true },
      });

      const totalDurationMs = duration?.startedAt
        ? Date.now() - duration.startedAt.getTime()
        : 0;

      await this.prisma.performanceTest.update({
        where: { id: testId },
        data: {
          status: exitCode === 0 ? 'COMPLETED' : 'FAILED',
          completedAt: new Date(),
          duration: totalDurationMs,
          totalIterations: summary['iterations'] as number || 0,
          totalRequests,
          avgResponseTime,
          p95ResponseTime,
          p99ResponseTime,
          avgThroughput,
          errorRate,
          maxVus,
          summary: summary as any,
          metrics: metrics as any,
        },
      });

      await this.alertService.checkThresholds(testId);

      this.logger.log(`Test ${testId} completed with status: ${exitCode === 0 ? 'COMPLETED' : 'FAILED'}`);
    } catch (error) {
      this.logger.error(`Error handling test completion for ${testId}: ${error}`);
      await this.prisma.performanceTest.update({
        where: { id: testId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  isTestRunning(testId: string): boolean {
    return this.runningProcesses.has(testId);
  }

  getRunningTestCount(): number {
    return this.runningProcesses.size;
  }
}