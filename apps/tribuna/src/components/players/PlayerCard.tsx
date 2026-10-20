'use client';

import { motion } from 'framer-motion';
import { nationalityEs, POSITION_SINGULAR } from '@/lib/format';
import type { Player } from '@/lib/types';
import { PlayerPhoto } from './PlayerPhoto';

export function PlayerCard({ player, onSelect }: { player: Player; onSelect: (p: Player) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(player)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="glass group relative flex w-full flex-col items-center overflow-hidden rounded-3xl px-3 pt-5 pb-4 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none hover:shadow-[0_12px_32px_rgb(0_0_0/0.1)] focus-visible:ring-2 focus-visible:ring-accent/60"
      aria-label={`${player.name}, dorsal ${player.number ?? 'sin asignar'}`}
    >
      {player.number != null && (
        <span aria-hidden className="absolute top-3 right-4 font-display text-[28px] leading-none font-bold tabular text-accent/15 transition-colors group-hover:text-accent/30">
          {player.number}
        </span>
      )}
      <PlayerPhoto src={player.photoUrl} name={player.name} size={88} className="ring-1 ring-hairline" />
      <span className="mt-3 line-clamp-1 text-[15px] font-semibold tracking-tight text-ink">{player.name}</span>
      <span className="mt-0.5 text-[12px] text-ink-2">
        {player.position ? POSITION_SINGULAR[player.position] : '—'} · {nationalityEs(player.nationality)}
      </span>
      {player.injured && <span className="mt-2 rounded-full bg-loss/10 px-2 py-0.5 text-[11px] font-medium text-loss">Lesionado</span>}
    </motion.button>
  );
}
