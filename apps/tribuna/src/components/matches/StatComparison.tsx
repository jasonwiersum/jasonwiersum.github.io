import type { MatchStatistic } from '@/lib/types';

const LABELS: Record<string, string> = {
  'Ball Possession': 'Posesión',
  expected_goals: 'Goles esperados (xG)',
  'Total Shots': 'Tiros',
  'Shots on Goal': 'Tiros a puerta',
  'Shots off Goal': 'Tiros fuera',
  'Blocked Shots': 'Tiros bloqueados',
  'Corner Kicks': 'Córners',
  Offsides: 'Fueras de juego',
  Fouls: 'Faltas',
  'Total passes': 'Pases',
  'Passes accurate': 'Pases completados',
  'Passes %': 'Precisión de pase',
  'Goalkeeper Saves': 'Paradas',
  'Yellow Cards': 'Amarillas',
  'Red Cards': 'Rojas',
};

const ORDER = Object.keys(LABELS);

const num = (v: number | string | null) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);

/**
 * Barras comparativas local / visitante. Cada barra lleva su valor escrito al
 * lado: la cifra se lee sin depender del color.
 */
export function StatComparison({ stats, homeName, awayName }: { stats: MatchStatistic[]; homeName: string; awayName: string }) {
  const rows = stats
    .filter((s) => LABELS[s.type])
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

  if (rows.length === 0) return <p className="py-8 text-center text-[14px] text-ink-3">Estadísticas no disponibles todavía.</p>;

  return (
    <div>
      <div className="mb-4 flex justify-between text-[12px] font-semibold">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />{homeName}</span>
        <span className="flex items-center gap-1.5">{awayName}<span className="size-2 rounded-full bg-accent-2" /></span>
      </div>
      <dl className="space-y-4">
        {rows.map((s) => {
          const h = num(s.home);
          const a = num(s.away);
          const total = h + a || 1;
          return (
            <div key={s.type}>
              <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline text-[13px]">
                <span className="font-semibold tabular">{s.home ?? 0}</span>
                <dt className="text-center text-ink-2">{LABELS[s.type]}</dt>
                <span className="text-right font-semibold tabular">{s.away ?? 0}</span>
              </div>
              <dd className="flex gap-[2px]" aria-hidden>
                <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-l-full bg-fill">
                  <div className="h-full rounded-l-full bg-accent transition-[width] duration-700" style={{ width: `${(h / total) * 100}%` }} />
                </div>
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-r-full bg-fill">
                  <div className="h-full rounded-r-full bg-accent-2 transition-[width] duration-700" style={{ width: `${(a / total) * 100}%` }} />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
