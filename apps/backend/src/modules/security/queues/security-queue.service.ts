import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { SecurityScannerService } from '../scanners/scanner.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SecurityScanJob {
  scanId: string;
  projectId: string;
  environmentId: string;
  baseUrl: string;
  config: Record<string, unknown>;
  scanType: string;
}

export interface DependencyScanJob {
  scanId: string;
  projectId: string;
  packageManager: string;
}

@Injectable()
export class SecurityQueueService {
  constructor(
    @InjectQueue('security-scan') private securityScanQueue: Queue,
    @InjectQueue('dependency-scan') private dependencyScanQueue: Queue,
    @InjectQueue('scheduled-scan') private scheduledScanQueue: Queue,
  ) {}

  async addSecurityScanJob(data: SecurityScanJob) {
    return this.securityScanQueue.add('security-scan', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });
  }

  async addDependencyScanJob(data: DependencyScanJob) {
    return this.dependencyScanQueue.add('dependency-scan', data, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
    });
  }

  async addScheduledScanJob(data: SecurityScanJob) {
    return this.scheduledScanQueue.add('scheduled-scan', data, {
      repeat: { pattern: data.config['cron'] as string },
    });
  }

  async getScanProgress(scanId: string): Promise<{ progress: number; status: string }> {
    const job = await this.securityScanQueue.getJobs(['active', 'waiting']);
    const scanJob = job.find((j) => j.data.scanId === scanId);
    if (scanJob) {
      return { progress: scanJob.progress as number, status: await scanJob.getState() };
    }
    return { progress: 0, status: 'unknown' };
  }

  async removeScanFromQueue(scanId: string) {
    const jobs = await this.securityScanQueue.getJobs(['active', 'waiting', 'completed', 'failed', 'delayed', 'paused']);
    const scanJob = jobs.find((j) => j.data.scanId === scanId);
    if (scanJob) {
      await scanJob.remove();
    }
  }
}

@Processor('security-scan', { concurrency: 5 })
export class SecurityScanProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerService: SecurityScannerService,
  ) {
    super();
  }

  async process(job: Job<SecurityScanJob>): Promise<void> {
    const { scanId, baseUrl, config, scanType } = job.data;

    try {
      await this.prisma.securityScan.update({
        where: { id: scanId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const results = await this.scannerService.runSecurityScan(scanId, baseUrl, config, scanType);

      await this.prisma.securityScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progress: 100,
          totalVulnerabilities: results.vulnerabilities.length,
          criticalCount: results.counts.critical,
          highCount: results.counts.high,
          mediumCount: results.counts.medium,
          lowCount: results.counts.low,
          infoCount: results.counts.info,
          duration: results.duration,
        },
      });

      for (const vuln of results.vulnerabilities) {
        await this.prisma.vulnerability.create({
          data: {
            ...vuln,
            scanId,
            severity: vuln.severity as any,
            status: vuln.status as any,
          } as any,
        });
      }

      for (const target of results.targets) {
        await this.prisma.securityTarget.create({
          data: {
            ...target,
            scanId,
          } as any,
        });
      }
    } catch (error) {
      await this.prisma.securityScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }
}

@Processor('dependency-scan', { concurrency: 3 })
export class DependencyScanProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerService: SecurityScannerService,
  ) {
    super();
  }

  async process(job: Job<DependencyScanJob>): Promise<void> {
    const { scanId, packageManager } = job.data;

    try {
      await this.prisma.dependencyScan.update({
        where: { id: scanId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const results = await this.scannerService.runDependencyScan(scanId, packageManager);

      await this.prisma.dependencyScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalPackages: results.totalPackages,
          vulnerablePackages: results.vulnerablePackages,
          criticalCount: results.counts.critical,
          highCount: results.counts.high,
          mediumCount: results.counts.medium,
          lowCount: results.counts.low,
          results: results.dependencies as any,
        },
      });
    } catch (error) {
      await this.prisma.dependencyScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }
}