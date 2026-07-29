export interface OrchestrationJob {
  id: string;
  type: 'test' | 'security' | 'performance' | 'accessibility' | 'ai-analysis' | 'report' | 'bug-sync';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'queued';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  dependencies?: string[];
  result?: unknown;
  error?: string;
  attemptsMade?: number;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  latency: number;
  errorRate: number;
  version?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface EventMessage {
  id: string;
  channel: string;
  payload: unknown;
  timestamp: string;
}

export type ExecutionMode = 'parallel' | 'sequential';

export interface JobFilters {
  type?: string;
  priority?: string;
  status?: string;
  search?: string;
}
