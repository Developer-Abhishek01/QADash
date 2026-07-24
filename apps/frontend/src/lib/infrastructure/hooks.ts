import { useQuery } from '@tanstack/react-query';

import { infrastructureApi } from '@/lib/api/client';

import type { InfrastructureHealth, DetailedHealth, SystemInfo } from './types';

export const infraKeys = {
  all: ['infrastructure'] as const,
  health: () => [...infraKeys.all, 'health'] as const,
  detailed: () => [...infraKeys.all, 'detailed'] as const,
  systemInfo: () => [...infraKeys.all, 'system'] as const,
};

export function useInfrastructureHealth() {
  return useQuery({
    queryKey: infraKeys.health(),
    queryFn: () => infrastructureApi.getInfrastructure() as Promise<InfrastructureHealth>,
    refetchInterval: 15000,
  });
}

export function useDetailedHealth() {
  return useQuery({
    queryKey: infraKeys.detailed(),
    queryFn: () => infrastructureApi.getDetailedHealth() as Promise<DetailedHealth>,
    refetchInterval: 30000,
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: infraKeys.systemInfo(),
    queryFn: () => infrastructureApi.getSystemInfo() as Promise<SystemInfo>,
    refetchInterval: 60000,
  });
}
