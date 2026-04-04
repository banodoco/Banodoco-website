import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { profilePath } from '@/lib/routing';

export interface FeaturedCreator {
  memberId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  profileUrl: string;
  artCount: number;
  resourceCount: number;
}

export const useFeaturedCreators = (limit = 8) => {
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const client = supabase!;
        // Get members who have listed/curated/featured media
        const { data: mediaCreators } = await client
          .from('media')
          .select('member_id')
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .not('member_id', 'is', null);

        const { data: assetCreators } = await client
          .from('assets')
          .select('member_id')
          .in('admin_status', ['Featured', 'Curated', 'Listed'])
          .not('member_id', 'is', null);

        // Count per member
        const counts = new Map<number, { art: number; resources: number }>();
        for (const row of mediaCreators ?? []) {
          const mid = row.member_id as number;
          const c = counts.get(mid) ?? { art: 0, resources: 0 };
          c.art++;
          counts.set(mid, c);
        }
        for (const row of assetCreators ?? []) {
          const mid = row.member_id as number;
          const c = counts.get(mid) ?? { art: 0, resources: 0 };
          c.resources++;
          counts.set(mid, c);
        }

        // Sort by total content count, take top N
        const topIds = [...counts.entries()]
          .sort((a, b) => (b[1].art + b[1].resources) - (a[1].art + a[1].resources))
          .slice(0, limit)
          .map(([id]) => id);

        if (topIds.length === 0) {
          setCreators([]);
          setLoading(false);
          return;
        }

        // Fetch member profiles
        const { data: members } = await client
          .from('members')
          .select('member_id, username, global_name, avatar_url, stored_avatar_url, bio')
          .in('member_id', topIds);

        if (members) {
          const mapped: FeaturedCreator[] = members
            .map((m: any) => {
              const c = counts.get(m.member_id) ?? { art: 0, resources: 0 };
              return {
                memberId: m.member_id,
                username: m.username,
                displayName: m.global_name,
                avatarUrl: m.stored_avatar_url ?? m.avatar_url,
                bio: m.bio,
                profileUrl: profilePath(m.username),
                artCount: c.art,
                resourceCount: c.resources,
              };
            })
            .sort((a: FeaturedCreator, b: FeaturedCreator) =>
              (b.artCount + b.resourceCount) - (a.artCount + a.resourceCount)
            );
          setCreators(mapped);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [limit]);

  return { creators, loading };
};
