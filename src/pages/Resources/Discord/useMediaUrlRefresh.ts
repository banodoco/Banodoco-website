import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface RefreshResult {
  attachments?: Array<{ url: string; proxy_url?: string }>;
}

export const useMediaUrlRefresh = () => {
  const cacheRef = useRef(new Map<string, string[]>());

  const refreshMediaUrls = useCallback(async (messageId: string): Promise<string[] | null> => {
    // Return cached result if available
    const cached = cacheRef.current.get(messageId);
    if (cached) return cached;

    if (!supabase) return null;

    try {
      const { data, error } = await supabase.functions.invoke<RefreshResult>('refresh-media-urls', {
        body: { message_id: messageId },
      });

      if (error || !data?.attachments) return null;

      const urls = data.attachments.map(a => a.url);
      cacheRef.current.set(messageId, urls);
      return urls;
    } catch {
      return null;
    }
  }, []);

  return { refreshMediaUrls };
};
