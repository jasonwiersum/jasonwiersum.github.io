// Capa de lectura para Server Components. Lee de Supabase (nunca de
// API-Football directamente) y cae a los datos de demostración si Supabase no
// está configurado.
import { cache } from 'react';
import { getPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { TEAMS, type TeamSlug } from '@/lib/teams';
import type { Match, Player, PlayerSeasonStats, StandingTable } from '@/lib/types';
import { demo } from './demo';
import {
  rowToMatch,
  rowToPlayer,
  rowToPlayerStats,
  rowToStanding,
  type MatchRow,
  type PlayerRow,
  type PlayerStatsRow,
  type StandingDbRow,
} from './rows';

export const isDemo = !isSupabaseConfigured;

const season = () => Number(process.env.API_FOOTBALL_SEASON ?? new Date().getUTCFullYear());

function fail(context: string, error: { message: string }): never {
  throw new Error(`Supabase (${context}): ${error.message}`);
}

/** Todos los partidos de la temporada del equipo, ordenados por fecha. */
export const getTeamMatches = cache(async (slug: TeamSlug): Promise<Match[]> => {
  if (isDemo) return demo.matches(slug);
  const id = TEAMS[slug].apiId;
  const { data, error } = await getPublicClient()
    .from('matches')
    .select('*')
    .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
    .eq('season', season())
    .order('kickoff_at', { ascending: true });
  if (error) fail('matches', error);
  return (data as MatchRow[]).map(rowToMatch);
});

export const getMatch = cache(async (id: number): Promise<Match | null> => {
  if (isDemo) return demo.match(id);
  const { data, error } = await getPublicClient().from('matches').select('*').eq('id', id).maybeSingle();
  if (error) fail('match', error);
  return data ? rowToMatch(data as MatchRow) : null;
});

export const getSquad = cache(async (slug: TeamSlug): Promise<Player[]> => {
  if (isDemo) return demo.players(slug);
  const { data, error } = await getPublicClient()
    .from('players')
    .select('*')
    .eq('team_id', TEAMS[slug].apiId)
    .eq('is_active', true)
    .order('number', { ascending: true, nullsFirst: false });
  if (error) fail('players', error);
  return (data as PlayerRow[]).map(rowToPlayer);
});

/** Estadísticas de la temporada agrupadas por jugador. */
export const getSquadStats = cache(async (slug: TeamSlug): Promise<Record<number, PlayerSeasonStats[]>> => {
  if (isDemo) return demo.stats(slug);
  const { data, error } = await getPublicClient()
    .from('player_stats')
    .select('*, competitions(name)')
    .eq('team_id', TEAMS[slug].apiId)
    .eq('season', season());
  if (error) fail('player_stats', error);

  const byPlayer: Record<number, PlayerSeasonStats[]> = {};
  for (const row of data as Array<PlayerStatsRow & { competitions: { name: string } | null }>) {
    (byPlayer[row.player_id] ??= []).push(rowToPlayerStats(row, row.competitions?.name ?? ''));
  }
  return byPlayer;
});

/** Las tablas (liga o fase de liga de Champions) en las que aparece el equipo. */
export const getStandings = cache(async (slug: TeamSlug): Promise<StandingTable[]> => {
  if (isDemo) return demo.standings(slug);
  const client = getPublicClient();
  const { data: own, error } = await client
    .from('standings')
    .select('competition_id, group_name')
    .eq('team_id', TEAMS[slug].apiId)
    .eq('season', season());
  if (error) fail('standings', error);
  if (!own?.length) return [];

  const tables = await Promise.all(
    own.map(async ({ competition_id, group_name }) => {
      const { data, error: e } = await client
        .from('standings')
        .select('*, competitions(name)')
        .eq('competition_id', competition_id)
        .eq('group_name', group_name)
        .eq('season', season())
        .order('rank');
      if (e) fail('standings table', e);
      const rows = data as Array<StandingDbRow & { competitions: { name: string } | null }>;
      const name = rows[0]?.competitions?.name ?? '';
      return {
        competitionId: competition_id as number,
        competitionName: name,
        groupName: group_name as string,
        rows: rows.map((r) => rowToStanding(r, name)),
      };
    }),
  );
  // LaLiga primero.
  return tables.sort((a, b) => (a.competitionId === 140 ? -1 : b.competitionId === 140 ? 1 : 0));
});
