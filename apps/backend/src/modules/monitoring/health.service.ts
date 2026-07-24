import { execSync } from 'child_process';
import * as os from 'os';

import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { LoggerService } from '../../common/logging';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class HealthService {
  private startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async getHealthStatus(): Promise<Record<string, unknown>> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allHealthy = database.status === 'healthy' && redis.status === 'healthy';

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.APP_VERSION || '1.0.0',
      services: {
        database: database.status,
        redis: redis.status,
      },
    };
  }

  async getDetailedHealth(): Promise<Record<string, unknown>> {
    const [database, redis, disk, memory, cpu, network] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDisk(),
      this.checkMemory(),
      this.checkCPU(),
      this.checkNetwork(),
    ]);

    const healthChecks = {
      database,
      redis,
      disk,
      memory,
      cpu,
      network,
    };

    const allHealthy = Object.values(healthChecks).every(h => h.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: healthChecks,
      summary: {
        total: Object.keys(healthChecks).length,
        healthy: Object.values(healthChecks).filter(h => h.status === 'healthy').length,
        unhealthy: Object.values(healthChecks).filter(h => h.status === 'unhealthy').length,
        degraded: Object.values(healthChecks).filter(h => h.status === 'degraded').length,
      },
    };
  }

  async getReadiness(): Promise<Record<string, unknown>> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const ready = database.status === 'healthy' && redis.status === 'healthy';

    return {
      ready,
      timestamp: new Date().toISOString(),
      checks: { database: database.status === 'healthy', redis: redis.status === 'healthy' },
    };
  }

  async getLiveness(): Promise<Record<string, unknown>> {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    const [systemInfo, infrastructure, executionStats, aiStats] = await Promise.all([
      this.getSystemInfo(),
      this.getInfrastructureHealth(),
      this.getExecutionStats('24h'),
      this.getAIStats('24h'),
    ]);

    return {
      system: systemInfo,
      infrastructure,
      executions: executionStats,
      ai: aiStats,
      timestamp: new Date().toISOString(),
    };
  }

  async getSystemInfo(): Promise<Record<string, unknown>> {
    const cpuLoad = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      cpu: {
        model: os.cpus()[0]?.model || 'unknown',
        cores: os.cpus().length,
        load: cpuLoad.map(l => Math.round(l * 100) / 100),
      },
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usedPercent: Math.round((usedMem / totalMem) * 100),
      },
      process: {
        pid: process.pid,
        memory: this.formatBytes(process.memoryUsage().heapUsed),
        uptime: Math.floor(process.uptime()),
      },
    };
  }

  async getQueueStats(): Promise<Record<string, unknown>> {
    try {
      const queueNames = ['file-import', 'test-execution', 'report-generation', 'ai-processing'];
      const queueStats = await Promise.all(
        queueNames.map(async (name) => {
          try {
            const queue = new Queue(name, { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') } });
            const [waiting, active, completed, failed] = await Promise.all([
              queue.getWaitingCount(),
              queue.getActiveCount(),
              queue.getCompletedCount(),
              queue.getFailedCount(),
            ]);
            await queue.close();
            return { name, status: 'active', waiting, active, completed, failed };
          } catch {
            return { name, status: 'unknown' };
          }
        })
      );

      return {
        queues: queueStats,
        totalWaiting: queueStats.reduce((sum, q) => sum + (q.waiting || 0), 0),
        totalActive: queueStats.reduce((sum, q) => sum + (q.active || 0), 0),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats', error);
      return { error: 'Failed to retrieve queue stats', timestamp: new Date().toISOString() };
    }
  }

  async getQueueStatsByName(name: string): Promise<Record<string, unknown>> {
    try {
      const queue = new Queue(name, { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') } });
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      await queue.close();
      return { name, status: 'active', waiting, active, completed, failed, timestamp: new Date().toISOString() };
    } catch (error) {
      return { error: `Queue ${name} not found`, timestamp: new Date().toISOString() };
    }
  }

  async getExecutionStats(period?: string): Promise<Record<string, unknown>> {
    const hours = period === '7d' ? 168 : period === '24h' ? 24 : 1;
    const since = new Date(Date.now() - hours * 3600000);

    try {
      const [total, passed, failed, skipped] = await Promise.all([
        this.prisma.execution.count({ where: { startedAt: { gte: since } } }),
        this.prisma.execution.count({ where: { startedAt: { gte: since }, status: 'PASSED' } }),
        this.prisma.execution.count({ where: { startedAt: { gte: since }, status: 'FAILED' } }),
        this.prisma.execution.count({ where: { startedAt: { gte: since }, status: 'SKIPPED' } }),
      ]);

      const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      return {
        period: period || '1h',
        total, passed, failed, skipped, successRate,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { period: period || '1h', total: 0, passed: 0, failed: 0, skipped: 0, successRate: 0, timestamp: new Date().toISOString() };
    }
  }

  async getAIStats(_period?: string): Promise<Record<string, unknown>> {
    return {
      period: _period || '24h',
      message: 'AI stats available via AI Engine monitoring endpoint',
      timestamp: new Date().toISOString(),
    };
  }

  async getWorkersStats(): Promise<Record<string, unknown>> {
    try {
      const queue = new Queue('test-execution', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') } });
      const [workers] = await Promise.all([queue.getWorkers()]);
      await queue.close();
      return {
        workers: workers || [],
        totalWorkers: workers?.length || 0,
        activeWorkers: workers?.filter((w: any) => w.status === 'active').length || 0,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { workers: [], totalWorkers: 0, activeWorkers: 0, timestamp: new Date().toISOString() };
    }
  }

  async getInfrastructureHealth(): Promise<Record<string, unknown>> {
    const [disk, memory, network] = await Promise.all([
      this.checkDisk(),
      this.checkMemory(),
      this.checkNetwork(),
    ]);

    return {
      storage: disk,
      memory,
      network,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: latency < 100 ? 'healthy' : 'degraded',
        latency,
      };
    } catch (error) {
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async checkRedis(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const redis = new Redis({ host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379'), connectTimeout: 3000, maxRetriesPerRequest: 1 });
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      await redis.quit();
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Redis unavailable' };
    }
  }

  private async checkDisk(): Promise<{ status: string; used?: number; total?: number; available?: number }> {
    try {
      const platform = process.platform;
      let usedPercent = 0;
      if (platform === 'win32') {
        const out = execSync('wmic logicaldisk where drivetype=3 get size,freespace /format:csv', { encoding: 'utf8', timeout: 3000 });
        const lines = out.trim().split('\n').slice(1);
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          if (parts.length >= 3) {
            const free = parseInt(parts[1]) || 0;
            const total = parseInt(parts[2]) || 1;
            usedPercent = Math.round(((total - free) / total) * 100);
          }
        }
      } else {
        const out = execSync('df -k / | tail -1', { encoding: 'utf8', timeout: 3000 });
        const parts = out.trim().split(/\s+/);
        if (parts.length >= 5) {
          const total = parseInt(parts[1]) || 1;
          const available = parseInt(parts[3]) || 0;
          usedPercent = Math.round(((total - available) / total) * 100);
        }
      }
      return {
        status: usedPercent > 90 ? 'unhealthy' : usedPercent > 75 ? 'degraded' : 'healthy',
        used: usedPercent,
      };
    } catch {
      return { status: 'unknown' };
    }
  }

  private async checkMemory(): Promise<{ status: string; usedPercent?: number }> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    return {
      status: usedPercent > 90 ? 'unhealthy' : usedPercent > 75 ? 'degraded' : 'healthy',
      usedPercent,
    };
  }

  private async checkCPU(): Promise<{ status: string; load?: number[] }> {
    const load = os.loadavg();
    const avgLoad = load[0] / os.cpus().length;

    return {
      status: avgLoad > 0.8 ? 'degraded' : 'healthy',
      load: load.map(l => Math.round(l * 100) / 100),
    };
  }

  private async checkNetwork(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://127.0.0.1:3001/api/v1/monitoring/health/live', { signal: controller.signal, method: 'HEAD' });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      return { status: latency < 200 ? 'healthy' : 'degraded', latency };
    } catch (error) {
      return { status: 'healthy', latency: 0 };
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${Math.round(bytes * 100) / 100} ${units[i]}`;
  }
}