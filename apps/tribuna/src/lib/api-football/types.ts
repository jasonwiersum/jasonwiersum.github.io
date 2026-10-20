// Subconjunto de las respuestas de API-Football v3 que usa la app.

export interface ApiEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  /** Un array vacío si todo fue bien; un objeto con mensajes si no. */
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export interface ApiTeamRef {
  id: number;
  name: string;
  logo: string | null;
  winner?: boolean | null;
}

export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null; extra: number | null };
  };
  league: { id: number; name: string; country: string; logo: string; season: number; round: string };
  teams: { home: ApiTeamRef; away: ApiTeamRef };
  goals: { home: number | null; away: number | null };
  score: { penalty: { home: number | null; away: number | null } };
  // Solo presentes al pedir /fixtures?id= o /fixtures?ids=
  events?: ApiEvent[];
  lineups?: ApiLineup[];
  statistics?: ApiTeamStatistics[];
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: ApiTeamRef;
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface ApiLineupPlayer {
  player: { id: number | null; name: string; number: number | null; pos: string | null; grid: string | null };
}

export interface ApiLineup {
  team: ApiTeamRef;
  formation: string | null;
  coach: { id: number | null; name: string | null } | null;
  startXI: ApiLineupPlayer[];
  substitutes: ApiLineupPlayer[];
}

export interface ApiTeamStatistics {
  team: ApiTeamRef;
  statistics: Array<{ type: string; value: number | string | null }>;
}

export interface ApiSquad {
  team: ApiTeamRef;
  players: Array<{
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string;
    photo: string | null;
  }>;
}

export interface ApiPlayerStatBlock {
  team: ApiTeamRef;
  league: { id: number; name: string; country: string; logo: string | null; season: number };
  games: {
    appearences: number | null; // sic: así viene en la API
    lineups: number | null;
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null;
  };
  shots: { total: number | null; on: number | null };
  goals: { total: number | null; conceded: number | null; assists: number | null; saves: number | null };
  passes: { total: number | null; key: number | null; accuracy: number | string | null };
  tackles: { total: number | null; blocks: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null };
  cards: { yellow: number | null; yellowred: number | null; red: number | null };
}

export interface ApiPlayer {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    age: number | null;
    birth: { date: string | null };
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured: boolean;
    photo: string | null;
  };
  statistics: ApiPlayerStatBlock[];
}

export interface ApiStandingEntry {
  rank: number;
  team: ApiTeamRef;
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  description: string | null;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export interface ApiStandingsLeague {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    standings: ApiStandingEntry[][];
  };
}
