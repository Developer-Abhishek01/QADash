import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventHubService } from '../orchestration/services/event-hub.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, string>();

  constructor(private readonly eventHubService: EventHubService) {}

  afterInit(server: Server) {
    this.eventHubService.setSocketServer(server);
    this.logger.log('Socket.io server initialized and shared with EventHubService');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-project')
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.join(`project-${projectId}`);
    this.logger.log(`Client ${client.id} joined project ${projectId}`);
    return { event: 'joined', room: `project-${projectId}` };
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    client.leave(`project-${projectId}`);
    return { event: 'left', room: `project-${projectId}` };
  }

  @SubscribeMessage('execution-update')
  handleExecutionUpdate(@MessageBody() data: { projectId: string; executionId: string; status: string; results?: object }) {
    this.server.to(`project-${data.projectId}`).emit('execution-status', data);
  }

  @SubscribeMessage('test-result')
  handleTestResult(@MessageBody() data: { projectId: string; testId: string; status: string; duration?: number }) {
    this.server.to(`project-${data.projectId}`).emit('test-completed', data);
  }

  emitToProject(projectId: string, event: string, data: unknown) {
    this.server.to(`project-${projectId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  @SubscribeMessage('join-security-scan')
  handleJoinSecurityScan(@ConnectedSocket() client: Socket, @MessageBody() scanId: string) {
    client.join(`security-scan-${scanId}`);
    this.logger.log(`Client ${client.id} joined security scan ${scanId}`);
    return { event: 'joined', room: `security-scan-${scanId}` };
  }

  @SubscribeMessage('leave-security-scan')
  handleLeaveSecurityScan(@ConnectedSocket() client: Socket, @MessageBody() scanId: string) {
    client.leave(`security-scan-${scanId}`);
    return { event: 'left', room: `security-scan-${scanId}` };
  }

  emitSecurityScanUpdate(projectId: string, scanId: string, data: {
    status: string;
    progress: number;
    findings?: { critical: number; high: number; medium: number; low: number; info: number };
  }) {
    this.server.to(`security-scan-${scanId}`).emit('security-scan-progress', { scanId, ...data });
    this.server.to(`project-${projectId}`).emit('security-scan-status', { scanId, ...data });
  }

  emitVulnerabilityFound(projectId: string, vulnerability: {
    id: string;
    title: string;
    severity: string;
    affectedUrl: string;
  }) {
    this.server.to(`project-${projectId}`).emit('vulnerability-detected', vulnerability);
  }

  emitSecurityAlert(projectId: string, alert: {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }) {
    this.server.to(`project-${projectId}`).emit('security-alert', alert);
  }
}