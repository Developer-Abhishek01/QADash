import { test, expect } from '@playwright/test';
import { ExecutionOrchestrator, CreateExecutionRequest } from '../execution-api';
import { EnvironmentMapper } from '../environment-mapper';
import { WorkerManager } from '../execution-engine';
import { Logger } from '../../utils/logger';

const logger = new Logger('OrchestrationTest');
const orchestrator = new ExecutionOrchestrator(logger);

test.describe('Execution Orchestration Tests', () => {
  test('should create execution', async () => {
    const request: CreateExecutionRequest = {
      projectId: 'proj-001',
      name: 'Test Execution',
      testIds: ['test-1', 'test-2', 'test-3'],
      environmentId: 'env-001',
      browser: 'chromium',
      parallel: true,
      maxWorkers: 2,
      retry: {
        enabled: true,
        maxAttempts: 2,
        strategy: 'exponential',
        delayMs: 1000,
      },
      timeout: 60000,
    };

    const result = await orchestrator.createExecution(request);
    expect(result.executionId).toBeDefined();
  });

  test('should get execution status', async () => {
    const request: CreateExecutionRequest = {
      projectId: 'proj-001',
      name: 'Status Test',
      testIds: ['test-1', 'test-2'],
      environmentId: 'env-001',
      browser: 'chromium',
      parallel: false,
      maxWorkers: 1,
      retry: { enabled: false, maxAttempts: 1, strategy: 'fixed', delayMs: 1000 },
      timeout: 30000,
    };

    const { executionId } = await orchestrator.createExecution(request);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const status = await orchestrator.getExecutionStatus(executionId);
    expect(status.executionId).toBe(executionId);
    expect(status.status).toBeDefined();
    expect(status.progress).toBeDefined();
  });

  test('should get worker status', async () => {
    const status = await orchestrator.getWorkerStatus();
    expect(status.total).toBeGreaterThan(0);
    expect(status.idle).toBeGreaterThan(0);
  });

  test('should cancel execution', async () => {
    const request: CreateExecutionRequest = {
      projectId: 'proj-001',
      name: 'Cancel Test',
      testIds: ['test-1', 'test-2', 'test-3', 'test-4', 'test-5'],
      environmentId: 'env-001',
      browser: 'chromium',
      parallel: true,
      maxWorkers: 2,
      retry: { enabled: false, maxAttempts: 1, strategy: 'fixed', delayMs: 1000 },
      timeout: 60000,
    };

    const { executionId } = await orchestrator.createExecution(request);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await orchestrator.cancelExecution(executionId);
    expect(result.success).toBe(true);
  });
});

test.describe('Environment Mapper Tests', () => {
  const mapper = new EnvironmentMapper(logger);

  test('should get chromium mapping', () => {
    const mapping = mapper.getMapping('chromium');
    expect(mapping).toBeDefined();
    expect(mapping?.browserConfig.type).toBe('chromium');
  });

  test('should get environment mapping with custom config', () => {
    const mapping = mapper.mapEnvironment(
      { id: 'env-001', name: 'Test', type: 'staging', baseUrl: 'http://test.com', variables: {}, capabilities: [] },
      'firefox'
    );
    expect(mapping).toBeDefined();
    expect(mapping.environmentId).toBe('env-001');
  });

  test('should get timeouts config', () => {
    const timeouts = mapper.getTimeouts('chromium');
    expect(timeouts.action).toBe(10000);
    expect(timeouts.navigation).toBe(30000);
    expect(timeouts.test).toBe(60000);
  });

  test('should get all mappings', () => {
    const mappings = mapper.getAllMappings();
    expect(mappings.length).toBeGreaterThan(0);
  });
});

test.describe('Worker Manager Tests', () => {
  const workerManager = new WorkerManager(logger, 5);

  test('should have workers initialized', () => {
    const status = workerManager.getWorkerStatus();
    expect(status.length).toBe(5);
    expect(status.every(w => w.status === 'idle')).toBe(true);
  });

  test('should assign workers', async () => {
    const workers = await workerManager.assignWorkers({
      id: 'exec-001',
      projectId: 'proj-001',
      name: 'Test',
      testIds: ['t1', 't2', 't3'],
      environmentId: 'env-001',
      browser: 'chromium' as any,
      parallel: true,
      maxWorkers: 3,
      retryConfig: { enabled: false, maxAttempts: 1, strategy: 'fixed', delayMs: 1000, backoffMultiplier: 2, maxDelayMs: 10000 },
      timeout: 30000,
    });

    expect(workers.length).toBeGreaterThan(0);
    expect(workers.length).toBeLessThanOrEqual(5);
  });

  test('should release workers', async () => {
    await workerManager.releaseWorkers('exec-001');
    const status = workerManager.getWorkerStatus();
    expect(status.every(w => w.status === 'idle')).toBe(true);
  });
});