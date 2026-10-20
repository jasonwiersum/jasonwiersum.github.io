'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLiveMatch } from '@/hooks/useLiveMatches';
import { clockLabel, matchPhase, statusLabel } from '@/lib/match';
import { formatLongDate } from '@/lib/format';
import { competitionShortName } from '@/lib/teams';
import type { Match } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { LiveDot } from '@/components/ui/LiveDot';
import { cn } from '@/lib/cn';
import { EventsTimeline } from './EventsTimeline';
import { Lineups } from './Lineups';
import { StatComparison } from './StatComparison';

const TABS = [
  { id: 'events', label: 'Resumen' },
  { id: 'lineups', label: 'Alineaciones' },
  { id: 'stats', label: 'Estadísticas' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export function MatchDetail({ match: initial }: { match: Match }) {
  const match = useLiveMatch(initial);
  const phase = matchPhase(match.statusShort);
  const [tab, setTab] = useState<Tab>(phase === 'scheduled' ? 'lineups' : 'events');

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <p className="text-[12px] font-medium text-ink-2">
          {competitionShortName(match.competitionId, match.competitionName)}
          {match.round && <span className="text-ink-3"> · {match.round.replace('Regular Season - ', 'Jornada ')}</span>}
        </p>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {[match.home, match.away].map((side, i) => (
            <div key={side.id} className={cn('flex flex-col items-center gap-2', i === 1 && 'col-start-3')}>
              <TeamCrest src={side.logoUrl} name={side.name} size={56} />
              <span className="text-[14px] font-semibold leading-tight">{side.name}</span>
            </div>
          ))}
          <div className="col-start-2 row-start-1">
            {phase === 'scheduled' ? (
              <span className="font-display text-2xl font-semibold text-ink-3">vs</span>
            ) : (
              <span className="font-display text-5xl font-semibold tabular tracking-tight">
                {match.home.goals ?? 0}
                <span className="mx-2 text-ink-3">–</span>
                {match.away.goals ?? 0}
              </span>
            )}
            {match.home.penalties != null && (
              <p className="mt-1 text-[12px] tabular text-ink-2">
                Penaltis {match.home.penalties}–{match.away.penalties}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-[13px]">
          {phase === 'live' ? (
            <span className="flex items-center gap-2 font-semibold text-live tabular">
              <LiveDot /> {clockLabel(match)}
            </span>
          ) : (
            <span className="text-ink-2">
              {statusLabel(match.statusShort)} · <span className="inline-block first-letter:uppercase">{formatLongDate(match.kickoffAt)}</span>
            </span>
          )}
        </p>
        {(match.venue || match.referee) && (
          <p className="mt-1 text-[12px] text-ink-3">{[match.venue, match.referee && `Árbitro: ${match.referee}`].filter(Boolean).join(' · ')}</p>
        )}
      </Card>

      <div role="tablist" className="relative mx-auto grid max-w-md grid-cols-3 rounded-[11px] bg-fill p-[3px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('relative z-0 h-8 rounded-[8px] text-[13px] font-medium transition-colors', tab === t.id ? 'text-ink' : 'text-ink-2')}
          >
            {tab === t.id && (
              <motion.span layoutId="match-tab" className="absolute inset-0 -z-10 rounded-[8px] bg-card-solid shadow-sm dark:bg-[#636366]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
            )}
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card>
          {tab === 'events' && <EventsTimeline match={match} />}
          {tab === 'lineups' && <Lineups match={match} />}
          {tab === 'stats' && <StatComparison stats={match.statistics} homeName={match.home.name} awayName={match.away.name} />}
        </Card>
      </motion.div>
    </div>
  );
}
