import { ArrowLeftRight, Goal, MonitorPlay } from 'lucide-react';
import type { Match, MatchEvent } from '@/lib/types';
import { cn } from '@/lib/cn';

function Icon({ e }: { e: MatchEvent }) {
  if (e.type === 'Goal') return <Goal size={15} className={e.detail === 'Own Goal' ? 'text-loss' : 'text-ink'} />;
  if (e.type === 'Card')
    return (
      <span
        aria-label={e.detail === 'Yellow Card' ? 'Amarilla' : 'Roja'}
        className={cn('inline-block h-[14px] w-[10px] rounded-[2px]', e.detail === 'Yellow Card' ? 'bg-[#ffcc00]' : 'bg-loss')}
      />
    );
  if (e.type === 'subst') return <ArrowLeftRight size={15} className="text-ink-2" />;
  return <MonitorPlay size={15} className="text-ink-2" />;
}

function describe(e: MatchEvent) {
  if (e.type === 'Goal') {
    const kind = e.detail === 'Penalty' ? ' (p.)' : e.detail === 'Own Goal' ? ' (p.p.)' : '';
    return { main: `${e.playerName ?? 'Gol'}${kind}`, sub: e.assistName ? `Asist. ${e.assistName}` : null };
  }
  if (e.type === 'subst') return { main: e.playerName ?? '', sub: e.assistName ? `⇄ ${e.assistName}` : null };
  if (e.type === 'Var') return { main: e.detail, sub: e.playerName };
  return { main: e.playerName ?? '', sub: null };
}

export function EventsTimeline({ match }: { match: Match }) {
  const events = match.events.filter((e) => e.detail !== 'Missed Penalty' || e.type !== 'Goal');
  if (events.length === 0) return <p className="py-8 text-center text-[14px] text-ink-3">Sin eventos todavía.</p>;

  return (
    <ol className="relative space-y-1">
      <span aria-hidden className="absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2 bg-hairline" />
      {events.map((e, i) => {
        const home = e.teamId === match.home.id;
        const { main, sub } = describe(e);
        return (
          <li key={i} className="relative grid grid-cols-[1fr_48px_1fr] items-center py-1.5 text-[13px]">
            <div className={cn('flex items-center gap-2', home ? 'justify-end text-right' : 'invisible')}>
              {home && (
                <>
                  <span>
                    <span className="block font-medium text-ink">{main}</span>
                    {sub && <span className="block text-[11px] text-ink-3">{sub}</span>}
                  </span>
                  <Icon e={e} />
                </>
              )}
            </div>
            <span className="z-10 mx-auto rounded-full bg-card-solid px-2 py-0.5 text-[11px] font-semibold tabular text-ink-2 ring-1 ring-hairline">
              {e.minute}
              {e.extra ? `+${e.extra}` : ''}&apos;
            </span>
            <div className={cn('flex items-center gap-2', !home ? '' : 'invisible')}>
              {!home && (
                <>
                  <Icon e={e} />
                  <span>
                    <span className="block font-medium text-ink">{main}</span>
                    {sub && <span className="block text-[11px] text-ink-3">{sub}</span>}
                  </span>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
