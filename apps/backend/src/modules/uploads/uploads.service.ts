import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};
    return this.prisma.upload.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Upload not found');
    return upload;
  }

  async create(data: { filename: string; originalName: string; mimeType: string; size: number; path: string; userId: string }) {
    return this.prisma.upload.create({ data });
  }

  async delete(id: string) { return this.prisma.upload.delete({ where: { id } }); }
}