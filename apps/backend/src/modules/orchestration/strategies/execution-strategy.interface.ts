import { OrchestrationJob } from '../orchestration.service';

export interface ExecutionResult {
  jobId: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface IExecutionStrategy {
  readonly name: string;
  execute(jobs: OrchestrationJob[]): Promise<ExecutionResult[]>;
}
