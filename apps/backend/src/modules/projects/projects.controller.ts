import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectUserDto } from './dto/add-project-user.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Request() req: any, @Query('userId') userId?: string) {
    return this.projectsService.findAll(userId || req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  create(@Body() data: CreateProjectDto) {
    return this.projectsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateProjectDto) {
    return this.projectsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Post(':id/users')
  addUser(@Param('id') id: string, @Body() data: AddProjectUserDto) {
    return this.projectsService.addUser(id, data.userId, data.role);
  }

  @Delete(':id/users/:userId')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeUser(id, userId);
  }
}