import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requirementsApi } from './api';

export const requirementsKeys = {
  all: ['requirements'] as const,
};

export function useParseDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { document: string; metadata?: Record<string, unknown> }) =>
      requirementsApi.parseDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementsKeys.all });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; documentType: string }) =>
      requirementsApi.uploadDocument(data.file, data.documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementsKeys.all });
    },
  });
}

export function useGenerateTests() {
  return useMutation({
    mutationFn: (data: { requirements: any[]; framework?: string }) =>
      requirementsApi.generateTests(data),
  });
}

export function useRequirementsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...requirementsKeys.all, 'list', params],
    queryFn: () => requirementsApi.list(params),
  });
}

export function useRequirement(id: string) {
  return useQuery({
    queryKey: [...requirementsKeys.all, id],
    queryFn: () => requirementsApi.get(id),
    enabled: !!id,
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requirementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementsKeys.all });
    },
  });
}
