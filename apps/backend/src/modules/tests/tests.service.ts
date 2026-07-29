import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, TestStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../common/prisma.service';

interface TestVersionPrisma {
  testVersion: {
    findFirst: (args: { where: { testId: string }; orderBy: { version: 'desc' } }) => Promise<{ version: number } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: { where: { testId: string }; orderBy: { version: 'desc' } }) => Promise<unknown[]>;
  };
}

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.test.findMany({
      where,
      include: { project: true, user: { select: { id: true, name: true, email: true } }, versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  private async resolveProjectId(projectId: string | undefined, projectName: string | undefined, testName: string): Promise<string> {
    if (projectId) {
      const byId = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (byId) return projectId;
    }
    const name = projectName || (testName ? `${testName} Project` : 'Auto-created Project');
    const byName = await this.prisma.project.findFirst({ where: { name } });
    if (byName) return byName.id;
    const project = await this.prisma.project.create({
      data: {
        id: uuidv4(),
        name,
        description: `Auto-created for test: ${testName}`,
        status: 'ACTIVE',
      },
    });
    this.logger.log(`Auto-created project: ${project.name} (${project.id})`);
    return project.id;
  }

  async create(data: { name: string; description?: string; projectId?: string; projectName?: string; userId: string; config?: object; code?: string; specFile?: string; tags?: string[]; status?: string }) {
    const resolvedProjectId = await this.resolveProjectId(data.projectId, data.projectName, data.name);
    const test = await this.prisma.test.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: resolvedProjectId,
        userId: data.userId,
        config: (data.config || {}) as unknown as Prisma.InputJsonValue,
        code: data.code,
        specFile: data.specFile,
        tags: data.tags || [],
        status: data.status as TestStatus,
      },
    });

    if (data.code) {
      await this.createVersion(test.id, data.code, data.config || {}, 'Initial version', data.userId);
    }

    return test;
  }

  async update(id: string, data: Partial<{ name: string; description: string; status: string; config: object; code: string; specFile: string; tags: string[] }>, userId?: string) {
    const existing = await this.prisma.test.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Test not found');

    const wasCodeChanged = data.code && data.code !== existing.code;
    const wasConfigChanged = data.config && JSON.stringify(data.config) !== JSON.stringify(existing.config);

    const test = await this.prisma.test.update({
      where: { id },
      data: {
        ...data,
        status: data.status as TestStatus,
        config: data.config as unknown as Prisma.InputJsonValue,
      },
    });

    if (wasCodeChanged || wasConfigChanged) {
      await this.createVersion(id, data.code || existing.code || '', data.config || (existing.config as object) || {}, wasCodeChanged ? 'Code updated' : 'Config updated', userId || existing.userId);
    }

    return test;
  }

  async saveCode(id: string, code: string, userId: string): Promise<unknown> {
    const existing = await this.prisma.test.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Test not found');

    const test = await this.prisma.test.update({
      where: { id },
      data: { code },
    });

    await this.createVersion(id, code, existing.config as object, 'Code auto-saved from AI generation', userId);
    return test;
  }

  private async createVersion(testId: string, code: string, config: object, changes: string, createdBy: string) {
    const lastVersion = await (this.prisma as unknown as TestVersionPrisma).testVersion.findFirst({
      where: { testId },
      orderBy: { version: 'desc' },
    });
    await (this.prisma as unknown as TestVersionPrisma).testVersion.create({
      data: {
        testId,
        version: (lastVersion?.version || 0) + 1,
        code,
        config: config as Record<string, unknown>,
        changes,
        createdBy,
      },
    });
  }

  async getVersions(testId: string) {
    return (this.prisma as unknown as TestVersionPrisma).testVersion.findMany({
      where: { testId },
      orderBy: { version: 'desc' },
    });
  }

  async delete(id: string) {
    try {
      await this.prisma.test.delete({ where: { id } });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2025') {
        throw new NotFoundException('Test not found');
      }
      throw error;
    }
  }
}
