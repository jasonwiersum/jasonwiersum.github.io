'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { matchPhase } from '@/lib/match';
import { COMPETITIONS, competitionShortName, type TeamSlug } from '@/lib/teams';
import type { Match } from '@/lib/types';
import { cn } from '@/lib/cn';
import { MatchCard } from './MatchCard';

type View = 'upcoming' | 'results';

export function FixturesList({ matches: initial, team, teamId }: { matches: Match[]; team: TeamSlug; teamId: number }) {
  const matches = useLiveMatches(initial);
  const [competition, setCompetition] = useState<number | 'all'>('all');
  const [view, setView] = useState<View>('upcoming');

  const competitions = useMemo(() => {
    const ids = [...new Set(matches.map((m) => m.competitionId).filter((id): id is number => id != null))];
    return ids
      .sort((a, b) => (COMPETITIONS[a]?.order ?? 50) - (COMPETITIONS[b]?.order ?? 50))
      .map((id) => ({ id, label: competitionShortName(id, matches.find((m) => m.competitionId === id)?.competitionName ?? null) }));
  }, [matches]);

  const visible = useMemo(() => {
    const filtered = matches.filter((m) => competition === 'all' || m.competitionId === competition);
    const live = filtered.filter((m) => matchPhase(m.statusShort) === 'live');
    if (view === 'upcoming') {
      return [...live, ...filtered.filter((m) => ['scheduled', 'postponed'].includes(matchPhase(m.statusShort)))];
    }
    return filtered.filter((m) => ['finished', 'cancelled'].includes(matchPhase(m.statusShort))).reverse();
  }, [matches, competition, view]);

  const groups = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
    const map = new Map<string, Match[]>();
    for (const m of visible) {
      const key = matchPhase(m.statusShort) === 'live' ? 'Ahora' : fmt.format(new Date(m.kickoffAt));
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Vista" className="relative grid w-full grid-cols-2 rounded-[11px] bg-fill p-[3px] sm:w-64">
          {(['upcoming', 'results'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('relative z-0 h-8 rounded-[8px] text-[13px] font-medium transition-colors', view === v ? 'text-ink' : 'text-ink-2')}
            >
              {view === v && (
                <motion.span layoutId="fixtures-view" className="absolute inset-0 -z-10 rounded-[8px] bg-card-solid shadow-sm dark:bg-[#636366]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              {v === 'upcoming' ? 'Calendario' : 'Resultados'}
            </button>
          ))}
        </div>

        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Competición">
          {[{ id: 'all' as const, label: 'Todas' }, ...competitions].map((c) => (
            <button
              key={c.id}
              onClick={() => setCompetition(c.id)}
              aria-pressed={competition === c.id}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95',
                competition === c.id ? 'bg-ink text-surface' : 'bg-fill text-ink-2 hover:text-ink',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && <p className="py-16 text-center text-[15px] text-ink-3">No hay partidos.</p>}

      <AnimatePresence mode="popLayout" initial={false}>
        {groups.map(([month, list]) => (
          <motion.section
            key={`${view}-${competition}-${month}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-2 px-1 text-[13px] font-semibold text-ink-2 first-letter:uppercase">{month}</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {list.map((m) => (
                <MatchCard key={m.id} match={m} team={team} teamId={teamId} />
              ))}
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
