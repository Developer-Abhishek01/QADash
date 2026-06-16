import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  responseTime?: number;
  statusCode?: number;
  [key: string]: unknown;
}

export interface MetricsData {
  type: 'request' | 'error' | 'performance' | 'custom';
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private correlationId: string;
  private context: Record<string, unknown> = {};

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.correlationId = this.generateCorrelationId();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  setCorrelationId(id?: string): void {
    this.correlationId = id || this.generateCorrelationId();
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private buildMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.context,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  log(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, this.buildMeta(meta));
  }

  error(message: string, trace?: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, { trace, ...this.buildMeta(meta) });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, this.buildMeta(meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, this.buildMeta(meta));
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, this.buildMeta(meta));
  }

  logRequest(params: {
    method: string;
    url: string;
    statusCode?: number;
    responseTime?: number;
    userId?: string;
    ip?: string;
    userAgent?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): void {
    const { method, url, statusCode, responseTime, userId, ip, userAgent, body, headers } = params;

    this.logger.http({
      message: `${method} ${url}`,
      method,
      url,
      statusCode,
      responseTime,
      userId,
      ip,
      userAgent,
      requestBody: this.sanitizeBody(body),
      requestHeaders: this.sanitizeHeaders(headers),
      ...this.buildMeta(),
    });
  }

  logError(params: {
    error: Error | string;
    context?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
    body?: unknown;
  }): void {
    const { error, context, userId, endpoint, method, body } = params;

    this.logger.error(
      typeof error === 'string' ? error : error.message,
      {
        stack: typeof error === 'string' ? undefined : error.stack,
        context,
        userId,
        endpoint,
        method,
        requestBody: this.sanitizeBody(body),
        ...this.buildMeta(),
      }
    );
  }

  logPerformance(params: {
    operation: string;
    duration: number;
    threshold?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const { operation, duration, threshold = 1000, metadata } = params;

    const level = duration > threshold ? 'warn' : 'info';

    this.logger[level](
      `Performance: ${operation} took ${duration}ms`,
      {
        operation,
        duration,
        threshold,
        slow: duration > threshold,
        ...metadata,
        ...this.buildMeta(),
      }
    );
  }

  logBusinessEvent(params: {
    event: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const { event, entity, entityId, userId, metadata } = params;

    this.logger.info(`Business Event: ${event}`, {
      event,
      entity,
      entityId,
      userId,
      eventType: 'business',
      ...metadata,
      ...this.buildMeta(),
    });
  }

  logSecurityEvent(params: {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    details?: Record<string, unknown>;
  }): void {
    const { event, severity, userId, ip, details } = params;

    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.logger[level](`Security Event: ${event}`, {
      event,
      severity,
      userId,
      ip,
      eventType: 'security',
      ...details,
      ...this.buildMeta(),
    });
  }

  logQueueEvent(params: {
    queue: string;
    jobId?: string;
    action: 'added' | 'processed' | 'failed' | 'retry' | 'completed';
    duration?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const { queue, jobId, action, duration, metadata } = params;

    this.logger.info(`Queue Event: ${action}`, {
      queue,
      jobId,
      action,
      duration,
      eventType: 'queue',
      ...metadata,
      ...this.buildMeta(),
    });
  }

  logExecution(params: {
    executionId: string;
    testId?: string;
    testName?: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    duration: number;
    retries?: number;
    environment?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const { executionId, testId, testName, status, duration, retries, environment, metadata } = params;

    const level = status === 'failed' || status === 'error' ? 'error' : 'info';

    this.logger[level](`Test Execution: ${status}`, {
      executionId,
      testId,
      testName,
      status,
      duration,
      retries,
      environment,
      eventType: 'execution',
      ...metadata,
      ...this.buildMeta(),
    });
  }

  logAIMetric(params: {
    operation: 'inference' | 'training' | 'evaluation' | 'prediction';
    model?: string;
    duration?: number;
    tokens?: number;
    inputSize?: number;
    outputSize?: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const { operation, model, duration, tokens, inputSize, outputSize, success, error, metadata } = params;

    const level = success ? 'info' : 'error';

    this.logger[level](`AI Metric: ${operation}`, {
      operation,
      model,
      duration,
      tokens,
      inputSize,
      outputSize,
      success,
      error,
      eventType: 'ai',
      ...metadata,
      ...this.buildMeta(),
    });
  }

  private sanitizeBody(body: unknown): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object') return undefined;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    const sanitized = JSON.parse(JSON.stringify(body));

    const sanitizeObject = (obj: Record<string, unknown>): void => {
      for (const key of Object.keys(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key] as Record<string, unknown>);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.some(h => key.toLowerCase().includes(h))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  child(options: Record<string, unknown>): LoggerService {
    const childLogger = new LoggerService(this.logger);
    childLogger.setContext({ ...this.context, ...options });
    childLogger.setCorrelationId(this.correlationId);
    return childLogger;
  }
}