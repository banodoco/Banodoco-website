import { useState } from 'react';
import { useDiscordMessages } from '@/pages/Resources/Discord/useDiscordMessages';
import { CHANNEL_ART_SHARING } from '@/pages/Resources/Discord/constants';
import type { EnrichedDiscordMessage } from '@/pages/Resources/Discord/types';
import { ArtShowcaseCard } from './ArtShowcaseCard';
import { ArtShowcaseModal } from './ArtShowcaseModal';

export const ArtShowcaseSection = () => {
  const { messages, loading, loadingMore, hasMore, loadMore } = useDiscordMessages(CHANNEL_ART_SHARING, 20);
  const [selectedMessage, setSelectedMessage] = useState<EnrichedDiscordMessage | null>(null);

  // Filter to only messages with image or video attachments
  const mediaMessages = messages.filter(msg =>
    msg.attachments.some(att =>
      att.content_type?.startsWith('image/') || att.content_type?.startsWith('video/')
    )
  );

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">Art Showcase</h2>
        <p className="mt-2 text-sm text-white/50">Community creations from the art sharing channel</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`${i < 2 ? 'col-span-12 sm:col-span-6 lg:col-span-6' : 'col-span-12 sm:col-span-6 lg:col-span-4'} rounded-lg overflow-hidden bg-white/5 border border-white/10 animate-pulse`}
            >
              <div className={`${i < 2 ? 'aspect-[2/1]' : 'aspect-video'} bg-white/5`} />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-12 gap-4">
          {mediaMessages.map((msg, i) => (
            <div
              key={msg.message_id}
              className={i < 2 ? 'col-span-12 sm:col-span-6 lg:col-span-6' : 'col-span-12 sm:col-span-6 lg:col-span-4'}
            >
              <ArtShowcaseCard
                message={msg}
                onClick={() => setSelectedMessage(msg)}
                featured={i < 2}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedMessage && (
        <ArtShowcaseModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </section>
  );
};
