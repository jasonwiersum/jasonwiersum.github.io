'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { nationalityEs, POSITION_SINGULAR } from '@/lib/format';
import { competitionShortName } from '@/lib/teams';
import type { Player, PlayerSeasonStats } from '@/lib/types';
import { Sheet } from '@/components/ui/Sheet';
import { AttributeRadar } from '@/components/charts/AttributeRadar';
import { cn } from '@/lib/cn';
import { PlayerPhoto } from './PlayerPhoto';

const SUM_KEYS = [
  'appearances', 'lineups', 'minutes', 'goals', 'assists', 'shotsTotal', 'shotsOn', 'passesTotal', 'passesKey',
  'tackles', 'interceptions', 'duelsTotal', 'duelsWon', 'dribblesAttempts', 'dribblesSuccess', 'saves',
  'goalsConceded', 'yellowCards', 'redCards',
] as const;

/** Suma de todas las competiciones; precisión y nota, ponderadas por minutos. */
function total(list: PlayerSeasonStats[]): PlayerSeasonStats | null {
  if (list.length === 0) return null;
  const out = { ...list[0]!, competitionId: 0, competitionName: 'Temporada' };
  for (const k of SUM_KEYS) out[k] = list.reduce((s, x) => s + x[k], 0);
  const weighted = (key: 'passAccuracy' | 'rating') => {
    const rows = list.filter((x) => x[key] != null && x.minutes > 0);
    const mins = rows.reduce((s, x) => s + x.minutes, 0);
    return mins ? rows.reduce((s, x) => s + x[key]! * x.minutes, 0) / mins : null;
  };
  const acc = weighted('passAccuracy');
  const rating = weighted('rating');
  out.passAccuracy = acc == null ? null : Math.round(acc);
  out.rating = rating == null ? null : Number(rating.toFixed(2));
  return out;
}

export function PlayerSheet({ player, stats, onClose }: { player: Player | null; stats: PlayerSeasonStats[]; onClose: () => void }) {
  return (
    <Sheet open={player !== null} onClose={onClose} title={player?.name ?? 'Jugador'}>
      {player && <PlayerDetail key={player.id} player={player} stats={stats} />}
    </Sheet>
  );
}

function PlayerDetail({ player, stats }: { player: Player; stats: PlayerSeasonStats[] }) {
  const options = useMemo(() => {
    const t = total(stats);
    return t ? [t, ...stats.filter((s) => s.appearances > 0)] : [];
  }, [stats]);
  const [selected, setSelected] = useState(0);
  const s = options[selected] ?? options[0];
  const gk = player.position === 'Goalkeeper';

  const tiles: Array<[string, string | number]> = s
    ? [
        ['Partidos', s.appearances],
        ['Minutos', s.minutes.toLocaleString('es-ES')],
        gk ? ['Paradas', s.saves] : ['Goles', s.goals],
        gk ? ['Encajados', s.goalsConceded] : ['Asistencias', s.assists],
        ['Pases clave', s.passesKey],
        ['Valoración', s.rating?.toFixed(2) ?? '—'],
      ]
    : [];

  const meters: Array<[string, number, number]> = s
    ? [
        ['Precisión de pase', s.passAccuracy ?? 0, 100],
        ['Duelos ganados', s.duelsWon, s.duelsTotal],
        ...(!gk ? ([['Tiros a puerta', s.shotsOn, s.shotsTotal], ['Regates completados', s.dribblesSuccess, s.dribblesAttempts]] as Array<[string, number, number]>) : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <PlayerPhoto src={player.photoUrl} name={player.name} size={88} className="ring-1 ring-hairline" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-accent tabular">{player.number != null ? `#${player.number}` : 'Sin dorsal'}</p>
          <h2 className="font-display text-[26px] leading-tight font-semibold tracking-tight">{player.name}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {[player.position && POSITION_SINGULAR[player.position], nationalityEs(player.nationality), player.age && `${player.age} años`, player.height]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      {!s ? (
        <p className="py-10 text-center text-[14px] text-ink-3">Sin estadísticas esta temporada.</p>
      ) : (
        <>
          {options.length > 2 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {options.map((o, i) => (
                <button
                  key={o.competitionId}
                  onClick={() => setSelected(i)}
                  aria-pressed={i === selected}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95',
                    i === selected ? 'bg-ink text-surface' : 'bg-fill text-ink-2 hover:text-ink',
                  )}
                >
                  {o.competitionId === 0 ? 'Temporada' : competitionShortName(o.competitionId, o.competitionName)}
                </button>
              ))}
            </div>
          )}

          <motion.dl key={selected} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-fill/60 px-3 py-3">
                <dd className="font-display text-[24px] leading-none font-semibold tabular tracking-tight">{value}</dd>
                <dt className="mt-1 text-[11px] text-ink-2">{label}</dt>
              </div>
            ))}
          </motion.dl>

          <section>
            <h3 className="text-[13px] font-semibold text-ink-2">Perfil</h3>
            <AttributeRadar stats={s} position={player.position} />
          </section>

          <section className="space-y-3">
            {meters.map(([label, value, of]) => {
              const pct = label === 'Precisión de pase' ? value : of ? Math.round((value / of) * 100) : 0;
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="text-ink-2">{label}</span>
                    <span className="font-semibold tabular">
                      {pct}%{label !== 'Precisión de pase' && <span className="font-normal text-ink-3"> · {value}/{of}</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-fill">
                    <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
