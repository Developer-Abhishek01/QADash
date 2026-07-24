import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { workersApi } from '@/lib/api/client';

import type { WorkersStats, QueueHealth, FailedJob } from './types';

export const workerKeys = {
  all: ['workers'] as const,
  stats: () => [...workerKeys.all, 'stats'] as const,
  queueHealth: () => [...workerKeys.all, 'queue-health'] as const,
  failedJobs: () => [...workerKeys.all, 'failed-jobs'] as const,
};

export function useWorkersStats() {
  return useQuery({
    queryKey: workerKeys.stats(),
    queryFn: () => workersApi.list() as Promise<WorkersStats>,
    refetchInterval: 10000,
  });
}

export function useQueueHealth() {
  return useQuery({
    queryKey: workerKeys.queueHealth(),
    queryFn: () => workersApi.getQueueHealth() as Promise<QueueHealth>,
    refetchInterval: 15000,
  });
}

export function useFailedJobs(queue?: string) {
  return useQuery({
    queryKey: [...workerKeys.failedJobs(), queue],
    queryFn: () => workersApi.getFailedJobs(queue) as Promise<FailedJob[]>,
    refetchInterval: 20000,
  });
}

export function usePauseQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => workersApi.pauseQueue(queue),
    onSuccess: () => { qc.invalidateQueries({ queryKey: workerKeys.queueHealth() }); },
  });
}

export function useResumeQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => workersApi.resumeQueue(queue),
    onSuccess: () => { qc.invalidateQueries({ queryKey: workerKeys.queueHealth() }); },
  });
}

export function useDrainQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => workersApi.drainQueue(queue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workerKeys.queueHealth() });
      qc.invalidateQueries({ queryKey: workerKeys.failedJobs() });
    },
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) => workersApi.retryJob(queue, jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: workerKeys.failedJobs() }); },
  });
}

export function useRetryAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => workersApi.retryAllFailed(queue),
    onSuccess: () => { qc.invalidateQueries({ queryKey: workerKeys.failedJobs() }); },
  });
}

export function useScaleWorkers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, count }: { action: 'up' | 'down'; count: number }) =>
      action === 'up' ? workersApi.scaleUp(count) : workersApi.scaleDown(count),
    onSuccess: () => { qc.invalidateQueries({ queryKey: workerKeys.stats() }); },
  });
}
