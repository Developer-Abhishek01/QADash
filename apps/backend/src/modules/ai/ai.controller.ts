import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('projects/:projectId/insights')
  getInsights(@Param('projectId') projectId: string) { return this.aiService.getInsights(projectId); }

  @Post('projects/:projectId/analyze-test')
  analyzeTest(@Param('projectId') projectId: string, @Body() data: { testCode: string }) { return this.aiService.analyzeTest(projectId, data.testCode); }

  @Post('projects/:projectId/generate-tests')
  generateTestCases(@Param('projectId') projectId: string, @Body() data: { description: string }) { return this.aiService.generateTestCases(projectId, data.description); }

  @Post('projects/:projectId/executions/:executionId/analyze')
  analyzeExecution(@Param('projectId') projectId: string, @Param('executionId') executionId: string) { return this.aiService.analyzeExecution(projectId, executionId); }

  @Post('bugs/:bugId/suggest-fixes')
  suggestFixes(@Param('bugId') bugId: string, @Body() data: { errorStack: string }) { return this.aiService.suggestFixes(bugId, data.errorStack); }
}