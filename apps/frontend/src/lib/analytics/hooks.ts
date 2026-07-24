import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '@/lib/api/client';

export const analyticKeys = {
  all: ['analytics'] as const,
  overview: () => [...analyticKeys.all, 'overview'] as const,
  flaky: () => [...analyticKeys.all, 'flaky'] as const,
  coverage: () => [...analyticKeys.all, 'coverage'] as const,
};

export function useAnalyticsOverview() {
  return useQuery({ queryKey: analyticKeys.overview(), queryFn: () => analyticsApi.getOverview() });
}

export function useAnalyticsFlaky() {
  return useQuery({ queryKey: analyticKeys.flaky(), queryFn: () => analyticsApi.getFlakyTests() });
}

export function useAnalyticsCoverage() {
  return useQuery({ queryKey: analyticKeys.coverage(), queryFn: () => analyticsApi.getCoverage() });
}
