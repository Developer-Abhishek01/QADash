import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class EnvironmentsService {
  private readonly logger = new Logger(EnvironmentsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.environment.findMany({ where, include: { project: true }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const env = await this.prisma.environment.findUnique({ where: { id } });
    if (!env) throw new NotFoundException('Environment not found');
    return env;
  }

  async create(data: { name: string; projectId: string; type: string; baseUrl: string; variables?: object }) {
    return this.prisma.environment.create({ data: { ...data, variables: data.variables as any } });
  }

  async update(id: string, data: Partial<{ name: string; type: string; baseUrl: string; variables: object; isActive: boolean }>) {
    return this.prisma.environment.update({ where: { id }, data: { ...data, variables: data.variables as any } });
  }

  async delete(id: string) { return this.prisma.environment.delete({ where: { id } }); }
}