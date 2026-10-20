'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { rowToMatch, type MatchRow } from '@/lib/data/rows';
import { matchPhase } from '@/lib/match';
import type { Match } from '@/lib/types';

const WATCH_AHEAD_MS = 6 * 60 * 60 * 1000;

/** Solo merece la pena escuchar partidos en juego o que empiezan pronto. */
function worthWatching(m: Match, now: number) {
  const phase = matchPhase(m.statusShort);
  if (phase === 'live') return true;
  return phase === 'scheduled' && new Date(m.kickoffAt).getTime() - now < WATCH_AHEAD_MS;
}

/**
 * Recibe los partidos que pintó el servidor y los mantiene al día con
 * Supabase Realtime. El servidor (cron /api/cron/live) escribe en `matches`;
 * Postgres emite el cambio y llega aquí por WebSocket sin recargar.
 */
export function useLiveMatches(initial: Match[]) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => setMatches(initial), [initial]);

  const watchIds = useMemo(() => {
    const now = Date.now();
    return initial.filter((m) => worthWatching(m, now)).map((m) => m.id);
  }, [initial]);
  const key = watchIds.join(',');

  useEffect(() => {
    if (!isSupabaseConfigured || !key) return;
    const client = getPublicClient();
    const channel = client
      .channel(`matches:${key}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=in.(${key})` },
        (payload) => {
          const next = rowToMatch(payload.new as MatchRow);
          setMatches((list) => list.map((m) => (m.id === next.id ? next : m)));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [key]);

  return matches;
}

export function useLiveMatch(initial: Match) {
  const list = useMemo(() => [initial], [initial]);
  return useLiveMatches(list)[0]!;
}
