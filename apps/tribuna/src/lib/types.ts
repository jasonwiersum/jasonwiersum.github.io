export type Position = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

export interface Player {
  id: number;
  teamId: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  number: number | null;
  position: Position | null;
  nationality: string | null;
  age: number | null;
  birthDate: string | null;
  height: string | null;
  weight: string | null;
  photoUrl: string | null;
  injured: boolean;
}

export interface PlayerSeasonStats {
  playerId: number;
  competitionId: number;
  competitionName: string;
  appearances: number;
  lineups: number;
  minutes: number;
  goals: number;
  assists: number;
  shotsTotal: number;
  shotsOn: number;
  passesTotal: number;
  passesKey: number;
  passAccuracy: number | null;
  tackles: number;
  interceptions: number;
  duelsTotal: number;
  duelsWon: number;
  dribblesAttempts: number;
  dribblesSuccess: number;
  saves: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  rating: number | null;
}

export type MatchPhase = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface MatchSide {
  id: number;
  name: string;
  logoUrl: string | null;
  goals: number | null;
  penalties: number | null;
}

export type MatchEventType = 'Goal' | 'Card' | 'subst' | 'Var';

export interface MatchEvent {
  minute: number;
  extra: number | null;
  teamId: number;
  playerId: number | null;
  playerName: string | null;
  assistId: number | null;
  assistName: string | null;
  type: MatchEventType;
  /** "Normal Goal", "Penalty", "Own Goal", "Yellow Card", "Red Card", "Substitution 1"… */
  detail: string;
}

export interface LineupPlayer {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
  /** "fila:columna" en la formación, p. ej. "2:3". */
  grid: string | null;
}

export interface Lineup {
  teamId: number;
  formation: string | null;
  coach: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchStatistic {
  type: string;
  home: number | string | null;
  away: number | string | null;
}

export interface Match {
  id: number;
  season: number;
  competitionId: number | null;
  competitionName: string | null;
  competitionLogo: string | null;
  round: string | null;
  kickoffAt: string;
  statusShort: string;
  statusLong: string | null;
  elapsed: number | null;
  elapsedExtra: number | null;
  home: MatchSide;
  away: MatchSide;
  venue: string | null;
  referee: string | null;
  events: MatchEvent[];
  lineups: Lineup[];
  statistics: MatchStatistic[];
}

export interface StandingRow {
  competitionId: number;
  competitionName: string;
  groupName: string;
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  form: string | null;
  description: string | null;
}

export interface StandingTable {
  competitionId: number;
  competitionName: string;
  groupName: string;
  rows: StandingRow[];
}

export type Outcome = 'W' | 'D' | 'L';
