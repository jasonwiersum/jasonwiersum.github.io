// Forma de las filas en Postgres (snake_case) y su conversión al dominio.
import type {
  Lineup,
  Match,
  MatchEvent,
  MatchStatistic,
  Player,
  PlayerSeasonStats,
  Position,
  StandingRow,
} from '@/lib/types';

export interface MatchRow {
  id: number;
  season: number;
  competition_id: number | null;
  competition_name: string | null;
  competition_logo: string | null;
  round: string | null;
  kickoff_at: string;
  status_short: string;
  status_long: string | null;
  elapsed: number | null;
  elapsed_extra: number | null;
  home_team_id: number;
  home_team_name: string;
  home_team_logo: string | null;
  away_team_id: number;
  away_team_name: string;
  away_team_logo: string | null;
  home_goals: number | null;
  away_goals: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  venue: string | null;
  referee: string | null;
  events: MatchEvent[];
  lineups: Lineup[];
  statistics: MatchStatistic[];
  detail_synced_at?: string | null;
  updated_at?: string;
}

export interface PlayerRow {
  id: number;
  team_id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  number: number | null;
  position: Position | null;
  nationality: string | null;
  age: number | null;
  birth_date: string | null;
  height: string | null;
  weight: string | null;
  photo_url: string | null;
  injured: boolean;
  is_active?: boolean;
  updated_at?: string;
}

export interface PlayerStatsRow {
  player_id: number;
  season: number;
  competition_id: number;
  team_id: number;
  appearances: number;
  lineups: number;
  minutes: number;
  goals: number;
  assists: number;
  shots_total: number;
  shots_on: number;
  passes_total: number;
  passes_key: number;
  pass_accuracy: number | null;
  tackles: number;
  interceptions: number;
  duels_total: number;
  duels_won: number;
  dribbles_attempts: number;
  dribbles_success: number;
  saves: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  rating: number | null;
  updated_at?: string;
}

export interface StandingDbRow {
  competition_id: number;
  season: number;
  group_name: string;
  team_id: number;
  rank: number;
  team_name: string;
  team_logo: string | null;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  form: string | null;
  description: string | null;
  updated_at?: string;
}

export function rowToMatch(r: MatchRow): Match {
  return {
    id: r.id,
    season: r.season,
    competitionId: r.competition_id,
    competitionName: r.competition_name,
    competitionLogo: r.competition_logo,
    round: r.round,
    kickoffAt: r.kickoff_at,
    statusShort: r.status_short,
    statusLong: r.status_long,
    elapsed: r.elapsed,
    elapsedExtra: r.elapsed_extra,
    home: {
      id: r.home_team_id,
      name: r.home_team_name,
      logoUrl: r.home_team_logo,
      goals: r.home_goals,
      penalties: r.home_penalties,
    },
    away: {
      id: r.away_team_id,
      name: r.away_team_name,
      logoUrl: r.away_team_logo,
      goals: r.away_goals,
      penalties: r.away_penalties,
    },
    venue: r.venue,
    referee: r.referee,
    events: r.events ?? [],
    lineups: r.lineups ?? [],
    statistics: r.statistics ?? [],
  };
}

export function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    teamId: r.team_id,
    name: r.name,
    firstname: r.firstname,
    lastname: r.lastname,
    number: r.number,
    position: r.position,
    nationality: r.nationality,
    age: r.age,
    birthDate: r.birth_date,
    height: r.height,
    weight: r.weight,
    photoUrl: r.photo_url,
    injured: r.injured,
  };
}

export function rowToPlayerStats(r: PlayerStatsRow, competitionName: string): PlayerSeasonStats {
  return {
    playerId: r.player_id,
    competitionId: r.competition_id,
    competitionName,
    appearances: r.appearances,
    lineups: r.lineups,
    minutes: r.minutes,
    goals: r.goals,
    assists: r.assists,
    shotsTotal: r.shots_total,
    shotsOn: r.shots_on,
    passesTotal: r.passes_total,
    passesKey: r.passes_key,
    passAccuracy: r.pass_accuracy,
    tackles: r.tackles,
    interceptions: r.interceptions,
    duelsTotal: r.duels_total,
    duelsWon: r.duels_won,
    dribblesAttempts: r.dribbles_attempts,
    dribblesSuccess: r.dribbles_success,
    saves: r.saves,
    goalsConceded: r.goals_conceded,
    yellowCards: r.yellow_cards,
    redCards: r.red_cards,
    rating: r.rating == null ? null : Number(r.rating),
  };
}

export function rowToStanding(r: StandingDbRow, competitionName: string): StandingRow {
  return {
    competitionId: r.competition_id,
    competitionName,
    groupName: r.group_name,
    rank: r.rank,
    teamId: r.team_id,
    teamName: r.team_name,
    teamLogo: r.team_logo,
    points: r.points,
    played: r.played,
    win: r.win,
    draw: r.draw,
    lose: r.lose,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    goalDiff: r.goal_diff,
    form: r.form,
    description: r.description,
  };
}
