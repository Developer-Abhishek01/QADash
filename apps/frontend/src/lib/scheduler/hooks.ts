import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulerApi } from '@/lib/api/client';

import type { ScheduledJob } from './types';

export const schedKeys = { all: ['scheduler'] as const, list: () => [...schedKeys.all, 'list'] as const };

export function useSchedules() {
  return useQuery({ queryKey: schedKeys.list(), queryFn: () => schedulerApi.list() as Promise<ScheduledJob[]> });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScheduledJob>) => schedulerApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedKeys.all }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedKeys.all }),
  });
}

export function usePauseSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedKeys.all }),
  });
}

export function useResumeSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedKeys.all }),
  });
}

export function useRunSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerApi.run(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: schedKeys.all }),
  });
}
