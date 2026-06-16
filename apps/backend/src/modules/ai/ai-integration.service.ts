import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
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
  private readonly AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:3002';

  constructor(
    private readonly httpService: HttpService,
    private readonly aiService: AiService,
    private readonly eventHubService: EventHubService,
  ) {}

  async analyzeWithAIEngine(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const startTime = Date.now();

      switch (request.type) {
        case 'code':
          return await this.analyzeCode(request.data);
        case 'execution':
          return await this.analyzeExecution(request.data);
        case 'bug':
          return await this.analyzeBug(request.data);
        case 'locator':
          return await this.analyzeLocator(request.data);
        case 'nlp':
          return await this.parseNLP(request.data);
        default:
          throw new HttpException(`Unknown analysis type: ${request.type}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(`AI Engine analysis failed: ${error.message}`);
      return {
        success: false,
        result: { error: error.message },
      };
    }
  }

  private async analyzeCode(data: any): Promise<AIAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/analyze-code`, data)
      );
      return {
        success: true,
        result: response.data,
        confidence: 85,
      };
    } catch (error) {
      this.logger.warn('AI Engine unavailable, using local analysis');
      return await this.fallbackToLocalAnalysis(data);
    }
  }

  private async analyzeExecution(data: any): Promise<AIAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/analysis/execution`, data)
      );
      return {
        success: true,
        result: response.data,
        confidence: 90,
      };
    } catch (error) {
      const localResult = await this.aiService.analyzeExecution(data.projectId, data.executionId);
      return {
        success: true,
        result: localResult,
        confidence: 70,
      };
    }
  }

  private async analyzeBug(data: any): Promise<AIAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/analyze-bug`, data)
      );
      return {
        success: true,
        result: response.data,
        confidence: 85,
      };
    } catch (error) {
      const localResult = await this.aiService.suggestFixes(data.bugId, data.errorStack);
      return {
        success: true,
        result: localResult,
        confidence: 70,
      };
    }
  }

  private async analyzeLocator(data: any): Promise<AIAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/fix-locator`, data)
      );
      return {
        success: true,
        result: response.data,
        confidence: 80,
      };
    } catch (error) {
      return {
        success: false,
        result: { error: 'Locator analysis unavailable' },
      };
    }
  }

  private async parseNLP(data: any): Promise<AIAnalysisResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/parse-nlp`, data)
      );
      return {
        success: true,
        result: response.data,
        confidence: 75,
      };
    } catch (error) {
      return {
        success: false,
        result: { error: 'NLP parsing unavailable' },
      };
    }
  }

  private async fallbackToLocalAnalysis(data: any): Promise<AIAnalysisResponse> {
    const localResult = await this.aiService.analyzeTest(data.projectId, data.code);
    return {
      success: true,
      result: localResult,
      confidence: 60,
    };
  }

  async getAIServiceHealth(): Promise<{ available: boolean; latency: number }> {
    const start = Date.now();
    try {
      await firstValueFrom(
        this.httpService.get(`${this.AI_ENGINE_URL}/health`, { timeout: 5000 })
      );
      return {
        available: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - start,
      };
    }
  }

  async triggerSelfHealing(executionId: string, failedTestId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/self-heal`, {
          executionId,
          failedTestId,
        })
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
      const response = await firstValueFrom(
        this.httpService.post(`${this.AI_ENGINE_URL}/api/ai/generate-tests`, {
          projectId,
          description,
          count,
        })
      );
      return response.data;
    } catch (error) {
      const localResult = await this.aiService.generateTestCases(projectId, description);
      return localResult;
    }
  }

  async getPredictions(projectId: string, executionId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.AI_ENGINE_URL}/api/predictions/${projectId}/${executionId}`)
      );
      return response.data;
    } catch (error) {
      return {
        predictions: [],
        confidence: 0,
      };
    }
  }
}