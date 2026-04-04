import { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface MediaUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  files: File[];
  onRemoveFile: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedType(file: File, accept: string): boolean {
  const acceptedTypes = accept.split(',').map(t => t.trim());
  return acceptedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.slice(0, type.indexOf('/'));
      return file.type.startsWith(category + '/');
    }
    return file.type === type;
  });
}

export function MediaUploader({
  onFilesSelected,
  accept = 'image/*,video/*',
  maxFiles = 5,
  maxSizeMB = 50,
  files,
  onRemoveFile,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndAdd = useCallback(
    (incoming: File[]) => {
      setError(null);
      const maxBytes = maxSizeMB * 1024 * 1024;
      const remaining = maxFiles - files.length;

      if (remaining <= 0) {
        setError(`Maximum of ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed.`);
        return;
      }

      const valid: File[] = [];
      for (const file of incoming) {
        if (valid.length >= remaining) break;

        if (!isAcceptedType(file, accept)) {
          setError(`"${file.name}" is not an accepted file type.`);
          continue;
        }
        if (file.size > maxBytes) {
          setError(`"${file.name}" exceeds the ${maxSizeMB}MB size limit.`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [accept, files.length, maxFiles, maxSizeMB, onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      validateAndAdd(dropped);
    },
    [validateAndAdd],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      validateAndAdd(selected);
      // Reset input so re-selecting the same file works
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateAndAdd],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          px-6 py-10 cursor-pointer transition-colors
          ${
            dragOver
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900'
          }
        `}
      >
        <Upload size={28} className="text-zinc-500" />
        <div className="text-center">
          <p className="text-sm text-zinc-300">
            Drag & drop files here
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            or click to browse &middot; max {maxFiles} file{maxFiles === 1 ? '' : 's'}, {maxSizeMB}MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Preview thumbnails */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, index) => (
            <FilePreview
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              onRemove={() => onRemoveFile(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isVideo = file.type.startsWith('video/');
  const objectUrl = URL.createObjectURL(file);

  return (
    <div className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="aspect-square">
        {isVideo ? (
          <video
            src={objectUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onLoadedData={e => {
              // Seek to first frame for thumbnail
              (e.target as HTMLVideoElement).currentTime = 0.1;
            }}
          />
        ) : (
          <img
            src={objectUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onLoad={() => URL.revokeObjectURL(objectUrl)}
          />
        )}
      </div>

      {/* File info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-zinc-300 truncate">{file.name}</p>
        <p className="text-[10px] text-zinc-500">{formatFileSize(file.size)}</p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
}
