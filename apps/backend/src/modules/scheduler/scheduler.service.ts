import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private readonly prisma: PrismaService, @InjectQueue('scheduler') private schedulerQueue: Queue) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.job.findMany({ where, include: { project: true }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async create(data: { name: string; projectId: string; userId: string; type: string; schedule?: string; config?: object }) {
    const job = await this.prisma.job.create({ data: { ...data, config: data.config as any } });
    if (data.schedule) await this.scheduleJob(job);
    return job;
  }

  async update(id: string, data: Partial<{ name: string; schedule: string; config: object; status: string }>) {
    const job = await this.prisma.job.update({ 
      where: { id }, 
      data: { 
        ...data, 
        status: data.status as any,
        config: data.config as any 
      } 
    });
    if (data.schedule) await this.scheduleJob(job);
    return job;
  }

  async delete(id: string) { return this.prisma.job.delete({ where: { id } }); }

  private async scheduleJob(job: any) {
    await this.schedulerQueue.add('scheduled-job', { jobId: job.id }, { repeat: { pattern: job.schedule } });
  }
}