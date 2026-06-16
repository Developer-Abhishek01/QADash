import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { Subject } from 'rxjs';

export interface EventMessage {
  id: string;
  channel: string;
  payload: any;
  timestamp: Date;
}

@Injectable()
export class EventHubService {
  private readonly logger = new Logger(EventHubService.name);
  private socketServer: Server | null = null;
  private eventHistory: EventMessage[] = [];
  private readonly maxHistorySize = 10000;

  setSocketServer(server: Server) {
    this.socketServer = server;
  }

  async publish(channel: string, payload: any): Promise<void> {
    const event: EventMessage = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel,
      payload,
      timestamp: new Date(),
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    if (this.socketServer) {
      this.socketServer.to(channel).emit(channel, event.payload);
      this.socketServer.emit(`broadcast:${channel}`, event.payload);
    }

    this.logger.debug(`Event published to ${channel}`);
  }

  async publishToUser(userId: string, channel: string, payload: any): Promise<void> {
    if (this.socketServer) {
      this.socketServer.to(`user:${userId}`).emit(channel, payload);
    }
    this.logger.debug(`Event published to user ${userId} on ${channel}`);
  }

  async publishToRoom(room: string, channel: string, payload: any): Promise<void> {
    if (this.socketServer) {
      this.socketServer.to(`room:${room}`).emit(channel, payload);
    }
    this.logger.debug(`Event published to room ${room} on ${channel}`);
  }

  getRecentEvents(limit: number = 100): EventMessage[] {
    return this.eventHistory.slice(-limit);
  }

  getEventsByChannel(channel: string, limit: number = 100): EventMessage[] {
    return this.eventHistory
      .filter(e => e.channel === channel)
      .slice(-limit);
  }

  async broadcastExecutionUpdate(executionId: string, data: any): Promise<void> {
    await this.publish(`execution:${executionId}`, {
      executionId,
      ...data,
    });
  }

  async broadcastJobUpdate(jobId: string, data: any): Promise<void> {
    await this.publish(`job:${jobId}`, {
      jobId,
      ...data,
    });
  }

  async broadcastServiceStatus(service: string, status: any): Promise<void> {
    await this.publish(`service:${service}`, {
      service,
      status,
      timestamp: new Date(),
    });
  }

  async broadcastAlert(severity: 'info' | 'warning' | 'critical', message: string, metadata?: any): Promise<void> {
    await this.publish('alerts', {
      severity,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  async broadcastAnalytics(data: any): Promise<void> {
    await this.publish('analytics', data);
  }

  clearHistory(): void {
    this.eventHistory = [];
    this.logger.log('Event history cleared');
  }
}