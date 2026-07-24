import { HttpService } from '@nestjs/axios';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExecutionsService } from '../executions/executions.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestsController {
  private readonly logger = new Logger(TestsController.name);
  private readonly AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8002';

  constructor(
    private readonly testsService: TestsService,
    private readonly executionsService: ExecutionsService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.testsService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testsService.findById(id);
  }

  @Post()
  create(@Body() data: CreateTestDto, @Request() req: any) {
    return this.testsService.create({ ...data, userId: req.user.id });
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run a single test case' })
  async run(@Param('id') id: string, @Request() req: any) {
    const test = await this.testsService.findById(id);
    const execution = await this.executionsService.create({
      name: `Run: ${test.name}`,
      projectId: test.projectId,
      userId: req.user.id,
      testIds: [id],
    });
    await this.executionsService.start(execution.id);
    return execution;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateTestDto, @Request() req: any) {
    return this.testsService.update(id, data, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.testsService.delete(id);
  }

  @Post(':id/save-code')
  @ApiOperation({ summary: 'Save generated code with version history' })
  async saveCode(@Param('id') id: string, @Body() data: { code: string }, @Request() req: any) {
    return this.testsService.saveCode(id, data.code, req.user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for test code' })
  async getVersions(@Param('id') id: string) {
    return this.testsService.getVersions(id);
  }

  @Post('generate-from-text')
  @ApiOperation({ summary: 'Generate test case from natural language via AI pipeline' })
  async generateFromText(@Body() data: { text: string; projectId?: string; name?: string; url?: string }, @Request() req: any) {
    const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
    const response = await firstValueFrom(
      this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/pipeline/nlp-to-test`,
        {
          text: data.text,
          context: { name: data.name, url: data.url, projectId: data.projectId },
        },
        { timeout: 60000, headers: { 'X-API-Key': apiKey } }
      )
    );
    const pipelineResult = response.data;

    if (pipelineResult.success && pipelineResult.test_case?.generated_code) {
      const test = await this.testsService.create({
        name: data.name || pipelineResult.test_case.name || 'AI Generated Test',
        projectId: data.projectId,
        userId: req.user.id,
        config: {
          url: pipelineResult.test_case.url || data.url || '',
          steps: pipelineResult.test_case.steps || [],
        },
        code: pipelineResult.test_case.generated_code,
        tags: ['ai-generated'],
        status: 'ACTIVE',
      });

      await this.testsService.saveCode(test.id, pipelineResult.test_case.generated_code, req.user.id);

      return {
        success: true,
        test,
        pipelineResult,
      };
    }

    return {
      success: false,
      message: 'AI could not generate test case from the provided text',
      pipelineResult,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate test case structure via AI engine' })
  async validateTestCase(@Body() data: { testCase: any }) {
    const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
    const response = await firstValueFrom(
      this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/validate/test-case`,
        { test_case: data.testCase },
        { timeout: 30000, headers: { 'X-API-Key': apiKey } }
      )
    );
    return response.data;
  }
}
