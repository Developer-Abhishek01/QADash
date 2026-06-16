import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import {
  CreateScanDto,
  UpdateScanDto,
  ScanFilterDto,
  VulnerabilityFilterDto,
  UpdateVulnerabilityDto,
  RunDependencyScanDto,
  GenerateReportDto,
} from './dto/security.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportService } from './reports/report.service';

@ApiTags('Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly reportService: ReportService,
  ) {}

  @Post('scans')
  @ApiOperation({ summary: 'Create a new security scan' })
  async createScan(@Body() dto: CreateScanDto, @Request() req: { user: { id: string } }) {
    return this.securityService.createScan(dto, req.user.id);
  }

  @Post('scans/:id/start')
  @ApiOperation({ summary: 'Start a security scan' })
  async startScan(@Param('id') id: string) {
    return this.securityService.startScan(id);
  }

  @Post('scans/:id/cancel')
  @ApiOperation({ summary: 'Cancel a security scan' })
  async cancelScan(@Param('id') id: string) {
    return this.securityService.cancelScan(id);
  }

  @Get('scans')
  @ApiOperation({ summary: 'Get all security scans' })
  async getScans(@Query() filter: ScanFilterDto) {
    return this.securityService.getScans(filter);
  }

  @Get('scans/:id')
  @ApiOperation({ summary: 'Get security scan by ID' })
  async getScanById(@Param('id') id: string) {
    return this.securityService.getScanById(id);
  }

  @Put('scans/:id')
  @ApiOperation({ summary: 'Update security scan' })
  async updateScan(@Param('id') id: string, @Body() dto: UpdateScanDto) {
    return this.securityService.updateScan(id, dto);
  }

  @Get('vulnerabilities')
  @ApiOperation({ summary: 'Get all vulnerabilities' })
  async getVulnerabilities(@Query() filter: VulnerabilityFilterDto) {
    return this.securityService.getVulnerabilities(filter);
  }

  @Put('vulnerabilities/:id')
  @ApiOperation({ summary: 'Update vulnerability status' })
  async updateVulnerability(
    @Param('id') id: string,
    @Body() dto: UpdateVulnerabilityDto,
  ) {
    return this.securityService.updateVulnerabilityStatus(id, dto.status, dto.reason);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get security dashboard stats' })
  async getDashboardStats(@Query('projectId') projectId?: string) {
    return this.securityService.getDashboardStats(projectId);
  }

  @Post('dependency-scan')
  @ApiOperation({ summary: 'Run dependency vulnerability scan' })
  async runDependencyScan(@Body() dto: RunDependencyScanDto, @Request() req: { user: { id: string } }) {
    return this.securityService.runDependencyScan(dto.projectId, req.user.id, dto.packageManager);
  }

  @Get('dependency-scans')
  @ApiOperation({ summary: 'Get dependency scans' })
  async getDependencyScans(@Query('projectId') projectId: string) {
    return this.securityService.getDependencyScans(projectId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get security alerts' })
  async getAlerts(@Query('projectId') projectId: string, @Query('unreadOnly') unreadOnly?: boolean) {
    return this.securityService.getAlerts(projectId, unreadOnly === true);
  }

  @Put('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  async markAlertRead(@Param('id') id: string) {
    return this.securityService.markAlertRead(id);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate security report' })
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.reportService.generateReport(dto.scanId, dto.format, dto.type);
  }

  @Get('reports/:id/download')
  @ApiOperation({ summary: 'Download security report' })
  async downloadReport(@Param('id') id: string) {
    return this.reportService.getReportDownloadUrl(id);
  }

  @Get('owasp/top10')
  @ApiOperation({ summary: 'Get OWASP Top 10 statistics' })
  async getOwaspStats(@Query('projectId') projectId?: string) {
    return this.securityService.getDashboardStats(projectId);
  }
}