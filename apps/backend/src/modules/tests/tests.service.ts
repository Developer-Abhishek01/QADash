import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.test.findMany({
      where,
      include: { project: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const test = await this.prisma.test.findUnique({ where: { id } });
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
    return this.prisma.test.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: resolvedProjectId,
        userId: data.userId,
        config: (data.config || {}) as any,
        code: data.code,
        specFile: data.specFile,
        tags: data.tags || [],
        status: data.status as any,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string; status: string; config: object; code: string; specFile: string; tags: string[] }>) {
    return this.prisma.test.update({
      where: { id },
      data: { 
        ...data, 
        status: data.status as any,
        config: data.config as any 
      },
    });
  }

  async delete(id: string) {
    await this.prisma.test.deleteMany({ where: { id } });
  }
}