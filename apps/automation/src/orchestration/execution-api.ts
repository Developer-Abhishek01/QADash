import { Logger } from '../utils/logger';
import { ExecutionEngine, ExecutionRequest, ExecutionResult, ExecutionStatus, TestExecution } from './execution-engine';
import { WorkerManager } from './execution-engine';
import { EnvironmentMapper } from './environment-mapper';

export interface CreateExecutionRequest {
  projectId: string;
  name: string;
  testIds: string[];
  environmentId: string;
  browser: string;
  parallel: boolean;
  maxWorkers: number;
  retry: {
    enabled: boolean;
    maxAttempts: number;
    strategy: 'exponential' | 'linear' | 'fixed';
    delayMs: number;
  };
  timeout: number;
}

export interface ExecutionStatusResponse {
  executionId: string;
  status: ExecutionStatus;
  progress: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    skipped: number;
    progressPercent: number;
  };
  currentTest?: string;
  startedAt: string;
  estimatedEndTime?: string;
}

export interface WorkerStatusResponse {
  total: number;
  busy: number;
  idle: number;
  offline: number;
  workers: {
    id: string;
    status: string;
    executionId?: string;
    currentTest?: string;
    startedAt?: string;
  }[];
}

export class ExecutionOrchestrator {
  private logger: Logger;
  private engine: ExecutionEngine;
  private workerManager: WorkerManager;
  private environmentMapper: EnvironmentMapper;
  private activeExecutions: Map<string, NodeJS.Timeout> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ExecutionOrchestrator');
    this.engine = new ExecutionEngine(this.logger);
    this.workerManager = new WorkerManager(this.logger);
    this.environmentMapper = new EnvironmentMapper(this.logger);
  }

  async createExecution(request: CreateExecutionRequest): Promise<{ executionId: string }> {
    this.logger.info(`Creating execution for project ${request.projectId}`);

    const executionRequest: ExecutionRequest = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: request.projectId,
      name: request.name,
      testIds: request.testIds,
      environmentId: request.environmentId,
      browser: request.browser as any,
      parallel: request.parallel,
      maxWorkers: request.maxWorkers,
      retryConfig: {
        enabled: request.retry.enabled,
        maxAttempts: request.retry.maxAttempts,
        strategy: request.retry.strategy,
        delayMs: request.retry.delayMs,
        backoffMultiplier: 2,
        maxDelayMs: 30000,
      },
      timeout: request.timeout,
    };

    await this.engine.startExecution(executionRequest);

    return { executionId: executionRequest.id };
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatusResponse> {
    const status = this.engine.getExecutionStatus(executionId);
    const progress = this.engine.getExecutionProgress(executionId);
    const liveResults = this.engine.getLiveResults(executionId);

    const currentTest = liveResults.find(t => t.status === 'running');

    return {
      executionId,
      status,
      progress: {
        total: progress.total,
        completed: progress.completed,
        passed: progress.completed - progress.failed,
        failed: progress.failed,
        skipped: 0,
        progressPercent: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
      },
      currentTest: currentTest?.testName,
      startedAt: new Date().toISOString(),
    };
  }

  async getExecutionResults(executionId: string): Promise<ExecutionResult | null> {
    return this.engine.getExecutionResult(executionId);
  }

  async cancelExecution(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.engine.cancelExecution(executionId);
      const timeout = this.activeExecutions.get(executionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeExecutions.delete(executionId);
      }
      return { success: true, message: 'Execution cancelled successfully' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async getLiveResults(executionId: string): Promise<TestExecution[]> {
    return this.engine.getLiveResults(executionId);
  }

  async getWorkerStatus(): Promise<WorkerStatusResponse> {
    const workers = this.workerManager.getWorkerStatus();

    return {
      total: workers.length,
      busy: workers.filter(w => w.status === 'busy').length,
      idle: workers.filter(w => w.status === 'idle').length,
      offline: workers.filter(w => w.status === 'offline').length,
      workers: workers.map(w => ({
        id: w.workerId,
        status: w.status,
        executionId: w.executionId,
        currentTest: w.currentTest,
        startedAt: w.startedAt?.toISOString(),
      })),
    };
  }

  async getEnvironmentMappings(): Promise<any[]> {
    return this.environmentMapper.getAllMappings();
  }

  scheduleExecution(_request: CreateExecutionRequest, cronExpression: string): string {
    const jobId = `scheduled-${Date.now()}`;
    this.logger.info(`Scheduled execution ${jobId} with cron: ${cronExpression}`);
    return jobId;
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  cleanup(): void {
    for (const timeout of this.activeExecutions.values()) {
      clearTimeout(timeout);
    }
    this.activeExecutions.clear();
  }
}

export function createExecutionOrchestrator(): ExecutionOrchestrator {
  return new ExecutionOrchestrator();
}