import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessibilityApi } from './api';
import type { CreateTestDto, AccessibilityTest } from './types';

export const accessibilityKeys = {
  tests: {
    all: ['accessibility', 'tests'] as const,
    list: (params?: Record<string, unknown>) => [...accessibilityKeys.tests.all, 'list', params] as const,
    detail: (id: string) => [...accessibilityKeys.tests.all, 'detail', id] as const,
  },
  issues: {
    all: ['accessibility', 'issues'] as const,
    list: (params?: Record<string, unknown>) => [...accessibilityKeys.issues.all, 'list', params] as const,
  },
  dashboard: {
    all: ['accessibility', 'dashboard'] as const,
    stats: (projectId?: string) => [...accessibilityKeys.dashboard.all, 'stats', projectId] as const,
  },
  baselines: {
    all: ['accessibility', 'baselines'] as const,
    list: (projectId: string) => [...accessibilityKeys.baselines.all, 'list', projectId] as const,
  },
};

export function useAccessibilityTests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: accessibilityKeys.tests.list(params),
    queryFn: () => accessibilityApi.getTests(params),
  });
}

export function useAccessibilityTest(id: string) {
  return useQuery({
    queryKey: accessibilityKeys.tests.detail(id),
    queryFn: () => accessibilityApi.getTestById(id),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data as AccessibilityTest | undefined)?.status === 'RUNNING' ? 3000 : false,
  });
}

export function useCreateAccessibilityTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTestDto) => accessibilityApi.createTest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.tests.all });
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.dashboard.all });
    },
  });
}

export function useRunAccessibilityTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accessibilityApi.runTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.tests.all });
    },
  });
}

export function useCancelAccessibilityTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accessibilityApi.cancelTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.tests.all });
    },
  });
}

export function useAccessibilityIssues(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: accessibilityKeys.issues.list(params),
    queryFn: () => accessibilityApi.getIssues(params),
  });
}

export function useResolveAccessibilityIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isResolved: boolean; resolutionNote?: string } }) =>
      accessibilityApi.resolveIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.issues.all });
    },
  });
}

export function useAccessibilityDashboard(projectId?: string) {
  return useQuery({
    queryKey: accessibilityKeys.dashboard.stats(projectId),
    queryFn: () => accessibilityApi.getDashboardStats(projectId),
    refetchInterval: 30000,
  });
}

export function useAccessibilityBaselines(projectId: string) {
  return useQuery({
    queryKey: accessibilityKeys.baselines.list(projectId),
    queryFn: () => accessibilityApi.getBaselines(projectId),
    enabled: !!projectId,
  });
}

export function useCreateBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof accessibilityApi.createBaseline>[0]) =>
      accessibilityApi.createBaseline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessibilityKeys.baselines.all });
    },
  });
}

export function useGenerateAccessibilityReport() {
  return useMutation({
    mutationFn: ({ testId, format }: { testId: string; format: string }) =>
      accessibilityApi.generateReport(testId, format as 'json' | 'html' | 'pdf'),
  });
}