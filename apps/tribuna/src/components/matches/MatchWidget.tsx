'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useLiveMatch } from '@/hooks/useLiveMatches';
import { clockLabel, matchPhase, outcomeFor, statusLabel } from '@/lib/match';
import { formatLongDate } from '@/lib/format';
import { competitionShortName, type TeamSlug } from '@/lib/teams';
import type { Match } from '@/lib/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { LiveDot } from '@/components/ui/LiveDot';
import { OutcomeBadge } from '@/components/ui/OutcomeBadge';
import { Countdown } from './Countdown';

const HEADLINE = { live: 'En vivo', scheduled: 'Próximo partido', finished: 'Último resultado', postponed: 'Aplazado', cancelled: 'Cancelado' };

/**
 * Tarjeta principal del Team Hub. Cambia de forma según el estado:
 * cuenta atrás → marcador en vivo (Realtime) → resultado final.
 */
export function MatchWidget({ match: initial, team, teamId }: { match: Match; team: TeamSlug; teamId: number }) {
  const match = useLiveMatch(initial);
  const phase = matchPhase(match.statusShort);
  const outcome = outcomeFor(match, teamId);
  const scorers = match.events.filter((e) => e.type === 'Goal' && e.detail !== 'Missed Penalty');

  return (
    <Link href={`/${team}/partidos/${match.id}`} className="group block">
      <motion.article
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="glass relative overflow-hidden rounded-[28px] p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_rgb(0_0_0/0.08)] sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--team-glow),transparent)]" />

        <header className="relative mb-6 flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-2 font-semibold text-ink">
            {phase === 'live' && <LiveDot />}
            <span className={phase === 'live' ? 'text-live' : undefined}>{HEADLINE[phase]}</span>
          </span>
          <span className="flex items-center gap-1 text-ink-2">
            {competitionShortName(match.competitionId, match.competitionName)}
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </header>

        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <Side name={match.home.name} logo={match.home.logoUrl} />
          <div className="min-w-[120px] text-center">
            {phase === 'scheduled' ? (
              <Countdown to={match.kickoffAt} />
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 font-display text-5xl font-semibold tabular tracking-tight sm:text-6xl">
                  <Score value={match.home.goals} />
                  <span className="text-ink-3">–</span>
                  <Score value={match.away.goals} />
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 text-[13px] font-medium">
                  {phase === 'live' ? (
                    <span className="text-live tabular">{clockLabel(match)}</span>
                  ) : (
                    <span className="text-ink-2">{statusLabel(match.statusShort)}</span>
                  )}
                  {outcome && <OutcomeBadge outcome={outcome} size="sm" />}
                </div>
              </>
            )}
          </div>
          <Side name={match.away.name} logo={match.away.logoUrl} />
        </div>

        {phase !== 'scheduled' && scorers.length > 0 && (
          <ul className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-ink-2">
            {scorers.map((e, i) => (
              <li key={i} className={e.teamId === match.home.id ? 'text-right' : 'col-start-2'}>
                {e.playerName} <span className="tabular text-ink-3">{e.minute}&apos;</span>
              </li>
            ))}
          </ul>
        )}

        <footer className="relative mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
          <span className="inline-block first-letter:uppercase">{formatLongDate(match.kickoffAt)}</span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {match.venue}
            </span>
          )}
        </footer>
      </motion.article>
    </Link>
  );
}

function Side({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <TeamCrest src={logo} name={name} size={64} className="drop-shadow-sm" />
      <span className="line-clamp-2 text-[14px] font-semibold leading-tight tracking-tight sm:text-[15px]">{name}</span>
    </div>
  );
}

/** Al cambiar el marcador, el número sube con un spring. */
function Score({ value }: { value: number | null }) {
  return (
    <span className="relative inline-block min-w-[1ch] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value ?? '-'}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="inline-block"
        >
          {value ?? 0}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
