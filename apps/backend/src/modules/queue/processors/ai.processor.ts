import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

import { PrismaService } from '../../../common/prisma.service';
import { AiJobData } from '../queue.service';

@Processor('ai', {
  concurrency: 2,
  limiter: { max: 3, duration: 10000 },
})
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);
  private readonly aiEngineUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.aiEngineUrl = this.configService.get<string>('AI_ENGINE_URL', 'http://localhost:8002');
  }

  async process(job: Job<AiJobData>): Promise<any> {
    const { jobId, type, projectId, payload } = job.data;
    this.logger.log(`Processing AI job ${jobId} type: ${type}`);

    let result: any;
    switch (type) {
      case 'ANALYZE_TEST':
        result = await this.callAiEngine('/api/ai/analyze-test', payload);
        break;
      case 'GENERATE_TESTS':
        result = await this.callAiEngine('/api/ai/generate-tests', payload);
        break;
      case 'ANALYZE_EXECUTION':
        result = await this.callAiEngine('/api/ai/analyze-execution', payload);
        break;
      case 'SUGGEST_FIXES':
        result = await this.callAiEngine('/api/ai/suggest-fixes', payload);
        break;
      case 'GET_INSIGHTS':
        result = await this.callAiEngine(`/api/ai/insights/${projectId}`, {}, 'GET');
        break;
      case 'PIPELINE_NLP_TO_TEST':
        result = await this.callAiEngine('/api/ai/pipeline/nlp-to-test', payload);
        break;
      case 'PIPELINE_EXCEL_TO_TESTS':
        result = await this.callAiEngine('/api/ai/pipeline/excel-to-tests', payload);
        break;
      case 'VALIDATE_TEST_CASE':
        result = await this.callAiEngine('/api/ai/validate/test-case', payload);
        break;
      case 'GENERATE_CODE':
        result = await this.callAiEngine('/api/ai/generate-code', payload);
        break;
      default:
        throw new Error(`Unknown AI job type: ${type}`);
    }

    this.logger.log(`AI job ${jobId} completed successfully`);
    return result;
  }

  private async callAiEngine(path: string, payload: any, method: string = 'POST'): Promise<any> {
    const url = `${this.aiEngineUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'qadash-ai-dev-key' },
    };
    if (method === 'POST') {
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`AI Engine ${path} failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`AI job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`AI job ${job.id} failed: ${error.message}`);
  }
}
