import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EnrichedDiscordMessage, DiscordAttachment } from '@/pages/Resources/Discord/types';
import { MediaWithRefresh } from './MediaWithRefresh';

interface ArtShowcaseModalProps {
  message: EnrichedDiscordMessage;
  onClose: () => void;
}

export const ArtShowcaseModal = ({ message, onClose }: ArtShowcaseModalProps) => {
  const [activeAttachment, setActiveAttachment] = useState<DiscordAttachment>(message.attachments[0]);
  const isVideo = activeAttachment?.content_type?.startsWith('video/') ?? false;
  const displayName = message.author?.server_nick || message.author?.global_name || message.author?.username || 'Unknown';
  const avatarUrl = message.author?.avatar_url;

  const formattedDate = new Date(message.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Close on Escape, lock body scroll
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/95 overflow-y-auto p-4 sm:p-8"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        {/* Main media */}
        {activeAttachment && (
          <div className="w-full rounded-lg overflow-hidden bg-black">
            <MediaWithRefresh
              src={activeAttachment.url}
              messageId={message.message_id}
              alt={activeAttachment.filename}
              className={`w-full ${isVideo ? 'max-h-[70vh] sm:max-h-[80vh]' : 'max-h-[70vh] sm:max-h-[80vh] object-contain'}`}
              isVideo={isVideo}
            />
          </div>
        )}

        {/* Gallery strip for multiple attachments */}
        {message.attachments.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {message.attachments.map(att => (
              <button
                key={att.id}
                onClick={() => setActiveAttachment(att)}
                className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                  activeAttachment.id === att.id ? 'border-white/60' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="mt-6 space-y-4 pb-8">
          {/* Author row */}
          <div className="flex items-center gap-3">
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" loading="lazy" />
            )}
            <div>
              <span className="text-sm sm:text-base font-medium text-white">{displayName}</span>
              <span className="block text-xs text-white/40">{formattedDate}</span>
            </div>
          </div>

          {/* Reaction count */}
          {message.reaction_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {message.reaction_count} reactions
            </div>
          )}

          {/* Content */}
          {message.content && (
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              {message.content}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
