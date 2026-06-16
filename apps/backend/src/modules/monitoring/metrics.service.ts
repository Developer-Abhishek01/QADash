import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Summary, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private register: Registry;

  httpRequestsTotal: Counter;
  httpRequestDuration: Histogram;
  httpRequestsInProgress: Gauge;
  
  queueJobsTotal: Counter;
  queueJobsDuration: Histogram;
  queueJobsInProgress: Gauge;
  queueJobsFailed: Counter;
  
  executionTotal: Counter;
  executionDuration: Histogram;
  executionByStatus: Counter;
  executionRetries: Counter;
  
  aiRequestsTotal: Counter;
  aiRequestDuration: Histogram;
  aiTokensUsed: Counter;
  aiRequestsFailed: Counter;
  
  databaseQueryDuration: Histogram;
  databaseConnectionsInUse: Gauge;
  databaseConnectionsFree: Gauge;
  
  workerJobsActive: Gauge;
  workerJobsCompleted: Counter;
  workerJobsFailed: Counter;
  workerUtilization: Gauge;
  
  cacheHits: Counter;
  cacheMisses: Counter;
  cacheOperationDuration: Histogram;
  
  alertFired: Counter;
  alertResolved: Counter;

  constructor() {
    this.register = new Registry();
    this.initMetrics();
  }

  private initMetrics(): void {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'endpoint'],
      registers: [this.register],
    });

    this.queueJobsTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue', 'action'],
      registers: [this.register],
    });

    this.queueJobsDuration = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Duration of queue jobs in seconds',
      labelNames: ['queue', 'job_type'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
      registers: [this.register],
    });

    this.queueJobsInProgress = new Gauge({
      name: 'queue_jobs_in_progress',
      help: 'Number of queue jobs currently being processed',
      labelNames: ['queue'],
      registers: [this.register],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of failed queue jobs',
      labelNames: ['queue', 'job_type', 'reason'],
      registers: [this.register],
    });

    this.executionTotal = new Counter({
      name: 'test_executions_total',
      help: 'Total number of test executions',
      labelNames: ['project_id', 'environment'],
      registers: [this.register],
    });

    this.executionDuration = new Histogram({
      name: 'test_execution_duration_seconds',
      help: 'Duration of test executions in seconds',
      labelNames: ['project_id', 'test_type'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800],
      registers: [this.register],
    });

    this.executionByStatus = new Counter({
      name: 'test_executions_by_status',
      help: 'Test executions grouped by status',
      labelNames: ['project_id', 'status', 'environment'],
      registers: [this.register],
    });

    this.executionRetries = new Counter({
      name: 'test_execution_retries_total',
      help: 'Total number of test retries',
      labelNames: ['project_id', 'test_id'],
      registers: [this.register],
    });

    this.aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['operation', 'model', 'provider'],
      registers: [this.register],
    });

    this.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI requests in seconds',
      labelNames: ['operation', 'model', 'provider'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
      registers: [this.register],
    });

    this.aiTokensUsed = new Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of tokens used by AI',
      labelNames: ['operation', 'model', 'type'],
      registers: [this.register],
    });

    this.aiRequestsFailed = new Counter({
      name: 'ai_requests_failed_total',
      help: 'Total number of failed AI requests',
      labelNames: ['operation', 'model', 'provider', 'error_type'],
      registers: [this.register],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.register],
    });

    this.databaseConnectionsInUse = new Gauge({
      name: 'database_connections_in_use',
      help: 'Number of database connections currently in use',
      registers: [this.register],
    });

    this.databaseConnectionsFree = new Gauge({
      name: 'database_connections_free',
      help: 'Number of free database connections',
      registers: [this.register],
    });

    this.workerJobsActive = new Gauge({
      name: 'worker_jobs_active',
      help: 'Number of active jobs per worker',
      labelNames: ['worker_id', 'queue'],
      registers: [this.register],
    });

    this.workerJobsCompleted = new Counter({
      name: 'worker_jobs_completed_total',
      help: 'Total number of completed jobs per worker',
      labelNames: ['worker_id', 'queue'],
      registers: [this.register],
    });

    this.workerJobsFailed = new Counter({
      name: 'worker_jobs_failed_total',
      help: 'Total number of failed jobs per worker',
      labelNames: ['worker_id', 'queue', 'reason'],
      registers: [this.register],
    });

    this.workerUtilization = new Gauge({
      name: 'worker_utilization_percent',
      help: 'Worker utilization percentage',
      labelNames: ['worker_id'],
      registers: [this.register],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key'],
      registers: [this.register],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key'],
      registers: [this.register],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_type'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05],
      registers: [this.register],
    });

    this.alertFired = new Counter({
      name: 'alerts_fired_total',
      help: 'Total number of alerts fired',
      labelNames: ['alert_name', 'severity'],
      registers: [this.register],
    });

    this.alertResolved = new Counter({
      name: 'alerts_resolved_total',
      help: 'Total number of alerts resolved',
      labelNames: ['alert_name', 'severity'],
      registers: [this.register],
    });
  }

  incrementHttpRequest(method: string, endpoint: string, statusCode: number): void {
    this.httpRequestsTotal.inc({ method, endpoint, status_code: statusCode.toString() });
  }

  observeHttpRequestDuration(method: string, endpoint: string, duration: number): void {
    this.httpRequestDuration.observe({ method, endpoint }, duration);
  }

  setHttpRequestsInProgress(method: string, endpoint: string, count: number): void {
    this.httpRequestsInProgress.set({ method, endpoint }, count);
  }

  incrementQueueJob(queue: string, action: string): void {
    this.queueJobsTotal.inc({ queue, action });
  }

  observeQueueJobDuration(queue: string, jobType: string, duration: number): void {
    this.queueJobsDuration.observe({ queue, job_type: jobType }, duration);
  }

  setQueueJobsInProgress(queue: string, count: number): void {
    this.queueJobsInProgress.set({ queue }, count);
  }

  incrementQueueJobFailed(queue: string, jobType: string, reason: string): void {
    this.queueJobsFailed.inc({ queue, job_type: jobType, reason });
  }

  incrementExecution(projectId: string, environment: string): void {
    this.executionTotal.inc({ project_id: projectId, environment });
  }

  observeExecutionDuration(projectId: string, testType: string, duration: number): void {
    this.executionDuration.observe({ project_id: projectId, test_type: testType }, duration);
  }

  incrementExecutionByStatus(projectId: string, status: string, environment: string): void {
    this.executionByStatus.inc({ project_id: projectId, status, environment });
  }

  incrementExecutionRetry(projectId: string, testId: string): void {
    this.executionRetries.inc({ project_id: projectId, test_id: testId });
  }

  incrementAiRequest(operation: string, model: string, provider: string): void {
    this.aiRequestsTotal.inc({ operation, model, provider });
  }

  observeAiRequestDuration(operation: string, model: string, provider: string, duration: number): void {
    this.aiRequestDuration.observe({ operation, model, provider }, duration);
  }

  incrementAiTokens(operation: string, model: string, tokenType: string, count: number): void {
    this.aiTokensUsed.inc({ operation, model, type: tokenType }, count);
  }

  incrementAiRequestFailed(operation: string, model: string, provider: string, errorType: string): void {
    this.aiRequestsFailed.inc({ operation, model, provider, error_type: errorType });
  }

  observeDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  setDatabaseConnections(inUse: number, free: number): void {
    this.databaseConnectionsInUse.set(inUse);
    this.databaseConnectionsFree.set(free);
  }

  setWorkerJobsActive(workerId: string, queue: string, count: number): void {
    this.workerJobsActive.set({ worker_id: workerId, queue }, count);
  }

  incrementWorkerJobsCompleted(workerId: string, queue: string): void {
    this.workerJobsCompleted.inc({ worker_id: workerId, queue });
  }

  incrementWorkerJobsFailed(workerId: string, queue: string, reason: string): void {
    this.workerJobsFailed.inc({ worker_id: workerId, queue, reason });
  }

  setWorkerUtilization(workerId: string, percent: number): void {
    this.workerUtilization.set({ worker_id: workerId }, percent);
  }

  incrementCacheHit(cacheType: string, key: string): void {
    this.cacheHits.inc({ cache_type: cacheType, key });
  }

  incrementCacheMiss(cacheType: string, key: string): void {
    this.cacheMisses.inc({ cache_type: cacheType, key });
  }

  observeCacheOperation(operation: string, cacheType: string, duration: number): void {
    this.cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);
  }

  incrementAlert(alertName: string, severity: string, fired: boolean): void {
    if (fired) {
      this.alertFired.inc({ alert_name: alertName, severity });
    } else {
      this.alertResolved.inc({ alert_name: alertName, severity });
    }
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getMetricsAsJSON(): Promise<any> {
    return this.register.getMetricsAsJSON();
  }

  clear(): void {
    this.register.clear();
  }

  getRegister(): Registry {
    return this.register;
  }
}