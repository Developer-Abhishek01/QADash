import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importApi } from './api';

export const importKeys = {
  imports: {
    all: ['import', 'list'] as const,
    list: (params?: Record<string, unknown>) => [...importKeys.imports.all, 'list', params] as const,
    detail: (id: string) => [...importKeys.imports.all, 'detail', id] as const,
  },
  preview: {
    all: ['import', 'preview'] as const,
    byId: (id: string) => [...importKeys.preview.all, 'detail', id] as const,
  },
  errors: {
    all: ['import', 'errors'] as const,
    byImport: (importId: string) => [...importKeys.errors.all, 'import', importId] as const,
  },
};

export function useFileImports(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: importKeys.imports.list(params),
    queryFn: () => importApi.getImports(params),
  });
}

export function useFileImport(id: string) {
  return useQuery({
    queryKey: importKeys.imports.detail(id),
    queryFn: () => importApi.getImportById(id),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data as { status?: string } | undefined)?.status === 'PROCESSING' ? 2000 : false,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, projectId }: { file: File; projectId: string }) =>
      importApi.uploadFile(file, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.imports.all });
    },
  });
}

export function useParseFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importApi.parseFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.imports.all });
    },
  });
}

export function useSaveMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ importId, mappings }: { importId: string; mappings: unknown[] }) =>
      importApi.saveMappings(importId, mappings as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.imports.all });
    },
  });
}

export function useProcessImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importApi.processImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.imports.all });
    },
  });
}

export function useImportPreview(importId: string, offset?: number, limit?: number) {
  return useQuery({
    queryKey: [...importKeys.preview.byId(importId), offset, limit],
    queryFn: () => importApi.getPreview(importId, offset, limit),
    enabled: !!importId,
  });
}

export function useImportErrors(importId: string) {
  return useQuery({
    queryKey: importKeys.errors.byImport(importId),
    queryFn: () => importApi.getErrors(importId),
    enabled: !!importId,
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importApi.resolveError(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.errors.all });
    },
  });
}

export function useDeleteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => importApi.deleteImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.imports.all });
    },
  });
}