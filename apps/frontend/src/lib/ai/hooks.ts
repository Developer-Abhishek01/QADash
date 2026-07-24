import { useQuery } from '@tanstack/react-query';

import { aiApi } from '@/lib/api/client';

export const aiKeys = {
  all: ['ai'] as const,
  insights: () => [...aiKeys.all, 'insights'] as const,
};

export function useAIInsights(projectId: string = 'default') {
  return useQuery({
    queryKey: aiKeys.insights(),
    queryFn: () => aiApi.getInsights(projectId) as Promise<{ health: number; coverage: number; bugs: number; recommendations: number; insights: any[] }>,
  });
}
