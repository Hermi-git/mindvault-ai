'use client';

import { useMutation } from '@tanstack/react-query';
import { searchService } from '@/services/api';

export function useSemanticSearch() {
  return useMutation({
    mutationFn: ({ query, topK }: { query: string; topK?: number }) =>
      searchService.query(query, topK).then((res) => res.data),
  });
}
