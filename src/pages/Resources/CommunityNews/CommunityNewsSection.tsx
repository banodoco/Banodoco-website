import { useEffect, useRef, useState, useMemo } from 'react';
import { TopicCard } from '@/components/sections/Community/TopicCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { DiscordCTA } from './DiscordCTA';
import { useCommunityNews } from './useCommunityNews';

/** Format month key "2025-01" to short label, with year suffix if not current year */
const formatMonthLabel = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1);
  const label = date.toLocaleDateString('en-US', { month: 'short' });
  if (parseInt(yearStr) !== new Date().getFullYear()) {
    return `${label} '${yearStr.slice(2)}`;
  }
  return label;
};

/** Skeleton matching the non-fullWidth TopicCard structure */
const TopicCardSkeleton = () => (
  <div className="bg-white/5 rounded-xl md:rounded-2xl overflow-hidden border border-white/10">
    <div className="border-b border-white/10 flex items-center justify-between px-3 py-2 md:px-6 md:py-4">
      <Skeleton className="w-16 h-5 md:w-20 md:h-6 rounded-full" />
      <Skeleton className="w-12 h-3 md:w-16 md:h-4 rounded-full" />
    </div>
    <div className="p-3 md:p-6">
      {/* Mobile skeleton */}
      <div className="flex gap-3 md:hidden">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <Skeleton className="w-24 h-20 shrink-0 rounded-lg" />
      </div>
      {/* Desktop skeleton */}
      <div className="hidden md:grid gap-6 grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Skeleton className="rounded-lg aspect-video" />
      </div>
    </div>
  </div>
);

// Page background color from CSS variable --color-bg-base
const BG_COLOR = '#0b0b0f';

export const CommunityNewsSection = () => {
  const {
    availableDates,
    selectedDate,
    setSelectedDate,
    topics,
    loading,
    loadingDates,
    error,
  } = useCommunityNews();

  const contentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [topFade, setTopFade] = useState(0);
  const [bottomFade, setBottomFade] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const isLive = selectedDate === todayStr;

  // Group available dates by month
  const monthsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const date of availableDates) {
      const monthKey = date.slice(0, 7);
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(date);
    }
    return map;
  }, [availableDates]);

  const months = useMemo(() => [...monthsMap.keys()], [monthsMap]); // descending
  const selectedMonth = selectedDate ? selectedDate.slice(0, 7) : (months[0] || null);

  const daysInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    return monthsMap.get(selectedMonth) || [];
  }, [selectedMonth, monthsMap]);

  const handleMonthSelect = (monthKey: string) => {
    const dates = monthsMap.get(monthKey);
    if (dates && dates.length > 0) {
      setSelectedDate(dates[0]); // most recent date in that month
    }
  };

  // Desktop: track vertical scroll for active card + gradient fades
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;

      // Gradient fades
      setTopFade(Math.min(1, scrollTop / 60));
      setBottomFade(Math.min(1, (scrollHeight - clientHeight - scrollTop) / 60));

      // Find card closest to scroll center
      const scrollCenter = scrollTop + clientHeight / 2;
      let closestIdx = 0;
      let minDiff = Infinity;
      cardRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        const cardCenter = ref.offsetTop + ref.offsetHeight / 2;
        const diff = Math.abs(cardCenter - scrollCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setActiveIndex(prev => (prev === closestIdx ? prev : closestIdx));
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [topics.length]);

  // Scroll content to top when date changes
  useEffect(() => {
    setActiveIndex(0);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedDate]);

  const showTopics = !loading && !error && topics.length > 0;
  const showEmpty = !loading && !error && topics.length === 0 && selectedDate;

  // Shared rendering helpers
  const renderMonthButton = (monthKey: string) => (
    <button
      key={monthKey}
      onClick={() => handleMonthSelect(monthKey)}
      className={`shrink-0 px-3 py-2 rounded-lg text-center transition-all whitespace-nowrap ${
        monthKey === selectedMonth
          ? 'bg-white/10 text-white text-sm font-medium'
          : 'text-white/30 text-xs hover:text-white/50 hover:bg-white/5'
      }`}
    >
      {formatMonthLabel(monthKey)}
    </button>
  );

  const renderDayButton = (date: string) => {
    const day = parseInt(date.split('-')[2]);
    const isSelected = date === selectedDate;
    const isToday = date === todayStr;
    const isYesterday = date === yesterdayStr;

    return (
      <button
        key={date}
        onClick={() => setSelectedDate(date)}
        className={`shrink-0 flex flex-col items-center justify-center rounded-lg transition-all px-3 py-1.5 ${
          isSelected
            ? 'bg-white/10 text-white text-sm font-medium'
            : 'text-white/30 text-xs hover:text-white/50 hover:bg-white/5'
        }`}
      >
        <span>{day}</span>
        {isToday && <span className="text-[9px] text-emerald-400 leading-tight">Today</span>}
        {isYesterday && <span className="text-[9px] text-white/40 leading-tight">Yest.</span>}
      </button>
    );
  };

  const renderCards = (desktop: boolean) => (
    <>
      {(loading || loadingDates) && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <TopicCardSkeleton key={i} />)}
        </div>
      )}
      {error && <div className="text-center py-12 text-white/50">{error}</div>}
      {showEmpty && <div className="text-center py-12 text-white/50">No community updates for this day.</div>}
      {showTopics && (
        <div className="space-y-4">
          {topics.map((topic, idx) => (
            <TopicCard
              key={`${topic.channel_id}-${topic.summary_date}-${topic.topic_title}`}
              ref={desktop ? (el: HTMLElement | null) => { cardRefs.current[idx] = el; } : undefined}
              topic={topic}
              isActive={desktop ? idx === activeIndex : false}
              index={idx}
              isLive={isLive}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-1">News from the Community</h2>
      <p className="text-white/50 text-sm mb-5">Daily highlights from our Discord, powered by AI summaries.</p>

      {/* ── Desktop: three-column layout (md+) ── */}
      <div
        className="hidden md:flex rounded-xl border border-white/10 overflow-hidden"
        style={{ height: 'min(60vh, 600px)', minHeight: '350px' }}
      >
        {/* Month column */}
        <div
          className="w-20 overflow-y-auto scrollbar-hide border-r border-white/10 py-2 px-1.5 space-y-1 bg-white/[2%]"
          style={{ scrollbarWidth: 'none' }}
        >
          {loadingDates
            ? [1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full rounded-lg" />)
            : months.map(renderMonthButton)
          }
        </div>

        {/* Day column */}
        <div
          className="w-16 overflow-y-auto scrollbar-hide border-r border-white/10 py-2 px-1 space-y-1 bg-white/[1%]"
          style={{ scrollbarWidth: 'none' }}
        >
          {loadingDates
            ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
            : daysInMonth.map(renderDayButton)
          }
        </div>

        {/* Content column */}
        <div className="flex-1 relative min-w-0">
          <div
            ref={contentRef}
            className="h-full overflow-y-auto scrollbar-hide p-4 space-y-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {renderCards(true)}
          </div>

          {/* Top/bottom gradient fades */}
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-10 z-10"
            style={{ background: `linear-gradient(to bottom, ${BG_COLOR}, transparent)`, opacity: topFade }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-10"
            style={{ background: `linear-gradient(to top, ${BG_COLOR}, transparent)`, opacity: bottomFade }}
          />
        </div>
      </div>

      {/* ── Mobile: stacked layout (<md) ── */}
      <div className="md:hidden">
        {/* Month pills — horizontal */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {loadingDates
            ? [1, 2, 3].map(i => <Skeleton key={i} className="w-14 h-8 shrink-0 rounded-lg" />)
            : months.map(renderMonthButton)
          }
        </div>

        {/* Day pills — horizontal */}
        <div
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {loadingDates
            ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-10 h-10 shrink-0 rounded-lg" />)
            : daysInMonth.map(renderDayButton)
          }
        </div>

        {/* Topic cards — vertical */}
        <div
          className="overflow-y-auto scrollbar-hide space-y-3"
          style={{ maxHeight: '60vh', minHeight: '200px', scrollbarWidth: 'none' }}
        >
          {renderCards(false)}
        </div>
      </div>

      {/* Discord CTA */}
      <div className="mt-6">
        <DiscordCTA />
      </div>
    </div>
  );
};
