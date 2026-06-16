import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from './services/queue.service';
import { EventHubService } from './services/event-hub.service';
import { JobCoordinatorService } from './services/job-coordinator.service';
import { ServiceRegistryService } from './services/service-registry.service';

export interface OrchestrationJob {
  id: string;
  type: 'test' | 'security' | 'performance' | 'accessibility' | 'ai-analysis' | 'report' | 'bug-sync';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: Record<string, any>;
  dependencies?: string[];
  callback?: string;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  latency: number;
  errorRate: number;
}

@Injectable()
export class OrchestrationService implements OnModuleInit {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly eventHubService: EventHubService,
    private readonly jobCoordinatorService: JobCoordinatorService,
    private readonly serviceRegistryService: ServiceRegistryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.initializeServiceRegistry();
    this.setupEventListeners();
  }

  private async initializeServiceRegistry() {
    await this.serviceRegistryService.registerService({
      name: 'orchestration',
      url: process.env.ORCHESTRATION_URL || 'http://localhost:3001',
      capabilities: ['job-coordination', 'event-routing', 'health-monitoring'],
      priority: 1,
    });
    this.logger.log('Orchestration service initialized');
  }

  private setupEventListeners() {
    this.eventEmitter.on('job.completed', (job: OrchestrationJob) => {
      this.handleJobCompletion(job);
    });

    this.eventEmitter.on('job.failed', (job: OrchestrationJob, error: Error) => {
      this.handleJobFailure(job, error);
    });

    this.eventEmitter.on('service.health', (health: ServiceHealth) => {
      this.handleServiceHealthUpdate(health);
    });
  }

  async submitJob(job: OrchestrationJob): Promise<string> {
    const jobId = await this.queueService.enqueue(job);

    await this.eventHubService.publish('orchestration.job.submitted', {
      jobId,
      jobType: job.type,
      priority: job.priority,
      timestamp: new Date(),
    });

    return jobId;
  }

  async submitBatch(jobs: OrchestrationJob[]): Promise<string[]> {
    const jobIds = await Promise.all(
      jobs.map(job => this.queueService.enqueue(job))
    );

    await this.eventHubService.publish('orchestration.batch.submitted', {
      count: jobs.length,
      jobIds,
      timestamp: new Date(),
    });

    return jobIds;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    return this.queueService.cancel(jobId);
  }

  async getJobStatus(jobId: string) {
    return this.queueService.getStatus(jobId);
  }

  async orchestrateExecution(
    executionId: string,
    options: {
      tests?: boolean;
      security?: boolean;
      performance?: boolean;
      accessibility?: boolean;
      aiAnalysis?: boolean;
      priority?: 'critical' | 'high' | 'medium' | 'low';
    }
  ) {
    const jobs: OrchestrationJob[] = [];

    if (options.tests) {
      jobs.push({
        id: `exec-${executionId}-tests`,
        type: 'test',
        priority: options.priority || 'high',
        payload: { executionId },
      });
    }

    if (options.security) {
      jobs.push({
        id: `exec-${executionId}-security`,
        type: 'security',
        priority: options.priority || 'high',
        payload: { executionId },
        dependencies: options.tests ? [`exec-${executionId}-tests`] : undefined,
      });
    }

    if (options.performance) {
      jobs.push({
        id: `exec-${executionId}-performance`,
        type: 'performance',
        priority: options.priority || 'medium',
        payload: { executionId },
      });
    }

    if (options.accessibility) {
      jobs.push({
        id: `exec-${executionId}-accessibility`,
        type: 'accessibility',
        priority: options.priority || 'medium',
        payload: { executionId },
      });
    }

    if (options.aiAnalysis) {
      jobs.push({
        id: `exec-${executionId}-ai`,
        type: 'ai-analysis',
        priority: options.priority || 'low',
        payload: { executionId },
        dependencies: options.tests ? [`exec-${executionId}-tests`] : undefined,
      });
    }

    return this.jobCoordinatorService.coordinateJobs(jobs);
  }

  async getServiceHealth(): Promise<ServiceHealth[]> {
    return this.serviceRegistryService.getAllHealth();
  }

  async scaleService(serviceName: string, replicas: number) {
    await this.eventHubService.publish('service.scale', {
      service: serviceName,
      replicas,
      timestamp: new Date(),
    });
  }

  private async handleJobCompletion(job: OrchestrationJob) {
    await this.eventHubService.publish('orchestration.job.completed', {
      jobId: job.id,
      type: job.type,
      timestamp: new Date(),
    });

    if (job.callback) {
      await this.executeCallback(job.callback, { jobId: job.id, status: 'completed' });
    }
  }

  private async handleJobFailure(job: OrchestrationJob, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);

    await this.eventHubService.publish('orchestration.job.failed', {
      jobId: job.id,
      type: job.type,
      error: error.message,
      timestamp: new Date(),
    });

    if (job.callback) {
      await this.executeCallback(job.callback, { jobId: job.id, status: 'failed', error: error.message });
    }
  }

  private handleServiceHealthUpdate(health: ServiceHealth) {
    if (health.status !== 'healthy') {
      this.logger.warn(`Service ${health.service} is ${health.status}`);
    }
  }

  private async executeCallback(callback: string, data: Record<string, any>) {
    try {
      // Callback execution logic
      this.eventEmitter.emit(callback, data);
    } catch (error) {
      this.logger.error(`Callback execution failed: ${error.message}`);
    }
  }
}