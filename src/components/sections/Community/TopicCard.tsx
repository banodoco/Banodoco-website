import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { TopicData } from './types';
import { formatChannelName, formatDate, formatText } from './utils';
import { MediaGallery } from './MediaGallery';

interface TopicCardProps {
  topic: TopicData;
  isActive: boolean;
  variant?: 'scroll' | 'desktop';
}

export const TopicCard = forwardRef<HTMLElement, TopicCardProps>(
  ({ topic, isActive, variant = 'desktop' }, ref) => {
    const isScroll = variant === 'scroll';

    return (
      <article 
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border transition-colors duration-500",
          isActive ? "border-white/30 bg-white/10" : "border-white/10",
          isScroll && "w-[75vw] md:w-[60vw] lg:w-[50vw] xl:w-[45vw] shrink-0 snap-center",
          !isScroll && "rounded-2xl"
        )}
      >
        {/* Channel header */}
        <div className={cn(
          "border-b border-white/10 flex items-center justify-between",
          isScroll ? "px-3 py-2" : "px-6 py-4"
        )}>
          <span className={cn(
            "inline-flex items-center rounded-full font-medium bg-emerald-500/20 text-emerald-400",
            isScroll ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
          )}>
            #{formatChannelName(topic.channel_name)}
          </span>
          <span className={cn(
            "text-white/40 font-medium",
            isScroll ? "text-[10px]" : "text-xs"
          )}>
            {formatDate(topic.summary_date)}
          </span>
        </div>

        {/* Content */}
        <div className={cn(isScroll ? "p-3" : "p-6")}>
          {/* Scroll variant: Content on top, media below */}
          {isScroll && (
            <div className="flex flex-col gap-3">
              <div>
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
              {topic.mediaUrls && topic.mediaUrls.length > 0 && (
                <MediaGallery 
                  urls={topic.mediaUrls} 
                  isVisible={isActive}
                  maxHeight="max-h-36"
                />
              )}
              <button className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 group mt-1">
                Read full summary
                <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

          {/* Desktop variant: Two-column grid */}
          {!isScroll && (
            <div className="grid grid-cols-2 gap-6">
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

              {topic.mediaUrls && topic.mediaUrls.length > 0 && (
                <MediaGallery 
                  urls={topic.mediaUrls} 
                  isVisible={isActive}
                />
              )}
            </div>
          )}
        </div>

        {/* Read full update button - desktop only */}
        {!isScroll && (
          <div className="px-6 py-4 border-t border-white/10">
            <button className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
              Read full update
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </article>
    );
  }
);

TopicCard.displayName = 'TopicCard';


