'use client';

import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { POSITION_LABEL } from '@/lib/format';
import type { Player, PlayerSeasonStats, Position } from '@/lib/types';
import { PlayerCard } from './PlayerCard';
import { PlayerSheet } from './PlayerSheet';

const ORDER: Position[] = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];

export function RosterGrid({ players, stats }: { players: Player[]; stats: Record<number, PlayerSeasonStats[]> }) {
  const [selected, setSelected] = useState<Player | null>(null);
  const close = useCallback(() => setSelected(null), []);

  const groups = ORDER.map((pos) => ({ pos, players: players.filter((p) => p.position === pos) })).filter((g) => g.players.length);
  const unknown = players.filter((p) => !p.position);

  return (
    <>
      <div className="space-y-10">
        {groups.map(({ pos, players: list }) => (
          <section key={pos} aria-labelledby={`pos-${pos}`}>
            <h2 id={`pos-${pos}`} className="mb-3 flex items-baseline gap-2 px-1 font-display text-[20px] font-semibold tracking-tight">
              {POSITION_LABEL[pos]}
              <span className="text-[13px] font-medium text-ink-3 tabular">{list.length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <PlayerCard player={p} onSelect={setSelected} />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
        {unknown.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 font-display text-[20px] font-semibold tracking-tight">Otros</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {unknown.map((p) => (
                <PlayerCard key={p.id} player={p} onSelect={setSelected} />
              ))}
            </div>
          </section>
        )}
      </div>
      <PlayerSheet player={selected} stats={selected ? (stats[selected.id] ?? []) : []} onClose={close} />
    </>
  );
}
