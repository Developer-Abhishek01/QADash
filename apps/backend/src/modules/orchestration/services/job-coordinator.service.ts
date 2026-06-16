import { Injectable, Logger } from '@nestjs/common';
import { OrchestrationJob } from '../orchestration.service';

export interface JobExecution {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  dependencies: string[];
}

@Injectable()
export class JobCoordinatorService {
  private readonly logger = new Logger(JobCoordinatorService.name);
  private executingJobs: Map<string, JobExecution> = new Map();

  async coordinateJobs(jobs: OrchestrationJob[]): Promise<{ coordinationId: string; jobIds: string[] }> {
    const coordinationId = `coord-${Date.now()}`;

    const sortedJobs = this.topologicalSort(jobs);

    for (const job of sortedJobs) {
      if (job.dependencies && job.dependencies.length > 0) {
        await this.waitForDependencies(job.dependencies);
      }

      this.executingJobs.set(job.id, {
        jobId: job.id,
        status: 'pending',
        dependencies: job.dependencies || [],
        startedAt: new Date(),
      });
    }

    this.logger.log(`Coordinated ${jobs.length} jobs with coordination ID ${coordinationId}`);
    return { coordinationId, jobIds: jobs.map(j => j.id) };
  }

  async getJobExecution(jobId: string): Promise<JobExecution | undefined> {
    return this.executingJobs.get(jobId);
  }

  async updateJobStatus(jobId: string, status: JobExecution['status']): Promise<void> {
    const execution = this.executingJobs.get(jobId);
    if (execution) {
      execution.status = status;
      if (status === 'completed' || status === 'failed') {
        execution.completedAt = new Date();
      }
    }
  }

  async cancelAllInCoordination(coordinationId: string): Promise<void> {
    for (const [jobId] of this.executingJobs) {
      if (jobId.startsWith('exec-')) {
        this.updateJobStatus(jobId, 'cancelled');
      }
    }
  }

  private topologicalSort(jobs: OrchestrationJob[]): OrchestrationJob[] {
    const sorted: OrchestrationJob[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();

    const visit = (job: OrchestrationJob) => {
      if (visited.has(job.id)) return;
      if (inProgress.has(job.id)) {
        this.logger.warn(`Circular dependency detected for job ${job.id}`);
        return;
      }

      inProgress.add(job.id);

      if (job.dependencies) {
        for (const depId of job.dependencies) {
          const depJob = jobs.find(j => j.id === depId);
          if (depJob) visit(depJob);
        }
      }

      inProgress.delete(job.id);
      visited.add(job.id);
      sorted.push(job);
    };

    for (const job of jobs) {
      visit(job);
    }

    return sorted;
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    const checkInterval = 100;
    const maxWait = 300000;
    const startTime = Date.now();

    while (dependencies.some(dep => {
      const exec = this.executingJobs.get(dep);
      return exec && exec.status !== 'completed';
    })) {
      if (Date.now() - startTime > maxWait) {
        throw new Error(`Timeout waiting for dependencies: ${dependencies.join(', ')}`);
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
}