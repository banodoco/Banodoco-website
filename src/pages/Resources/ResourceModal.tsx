import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { HlsPlayer } from './HlsPlayer';
import type { Asset, AssetMedia } from './types';

function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

interface GalleryMedia {
  media: AssetMedia | AssetMedia[] | null;
}

interface ResourceModalProps {
  asset: Asset;
  onClose: () => void;
}

export const ResourceModal = ({ asset, onClose }: ResourceModalProps) => {
  const primaryMedia = unwrap<AssetMedia>(asset.media);
  const creatorName = asset.creator || 'Unknown';
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sourceLink = asset.lora_link || asset.download_link;

  const handleCopy = useCallback(() => {
    if (!sourceLink) return;
    navigator.clipboard.writeText(sourceLink).then(() => {
      setCopied(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [sourceLink]);

  const [galleryMedia, setGalleryMedia] = useState<AssetMedia[]>([]);
  const [activeMedia, setActiveMedia] = useState<AssetMedia | null>(primaryMedia);

  // Fetch gallery media on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !asset.id) return;

    supabase
      .from('asset_media')
      .select('media:media_id (id, type, cloudflare_thumbnail_url, cloudflare_playback_hls_url, placeholder_image)')
      .eq('asset_id', asset.id)
      .then(({ data }) => {
        if (!data) return;
        const media = (data as GalleryMedia[])
          .map(row => unwrap(row.media))
          .filter((m): m is AssetMedia => m !== null);
        setGalleryMedia(media);
      });
  }, [asset.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      clearTimeout(copyTimeoutRef.current);
    };
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const hlsUrl = activeMedia?.cloudflare_playback_hls_url;
  const thumbnailUrl = activeMedia?.cloudflare_thumbnail_url;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/95 overflow-y-auto p-4 sm:p-8"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        {/* Video player */}
        {hlsUrl ? (
          <HlsPlayer
            hlsUrl={hlsUrl}
            thumbnailUrl={thumbnailUrl}
            className="w-full aspect-video rounded-lg overflow-hidden"
          />
        ) : thumbnailUrl ? (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            <img src={thumbnailUrl} alt={asset.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-full aspect-video rounded-lg bg-white/5 flex items-center justify-center text-white/20">
            <span className="text-lg">No preview available</span>
          </div>
        )}

        {/* Gallery strip */}
        {galleryMedia.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {galleryMedia.map(media => (
              <button
                key={media.id}
                onClick={() => setActiveMedia(media)}
                className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                  activeMedia?.id === media.id ? 'border-white/60' : 'border-white/10 hover:border-white/30'
                }`}
              >
                {media.cloudflare_thumbnail_url ? (
                  <img
                    src={media.cloudflare_thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-[10px]">
                    {media.type === 'video' ? 'VID' : 'IMG'}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="mt-6 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-white">{asset.name}</h2>
            <span className="text-sm text-white/50 mt-1 block">by {creatorName}</span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              asset.type === 'workflow'
                ? 'bg-purple-500/20 text-purple-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {asset.type === 'workflow' ? 'Workflow' : 'LoRA'}
            </span>
            {asset.admin_status === 'Featured' && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300">
                Featured
              </span>
            )}
            {asset.admin_status === 'Curated' && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-300">
                Curated
              </span>
            )}
            {asset.lora_base_model && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 text-white/60 capitalize">
                {asset.lora_base_model}
              </span>
            )}
            {asset.lora_type && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 text-white/60">
                {asset.lora_type}
              </span>
            )}
            {asset.model_variant && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 text-white/60">
                {asset.model_variant}
              </span>
            )}
          </div>

          {/* Description */}
          {asset.description && (
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              {asset.description}
            </p>
          )}

          {/* Action buttons */}
          {sourceLink && (
            <div className="flex flex-wrap gap-3 pt-2 pb-8">
              <a
                href={sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Source
              </a>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Source
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
