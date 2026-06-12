'use client';

import { useQuery } from '@tanstack/react-query';
import { usageService } from '@/services/api';

export function useUsage() {
  return useQuery({
    queryKey: ['usage', 'monthly'],
    queryFn: () => usageService.getMonthly().then((res) => res.data),
    staleTime: 1000 * 60, // 1 min — usage updates are not real-time critical
  });
}
