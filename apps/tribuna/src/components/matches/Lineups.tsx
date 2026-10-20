'use client';

import { playerPhotoUrl } from '@/lib/format';
import type { Lineup, LineupPlayer, Match } from '@/lib/types';
import { PlayerPhoto } from '@/components/players/PlayerPhoto';

function shortName(name: string) {
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
}

/** Coloca a los titulares según `grid` ("fila:columna") en su mitad del campo. */
function placed(lineup: Lineup, half: 'bottom' | 'top') {
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of lineup.startXI) {
    const [r = 1] = (p.grid ?? '1:1').split(':').map(Number);
    rows.set(r, [...(rows.get(r) ?? []), p]);
  }
  const rowCount = Math.max(...rows.keys(), 1);
  return [...rows.entries()].flatMap(([r, players]) => {
    const sorted = [...players].sort((a, b) => Number(a.grid?.split(':')[1]) - Number(b.grid?.split(':')[1]));
    return sorted.map((p, i) => {
      const depth = rowCount > 1 ? (r - 1) / (rowCount - 1) : 0; // 0 = portero, 1 = línea más adelantada
      const x = ((i + 0.5) / sorted.length) * 100;
      // Del 6 % al 43 % de la altura: nadie toca la línea de fondo ni el medio campo.
      const offset = 6 + depth * 37;
      const y = half === 'bottom' ? 100 - offset : offset;
      // El rival se ve de frente: su izquierda es nuestra derecha.
      return { p, x: half === 'top' ? 100 - x : x, y };
    });
  });
}

function Pitch({ match }: { match: Match }) {
  const home = match.lineups.find((l) => l.teamId === match.home.id);
  const away = match.lineups.find((l) => l.teamId === match.away.id);
  const dots = [...(away ? placed(away, 'top') : []), ...(home ? placed(home, 'bottom') : [])];

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#2f7d46,#276b3c)] ring-1 ring-black/5">
      {/* Líneas del campo */}
      <svg viewBox="0 0 300 400" className="absolute inset-0 size-full text-white/25" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="10" y="10" width="280" height="380" rx="4" />
        <line x1="10" y1="200" x2="290" y2="200" />
        <circle cx="150" cy="200" r="36" />
        <rect x="80" y="10" width="140" height="56" />
        <rect x="80" y="334" width="140" height="56" />
        <rect x="118" y="10" width="64" height="20" />
        <rect x="118" y="370" width="64" height="20" />
      </svg>
      {dots.map(({ p, x, y }, i) => (
        <div
          key={`${p.id ?? p.name}-${i}`}
          className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <PlayerPhoto src={playerPhotoUrl(p.id)} name={p.name} size={32} className="ring-2 ring-white/90 shadow-md" />
          <span className="max-w-full truncate rounded-full bg-black/35 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {p.number != null && <span className="tabular opacity-70">{p.number} </span>}
            {shortName(p.name)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Lineups({ match }: { match: Match }) {
  if (match.lineups.length === 0) {
    return <p className="py-8 text-center text-[14px] text-ink-3">Las alineaciones se publican una hora antes del partido.</p>;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Pitch match={match} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {[match.home, match.away].map((side) => {
          const l = match.lineups.find((x) => x.teamId === side.id);
          if (!l) return null;
          return (
            <div key={side.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-[14px] font-semibold">{side.name}</h3>
                <span className="text-[12px] font-medium tabular text-ink-2">{l.formation}</span>
              </div>
              {l.coach && <p className="mb-2 text-[12px] text-ink-3">Entrenador · {l.coach}</p>}
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Suplentes</p>
              <ul className="flex flex-wrap gap-1.5">
                {l.substitutes.map((p, i) => (
                  <li key={i} className="rounded-full bg-fill px-2.5 py-1 text-[12px] text-ink-2">
                    {p.number != null && <span className="tabular text-ink-3">{p.number} </span>}
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
