import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ResourceShell } from '@/components/resources/ResourceShell';
import { useAssetComments } from '@/hooks/useAssetComments';
import { useCommunityResource } from '@/hooks/useCommunityResource';
import { buildEntitySlug } from '@/lib/routing';
import type { Asset } from './types';

interface ResourceModalProps {
  asset: Asset;
  onClose: () => void;
}

export const ResourceModal = ({ asset, onClose }: ResourceModalProps) => {
  const resourceSlug = useMemo(
    () => asset.slug ?? buildEntitySlug(asset.name, asset.id),
    [asset.id, asset.name, asset.slug],
  );
  const { resource, galleryMedia, assetModels, loading } = useCommunityResource(resourceSlug);
  const { comments, loading: commentsLoading, error: commentsError } = useAssetComments(resource?.id ?? asset.id);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/95 p-4 sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        {loading || !resource ? (
          <div className="rounded-2xl border border-white/8 bg-[#0b0b0f] p-6 text-sm text-zinc-400">
            Loading resource...
          </div>
        ) : (
          <div className="rounded-3xl border border-white/8 bg-[#0b0b0f] p-6">
            <ResourceShell
              variant="modal"
              resource={resource}
              galleryMedia={galleryMedia}
              assetModels={assetModels}
              comments={comments}
              commentsLoading={commentsLoading}
              commentsError={commentsError}
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ResourceModal;
