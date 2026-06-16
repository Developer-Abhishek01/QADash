import { Logger } from '../../utils/logger';
import { ApiResponse } from '../api-client';

export interface ResponseLog {
  timestamp: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
}

export class ResponseInterceptor {
  private logger: Logger;
  private logs: ResponseLog[] = [];
  private hooks: ((log: ResponseLog) => Promise<void>)[] = [];
  private errorHooks: ((log: ResponseLog, error: Error) => Promise<void>)[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  intercept<T>(response: ApiResponse<T>): void {
    const log: ResponseLog = {
      timestamp: new Date().toISOString(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      responseTime: response.responseTime,
    };

    this.logs.push(log);

    const statusEmoji = response.status >= 200 && response.status < 300 ? '✅' :
                       response.status >= 300 && response.status < 400 ? '⚠️' : '❌';

    this.logger.info(`${statusEmoji} ← ${response.status} ${response.statusText} (${response.responseTime}ms)`);

    if (response.status >= 400) {
      this.logger.warn(`Response body: ${JSON.stringify(response.body, null, 2).substring(0, 500)}`);
      this.executeErrorHooks(log, new Error(`HTTP ${response.status}: ${response.statusText}`));
    } else {
      this.logger.debug(`Response body: ${JSON.stringify(response.body, null, 2).substring(0, 200)}`);
    }

    this.executeHooks(log);
  }

  getLogs(): ResponseLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  onResponse(callback: (log: ResponseLog) => Promise<void>): void {
    this.hooks.push(callback);
  }

  onError(callback: (log: ResponseLog, error: Error) => Promise<void>): void {
    this.errorHooks.push(callback);
  }

  private async executeHooks(log: ResponseLog): Promise<void> {
    for (const hook of this.hooks) {
      try {
        await hook(log);
      } catch (error) {
        this.logger.error(`Response hook error: ${error}`);
      }
    }
  }

  private async executeErrorHooks(log: ResponseLog, error: Error): Promise<void> {
    for (const hook of this.errorHooks) {
      try {
        await hook(log, error);
      } catch (err) {
        this.logger.error(`Error hook error: ${err}`);
      }
    }
  }

  isSuccess(response: ApiResponse): boolean {
    return response.status >= 200 && response.status < 300;
  }

  isRedirect(response: ApiResponse): boolean {
    return response.status >= 300 && response.status < 400;
  }

  isClientError(response: ApiResponse): boolean {
    return response.status >= 400 && response.status < 500;
  }

  isServerError(response: ApiResponse): boolean {
    return response.status >= 500;
  }
}