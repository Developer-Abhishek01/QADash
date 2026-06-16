import { Server as SocketIOServer, Socket, ServerOptions } from 'socket.io';
import { Server } from 'http';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export type EventType = 
  | 'execution:started'
  | 'execution:progress'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'test:started'
  | 'test:passed'
  | 'test:failed'
  | 'test:skipped'
  | 'worker:allocated'
  | 'worker:released'
  | 'worker:status'
  | 'queue:status'
  | 'logs:stream'
  | 'screenshot:captured'
  | 'video:recorded';

export interface RealtimeEvent {
  type: EventType;
  executionId?: string;
  testId?: string;
  workerId?: string;
  timestamp: string;
  payload: unknown;
}

export interface ExecutionProgress {
  executionId: string;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  progressPercent: number;
  currentTest?: string;
  duration: number;
}

export interface WorkerStatusUpdate {
  workerId: string;
  status: 'idle' | 'busy' | 'offline';
  currentExecution?: string;
  currentTest?: string;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface QueueStatusUpdate {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export class WebSocketGateway extends EventEmitter {
  private _io: SocketIOServer | null = null;
  private logger: Logger;
  private connectedClients: Map<string, Set<string>> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  get io(): SocketIOServer | null {
    return this._io;
  }

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('WebSocketGateway');
  }

  initialize(httpServer: Server, options?: Partial<ServerOptions>): void {
    this._io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ['websocket', 'polling'],
      ...options,
    });

    this.setupEventHandlers();
    this.logger.info('WebSocket Gateway initialized');
  }

  private setupEventHandlers(): void {
    if (!this._io) return;

    this._io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this._io.on('disconnect', (socket: Socket) => {
      this.handleDisconnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.set(clientId, new Set());
    
    this.logger.info(`Client connected: ${clientId}`);

    socket.on('subscribe', (data: { room: string }) => {
      this.subscribeClient(socket, data.room);
    });

    socket.on('unsubscribe', (data: { room: string }) => {
      this.unsubscribeClient(socket, data.room);
    });

    socket.on('execution:subscribe', (data: { executionId: string }) => {
      const room = `execution:${data.executionId}`;
      this.subscribeClient(socket, room);
    });

    socket.on('execution:unsubscribe', (data: { executionId: string }) => {
      const room = `execution:${data.executionId}`;
      this.unsubscribeClient(socket, room);
    });

    socket.on('project:subscribe', (data: { projectId: string }) => {
      const room = `project:${data.projectId}`;
      this.subscribeClient(socket, room);
    });

    socket.on('worker:subscribe', () => {
      this.subscribeClient(socket, 'workers');
    });

    socket.on('queue:subscribe', () => {
      this.subscribeClient(socket, 'queues');
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.emit('connected', { clientId, timestamp: new Date().toISOString() });
  }

  private handleDisconnection(socket: Socket): void {
    const clientId = socket.id;
    const rooms = this.connectedClients.get(clientId);
    
    if (rooms) {
      rooms.forEach(room => {
        socket.leave(room);
        this.removeFromRoom(room, clientId);
      });
    }

    this.connectedClients.delete(clientId);
    this.logger.info(`Client disconnected: ${clientId}`);
  }

  private subscribeClient(socket: Socket, room: string): void {
    socket.join(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socket.id);
    this.connectedClients.get(socket.id)?.add(room);
    
    this.logger.debug(`Client ${socket.id} joined room: ${room}`);
  }

  private unsubscribeClient(socket: Socket, room: string): void {
    socket.leave(room);
    this.removeFromRoom(room, socket.id);
    this.connectedClients.get(socket.id)?.delete(room);
    
    this.logger.debug(`Client ${socket.id} left room: ${room}`);
  }

  private removeFromRoom(room: string, clientId: string): void {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  emitExecutionStarted(executionId: string, payload: { projectId: string; totalTests: number; browser: string }): void {
    const event: RealtimeEvent = {
      type: 'execution:started',
      executionId,
      timestamp: new Date().toISOString(),
      payload,
    };

    this._io?.to(`execution:${executionId}`).emit('execution:started', event);
    this.emit('execution:started', event);
  }

  emitExecutionProgress(progress: ExecutionProgress): void {
    const event: RealtimeEvent = {
      type: 'execution:progress',
      executionId: progress.executionId,
      timestamp: new Date().toISOString(),
      payload: progress,
    };

    this._io?.to(`execution:${progress.executionId}`).emit('execution:progress', event);
    this.emit('execution:progress', event);
  }

  emitExecutionCompleted(executionId: string, result: { status: string; passed: number; failed: number; duration: number }): void {
    const event: RealtimeEvent = {
      type: 'execution:completed',
      executionId,
      timestamp: new Date().toISOString(),
      payload: result,
    };

    this._io?.to(`execution:${executionId}`).emit('execution:completed', event);
    this.emit('execution:completed', event);
  }

  emitTestStarted(executionId: string, testId: string, testName: string, workerId: string): void {
    const event: RealtimeEvent = {
      type: 'test:started',
      executionId,
      testId,
      workerId,
      timestamp: new Date().toISOString(),
      payload: { testId, testName, workerId },
    };

    this._io?.to(`execution:${executionId}`).emit('test:started', event);
    this.emit('test:started', event);
  }

  emitTestCompleted(executionId: string, testId: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: string): void {
    const event: RealtimeEvent = {
      type: status === 'passed' ? 'test:passed' : status === 'failed' ? 'test:failed' : 'test:skipped',
      executionId,
      testId,
      timestamp: new Date().toISOString(),
      payload: { testId, status, duration, error },
    };

    this._io?.to(`execution:${executionId}`).emit(`test:${status}`, event);
    this.emit(`test:${status}`, event);
  }

  emitWorkerStatusUpdate(status: WorkerStatusUpdate): void {
    const event: RealtimeEvent = {
      type: 'worker:status',
      workerId: status.workerId,
      timestamp: new Date().toISOString(),
      payload: status,
    };

    this._io?.to('workers').emit('worker:status', event);
    this.emit('worker:status', event);
  }

  emitQueueStatusUpdate(status: QueueStatusUpdate): void {
    const event: RealtimeEvent = {
      type: 'queue:status',
      timestamp: new Date().toISOString(),
      payload: status,
    };

    this._io?.to('queues').emit('queue:status', event);
    this.emit('queue:status', event);
  }

  emitLogStream(executionId: string, testId: string, logs: string): void {
    const event: RealtimeEvent = {
      type: 'logs:stream',
      executionId,
      testId,
      timestamp: new Date().toISOString(),
      payload: { logs },
    };

    this._io?.to(`execution:${executionId}`).emit('logs:stream', event);
  }

  emitScreenshot(executionId: string, testId: string, screenshot: string): void {
    const event: RealtimeEvent = {
      type: 'screenshot:captured',
      executionId,
      testId,
      timestamp: new Date().toISOString(),
      payload: { screenshot },
    };

    this._io?.to(`execution:${executionId}`).emit('screenshot:captured', event);
  }

  emitVideo(executionId: string, testId: string, videoPath: string): void {
    const event: RealtimeEvent = {
      type: 'video:recorded',
      executionId,
      testId,
      timestamp: new Date().toISOString(),
      payload: { videoPath },
    };

    this._io?.to(`execution:${executionId}`).emit('video:recorded', event);
  }

  broadcastToProject(projectId: string, event: string, data: unknown): void {
    this._io?.to(`project:${projectId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: unknown): void {
    this._io?.emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getRoomCount(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  getExecutionSubscribers(executionId: string): number {
    return this.getRoomCount(`execution:${executionId}`);
  }

  isClientConnected(clientId: string): boolean {
    return this.connectedClients.has(clientId);
  }

  getStats(): { connectedClients: number; rooms: number; totalSubscribers: number } {
    let totalSubscribers = 0;
    this.rooms.forEach(clients => {
      totalSubscribers += clients.size;
    });

    return {
      connectedClients: this.connectedClients.size,
      rooms: this.rooms.size,
      totalSubscribers,
    };
  }

  shutdown(): void {
    this._io?.close();
    this.connectedClients.clear();
    this.rooms.clear();
    this.logger.info('WebSocket Gateway shutdown');
  }
}

export const websocketGateway = new WebSocketGateway();