import Link from 'next/link';
import { clockLabel, matchPhase, outcomeFor, statusLabel } from '@/lib/match';
import { formatKickoffTime, formatMatchDate } from '@/lib/format';
import { competitionShortName, type TeamSlug } from '@/lib/teams';
import type { Match } from '@/lib/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { LiveDot } from '@/components/ui/LiveDot';
import { OutcomeBadge } from '@/components/ui/OutcomeBadge';
import { cn } from '@/lib/cn';

/** Fila compacta de partido con sus tres estados: programado, en vivo, finalizado. */
export function MatchCard({ match, team, teamId }: { match: Match; team: TeamSlug; teamId: number }) {
  const phase = matchPhase(match.statusShort);
  const outcome = outcomeFor(match, teamId);
  const showScore = phase === 'live' || phase === 'finished';

  return (
    <Link
      href={`/${team}/partidos/${match.id}`}
      className={cn(
        'glass group grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-2xl px-3.5 sm:grid-cols-[72px_1fr_auto] sm:gap-4 sm:px-4 py-3.5 transition',
        'hover:-translate-y-px hover:shadow-[0_8px_24px_rgb(0_0_0/0.08)] active:scale-[0.99]',
        phase === 'live' && 'ring-1 ring-live/40',
      )}
    >
      <div className="text-[12px] leading-tight">
        <div className="font-medium text-ink first-letter:uppercase">{formatMatchDate(match.kickoffAt)}</div>
        <div className="mt-0.5 text-ink-3">{competitionShortName(match.competitionId, match.competitionName)}</div>
      </div>

      <div className="min-w-0 space-y-1.5">
        {[match.home, match.away].map((side) => (
          <div key={side.id} className="flex items-center gap-2.5">
            <TeamCrest src={side.logoUrl} name={side.name} size={20} />
            <span className={cn('truncate text-[14px]', side.id === teamId ? 'font-semibold text-ink' : 'text-ink-2')}>{side.name}</span>
            {showScore && <span className="ml-auto pl-2 font-semibold tabular text-ink">{side.goals ?? 0}</span>}
          </div>
        ))}
      </div>

      <div className="flex min-w-10 flex-col items-end gap-1 text-[12px]">
        {phase === 'live' && (
          <span className="flex items-center gap-1.5 font-semibold text-live tabular">
            <LiveDot /> {clockLabel(match)}
          </span>
        )}
        {phase === 'finished' && outcome && <OutcomeBadge outcome={outcome} />}
        {phase === 'scheduled' && <span className="font-semibold tabular text-ink">{formatKickoffTime(match.kickoffAt)}</span>}
        {(phase === 'postponed' || phase === 'cancelled') && <span className="text-ink-3">{statusLabel(match.statusShort)}</span>}
      </div>
    </Link>
  );
}
