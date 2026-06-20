import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  constructor(
    private readonly testsService: TestsService,
    private readonly executionsService: ExecutionsService,
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
  update(@Param('id') id: string, @Body() data: UpdateTestDto) {
    return this.testsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.testsService.delete(id);
  }
}