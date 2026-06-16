import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  findAll(@Request() req: any) { return this.uploadsService.findAll(req.user.id); }
  @Get(':id')
  findOne(@Param('id') id: string) { return this.uploadsService.findById(id); }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.uploadsService.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      userId: req.user.id,
    });
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.uploadsService.delete(id); }
}