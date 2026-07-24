export interface Worker {
  id: string;
  status: 'active' | 'idle' | 'offline';
  jobsActive: number;
  jobsCompleted: number;
  jobsFailed: number;
  utilization: number;
  cpu: number;
  memory: number;
  lastHeartbeat: string;
}

export interface WorkersStats {
  workers: Worker[];
  totalWorkers: number;
  activeWorkers: number;
  totalJobsActive: number;
  totalJobsCompleted: number;
  averageUtilization: number;
  timestamp: string;
}

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface FailedJob {
  id: string;
  name: string;
  status: string;
  data?: Record<string, unknown>;
  attempts: number;
  failedReason?: string;
  finishedOn: string | null;
  queue?: string;
}

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  queues: Record<string, QueueMetrics>;
  redis: { status: string; connected: boolean };
  workers: { active: number; idle: number };
}
