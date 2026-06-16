import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { websocketGateway, RealtimeEvent, EventType } from './websocket-gateway';

export interface EventHandler {
  (event: RealtimeEvent): Promise<void> | void;
}

export interface EventFilter {
  executionId?: string;
  testId?: string;
  workerId?: string;
  type?: EventType;
}

export class EventSystem extends EventEmitter {
  private logger: Logger;
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 1000, logger?: Logger) {
    super();
    this.logger = logger || new Logger('EventSystem');
    this.maxHistorySize = maxHistorySize;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers(): void {
    this.on('execution:completed', (event: RealtimeEvent) => {
      this.logger.info(`Execution completed: ${event.executionId}`);
    });

    this.on('test:failed', (event: RealtimeEvent) => {
      this.logger.warn(`Test failed: ${event.testId}`);
    });

    this.on('execution:failed', (event: RealtimeEvent) => {
      this.logger.error(`Execution failed: ${event.executionId}`);
    });
  }

  registerHandler(type: EventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    this.logger.debug(`Handler registered for event: ${type}`);
  }

  unregisterHandler(type: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger.debug(`Handler unregistered for event: ${type}`);
      }
    }
  }

  async emitEvent(type: EventType, payload: unknown, context?: { executionId?: string; testId?: string; workerId?: string }): Promise<void> {
    const event: RealtimeEvent = {
      type,
      executionId: context?.executionId,
      testId: context?.testId,
      workerId: context?.workerId,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.addToHistory(event);

    const handlers = this.handlers.get(type);
    if (handlers) {
      await Promise.all(handlers.map(handler => {
        try {
          return handler(event);
        } catch (error) {
          this.logger.error(`Handler error for ${type}: ${error}`);
        }
      }));
    }

    this.emit(type, event);
    websocketGateway.io?.emit(type as string, event);
  }

  private addToHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getEventHistory(filter?: EventFilter, limit = 100): RealtimeEvent[] {
    let filtered = this.eventHistory;

    if (filter) {
      filtered = filtered.filter(event => {
        if (filter.type && event.type !== filter.type) return false;
        if (filter.executionId && event.executionId !== filter.executionId) return false;
        if (filter.testId && event.testId !== filter.testId) return false;
        if (filter.workerId && event.workerId !== filter.workerId) return false;
        return true;
      });
    }

    return filtered.slice(-limit);
  }

  clearHistory(): void {
    this.eventHistory = [];
    this.logger.info('Event history cleared');
  }

  getEventStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};

    this.eventHistory.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
    });

    return {
      total: this.eventHistory.length,
      byType,
    };
  }
}

export class ExecutionEventPublisher {
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem, _logger?: Logger) {
    this.eventSystem = eventSystem;
  }

  async publishExecutionStarted(executionId: string, projectId: string, totalTests: number, browser: string): Promise<void> {
    await this.eventSystem.emitEvent('execution:started', { projectId, totalTests, browser }, { executionId });
  }

  async publishExecutionProgress(executionId: string, progress: { total: number; completed: number; passed: number; failed: number }): Promise<void> {
    await this.eventSystem.emitEvent('execution:progress', progress, { executionId });
  }

  async publishExecutionCompleted(executionId: string, result: { status: string; passed: number; failed: number; duration: number }): Promise<void> {
    await this.eventSystem.emitEvent(result.status === 'failed' ? 'execution:failed' : 'execution:completed', result, { executionId });
  }

  async publishTestStarted(executionId: string, testId: string, testName: string, workerId: string): Promise<void> {
    await this.eventSystem.emitEvent('test:started', { testName }, { executionId, testId, workerId });
  }

  async publishTestCompleted(executionId: string, testId: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: string): Promise<void> {
    const eventType = status === 'passed' ? 'test:passed' : status === 'failed' ? 'test:failed' : 'test:skipped';
    await this.eventSystem.emitEvent(eventType as any, { duration, error }, { executionId, testId });
  }

  async publishLogs(executionId: string, testId: string, logs: string): Promise<void> {
    await this.eventSystem.emitEvent('logs:stream', { logs }, { executionId, testId });
  }

  async publishScreenshot(executionId: string, testId: string, screenshot: string): Promise<void> {
    await this.eventSystem.emitEvent('screenshot:captured', { screenshot }, { executionId, testId });
  }
}

export const eventSystem = new EventSystem();
export const eventPublisher = new ExecutionEventPublisher(eventSystem);