'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { goalsFor, outcomeFor } from '@/lib/match';
import { formatMatchDate } from '@/lib/format';
import type { Match, Outcome } from '@/lib/types';
import { OutcomeBadge } from '@/components/ui/OutcomeBadge';

interface Point {
  label: string;
  opponent: string;
  date: string;
  score: string;
  scored: number;
  conceded: number;
  outcome: Outcome;
}

/**
 * Rendimiento en los últimos partidos: racha V/E/D, totales y goles a favor
 * y en contra por partido.
 */
export function StatsChart({ matches, teamId }: { matches: Match[]; teamId: number }) {
  const data: Point[] = matches.map((m) => {
    const isHome = m.home.id === teamId;
    const opponent = isHome ? m.away.name : m.home.name;
    const { scored, conceded } = goalsFor(m, teamId);
    return {
      label: opponent.slice(0, 3).toUpperCase(),
      opponent,
      date: formatMatchDate(m.kickoffAt),
      score: `${m.home.goals ?? 0}–${m.away.goals ?? 0}`,
      scored,
      conceded,
      outcome: outcomeFor(m, teamId) ?? 'D',
    };
  });

  if (data.length === 0) return <p className="py-10 text-center text-[14px] text-ink-3">Aún no hay partidos jugados.</p>;

  const count = (o: Outcome) => data.filter((d) => d.outcome === o).length;
  const gf = data.reduce((s, d) => s + d.scored, 0);
  const gc = data.reduce((s, d) => s + d.conceded, 0);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <dl className="grid grid-cols-5 gap-2 text-center">
        {[
          ['Victorias', count('W')],
          ['Empates', count('D')],
          ['Derrotas', count('L')],
          ['A favor', gf],
          ['En contra', gc],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-fill/60 px-1 py-2.5">
            <dd className="font-display text-[22px] font-semibold tabular tracking-tight">{value}</dd>
            <dt className="text-[11px] text-ink-2">{label}</dt>
          </div>
        ))}
      </dl>

      <ol className="flex items-center justify-between gap-1" aria-label="Racha, del más antiguo al más reciente">
        {data.map((d, i) => (
          <li key={i} title={`${d.opponent} · ${d.score}`}>
            <OutcomeBadge outcome={d.outcome} />
          </li>
        ))}
      </ol>

      <div className="flex min-h-44 flex-1 flex-col">
        <div className="mb-2 flex gap-4 text-[12px] text-ink-2" aria-hidden>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-[3px] bg-accent" />A favor</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-[3px] bg-accent-2" />En contra</span>
        </div>
        <div className="min-h-44 flex-1" role="img" aria-label={`Goles por partido: ${gf} a favor y ${gc} en contra en ${data.length} partidos`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
              <Tooltip cursor={{ fill: 'var(--fill)', radius: 8 }} content={<ChartTooltip />} />
              <Bar dataKey="scored" name="A favor" fill="var(--team-accent)" radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="conceded" name="En contra" fill="var(--team-accent-2)" radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-[12px] shadow-lg">
      <p className="font-semibold text-ink">
        {d.opponent} <span className="tabular text-ink-2">{d.score}</span>
      </p>
      <p className="text-ink-3 first-letter:uppercase">{d.date}</p>
      <p className="mt-1 tabular text-ink-2">
        {d.scored} a favor · {d.conceded} en contra
      </p>
    </div>
  );
}
