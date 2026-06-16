import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, unreadOnly?: boolean) {
    const where = { userId, ...(unreadOnly ? { read: false } : {}) };
    return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(data: { userId: string; type: string; title: string; message: string; link?: string }) {
    return this.prisma.notification.create({ data: { ...data, type: data.type as any } });
  }

  async markAsRead(id: string) { return this.prisma.notification.update({ where: { id }, data: { read: true } }); }

  async markAllAsRead(userId: string) { return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } }); }
}