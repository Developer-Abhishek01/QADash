import { Logger } from '../utils/logger';

export interface SocketConfig {
  url: string;
  transports?: ('websocket' | 'polling')[];
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  auth?: { token?: string };
}

export interface ExecutionProgress {
  executionId: string;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  progressPercent: number;
  currentTest?: string;
}

export interface TestEvent {
  testId: string;
  testName: string;
  status: 'started' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  timestamp: string;
}

export interface WorkerStatus {
  workerId: string;
  status: 'idle' | 'busy' | 'offline';
  currentExecution?: string;
  currentTest?: string;
}

export interface QueueStatus {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export class RealtimeClient {
  private socket: any = null;
  private logger: Logger;
  private config: SocketConfig;
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connected = false;
  private connectionAttempts = 0;

  constructor(config: SocketConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('RealtimeClient');
  }

  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.warn('Already connected');
      return;
    }

    try {
      const { io } = await import('socket.io-client');
      
      this.socket = io(this.config.url, {
        transports: this.config.transports || ['websocket', 'polling'],
        reconnection: this.config.reconnection ?? true,
        reconnectionAttempts: this.config.reconnectionAttempts ?? 5,
        reconnectionDelay: this.config.reconnectionDelay ?? 1000,
        auth: this.config.auth,
      });

      this.setupEventListeners();
    } catch (error) {
      this.logger.error(`Connection failed: ${error}`);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connected = true;
      this.connectionAttempts = 0;
      this.logger.info('Connected to realtime server');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.connected = false;
      this.logger.warn(`Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (error: Error) => {
      this.connectionAttempts++;
      this.logger.error(`Connection error (attempt ${this.connectionAttempts}): ${error.message}`);
    });

    this.socket.on('execution:started', (data: any) => this.emit('execution:started', data));
    this.socket.on('execution:progress', (data: any) => this.emit('execution:progress', data));
    this.socket.on('execution:completed', (data: any) => this.emit('execution:completed', data));
    this.socket.on('execution:failed', (data: any) => this.emit('execution:failed', data));
    
    this.socket.on('test:started', (data: any) => this.emit('test:started', data));
    this.socket.on('test:passed', (data: any) => this.emit('test:passed', data));
    this.socket.on('test:failed', (data: any) => this.emit('test:failed', data));
    this.socket.on('test:skipped', (data: any) => this.emit('test:skipped', data));
    
    this.socket.on('worker:status', (data: any) => this.emit('worker:status', data));
    this.socket.on('queue:status', (data: any) => this.emit('queue:status', data));
    this.socket.on('logs:stream', (data: any) => this.emit('logs:stream', data));
    this.socket.on('screenshot:captured', (data: any) => this.emit('screenshot:captured', data));
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Handler error for ${event}: ${error}`);
        }
      });
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: (data: any) => void): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  subscribeToExecution(executionId: string): void {
    this.socket?.emit('execution:subscribe', { executionId });
  }

  unsubscribeFromExecution(executionId: string): void {
    this.socket?.emit('execution:unsubscribe', { executionId });
  }

  subscribeToProject(projectId: string): void {
    this.socket?.emit('project:subscribe', { projectId });
  }

  subscribeToWorkers(): void {
    this.socket?.emit('worker:subscribe');
  }

  subscribeToQueues(): void {
    this.socket?.emit('queue:subscribe');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connected = false;
    this.eventHandlers.clear();
  }
}

export class ExecutionMonitor {
  private client: RealtimeClient;
  private logger: Logger;
  private currentExecutionId: string | null = null;
  private progressCallback?: (progress: ExecutionProgress) => void;
  private testCallback?: (event: TestEvent) => void;
  private logCallback?: (testId: string, logs: string) => void;

  constructor(config: SocketConfig, logger?: Logger) {
    this.client = new RealtimeClient(config, logger);
    this.logger = logger || new Logger('ExecutionMonitor');
  }

  async startMonitoring(executionId: string): Promise<void> {
    this.currentExecutionId = executionId;
    await this.client.connect();
    this.client.subscribeToExecution(executionId);
    
    this.client.on('execution:progress', (data) => {
      if (this.progressCallback) {
        this.progressCallback(data.payload);
      }
    });

    this.client.on('test:started', (data) => {
      if (this.testCallback) {
        this.testCallback({
          testId: data.testId,
          testName: data.payload.testName,
          status: 'started',
          timestamp: data.timestamp,
        });
      }
    });

    this.client.on('test:passed', (data) => {
      if (this.testCallback) {
        this.testCallback({
          testId: data.testId,
          testName: '',
          status: 'passed',
          duration: data.payload.duration,
          timestamp: data.timestamp,
        });
      }
    });

    this.client.on('test:failed', (data) => {
      if (this.testCallback) {
        this.testCallback({
          testId: data.testId,
          testName: '',
          status: 'failed',
          duration: data.payload.duration,
          error: data.payload.error,
          timestamp: data.timestamp,
        });
      }
    });

    this.client.on('logs:stream', (data) => {
      if (this.logCallback && data.testId) {
        this.logCallback(data.testId, data.payload.logs);
      }
    });

    this.logger.info(`Started monitoring execution: ${executionId}`);
  }

  async stopMonitoring(): Promise<void> {
    if (this.currentExecutionId) {
      this.client.unsubscribeFromExecution(this.currentExecutionId);
    }
    this.client.disconnect();
    this.currentExecutionId = null;
    this.logger.info('Stopped monitoring');
  }

  onProgress(callback: (progress: ExecutionProgress) => void): void {
    this.progressCallback = callback;
  }

  onTestEvent(callback: (event: TestEvent) => void): void {
    this.testCallback = callback;
  }

  onLogs(callback: (testId: string, logs: string) => void): void {
    this.logCallback = callback;
  }
}

export function createRealtimeClient(baseUrl: string, token?: string): RealtimeClient {
  return new RealtimeClient({
    url: baseUrl,
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
  });
}

export function createExecutionMonitor(baseUrl: string, token?: string): ExecutionMonitor {
  return new ExecutionMonitor({
    url: baseUrl,
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
  });
}