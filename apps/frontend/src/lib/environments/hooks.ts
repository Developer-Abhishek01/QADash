import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { environmentsApi } from '@/lib/api/client';

import type { Environment } from './types';

export const envKeys = { all: ['environments'] as const, list: () => [...envKeys.all, 'list'] as const };

export function useEnvironments() {
  return useQuery({ queryKey: envKeys.list(), queryFn: () => environmentsApi.list() as Promise<Environment[]> });
}

export function useCreateEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Environment>) => environmentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: envKeys.all }),
  });
}

export function useUpdateEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Environment> }) => environmentsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: envKeys.all }),
  });
}

export function useDeleteEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => environmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: envKeys.all }),
  });
}

export function useTestEnvironment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => environmentsApi.test(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: envKeys.all }),
  });
}
