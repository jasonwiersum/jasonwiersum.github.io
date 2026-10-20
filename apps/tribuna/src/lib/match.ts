import type { Match, MatchPhase, Outcome } from './types';

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE']);
const FINISHED = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);
const POSTPONED = new Set(['PST', 'TBD']);
const CANCELLED = new Set(['CANC', 'ABD']);

/** Traduce los códigos de estado de API-Football a cinco fases. */
export function matchPhase(statusShort: string): MatchPhase {
  if (LIVE.has(statusShort)) return 'live';
  if (FINISHED.has(statusShort)) return 'finished';
  if (POSTPONED.has(statusShort)) return 'postponed';
  if (CANCELLED.has(statusShort)) return 'cancelled';
  return 'scheduled';
}

export const isLive = (m: Pick<Match, 'statusShort'>) => matchPhase(m.statusShort) === 'live';
export const isFinished = (m: Pick<Match, 'statusShort'>) => matchPhase(m.statusShort) === 'finished';

/** Resultado del partido desde el punto de vista de `teamId`. */
export function outcomeFor(match: Match, teamId: number): Outcome | null {
  if (!isFinished(match)) return null;
  const isHome = match.home.id === teamId;
  const own = (isHome ? match.home.goals : match.away.goals) ?? 0;
  const other = (isHome ? match.away.goals : match.home.goals) ?? 0;
  if (own !== other) return own > other ? 'W' : 'L';
  // Empate tras la prórroga: deciden los penaltis.
  const ownPen = isHome ? match.home.penalties : match.away.penalties;
  const otherPen = isHome ? match.away.penalties : match.home.penalties;
  if (ownPen != null && otherPen != null && ownPen !== otherPen) return ownPen > otherPen ? 'W' : 'L';
  return 'D';
}

export function goalsFor(match: Match, teamId: number) {
  const isHome = match.home.id === teamId;
  return {
    scored: (isHome ? match.home.goals : match.away.goals) ?? 0,
    conceded: (isHome ? match.away.goals : match.home.goals) ?? 0,
  };
}

const STATUS_LABEL: Record<string, string> = {
  '1H': 'Primera parte',
  HT: 'Descanso',
  '2H': 'Segunda parte',
  ET: 'Prórroga',
  BT: 'Descanso prórroga',
  P: 'Penaltis',
  SUSP: 'Suspendido',
  INT: 'Interrumpido',
  FT: 'Finalizado',
  AET: 'Final (prórroga)',
  PEN: 'Final (penaltis)',
  PST: 'Aplazado',
  CANC: 'Cancelado',
  ABD: 'Abandonado',
  TBD: 'Por confirmar',
  NS: 'Programado',
};

export function statusLabel(statusShort: string) {
  return STATUS_LABEL[statusShort] ?? statusShort;
}

/** "67'", "45+2'", "HT" */
export function clockLabel(m: Pick<Match, 'statusShort' | 'elapsed' | 'elapsedExtra'>) {
  if (m.statusShort === 'HT') return 'Descanso';
  if (m.statusShort === 'P') return 'Penaltis';
  if (m.elapsed == null) return 'En vivo';
  return m.elapsedExtra ? `${m.elapsed}+${m.elapsedExtra}'` : `${m.elapsed}'`;
}
