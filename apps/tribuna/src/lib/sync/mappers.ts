import type { Lineup, MatchEvent, MatchEventType, MatchStatistic, Position } from '@/lib/types';
import type { MatchRow, PlayerRow, PlayerStatsRow, StandingDbRow } from '@/lib/data/rows';
import type {
  ApiFixture,
  ApiLineup,
  ApiPlayer,
  ApiPlayerStatBlock,
  ApiSquad,
  ApiStandingEntry,
} from '@/lib/api-football/types';

const POSITIONS: Position[] = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
const toPosition = (p: string | null | undefined): Position | null =>
  POSITIONS.includes(p as Position) ? (p as Position) : null;

const n = (v: number | null | undefined) => v ?? 0;
const now = () => new Date().toISOString();

/** Campos básicos del partido: válidos para /fixtures?team= y para /fixtures?ids=. */
export function fixtureToRow(f: ApiFixture): MatchRow {
  return {
    id: f.fixture.id,
    season: f.league.season,
    competition_id: f.league.id,
    competition_name: f.league.name,
    competition_logo: f.league.logo,
    round: f.league.round,
    kickoff_at: f.fixture.date,
    status_short: f.fixture.status.short,
    status_long: f.fixture.status.long,
    elapsed: f.fixture.status.elapsed,
    elapsed_extra: f.fixture.status.extra,
    home_team_id: f.teams.home.id,
    home_team_name: f.teams.home.name,
    home_team_logo: f.teams.home.logo,
    away_team_id: f.teams.away.id,
    away_team_name: f.teams.away.name,
    away_team_logo: f.teams.away.logo,
    home_goals: f.goals.home,
    away_goals: f.goals.away,
    home_penalties: f.score.penalty.home,
    away_penalties: f.score.penalty.away,
    venue: [f.fixture.venue.name, f.fixture.venue.city].filter(Boolean).join(', ') || null,
    referee: f.fixture.referee,
    events: [],
    lineups: [],
    statistics: [],
    updated_at: now(),
  };
}

/**
 * Igual que `fixtureToRow` sin las columnas jsonb, para no pisar eventos ni
 * alineaciones ya guardados cuando la respuesta no los trae.
 */
export function fixtureToBasicRow(f: ApiFixture) {
  const { events: _e, lineups: _l, statistics: _s, ...basic } = fixtureToRow(f);
  return basic;
}

export function fixtureToDetailedRow(f: ApiFixture): MatchRow {
  const row = fixtureToRow(f);
  const homeId = f.teams.home.id;
  row.events = (f.events ?? []).map(toEvent).filter((e): e is MatchEvent => e !== null);
  row.lineups = (f.lineups ?? []).map(toLineup);
  row.statistics = toStatistics(f, homeId);
  row.detail_synced_at = now();
  return row;
}

const EVENT_TYPES: Record<string, MatchEventType> = { Goal: 'Goal', Card: 'Card', subst: 'subst', Var: 'Var' };

function toEvent(e: NonNullable<ApiFixture['events']>[number]): MatchEvent | null {
  const type = EVENT_TYPES[e.type];
  if (!type) return null;
  return {
    minute: e.time.elapsed,
    extra: e.time.extra,
    teamId: e.team.id,
    playerId: e.player.id,
    playerName: e.player.name,
    assistId: e.assist.id,
    assistName: e.assist.name,
    type,
    detail: e.detail,
  };
}

function toLineup(l: ApiLineup): Lineup {
  const map = (p: ApiLineup['startXI'][number]) => ({
    id: p.player.id,
    name: p.player.name,
    number: p.player.number,
    pos: p.player.pos,
    grid: p.player.grid,
  });
  return {
    teamId: l.team.id,
    formation: l.formation,
    coach: l.coach?.name ?? null,
    startXI: l.startXI.map(map),
    substitutes: l.substitutes.map(map),
  };
}

function toStatistics(f: ApiFixture, homeId: number): MatchStatistic[] {
  const home = f.statistics?.find((s) => s.team.id === homeId)?.statistics ?? [];
  const away = f.statistics?.find((s) => s.team.id !== homeId)?.statistics ?? [];
  return home.map((s) => ({
    type: s.type,
    home: s.value,
    away: away.find((a) => a.type === s.type)?.value ?? null,
  }));
}

export function squadToRows(squad: ApiSquad, teamId: number): PlayerRow[] {
  return squad.players.map((p) => ({
    id: p.id,
    team_id: teamId,
    name: p.name,
    firstname: null,
    lastname: null,
    number: p.number,
    position: toPosition(p.position),
    nationality: null,
    age: p.age,
    birth_date: null,
    height: null,
    weight: null,
    photo_url: p.photo,
    injured: false,
    is_active: true,
    updated_at: now(),
  }));
}

/** Datos biográficos de /players (el endpoint de plantilla no trae nacionalidad). */
export function playerBio(p: ApiPlayer) {
  return {
    id: p.player.id,
    firstname: p.player.firstname,
    lastname: p.player.lastname,
    nationality: p.player.nationality,
    age: p.player.age,
    birth_date: p.player.birth.date,
    height: p.player.height,
    weight: p.player.weight,
    injured: p.player.injured,
    photo_url: p.player.photo,
    updated_at: now(),
  };
}

export function playerStatsToRow(playerId: number, teamId: number, s: ApiPlayerStatBlock): PlayerStatsRow {
  const accuracy = s.passes.accuracy == null ? null : Number(s.passes.accuracy);
  return {
    player_id: playerId,
    season: s.league.season,
    competition_id: s.league.id,
    team_id: teamId,
    appearances: n(s.games.appearences),
    lineups: n(s.games.lineups),
    minutes: n(s.games.minutes),
    goals: n(s.goals.total),
    assists: n(s.goals.assists),
    shots_total: n(s.shots.total),
    shots_on: n(s.shots.on),
    passes_total: n(s.passes.total),
    passes_key: n(s.passes.key),
    pass_accuracy: Number.isFinite(accuracy) ? accuracy : null,
    tackles: n(s.tackles.total),
    interceptions: n(s.tackles.interceptions),
    duels_total: n(s.duels.total),
    duels_won: n(s.duels.won),
    dribbles_attempts: n(s.dribbles.attempts),
    dribbles_success: n(s.dribbles.success),
    saves: n(s.goals.saves),
    goals_conceded: n(s.goals.conceded),
    yellow_cards: n(s.cards.yellow) + n(s.cards.yellowred),
    red_cards: n(s.cards.red),
    rating: s.games.rating ? Number(Number(s.games.rating).toFixed(2)) : null,
    updated_at: now(),
  };
}

export function standingToRow(e: ApiStandingEntry, competitionId: number, season: number, groupName: string): StandingDbRow {
  return {
    competition_id: competitionId,
    season,
    group_name: groupName,
    team_id: e.team.id,
    rank: e.rank,
    team_name: e.team.name,
    team_logo: e.team.logo,
    points: e.points,
    played: e.all.played,
    win: e.all.win,
    draw: e.all.draw,
    lose: e.all.lose,
    goals_for: e.all.goals.for,
    goals_against: e.all.goals.against,
    goal_diff: e.goalsDiff,
    form: e.form,
    description: e.description,
    updated_at: now(),
  };
}
