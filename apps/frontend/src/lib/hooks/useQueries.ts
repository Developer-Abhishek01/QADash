import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, testsApi, executionsApi, reportsApi, bugsApi, analyticsApi, aiApi, notificationsApi } from '@/lib/api/client';

export function useProjects(params?: any) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useTests(params?: any) {
  return useQuery({
    queryKey: ['tests', params],
    queryFn: () => testsApi.list(params),
  });
}

export function useTest(id: string) {
  return useQuery({
    queryKey: ['test', id],
    queryFn: () => testsApi.get(id),
    enabled: !!id,
  });
}

export function useRunTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testsApi.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
}

export function useExecutions(params?: any) {
  return useQuery({
    queryKey: ['executions', params],
    queryFn: () => executionsApi.list(params),
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => executionsApi.get(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useReports(params?: any) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.list(params),
  });
}

export function useBugs(params?: any) {
  return useQuery({
    queryKey: ['bugs', params],
    queryFn: () => bugsApi.list(params),
  });
}

export function useCreateBug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bugsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getOverview(),
  });
}

export function useAIInsights(params?: any) {
  return useQuery({
    queryKey: ['ai-insights', params],
    queryFn: () => aiApi.getInsights(params),
  });
}

export function useNotifications(params?: any) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}