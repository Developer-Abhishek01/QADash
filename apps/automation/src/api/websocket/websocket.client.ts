import { Logger } from '../../utils/logger';

export type WebSocketEventType = 'open' | 'message' | 'close' | 'error' | 'ping' | 'pong';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: unknown;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  headers?: Record<string, string>;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private logger: Logger;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private eventHandlers: Map<WebSocketEventType, (event: unknown) => void> = new Map();
  private isConnected = false;
  private messageQueue: unknown[] = [];

  constructor(config: WebSocketConfig, logger?: Logger) {
    this.config = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
    this.logger = logger || new Logger('WebSocketClient');
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        this.ws.onopen = () => {
          this.logger.info(`WebSocket connected to: ${this.config.url}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.emitEvent('open', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.logger.debug(`WebSocket message received: ${event.data}`);
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch {
            this.handleMessage(event.data);
          }
        };

        this.ws.onclose = (event) => {
          this.logger.info(`WebSocket closed: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          this.emitEvent('close', event);

          if (this.config.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 5)) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.logger.error(`WebSocket error: ${error}`);
          this.emitEvent('error', error);
          reject(error);
        };

        (this.ws as any).onping = () => this.emitEvent('ping', {});
        (this.ws as any).onpong = () => this.emitEvent('pong', {});
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.config.reconnect = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
      this.isConnected = false;
    }
  }

  send(data: unknown): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.logger.debug(`WebSocket sent: ${message}`);
    } else {
      this.logger.warn('WebSocket not connected, queuing message');
      this.messageQueue.push(data);
    }
  }

  onMessage(type: string, handler: (data: unknown) => void): void {
    this.messageHandlers.set(type, handler);
  }

  on(event: WebSocketEventType, handler: (data: unknown) => void): void {
    this.eventHandlers.set(event, handler);
  }

  off(type: string): void {
    this.messageHandlers.delete(type);
  }

  offEvent(event: WebSocketEventType): void {
    this.eventHandlers.delete(event);
  }

  isOpen(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private handleMessage(data: unknown): void {
    if (typeof data === 'object' && data !== null && 'type' in data) {
      const messageType = (data as Record<string, unknown>).type as string;
      const handler = this.messageHandlers.get(messageType);
      if (handler) {
        handler(data);
      }
    }

    this.messageHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        this.logger.error(`Message handler error: ${error}`);
      }
    });
  }

  private emitEvent(event: WebSocketEventType, data: unknown): void {
    const handler = this.eventHandlers.get(event);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        this.logger.error(`Event handler error: ${error}`);
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.config.reconnectInterval}ms`);

    setTimeout(() => {
      this.logger.info(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect().catch((error) => {
        this.logger.error(`Reconnect failed: ${error}`);
      });
    }, this.config.reconnectInterval);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift();
      if (data) this.send(data);
    }
  }

  waitForMessage(pattern: string | RegExp, timeout = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.offMessageCheck();
        reject(new Error(`Timeout waiting for message matching: ${pattern}`));
      }, timeout);

      const check = (data: unknown) => {
        const dataStr = JSON.stringify(data);
        const match = typeof pattern === 'string' ? dataStr.includes(pattern) : pattern.test(dataStr);
        if (match) {
          clearTimeout(timer);
          this.offMessageCheck();
          resolve(data);
        }
      };

      this.onMessage('wait-for', check);
    });
  }

  private offMessageCheck(): void {
    this.messageHandlers.delete('wait-for');
  }
}

export class WebSocketClientFactory {
  static create(config: WebSocketConfig, logger?: Logger): WebSocketClient {
    return new WebSocketClient(config, logger);
  }
}