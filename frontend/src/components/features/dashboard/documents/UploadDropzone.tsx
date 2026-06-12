'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useUploadDocument } from '@/hooks/useDocuments';
import { formatFileSize } from '@/lib/utils/helpers';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'text/markdown': ['.md', '.markdown'],
  'text/plain': ['.txt', '.text', '.log'],
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

interface ActiveUpload {
  name: string;
  size: number;
  progress: number;
}

export function UploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const { mutateAsync, isPending } = useUploadDocument();
  const [active, setActive] = useState<ActiveUpload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      setError(null);

      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        setError(
          reason?.code === 'file-too-large'
            ? 'File is larger than the 25 MB limit.'
            : 'Unsupported file type. Use PDF, DOCX, Markdown, or text.'
        );
        return;
      }

      // Upload sequentially so progress UI stays legible and we don't hammer
      // the rate-limited upload endpoint.
      for (const file of accepted) {
        setActive({ name: file.name, size: file.size, progress: 0 });
        try {
          await mutateAsync({
            file,
            onProgress: (progress) =>
              setActive((prev) => (prev ? { ...prev, progress } : prev)),
          });
        } catch {
          setError(`Failed to upload ${file.name}.`);
          break;
        }
      }

      setActive(null);
      onUploaded?.();
    },
    [mutateAsync, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    disabled: isPending,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'cursor-pointer',
          isDragActive
            ? 'border-cyan-400/60 bg-cyan-500/5'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/40',
          isPending && 'pointer-events-none opacity-70'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
          {isPending ? (
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          ) : (
            <UploadCloud className="h-6 w-6 text-slate-300" />
          )}
        </div>
        {active ? (
          <div className="w-full max-w-sm">
            <p className="truncate text-sm font-medium text-white">
              {active.name}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                style={{ width: `${active.progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {active.progress}% · {formatFileSize(active.size)}
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-white">
                {isDragActive
                  ? 'Drop to upload'
                  : 'Drag & drop documents here'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                or click to browse · PDF, DOCX, Markdown, TXT · up to 25 MB
              </p>
            </div>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
