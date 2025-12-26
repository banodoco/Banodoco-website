import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Attachment {
  url: string;
  filename: string;
}

interface SubTopic {
  text: string;
  subTopicMediaMessageIds?: string[];
}

interface TopicData {
  channel_id: string;
  channel_name: string;
  topic_title: string;
  topic_main_text: string;
  topic_sub_topics: SubTopic[];
  media_message_ids: string[];
  media_count: number;
  summary_date: string;
  mediaUrls?: string[];
}

// Constants for timing
const IMAGE_DISPLAY_DURATION = 5000; // 5 seconds for images

// Media Gallery Component with progress tracking
const MediaGallery = ({ urls, isVisible, compact = false }: { urls: string[], isVisible: boolean, compact?: boolean }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const urlsLengthRef = useRef(urls.length);
  const isVisibleRef = useRef(isVisible);
  const lastProgressUpdateRef = useRef(0);
  
  // Keep refs in sync
  selectedIndexRef.current = selectedIndex;
  urlsLengthRef.current = urls.length;
  isVisibleRef.current = isVisible;
  
  if (urls.length === 0) return null;
  
  const currentUrl = urls[selectedIndex];
  const isVideo = !!currentUrl.match(/\.(mp4|webm|mov)(\?|$)/i);

  // Clear any image timer
  const clearImageTimer = useCallback(() => {
    if (imageTimerRef.current) {
      clearInterval(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, []);

  // Advance to next item
  const advanceToNext = useCallback(() => {
    if (urlsLengthRef.current > 1 && isVisibleRef.current) {
      const nextIdx = (selectedIndexRef.current + 1) % urlsLengthRef.current;
      setSelectedIndex(nextIdx);
      setProgress(0);
    }
  }, []);

  // Start image timer for auto-advance
  const startImageTimer = useCallback(() => {
    clearImageTimer();
    const startTime = Date.now();
    setProgress(0);
    setIsPlaying(true);
    
    imageTimerRef.current = setInterval(() => {
      if (!isVisibleRef.current) {
        clearImageTimer();
        setIsPlaying(false);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / IMAGE_DISPLAY_DURATION) * 100;
      
      if (newProgress >= 100) {
        clearImageTimer();
        setProgress(100);
        advanceToNext();
      } else {
        setProgress(newProgress);
      }
    }, 150); // Update every 150ms (~7fps) for smooth but efficient progress
  }, [clearImageTimer, advanceToNext]);

  // Handle video time update - throttled
  const handleVideoTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 250) return; // Throttle to 4fps
    lastProgressUpdateRef.current = now;
    
    const video = e.currentTarget;
    if (video && video.duration) {
      const newProgress = (video.currentTime / video.duration) * 100;
      setProgress(newProgress);
    }
  }, []);

  // Handle video ended - auto-advance
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    advanceToNext();
  }, [advanceToNext]);

  // Handle video started
  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Handle manual selection
  const handleSelect = useCallback((idx: number) => {
    clearImageTimer();
    setProgress(0);
    setIsPlaying(true);
    setSelectedIndex(idx);
  }, [clearImageTimer]);

  // Handle visibility changes - pause/play
  useEffect(() => {
    const video = videoRef.current;
    
    if (isVisible) {
      // Start playing
      const url = urls[selectedIndex];
      const isVid = !!url?.match(/\.(mp4|webm|mov)(\?|$)/i);
      
      if (!isVid) {
        startImageTimer();
      } else if (video) {
        video.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Pause everything
      clearImageTimer();
      if (video) {
        video.pause();
      }
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Effect to handle media type changes - only runs when selectedIndex changes
  useEffect(() => {
    if (!isVisible) return;
    
    const url = urls[selectedIndex];
    const isVid = !!url?.match(/\.(mp4|webm|mov)(\?|$)/i);
    
    if (!isVid) {
      // Start image timer
      startImageTimer();
    } else {
      // Clear image timer, video handles itself via autoPlay
      clearImageTimer();
      setProgress(0);
      setIsPlaying(true);
    }
    
    return () => clearImageTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2 md:space-y-3"}>
      {/* Main display */}
      <div className={cn(
        "relative rounded-lg overflow-hidden bg-black/20",
        compact ? "aspect-square" : "aspect-video"
      )}>
        {isVideo ? (
          <video 
            ref={videoRef}
            key={currentUrl}
            src={currentUrl}
            className="w-full h-full object-cover"
            autoPlay={isVisible}
            muted
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onPlay={handleVideoPlay}
          />
        ) : (
          <img 
            key={currentUrl}
            src={currentUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {/* Progress indicator for compact mode */}
        {compact && urls.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div 
              className="h-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Thumbnail selector with progress - hidden in compact mode */}
      {!compact && urls.length > 1 && (
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto py-1 px-0.5 -mx-0.5">
          {urls.map((url, idx) => {
            const isVid = url.match(/\.(mp4|webm|mov)(\?|$)/i);
            const isSelected = idx === selectedIndex;
            
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={cn(
                  "relative shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-md overflow-hidden transition-all",
                  isSelected 
                    ? "ring-2 ring-emerald-400" 
                    : "ring-1 ring-white/10 hover:ring-white/30"
                )}
              >
                {/* Progress fill for selected item */}
                {isSelected && isPlaying && (
                  <div
                    className="absolute inset-0 bg-emerald-500/30 z-10"
                    style={{
                      clipPath: `inset(0 ${100 - progress}% 0 0)`,
                      transition: 'clip-path 100ms linear',
                    }}
                  />
                )}
                
                {/* Thumbnail content */}
                {isVid ? (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                ) : (
                  <img 
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Compact mode: dot indicators */}
      {compact && urls.length > 1 && (
        <div className="flex justify-center gap-1">
          {urls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                idx === selectedIndex 
                  ? "bg-emerald-400" 
                  : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Format channel name for display
const formatChannelName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/^ad[-_]/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00'); // Ensure consistent parsing
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export const Community = () => {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const topicRefs = useRef<(HTMLElement | null)[]>([]);

  // Track scroll to determine active topic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!container || topicRefs.current.length === 0) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      
      let closestIdx = 0;
      let minDiff = Infinity;
      
      topicRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const diff = Math.abs(center - containerCenter);
        
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      
      setActiveTopicIndex(closestIdx);
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [topics.length]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call the database function to get pre-processed topics
        const { data: topicsData, error: topicsError } = await supabase
          .rpc('get_top_community_topics');

        if (topicsError) throw topicsError;
        if (!topicsData || topicsData.length === 0) {
          setLoading(false);
          return;
        }

        // Collect all media message IDs
        const allMediaIds = topicsData.flatMap((t: TopicData) => t.media_message_ids || []);

        // Fetch media URLs in one query
        let mediaMap: Record<string, string> = {};
        if (allMediaIds.length > 0) {
          const { data: messagesData } = await supabase
            .from('discord_messages')
            .select('message_id::text, attachments')
            .in('message_id', allMediaIds);

          if (messagesData) {
            messagesData.forEach((msg: { message_id: string; attachments: Attachment[] }) => {
              if (msg.attachments?.length > 0) {
                const mediaAttachment = msg.attachments.find(
                  (a: Attachment) => a.filename.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mov)$/i)
                );
                if (mediaAttachment) {
                  mediaMap[msg.message_id] = mediaAttachment.url;
                }
              }
            });
          }
        }

        // Resolve media URLs for each topic
        const topicsWithMedia = topicsData.map((topic: TopicData) => ({
          ...topic,
          mediaUrls: (topic.media_message_ids || [])
            .map((id: string) => mediaMap[id])
            .filter(Boolean)
        }));

        setTopics(topicsWithMedia);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load community updates');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/:\s*$/, '');
  };

  return (
    <section id="community" className="h-screen snap-start bg-[#1a1a1a] text-white overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto px-4 md:px-16 py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
        {/* Mobile intro - shown above cards */}
        <div className="mb-6 md:hidden">
          <h2 className="text-2xl font-normal tracking-tight leading-[1.15] mb-3">
            Our Discord is a gathering place for people from across the ecosystem
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-4">
            We've been at the cutting-edge of the technical & artistic scenes over the past two years.
          </p>
          <a 
            href="https://discord.gg/banodoco" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Join Discord
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16">
          {/* Left side - Introduction text (desktop only) */}
          <div className="hidden md:block lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] mb-6">
              Our Discord is a gathering place for people from across the ecosystem
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-8">
              We've been at the cutting-edge of the technical & artistic scenes over the past two years.
            </p>
            <a 
              href="https://discord.gg/banodoco" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Join Discord
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Right side - Topic cards */}
          <div className="lg:col-span-8">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-white/40">Loading latest updates...</div>
              </div>
            )}

            {error && (
              <div className="text-center py-20 text-white/50">
                {error}
              </div>
            )}

            {!loading && !error && topics.length === 0 && (
              <div className="text-center py-20 text-white/50">
                No updates available yet. Check back later!
              </div>
            )}

            {!loading && !error && topics.length > 0 && (
              <div className="space-y-3 md:space-y-6 md:pt-6">
                {topics.map((item, idx) => (
                  <article 
                    key={idx}
                    ref={(el) => {
                      topicRefs.current[idx] = el;
                    }}
                    className={cn(
                      "bg-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden border transition-colors duration-500",
                      idx === activeTopicIndex ? "border-white/30 bg-white/10" : "border-white/10"
                    )}
                  >
                    {/* Channel header - more compact on mobile */}
                    <div className="px-3 py-2 md:px-6 md:py-4 border-b border-white/10 flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        #{formatChannelName(item.channel_name)}
                      </span>
                      <span className="text-[10px] md:text-xs text-white/40 font-medium">{formatDate(item.summary_date)}</span>
                    </div>

                    {/* Content - compact mobile layout */}
                    <div className="p-3 md:p-6">
                      {/* Mobile: Horizontal layout with media on right */}
                      <div className="flex gap-3 md:hidden">
                        {/* Bullet points on the left */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white mb-2 leading-snug line-clamp-2">
                            {item.topic_title}
                          </h3>
                          {item.topic_sub_topics && item.topic_sub_topics.length > 0 && (
                            <div className="space-y-1.5">
                              {item.topic_sub_topics.slice(0, 3).map((sub, subIdx) => (
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
                              {item.topic_sub_topics.length > 3 && (
                                <p className="text-[10px] text-white/30 pl-3">
                                  +{item.topic_sub_topics.length - 3} more
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Media on the right for mobile */}
                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                          <div className="w-24 shrink-0">
                            <MediaGallery 
                              urls={item.mediaUrls} 
                              isVisible={idx === activeTopicIndex}
                              compact
                            />
                          </div>
                        )}
                      </div>

                      {/* Desktop: Original grid layout */}
                      <div className="hidden md:grid grid-cols-2 gap-6">
                        {/* Text content */}
                        <div>
                          <h3 className="text-lg font-medium text-white mb-3 leading-snug">
                            {item.topic_title}
                          </h3>
                          <p 
                            className="text-sm text-white/60 leading-relaxed mb-4"
                            dangerouslySetInnerHTML={{ __html: formatText(item.topic_main_text) }}
                          />
                          
                          {item.topic_sub_topics && item.topic_sub_topics.length > 0 && (
                            <div className="space-y-2 mt-4">
                              {item.topic_sub_topics.slice(0, 2).map((sub, subIdx) => (
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
                              {item.topic_sub_topics.length > 2 && (
                                <p className="text-xs text-white/30 pl-4">
                                  +{item.topic_sub_topics.length - 2} more updates
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Media Gallery */}
                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                          <div>
                            <MediaGallery 
                              urls={item.mediaUrls} 
                              isVisible={idx === activeTopicIndex}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Read full update button - hidden on mobile */}
                    <div className="hidden md:block px-6 py-4 border-t border-white/10">
                      <button className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
                        Read full update
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};
