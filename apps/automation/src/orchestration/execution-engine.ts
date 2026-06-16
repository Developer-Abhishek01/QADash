import { Logger } from '../utils/logger';

export interface ExecutionRequest {
  id: string;
  projectId: string;
  name: string;
  testIds: string[];
  environmentId: string;
  browser: BrowserType;
  parallel: boolean;
  maxWorkers: number;
  retryConfig: RetryConfig;
  timeout: number;
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  strategy: 'exponential' | 'linear' | 'fixed';
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'mobile-chrome' | 'mobile-safari';
export type ExecutionStatus = 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled' | 'timeout';

export interface TestExecution {
  testId: string;
  testName: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  retryAttempt?: number;
  workerId?: string;
}

export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: TestExecution[];
  summary: ExecutionSummary;
}

export interface ExecutionSummary {
  passRate: number;
  avgDuration: number;
  flakyTests: string[];
  slowestTests: { testId: string; duration: number }[];
  errors: { testId: string; error: string }[];
}

export interface WorkerAllocation {
  workerId: string;
  executionId: string;
  tests: string[];
  status: 'allocated' | 'busy' | 'idle' | 'offline';
  currentTest?: string;
  startedAt?: Date;
}

export interface EnvironmentConfig {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  variables: Record<string, string>;
  capabilities: string[];
}

export class ExecutionEngine {
  private logger: Logger;
  private executions: Map<string, ExecutionRequest> = new Map();
  private workerManager: WorkerManager;
  private retryEngine: RetryEngine;
  private monitor: ExecutionMonitor;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ExecutionEngine');
    this.workerManager = new WorkerManager(this.logger);
    this.retryEngine = new RetryEngine(this.logger);
    this.monitor = new ExecutionMonitor(this.logger);
  }

  async startExecution(request: ExecutionRequest): Promise<string> {
    this.logger.info(`Starting execution ${request.id} with ${request.testIds.length} tests`);

    this.executions.set(request.id, request);
    this.monitor.startTracking(request.id);

    const assignedWorkers = await this.workerManager.assignWorkers(request);

    if (request.parallel && request.maxWorkers > 1) {
      await this.runParallel(request, assignedWorkers);
    } else {
      await this.runSequential(request, assignedWorkers);
    }

    this.monitor.stopTracking(request.id);
    return request.id;
  }

  private async runParallel(request: ExecutionRequest, workers: WorkerAllocation[]): Promise<void> {
    const testChunks = this.chunkTests(request.testIds, workers.length);
    const promises = workers.map((worker, index) =>
      this.executeTestsOnWorker(request, worker, testChunks[index] || [])
    );

    await Promise.all(promises);
  }

  private async runSequential(request: ExecutionRequest, workers: WorkerAllocation[]): Promise<void> {
    const worker = workers[0];
    if (!worker) throw new Error('No workers available');
    
    await this.executeTestsOnWorker(request, worker, request.testIds);
  }

  private async executeTestsOnWorker(
    request: ExecutionRequest,
    worker: WorkerAllocation,
    testIds: string[]
  ): Promise<void> {
    worker.status = 'busy';
    worker.startedAt = new Date();

    for (const testId of testIds) {
      const testResult = await this.executeTest(request, worker, testId);
      
      if (testResult.status === 'failed' && request.retryConfig.enabled) {
        const retryResult = await this.retryEngine.retryWithBackoff(
          () => this.executeTest(request, worker, testId),
          request.retryConfig
        );
        
        if (retryResult.status === 'passed') {
          testResult.status = 'passed';
          testResult.error = undefined;
        }
      }
    }

    worker.status = 'idle';
  }

  private async executeTest(
    request: ExecutionRequest,
    worker: WorkerAllocation,
    testId: string
  ): Promise<TestExecution> {
    const result: TestExecution = {
      testId,
      testName: `Test-${testId}`,
      status: 'running',
      startTime: new Date(),
      workerId: worker.workerId,
    };

    try {
      this.logger.debug(`Worker ${worker.workerId} executing test ${testId}`);
      
      await this.executeTestWithTimeout(testId, request.timeout);

      result.status = 'passed';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - (result.startTime?.getTime() || 0);
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - (result.startTime?.getTime() || 0);
    }

    this.monitor.updateTestStatus(request.id, result);
    return result;
  }

  private async executeTestWithTimeout(_testId: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test timeout')), timeout);
      
      setTimeout(() => {
        clearTimeout(timer);
        Math.random() > 0.2 ? resolve() : reject(new Error('Test failed'));
      }, Math.random() * 2000 + 500);
    });
  }

  private chunkTests(tests: string[], chunks: number): string[][] {
    const result: string[][] = [];
    const chunkSize = Math.ceil(tests.length / chunks);
    
    for (let i = 0; i < tests.length; i += chunkSize) {
      result.push(tests.slice(i, i + chunkSize));
    }
    
    return result;
  }

  async cancelExecution(executionId: string): Promise<void> {
    this.logger.info(`Cancelling execution ${executionId}`);
    const execution = this.executions.get(executionId);
    if (execution) {
      await this.workerManager.releaseWorkers(executionId);
      this.monitor.stopTracking(executionId);
    }
  }

  getExecutionStatus(executionId: string): ExecutionStatus {
    return this.monitor.getStatus(executionId);
  }

  getExecutionProgress(executionId: string): { total: number; completed: number; failed: number } {
    return this.monitor.getProgress(executionId);
  }

  getLiveResults(executionId: string): TestExecution[] {
    return this.monitor.getLiveResults(executionId);
  }

  async getExecutionResult(executionId: string): Promise<ExecutionResult | null> {
    return this.monitor.getResult(executionId);
  }
}

export class WorkerManager {
  private logger: Logger;
  private workers: Map<string, WorkerAllocation> = new Map();
  private maxWorkers: number;

  constructor(logger: Logger, maxWorkers = 10) {
    this.logger = logger;
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 1; i <= this.maxWorkers; i++) {
      const workerId = `worker-${i}`;
      this.workers.set(workerId, {
        workerId,
        executionId: '',
        tests: [],
        status: 'idle',
      });
    }
  }

  async assignWorkers(request: ExecutionRequest): Promise<WorkerAllocation[]> {
    const requiredWorkers = Math.min(request.maxWorkers, this.maxWorkers);
    const availableWorkers: WorkerAllocation[] = [];

    for (const worker of this.workers.values()) {
      if (worker.status === 'idle' && availableWorkers.length < requiredWorkers) {
        worker.status = 'allocated';
        worker.executionId = request.id;
        worker.tests = [];
        availableWorkers.push(worker);
      }
    }

    if (availableWorkers.length < requiredWorkers) {
      this.logger.warn(`Only ${availableWorkers.length} of ${requiredWorkers} workers available`);
    }

    return availableWorkers;
  }

  async releaseWorkers(executionId: string): Promise<void> {
    for (const worker of this.workers.values()) {
      if (worker.executionId === executionId) {
        worker.status = 'idle';
        worker.executionId = '';
        worker.tests = [];
        worker.currentTest = undefined;
        worker.startedAt = undefined;
      }
    }
  }

  getWorkerStatus(): { workerId: string; status: string; currentTest?: string; executionId?: string; startedAt?: Date }[] {
    return Array.from(this.workers.values()).map(w => ({
      workerId: w.workerId,
      status: w.status,
      currentTest: w.currentTest,
      executionId: w.executionId,
      startedAt: w.startedAt,
    }));
  }

  async updateWorkerCapacity(workerId: string, capacity: number): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.logger.info(`Updated worker ${workerId} capacity to ${capacity}`);
    }
  }
}

export class RetryEngine {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | undefined;
    let currentDelay = config.delayMs;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}`);

        if (attempt < config.maxAttempts) {
          await this.sleep(currentDelay);
          currentDelay = Math.min(
            currentDelay * config.backoffMultiplier,
            config.maxDelayMs
          );
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  async retryWithLinear<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    delayMs: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await this.sleep(delayMs);
      }
    }
    throw new Error('All retry attempts failed');
  }

  async retryWithFixed<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    delayMs: number
  ): Promise<T> {
    return this.retryWithLinear(fn, maxAttempts, delayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ExecutionMonitor {
  private executions: Map<string, { results: TestExecution[]; startTime: Date; status: ExecutionStatus }> = new Map();

  constructor(_logger: Logger) {
  }

  startTracking(executionId: string): void {
    this.executions.set(executionId, {
      results: [],
      startTime: new Date(),
      status: 'queued',
    });
  }

  updateTestStatus(executionId: string, result: TestExecution): void {
    const execution = this.executions.get(executionId);
    if (execution) {
      const index = execution.results.findIndex(t => t.testId === result.testId);
      if (index >= 0) {
        execution.results[index] = result;
      } else {
        execution.results.push(result);
      }

      execution.status = this.calculateStatus(execution.results);
    }
  }

  private calculateStatus(results: TestExecution[]): ExecutionStatus {
    const hasRunning = results.some(r => r.status === 'running');
    const hasFailed = results.some(r => r.status === 'failed');
    
    if (hasRunning) return 'running';
    if (hasFailed) return 'failed';
    if (results.length > 0 && results.every(r => r.status === 'passed')) return 'passed';
    return 'pending';
  }

  stopTracking(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = this.calculateStatus(execution.results);
    }
  }

  getStatus(executionId: string): ExecutionStatus {
    return this.executions.get(executionId)?.status || 'pending';
  }

  getProgress(executionId: string): { total: number; completed: number; failed: number } {
    const execution = this.executions.get(executionId);
    if (!execution) return { total: 0, completed: 0, failed: 0 };

    const completed = execution.results.filter(r => r.status !== 'running' && r.status !== 'pending').length;
    const failed = execution.results.filter(r => r.status === 'failed').length;

    return {
      total: execution.results.length,
      completed,
      failed,
    };
  }

  getLiveResults(executionId: string): TestExecution[] {
    return this.executions.get(executionId)?.results || [];
  }

  getResult(executionId: string): ExecutionResult | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    const results = execution.results;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return {
      executionId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: new Date(),
      duration: Date.now() - execution.startTime.getTime(),
      totalTests: results.length,
      passed,
      failed,
      skipped,
      tests: results,
      summary: {
        passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
        avgDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length || 0,
        flakyTests: [],
        slowestTests: results.map(r => ({ testId: r.testId, duration: r.duration || 0 })).sort((a, b) => b.duration - a.duration).slice(0, 5),
        errors: results.filter(r => r.error).map(r => ({ testId: r.testId, error: r.error || '' })),
      },
    };
  }
}