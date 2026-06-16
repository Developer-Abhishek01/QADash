import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApi } from './api';
import type { Device, MobileTestConfig } from './types';

export const mobileKeys = {
  devices: {
    all: ['mobile', 'devices'] as const,
    list: (platform?: string) => [...mobileKeys.devices.all, 'list', platform] as const,
    detail: (id: string) => [...mobileKeys.devices.all, 'detail', id] as const,
    available: (platform: string, osVersion?: string) => [...mobileKeys.devices.all, 'available', platform, osVersion] as const,
  },
  executions: {
    all: ['mobile', 'executions'] as const,
    detail: (id: string) => [...mobileKeys.executions.all, 'detail', id] as const,
  },
  reports: {
    all: ['mobile', 'reports'] as const,
    detail: (executionId: string) => [...mobileKeys.reports.all, 'detail', executionId] as const,
  },
  statistics: {
    all: ['mobile', 'statistics'] as const,
    devices: () => [...mobileKeys.statistics.all, 'devices'] as const,
    trending: (projectId: string, days?: number) => [...mobileKeys.statistics.all, 'trending', projectId, days] as const,
  },
};

export function useDevices(platform?: string) {
  return useQuery({
    queryKey: mobileKeys.devices.list(platform),
    queryFn: () => mobileApi.getDevices(platform),
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: mobileKeys.devices.detail(deviceId),
    queryFn: () => mobileApi.getDevice(deviceId),
    enabled: !!deviceId,
  });
}

export function useAvailableDevices(platform: 'android' | 'ios', osVersion?: string) {
  return useQuery({
    queryKey: mobileKeys.devices.available(platform, osVersion),
    queryFn: () => mobileApi.getAvailableDevices(platform, osVersion),
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (device: Partial<Device>) => mobileApi.registerDevice(device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileKeys.devices.all });
    },
  });
}

export function useReserveDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, userId }: { deviceId: string; userId: string }) =>
      mobileApi.reserveDevice(deviceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileKeys.devices.all });
    },
  });
}

export function useReleaseDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => mobileApi.releaseDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileKeys.devices.all });
    },
  });
}

export function useRunMobileTests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: MobileTestConfig) => mobileApi.runTests(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileKeys.executions.all });
    },
  });
}

export function useExecutionStatus(executionId: string) {
  return useQuery({
    queryKey: mobileKeys.executions.detail(executionId),
    queryFn: () => mobileApi.getExecutionStatus(executionId),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      if (status === 'running' || status === 'queued') {
        return 3000;
      }
      return false;
    },
  });
}

export function useMobileReport(executionId: string) {
  return useQuery({
    queryKey: mobileKeys.reports.detail(executionId),
    queryFn: () => mobileApi.getReport(executionId),
    enabled: !!executionId,
  });
}

export function useMobileReportHTML(executionId: string) {
  return useQuery({
    queryKey: [...mobileKeys.reports.detail(executionId), 'html'],
    queryFn: () => mobileApi.getHTMLReport(executionId),
    enabled: !!executionId,
  });
}

export function useDeviceStatistics() {
  return useQuery({
    queryKey: mobileKeys.statistics.devices(),
    queryFn: () => mobileApi.getDeviceStatistics(),
  });
}

export function useReportTrending(projectId: string, days?: number) {
  return useQuery({
    queryKey: mobileKeys.statistics.trending(projectId, days),
    queryFn: () => mobileApi.getReportTrending(projectId, days),
    enabled: !!projectId,
  });
}

export function useEmulators(platform: 'android' | 'ios') {
  return useQuery({
    queryKey: [...mobileKeys.devices.all, 'emulators', platform],
    queryFn: () => mobileApi.getEmulators(platform),
  });
}

export function useRealDevices(platform: 'android' | 'ios') {
  return useQuery({
    queryKey: [...mobileKeys.devices.all, 'real', platform],
    queryFn: () => mobileApi.getRealDevices(platform),
  });
}

export function useUploadApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      mobileApi.uploadApp(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile', 'apps'] });
    },
  });
}