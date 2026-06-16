import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from './api';
import type { CreateTestDto } from './types';

export const performanceKeys = {
  tests: {
    all: ['performance', 'tests'] as const,
    list: (params?: Record<string, unknown>) => [...performanceKeys.tests.all, 'list', params] as const,
    detail: (id: string) => [...performanceKeys.tests.all, 'detail', id] as const,
  },
  metrics: {
    all: ['performance', 'metrics'] as const,
    test: (testId: string) => [...performanceKeys.metrics.all, 'test', testId] as const,
    realtime: (testId: string) => [...performanceKeys.metrics.all, 'realtime', testId] as const,
  },
  dashboard: {
    all: ['performance', 'dashboard'] as const,
    stats: (projectId?: string) => [...performanceKeys.dashboard.all, 'stats', projectId] as const,
  },
  alerts: {
    all: ['performance', 'alerts'] as const,
    list: (projectId: string) => [...performanceKeys.alerts.all, 'list', projectId] as const,
    events: (projectId: string) => [...performanceKeys.alerts.all, 'events', projectId] as const,
  },
};

export function usePerformanceTests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: performanceKeys.tests.list(params),
    queryFn: () => performanceApi.getTests(params),
  });
}

export function usePerformanceTest(id: string) {
  return useQuery({
    queryKey: performanceKeys.tests.detail(id),
    queryFn: () => performanceApi.getTestById(id),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data as { status?: string } | undefined)?.status === 'RUNNING' ? 3000 : false,
  });
}

export function useCreatePerformanceTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTestDto) => performanceApi.createTest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.tests.all });
      queryClient.invalidateQueries({ queryKey: performanceKeys.dashboard.all });
    },
  });
}

export function useRunPerformanceTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => performanceApi.runTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.tests.all });
    },
  });
}

export function useCancelPerformanceTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => performanceApi.cancelTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.tests.all });
    },
  });
}

export function useTestMetrics(testId: string, options?: Record<string, unknown>) {
  return useQuery({
    queryKey: performanceKeys.metrics.test(testId),
    queryFn: () => performanceApi.getTestMetrics(testId, options),
    enabled: !!testId,
  });
}

export function useRealtimeMetrics(testId: string) {
  return useQuery({
    queryKey: performanceKeys.metrics.realtime(testId),
    queryFn: () => performanceApi.getRealtimeMetrics(testId),
    enabled: !!testId,
    refetchInterval: 2000,
  });
}

export function usePerformanceDashboard(projectId?: string) {
  return useQuery({
    queryKey: performanceKeys.dashboard.stats(projectId),
    queryFn: () => performanceApi.getDashboardStats(projectId),
    refetchInterval: 30000,
  });
}

export function usePerformanceAlerts(projectId: string) {
  return useQuery({
    queryKey: performanceKeys.alerts.list(projectId),
    queryFn: () => performanceApi.getAlerts(projectId),
    enabled: !!projectId,
  });
}

export function useAlertEvents(projectId: string, unreadOnly?: boolean) {
  return useQuery({
    queryKey: performanceKeys.alerts.events(projectId),
    queryFn: () => performanceApi.getAlertEvents(projectId, unreadOnly),
    enabled: !!projectId,
    refetchInterval: 15000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof performanceApi.createAlert>[0]) =>
      performanceApi.createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.alerts.all });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => performanceApi.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: performanceKeys.alerts.all });
    },
  });
}

export function useHistoricalAnalytics(projectId: string, timeRange: '24h' | '7d' | '30d' | '90d') {
  return useQuery({
    queryKey: ['performance', 'analytics', 'historical', projectId, timeRange],
    queryFn: () => performanceApi.getHistoricalAnalytics(projectId, timeRange),
    enabled: !!projectId,
  });
}