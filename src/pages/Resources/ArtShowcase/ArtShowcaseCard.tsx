import type { EnrichedDiscordMessage } from '@/pages/Resources/Discord/types';
import { MediaWithRefresh } from './MediaWithRefresh';

interface ArtShowcaseCardProps {
  message: EnrichedDiscordMessage;
  onClick: () => void;
  featured?: boolean;
}

export const ArtShowcaseCard = ({ message, onClick, featured = false }: ArtShowcaseCardProps) => {
  const attachment = message.attachments[0];
  if (!attachment) return null;

  const isVideo = attachment.content_type?.startsWith('video/') ?? false;
  const displayName = message.author?.server_nick || message.author?.global_name || message.author?.username || 'Unknown';
  const avatarUrl = message.author?.avatar_url;

  return (
    <button
      onClick={onClick}
      className={`group text-left w-full rounded-lg overflow-hidden bg-white/5 border border-white/10 transition-all duration-200 hover:scale-[1.02] hover:border-white/20 cursor-pointer`}
    >
      {/* Media */}
      <div className={`relative bg-white/5 overflow-hidden ${featured ? 'aspect-[2/1]' : 'aspect-video'}`}>
        <MediaWithRefresh
          src={attachment.url}
          messageId={message.message_id}
          alt={attachment.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          isVideo={false}
          poster={isVideo ? attachment.url : undefined}
        />

        {/* Video badge */}
        {isVideo && (
          <div className="absolute top-2 left-2">
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white/90 rounded">
              Video
            </span>
          </div>
        )}

        {/* Reaction badge */}
        {message.reaction_count > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium bg-black/60 backdrop-blur-sm text-white/90 rounded">
              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {message.reaction_count}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full flex-shrink-0" loading="lazy" />
          )}
          <p className="text-xs text-white/50 truncate">{displayName}</p>
        </div>

        {message.content && (
          <p className="mt-1.5 text-sm text-white/70 line-clamp-2 leading-snug">
            {message.content}
          </p>
        )}
      </div>
    </button>
  );
};
