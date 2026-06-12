'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { documentService } from '@/services/api';
import type {
  DocumentResponse,
  DocumentStatus,
  Paginated,
} from '@/services/api';

const documentKeys = {
  all: ['documents'] as const,
  list: (status?: DocumentStatus) =>
    [...documentKeys.all, 'list', status ?? 'all'] as const,
  chunks: (docId: string) => [...documentKeys.all, 'chunks', docId] as const,
};

/**
 * List documents for the active org. Polls every 4s while any document is
 * still ingesting so the UI flips pending/processing -> ready without a manual
 * refresh.
 */
export function useDocuments(status?: DocumentStatus) {
  return useQuery({
    queryKey: documentKeys.list(status),
    queryFn: () =>
      documentService
        .list({ page: 1, page_size: 100, status })
        .then((res) => res.data),
    refetchInterval: (query) => {
      const data = query.state.data as Paginated<DocumentResponse> | undefined;
      const hasInFlight = data?.items.some(
        (d) => d.status === 'pending' || d.status === 'processing'
      );
      return hasInFlight ? 4000 : false;
    },
  });
}

export function useDocumentChunks(docId: string | null) {
  return useQuery({
    queryKey: documentKeys.chunks(docId ?? ''),
    queryFn: () =>
      documentService.listChunks(docId as string).then((res) => res.data),
    enabled: !!docId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => documentService.upload(file, undefined, onProgress).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docId: string) => documentService.remove(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
