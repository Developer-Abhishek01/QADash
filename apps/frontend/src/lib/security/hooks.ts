import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from './api';
import type { CreateScanDto } from './types';

export const securityKeys = {
  scans: {
    all: ['security', 'scans'] as const,
    list: (params?: Record<string, unknown>) => [...securityKeys.scans.all, 'list', params] as const,
    detail: (id: string) => [...securityKeys.scans.all, 'detail', id] as const,
  },
  vulnerabilities: {
    all: ['security', 'vulnerabilities'] as const,
    list: (params?: Record<string, unknown>) => [...securityKeys.vulnerabilities.all, 'list', params] as const,
    detail: (id: string) => [...securityKeys.vulnerabilities.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['security', 'dashboard'] as const,
    stats: (projectId?: string) => [...securityKeys.dashboard.all, 'stats', projectId] as const,
  },
  alerts: {
    all: ['security', 'alerts'] as const,
    list: (projectId: string, unreadOnly?: boolean) => [...securityKeys.alerts.all, 'list', projectId, unreadOnly] as const,
  },
  dependencyScans: {
    all: ['security', 'dependency-scans'] as const,
    list: (projectId: string) => [...securityKeys.dependencyScans.all, 'list', projectId] as const,
  },
};

export function useSecurityScans(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: securityKeys.scans.list(params),
    queryFn: () => securityApi.getScans(params),
  });
}

export function useSecurityScan(id: string) {
  return useQuery({
    queryKey: securityKeys.scans.detail(id),
    queryFn: () => securityApi.getScanById(id),
    enabled: !!id,
  });
}

export function useCreateSecurityScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScanDto) => securityApi.createScan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.scans.all });
      queryClient.invalidateQueries({ queryKey: securityKeys.dashboard.all });
    },
  });
}

export function useStartSecurityScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => securityApi.startScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.scans.all });
    },
  });
}

export function useCancelSecurityScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => securityApi.cancelScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.scans.all });
    },
  });
}

export function useVulnerabilities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: securityKeys.vulnerabilities.list(params),
    queryFn: () => securityApi.getVulnerabilities(params),
  });
}

export function useUpdateVulnerability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; reason?: string } }) =>
      securityApi.updateVulnerability(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.vulnerabilities.all });
    },
  });
}

export function useSecurityDashboard(projectId?: string) {
  return useQuery({
    queryKey: securityKeys.dashboard.stats(projectId),
    queryFn: () => securityApi.getDashboardStats(projectId),
  });
}

export function useSecurityAlerts(projectId: string, unreadOnly?: boolean) {
  return useQuery({
    queryKey: securityKeys.alerts.list(projectId, unreadOnly),
    queryFn: () => securityApi.getAlerts(projectId, unreadOnly),
    enabled: !!projectId,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => securityApi.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.alerts.all });
    },
  });
}

export function useDependencyScans(projectId: string) {
  return useQuery({
    queryKey: securityKeys.dependencyScans.list(projectId),
    queryFn: () => securityApi.getDependencyScans(projectId),
    enabled: !!projectId,
  });
}

export function useRunDependencyScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, packageManager }: { projectId: string; packageManager: string }) =>
      securityApi.runDependencyScan(projectId, packageManager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.dependencyScans.all });
    },
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: ({ scanId, format, type }: { scanId: string; format: string; type?: string }) =>
      securityApi.generateReport(scanId, format as 'json' | 'html' | 'pdf', type),
  });
}