import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return { integrations: [], notifications: { email: true, slack: false }, general: { timezone: 'UTC', language: 'en' } };
  }

  async updateSettings(data: Record<string, unknown>) {
    this.logger.log('Settings updated');
    return { ...data, updatedAt: new Date().toISOString() };
  }

  async getTeam() {
    return this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  async updateTeam(data: { userId: string; role: string }[]) {
    for (const item of data) {
      await this.prisma.user.update({ where: { id: item.userId }, data: { role: item.role as UserRole } });
    }
    return this.getTeam();
  }

  async getIntegrations() {
    return { jira: false, slack: false, github: false };
  }

  async updateIntegrations(data: Record<string, unknown>) {
    this.logger.log('Integrations updated');
    return { ...data, updatedAt: new Date().toISOString() };
  }
}
