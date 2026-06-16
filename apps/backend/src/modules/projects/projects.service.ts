import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string) {
    if (userId) {
      const projectUsers = await this.prisma.projectUser.findMany({
        where: { userId },
        include: { project: true },
      });
      return projectUsers.map((pu) => pu.project);
    }
    return this.prisma.project.findMany();
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(data: { name: string; description?: string; settings?: object }) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        settings: data.settings as any,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string; status: string; settings: object }>) {
    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        status: data.status as any,
        settings: data.settings as any,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  async addUser(projectId: string, userId: string, role: string = 'member') {
    return this.prisma.projectUser.create({
      data: { projectId, userId, role },
    });
  }

  async removeUser(projectId: string, userId: string) {
    return this.prisma.projectUser.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}