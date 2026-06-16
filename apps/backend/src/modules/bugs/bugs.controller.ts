import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BugsService, BugCreateInput, BugUpdateInput } from './bugs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExcelIntegration } from './integrations/excel.integration';
import { JiraIntegration } from './integrations/jira.integration';
import { UserRole } from '../rbac/rbac.service';
import { Response } from 'express';

@Controller('bugs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BugsController {
  constructor(
    private readonly bugsService: BugsService,
    private readonly excelIntegration: ExcelIntegration,
    private readonly jiraIntegration: JiraIntegration,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER)
  @ApiOperation({ summary: 'Create a new bug' })
  async create(@Body() createBugDto: any, @Req() req: any) {
    return this.bugsService.create({ ...createBugDto, userId: req.user.id });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get all bugs' })
  async findAll(@Query() query: any) {
    return this.bugsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get bug by id' })
  async findOne(@Param('id') id: string) {
    return this.bugsService.findById(id);
  }

  @Post(':id/duplicate-check')
  async checkDuplicates(@Param('id') id: string, @Body('title') title: string) {
    const bug = await this.bugsService.findById(id);
    return this.bugsService.detectDuplicates(title || bug.title, bug.projectId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Update bug' })
  async update(@Param('id') id: string, @Body() updateBugDto: BugUpdateInput) {
    return this.bugsService.update(id, updateBugDto);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Update bug status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.bugsService.updateStatus(id, status);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign bug' })
  async assign(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.bugsService.assign(id, assigneeId);
  }

  @Post(':id/attachments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER)
  @ApiOperation({ summary: 'Add attachment to bug' })
  async addAttachment(
    @Param('id') id: string,
    @Body() body: { type: 'screenshot' | 'video' | 'log'; url: string },
  ) {
    return this.bugsService.addAttachment(id, body.type, body.url);
  }

  @Post(':id/sync-jira')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER)
  @ApiOperation({ summary: 'Sync bug with Jira' })
  async syncJira(@Param('id') id: string) {
    return this.bugsService.syncJira(id);
  }

  @Post('export/excel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export bugs to Excel' })
  async exportExcel(@Query() query: any, @Res() res: any) {
    const bugs = await this.bugsService.findAll(query.projectId, query);
    const buffer = this.excelIntegration.exportToExcel(bugs);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=bugs.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('stats/overview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get bugs statistics' })
  async getStats(@Query('projectId') projectId: string) {
    return this.bugsService.getStats(projectId);
  }

  @Get('ai/analysis/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.QA_ENGINEER)
  @ApiOperation({ summary: 'Get AI failure analysis' })
  async getAiAnalysis(@Param('id') id: string) {
    return this.bugsService.getAiAnalysis(id);
  }

  @Get('export/csv/:projectId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export bugs to CSV' })
  async exportCsv(@Param('projectId') projectId: string, @Res() res: any) {
    const bugs = await this.bugsService.findAll(projectId);
    const csv = this.excelIntegration.exportToCsv(bugs);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=bugs.csv',
    });
    res.send(csv);
  }

  @Post('import/excel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Import bugs from Excel' })
  async importExcel(@Body() body: { buffer: string; projectId: string }) {
    const buffer = Buffer.from(body.buffer, 'base64');
    const bugs = await this.excelIntegration.importFromExcel(buffer, body.projectId);
    // You would typically save these to the database here
    return { imported: bugs.length, bugs };
  }

  @Post('import/csv')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Import bugs from CSV' })
  async importCsv(@Body() body: { content: string; projectId: string }) {
    const bugs = await this.excelIntegration.importFromCsv(body.content, body.projectId);
    // You would typically save these to the database here
    return { imported: bugs.length, bugs };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete bug' })
  async delete(@Param('id') id: string) {
    return this.bugsService.delete(id);
  }
}