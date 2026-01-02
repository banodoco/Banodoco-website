import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { TopicData } from './types';
import { formatChannelName, formatDate, formatText } from './utils';
import { MediaGallery } from './MediaGallery';

interface TopicCardProps {
  topic: TopicData;
  isActive: boolean;
  fullWidth?: boolean;
}

export const TopicCard = forwardRef<HTMLElement, TopicCardProps>(
  ({ topic, isActive, fullWidth = false }, ref) => {
    return (
      <article 
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border transition-colors duration-500",
          isActive ? "border-white/30 bg-white/10" : "border-white/10",
          fullWidth && "w-[85vw] shrink-0 snap-center"
        )}
      >
        {/* Channel header */}
        <div className={cn(
          "border-b border-white/10 flex items-center justify-between",
          fullWidth ? "px-4 py-3" : "px-3 py-2 md:px-6 md:py-4"
        )}>
          <span className={cn(
            "inline-flex items-center rounded-full font-medium bg-emerald-500/20 text-emerald-400",
            fullWidth ? "px-3 py-1.5 text-xs" : "px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs"
          )}>
            #{formatChannelName(topic.channel_name)}
          </span>
          <span className={cn(
            "text-white/40 font-medium",
            fullWidth ? "text-xs" : "text-[10px] md:text-xs"
          )}>
            {formatDate(topic.summary_date)}
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
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </article>
    );
  }
);

TopicCard.displayName = 'TopicCard';


