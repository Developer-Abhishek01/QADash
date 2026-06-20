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
import { AccessibilityService } from './accessibility.service';
import {
  CreateAccessibilityTestDto,
  UpdateAccessibilityTestDto,
  AccessibilityTestFilterDto,
  IssueFilterDto,
  ResolveIssueDto,
  CreateBaselineDto,
} from './dto/accessibility.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Accessibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accessibility')
export class AccessibilityController {
  constructor(private readonly accessibilityService: AccessibilityService) {}

  @Post('tests')
  @ApiOperation({ summary: 'Create a new accessibility test' })
  async createTest(@Body() dto: CreateAccessibilityTestDto, @Request() req: { user: { id: string } }) {
    return this.accessibilityService.createTest(dto, req.user.id);
  }

  @Post('tests/:id/run')
  @ApiOperation({ summary: 'Run an accessibility test' })
  async runTest(@Param('id') id: string) {
    return this.accessibilityService.runTest(id);
  }

  @Post('tests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a running test' })
  async cancelTest(@Param('id') id: string) {
    return this.accessibilityService.cancelTest(id);
  }

  @Get('tests')
  @ApiOperation({ summary: 'Get all accessibility tests' })
  async getTests(@Query() filter: AccessibilityTestFilterDto) {
    return this.accessibilityService.getTests(filter);
  }

  @Get('tests/:id')
  @ApiOperation({ summary: 'Get accessibility test by ID' })
  async getTestById(@Param('id') id: string) {
    return this.accessibilityService.getTestById(id);
  }

  @Put('tests/:id')
  @ApiOperation({ summary: 'Update accessibility test' })
  async updateTest(@Param('id') id: string, @Body() dto: UpdateAccessibilityTestDto) {
    return this.accessibilityService.updateTest(id, dto);
  }

  @Delete('tests/:id')
  @ApiOperation({ summary: 'Delete accessibility test' })
  async deleteTest(@Param('id') id: string) {
    return this.accessibilityService.deleteTest(id);
  }

  @Get('issues')
  @ApiOperation({ summary: 'Get accessibility issues' })
  async getIssues(@Query() filter: IssueFilterDto) {
    return this.accessibilityService.getIssues(filter);
  }

  @Put('issues/:id/resolve')
  @ApiOperation({ summary: 'Resolve an issue' })
  async resolveIssue(@Param('id') id: string, @Body() dto: ResolveIssueDto) {
    return this.accessibilityService.resolveIssue(id, dto);
  }

  @Post('baselines')
  @ApiOperation({ summary: 'Create accessibility baseline' })
  async createBaseline(@Body() dto: CreateBaselineDto) {
    return this.accessibilityService.createBaseline(dto);
  }

  @Get('baselines')
  @ApiOperation({ summary: 'Get accessibility baselines' })
  async getBaselines(@Query('projectId') projectId: string) {
    return this.accessibilityService.getBaselines(projectId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get accessibility dashboard stats' })
  async getDashboardStats(@Query('projectId') projectId?: string) {
    return this.accessibilityService.getDashboardStats(projectId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate accessibility report' })
  async generateReport(@Body() body: GenerateReportDto) {
    return this.accessibilityService.generateReport(body.testId, body.format);
  }
}