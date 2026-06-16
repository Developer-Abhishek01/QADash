import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FileParserService } from './parsers/file-parser.service';
import { ValidationService } from './validators/validation.service';
import { MappingService } from './services/mapping.service';
import { CreateImportDto, ImportFilterDto, SaveMappingsDto, ProcessImportDto } from './dto/import.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ImportService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: FileParserService,
    private readonly validationService: ValidationService,
    private readonly mappingService: MappingService,
  ) {}

  async onModuleInit() {}

  async createImport(dto: CreateImportDto, userId: string, file: Express.Multer.File) {
    const importRecord = await this.prisma.fileImport.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        userId,
        fileType: dto.fileType,
        status: 'PENDING',
        originalFilename: file.originalname,
        storedFilename: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        settings: (dto.settings || {}) as any,
      },
      include: {
        project: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    return importRecord;
  }

  async uploadFile(projectId: string, userId: string, file: Express.Multer.File) {
    const ext = path.extname(file.originalname).toLowerCase();
    let fileType: string;

    if (ext === '.xlsx' || ext === '.xls') {
      fileType = 'EXCEL';
    } else if (ext === '.csv') {
      fileType = 'CSV';
    } else if (ext === '.json') {
      fileType = 'JSON';
    } else if (ext === '.yaml' || ext === '.yml') {
      fileType = 'YAML';
    } else {
      throw new BadRequestException('Unsupported file type. Supported: Excel, CSV, JSON, YAML');
    }

    const fileImport = await this.prisma.fileImport.create({
      data: {
        name: file.originalname.replace(/\.[^/.]+$/, ''),
        projectId,
        userId,
        fileType: fileType as any,
        status: 'PENDING',
        originalFilename: file.originalname,
        storedFilename: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    return fileImport;
  }

  async parseFile(importId: string) {
    const fileImport = await this.prisma.fileImport.findUnique({
      where: { id: importId },
    });

    if (!fileImport) throw new NotFoundException('Import not found');

    await this.prisma.fileImport.update({
      where: { id: importId },
      data: { status: 'PROCESSING' },
    });

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, fileImport.storedFilename);

      const parsedData = await this.parserService.parse(filePath, fileImport.fileType as any);

      const schema = this.parserService.extractSchema(parsedData);
      const previewData = parsedData.slice(0, 10);

      await this.prisma.fileImport.update({
        where: { id: importId },
        data: {
          totalRows: parsedData.length,
          previewData: previewData as any,
          schema: schema as any,
          status: 'PENDING',
        },
      });

      const autoMappings = this.mappingService.generateAutoMappings(schema, {});
      for (const mapping of autoMappings) {
        await this.prisma.fieldMapping.create({
          data: {
            importId,
            sourceField: mapping.sourceField,
            targetField: mapping.targetField,
            fieldType: mapping.fieldType,
            isRequired: mapping.isRequired,
          },
        });
      }

      return {
        importId,
        totalRows: parsedData.length,
        schema,
        previewData,
        mappings: autoMappings,
      };
    } catch (error) {
      await this.prisma.fileImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errorSummary: { error: error.message },
        },
      });
      throw error;
    }
  }

  async getImports(filter: ImportFilterDto) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;

    const [imports, total] = await Promise.all([
      this.prisma.fileImport.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          _count: { select: { mappings: true, errors: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.offset || 0,
        take: filter.limit || 20,
      }),
      this.prisma.fileImport.count({ where }),
    ]);

    return { imports, total };
  }

  async getImportById(importId: string) {
    const fileImport = await this.prisma.fileImport.findUnique({
      where: { id: importId },
      include: {
        project: true,
        user: { select: { id: true, name: true } },
        mappings: { orderBy: { sourceField: 'asc' } },
        errors: { orderBy: { rowNumber: 'asc' }, take: 50 },
      },
    });

    if (!fileImport) throw new NotFoundException('Import not found');
    return fileImport;
  }

  async saveMappings(dto: SaveMappingsDto) {
    await this.prisma.fieldMapping.deleteMany({
      where: { importId: dto.importId },
    });

    for (const mapping of dto.mappings) {
      await this.prisma.fieldMapping.create({
        data: {
          importId: dto.importId,
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          fieldType: mapping.fieldType || 'string',
          isRequired: mapping.isRequired || false,
          defaultValue: mapping.defaultValue,
          transformer: mapping.transformer,
          validationRule: mapping.validationRule,
        },
      });
    }

    return { message: 'Mappings saved successfully' };
  }

  async processImport(importId: string) {
    const fileImport = await this.prisma.fileImport.findUnique({
      where: { id: importId },
      include: { mappings: true },
    });

    if (!fileImport) throw new NotFoundException('Import not found');

    await this.prisma.fileImport.update({
      where: { id: importId },
      data: { status: 'PROCESSING' },
    });

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, fileImport.storedFilename);

      const parsedData = await this.parserService.parse(filePath, fileImport.fileType as any);

      const transformedData = this.mappingService.applyMappings(parsedData, fileImport.mappings);

      const validationResult = await this.validationService.validateBatch(transformedData, fileImport.mappings);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validationResult.length; i++) {
        const item = validationResult[i];
        if (item.isValid) {
          successCount++;
        } else {
          errorCount++;
          await this.prisma.importError.create({
            data: {
              importId,
              rowNumber: i + 1,
              fieldName: item.errors[0]?.field,
              value: String(item.errors[0]?.value || ''),
              errorType: item.errors[0]?.type,
              errorMessage: item.errors[0]?.message,
            },
          });
        }
      }

      const finalStatus = errorCount === 0 ? 'COMPLETED' : errorCount === validationResult.length ? 'FAILED' : 'PARTIAL';

      await this.prisma.fileImport.update({
        where: { id: importId },
        data: {
          status: finalStatus,
          processedRows: validationResult.length,
          successRows: successCount,
          errorRows: errorCount,
          completedAt: new Date(),
        },
      });

      return {
        importId,
        totalRows: validationResult.length,
        successRows: successCount,
        errorRows: errorCount,
        status: finalStatus,
        validData: validationResult.filter((r) => r.isValid).map((r) => r.data),
      };
    } catch (error) {
      await this.prisma.fileImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorSummary: { error: error.message },
        },
      });
      throw error;
    }
  }

  async deleteImport(importId: string) {
    const fileImport = await this.prisma.fileImport.findUnique({ where: { id: importId } });
    if (!fileImport) throw new NotFoundException('Import not found');

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, fileImport.storedFilename);
      await fs.unlink(filePath);
    } catch {}

    await this.prisma.fileImport.delete({ where: { id: importId } });
    return { message: 'Import deleted successfully' };
  }

  async getPreviewData(importId: string, offset = 0, limit = 20) {
    const fileImport = await this.prisma.fileImport.findUnique({
      where: { id: importId },
      include: { mappings: true },
    });

    if (!fileImport) throw new NotFoundException('Import not found');

    if (fileImport.previewData) {
      const data = fileImport.previewData as any[];
      return data.slice(offset, offset + limit);
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileImport.storedFilename);

    const parsedData = await this.parserService.parse(filePath, fileImport.fileType as any);
    return parsedData.slice(offset, offset + limit);
  }

  async resolveError(errorId: string) {
    return this.prisma.importError.update({
      where: { id: errorId },
      data: { isResolved: true },
    });
  }

  async getErrors(importId: string) {
    return this.prisma.importError.findMany({
      where: { importId },
      orderBy: { rowNumber: 'asc' },
    });
  }
}