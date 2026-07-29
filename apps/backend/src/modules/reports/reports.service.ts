import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.report.findMany({ where, include: { project: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async create(data: { projectId: string; userId: string; type: string; name: string; summary: object; data?: object }) {
    return this.prisma.report.create({ 
      data: { 
        ...data, 
        type: data.type as unknown as 'TEST_SUMMARY' | 'COVERAGE' | 'PERFORMANCE' | 'FLAKY_TESTS',
        summary: data.summary as unknown as Prisma.InputJsonValue,
        data: data.data as unknown as Prisma.InputJsonValue,
      }, 
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.report.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Report ${id} not found`);
    await this.prisma.report.delete({ where: { id } });
    return { deleted: true, id };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.report.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count, ids };
  }
}