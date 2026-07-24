import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { AiService } from './ai.service';
import { EventHubService } from '../orchestration/services/event-hub.service';

export interface AIAnalysisRequest {
  type: 'code' | 'execution' | 'bug' | 'locator' | 'nlp';
  data: any;
  options?: Record<string, any>;
}

export interface AIAnalysisResponse {
  success: boolean;
  result: any;
  confidence?: number;
  processingTime?: number;
}

@Injectable()
export class AIIntegrationService {
  private readonly logger = new Logger(AIIntegrationService.name);
  private readonly AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8002';

  constructor(
    private readonly httpService: HttpService,
    private readonly aiService: AiService,
    private readonly eventHubService: EventHubService,
  ) {}

  async analyzeWithAIEngine(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const startTime = Date.now();
      let result: AIAnalysisResponse;

      switch (request.type) {
        case 'code':
          result = await this.analyzeCode(request.data);
          break;
        case 'execution':
          result = await this.analyzeExecution(request.data);
          break;
        case 'bug':
          result = await this.analyzeBug(request.data);
          break;
        case 'locator':
          result = await this.analyzeLocator(request.data);
          break;
        case 'nlp':
          result = await this.parseNLP(request.data);
          break;
        default:
          throw new HttpException(`Unknown analysis type: ${request.type}`, HttpStatus.BAD_REQUEST);
      }

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      this.logger.error(`AI Engine analysis failed: ${error.message}`);
      return {
        success: false,
        result: { error: error.message },
      };
    }
  }

  private async postToAI(path: string, data: any): Promise<any> {
    const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
    const response = await firstValueFrom(
      this.httpService.post(`${this.AI_ENGINE_URL}${path}`, data, {
        timeout: 30000,
        headers: { 'X-API-Key': apiKey },
      })
    );
    return response.data;
  }

  private async analyzeCode(data: any): Promise<AIAnalysisResponse> {
    try {
      const result = await this.postToAI('/api/ai/test-generator/optimize', { test_code: data.code });
      return { success: true, result, confidence: 85 };
    } catch (error) {
      this.logger.warn('AI Engine unavailable, using local analysis');
      return await this.fallbackToLocalAnalysis(data);
    }
  }

  private async analyzeExecution(data: any): Promise<AIAnalysisResponse> {
    try {
      const result = await this.postToAI('/api/ai/failure/analyze', {
        failure: { executionId: data.executionId, ...data },
        context: { source: 'execution-analysis' },
      });
      return { success: true, result, confidence: 90 };
    } catch (error) {
      const localResult = await this.aiService.analyzeExecution(data.projectId, data.executionId);
      return { success: true, result: localResult, confidence: 70 };
    }
  }

  private async analyzeBug(data: any): Promise<AIAnalysisResponse> {
    try {
      const result = await this.postToAI('/api/ai/failure/analyze', {
        failure: { bugId: data.bugId, stack: data.errorStack, ...data },
        context: { source: 'bug-analysis' },
      });
      return { success: true, result, confidence: 85 };
    } catch (error) {
      const localResult = await this.aiService.suggestFixes(data.bugId, data.errorStack);
      return { success: true, result: localResult, confidence: 70 };
    }
  }

  private async analyzeLocator(data: any): Promise<AIAnalysisResponse> {
    try {
      const result = await this.postToAI('/api/ai/locator/find', {
        description: data.description || data.locator || '',
        context: { page: data.page, ...data },
      });
      return { success: true, result, confidence: 80 };
    } catch (error) {
      return { success: false, result: { error: 'Locator analysis unavailable' } };
    }
  }

  private async parseNLP(data: any): Promise<AIAnalysisResponse> {
    try {
      const result = await this.postToAI('/api/ai/nlp/parse', {
        text: data.text || data.query || '',
        context: data.context || null,
      });
      return { success: true, result, confidence: 75 };
    } catch (error) {
      return { success: false, result: { error: 'NLP parsing unavailable' } };
    }
  }

  private async fallbackToLocalAnalysis(data: any): Promise<AIAnalysisResponse> {
    const localResult = await this.aiService.analyzeTest(data.projectId, data.code);
    return { success: true, result: localResult, confidence: 60 };
  }

  async getAIServiceHealth(): Promise<{ available: boolean; latency: number }> {
    const start = Date.now();
    try {
      await firstValueFrom(
        this.httpService.get(`${this.AI_ENGINE_URL}/health/`, { timeout: 5000 })
      );
      return { available: true, latency: Date.now() - start };
    } catch (error) {
      return { available: false, latency: Date.now() - start };
    }
  }

  async triggerSelfHealing(executionId: string, failedTestId: string): Promise<any> {
    try {
      const apiKey = process.env.AI_ENGINE_API_KEY || 'qadash-ai-dev-key';
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/self-healing/heal`, {
          error: { executionId, failedTestId },
          context: { locator: '' },
        }, { headers: { 'X-API-Key': apiKey } })
      );
      await this.eventHubService.publish('ai.self-healing.completed', {
        executionId,
        failedTestId,
        result: response.data,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Self-healing failed: ${error.message}`);
      throw new HttpException('Self-healing service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async generateTests(projectId: string, description: string, count: number = 5): Promise<any> {
    try {
      const result = await this.postToAI('/api/ai/pipeline/nlp-to-test', {
        text: description,
        context: { projectId, name: `AI Generated Tests - ${projectId}` },
      });
      if (result?.success && result?.test_case?.generated_code) {
        return {
          testCases: [{
            id: 'TC-001',
            name: result.test_case.name || 'AI Generated Test',
            description,
            code: result.test_case.generated_code,
            confidence: result.test_case.confidence || 0.85,
          }],
          testCasesCount: 1,
        };
      }
      return result;
    } catch (error) {
      const localResult = await this.aiService.generateTestCases(projectId, description);
      return localResult;
    }
  }

  async getPredictions(projectId: string, executionId: string): Promise<any> {
    try {
      const result = await this.postToAI('/api/predictions', {
        test_history: [{ projectId, executionId }],
        current_metrics: {},
      });
      return result;
    } catch (error) {
      return { predictions: [], confidence: 0 };
    }
  }
}
