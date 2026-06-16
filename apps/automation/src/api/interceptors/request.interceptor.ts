import { Logger } from '../../utils/logger';
import { RequestOptions } from '../api-client';

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

export class RequestInterceptor {
  private logger: Logger;
  private logs: RequestLog[] = [];
  private hooks: ((log: RequestLog) => Promise<void>)[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  intercept(options: RequestOptions, headers: Record<string, string>): void {
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: options.method,
      path: options.path,
      headers,
      body: options.body,
    };

    this.logs.push(log);
    this.logger.info(`→ ${options.method} ${options.path}`);

    if (options.body) {
      this.logger.debug(`Request body: ${JSON.stringify(options.body, null, 2)}`);
    }

    this.executeHooks(log);
  }

  getLogs(): RequestLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  onRequest(callback: (log: RequestLog) => Promise<void>): void {
    this.hooks.push(callback);
  }

  private async executeHooks(log: RequestLog): Promise<void> {
    for (const hook of this.hooks) {
      try {
        await hook(log);
      } catch (error) {
        this.logger.error(`Request hook error: ${error}`);
      }
    }
  }

  addHeader(headers: Record<string, string>, key: string, value: string): Record<string, string> {
    return { ...headers, [key]: value };
  }

  removeHeader(headers: Record<string, string>, key: string): Record<string, string> {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    return newHeaders;
  }

  modifyBody(body: unknown, transformer: (body: unknown) => unknown): unknown {
    return transformer(body);
  }

  addQueryParam(path: string, key: string, value: string): string {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}