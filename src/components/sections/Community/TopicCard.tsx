import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { TopicData } from './types';
import { formatChannelName, formatDate, formatText } from './utils';
import { MediaGallery } from './MediaGallery';
import { ArrowRightIcon } from '@/components/ui/icons';

// Understated colors for channel tags (excluding blue and green)
const CHANNEL_COLORS = [
  { bg: 'bg-rose-500/10', text: 'text-rose-400/70' },
  { bg: 'bg-purple-500/10', text: 'text-purple-400/70' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400/70' },
  { bg: 'bg-pink-500/10', text: 'text-pink-400/70' },
  { bg: 'bg-orange-500/10', text: 'text-orange-400/70' },
  { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400/70' },
  { bg: 'bg-violet-500/10', text: 'text-violet-400/70' },
  { bg: 'bg-stone-500/10', text: 'text-stone-400/70' },
];

interface TopicCardProps {
  topic: TopicData;
  isActive: boolean;
  fullWidth?: boolean;
  index?: number;
}

export const TopicCard = forwardRef<HTMLElement, TopicCardProps>(
  ({ topic, isActive, fullWidth = false, index = 0 }, ref) => {
    const channelColor = CHANNEL_COLORS[index % CHANNEL_COLORS.length];
    
    return (
      <article 
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border transition-colors duration-500",
          isActive ? "border-white/30 bg-white/10" : "border-white/10",
          fullWidth && "w-[85vw] shrink-0 snap-center"
        )}
      >
        {/* Channel header - date/live on left, channel tag on right */}
        <div className={cn(
          "border-b border-white/10 flex items-center justify-between",
          fullWidth ? "px-4 py-3" : "px-3 py-2 md:px-6 md:py-4"
        )}>
          {/* Left side: Live indicator + date */}
          <span className={cn(
            "flex items-center gap-2 text-white/40 font-medium",
            fullWidth ? "text-xs" : "text-[10px] md:text-xs"
          )}>
            {/* Live indicator */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            {formatDate(topic.summary_date)}
          </span>
          
          {/* Right side: Channel tag */}
          <span className={cn(
            "inline-flex items-center rounded-full font-medium",
            channelColor.bg,
            channelColor.text,
            fullWidth ? "px-3 py-1.5 text-xs" : "px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs"
          )}>
            #{formatChannelName(topic.channel_name)}
          </span>
        </div>

        {/* Content */}
        <div className={cn(fullWidth ? "p-4" : "p-3 md:p-6")}>
          {/* Full width mobile: Show media and bullet points */}
          {fullWidth && (
            <div className="flex gap-4">
              {/* Media Gallery on left */}
              {topic.mediaUrls && topic.mediaUrls.length > 0 && (
                <div className="w-32 shrink-0">
                  <MediaGallery 
                    urls={topic.mediaUrls} 
                    isVisible={isActive}
                    compact
                  />
                </div>
              )}
              
              {/* Title and bullet points on right */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white mb-2 leading-snug">
                  {topic.topic_title}
                </h3>
                
                {topic.topic_sub_topics && topic.topic_sub_topics.length > 0 && (
                  <div className="space-y-2">
                    {topic.topic_sub_topics.slice(0, 4).map((sub, subIdx) => (
                      <div 
                        key={subIdx}
                        className="flex items-start gap-2 text-xs text-white/50"
                      >
                        <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                        <span 
                          className="line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: formatText(sub.text) }}
                        />
                      </div>
                    ))}
                    {topic.topic_sub_topics.length > 4 && (
                      <p className="text-xs text-white/30 pl-4">
                        +{topic.topic_sub_topics.length - 4} more updates
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compact mobile (non-fullWidth): Horizontal layout with media on right */}
          {!fullWidth && (
            <div className="flex gap-3 md:hidden">
              {/* Bullet points on the left */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white mb-2 leading-snug line-clamp-2">
                  {topic.topic_title}
                </h3>
                {topic.topic_sub_topics && topic.topic_sub_topics.length > 0 && (
                  <div className="space-y-1.5">
                    {topic.topic_sub_topics.slice(0, 3).map((sub, subIdx) => (
                      <div 
                        key={subIdx}
                        className="flex items-start gap-1.5 text-[11px] text-white/50"
                      >
                        <span className="text-emerald-400 shrink-0">→</span>
                        <span 
                          className="line-clamp-1"
                          dangerouslySetInnerHTML={{ __html: formatText(sub.text) }}
                        />
                      </div>
                    ))}
                    {topic.topic_sub_topics.length > 3 && (
                      <p className="text-[10px] text-white/30 pl-3">
                        +{topic.topic_sub_topics.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Media on the right for mobile */}
              {topic.mediaUrls && topic.mediaUrls.length > 0 && (
                <div className="w-24 shrink-0">
                  <MediaGallery 
                    urls={topic.mediaUrls} 
                    isVisible={isActive}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Desktop: Original grid layout */}
          <div className={cn(
            "hidden md:grid gap-6", 
            fullWidth && "!hidden",
            topic.mediaUrls && topic.mediaUrls.length > 0 ? "grid-cols-2" : "grid-cols-1"
          )}>
            {/* Text content */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3 leading-snug">
                {topic.topic_title}
              </h3>
              <p 
                className="text-sm text-white/60 leading-relaxed mb-4"
                dangerouslySetInnerHTML={{ __html: formatText(topic.topic_main_text) }}
              />
              
              {topic.topic_sub_topics && topic.topic_sub_topics.length > 0 && (
                <div className="space-y-2 mt-4">
                  {topic.topic_sub_topics.slice(0, 2).map((sub, subIdx) => (
                    <div 
                      key={subIdx}
                      className="flex items-start gap-2 text-xs text-white/50"
                    >
                      <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                      <span 
                        className="line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: formatText(sub.text) }}
                      />
                    </div>
                  ))}
                  {topic.topic_sub_topics.length > 2 && (
                    <p className="text-xs text-white/30 pl-4">
                      +{topic.topic_sub_topics.length - 2} more updates
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Media Gallery */}
            {topic.mediaUrls && topic.mediaUrls.length > 0 && (
              <div>
                <MediaGallery 
                  urls={topic.mediaUrls} 
                  isVisible={isActive}
                />
              </div>
            )}
          </div>
        </div>

        {/* Read full update button - desktop only */}
        <div className="hidden md:block px-6 py-4 border-t border-white/10">
          <a 
            href="https://discord.gg/NnFxGvx94b"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group"
          >
            Read full update
            <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </article>
    );
  }
);

TopicCard.displayName = 'TopicCard';


