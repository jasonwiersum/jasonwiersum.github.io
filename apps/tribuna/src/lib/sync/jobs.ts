import { getAdminClient } from '@/lib/supabase/admin';
import { apiConfig, apiFootball } from '@/lib/api-football/client';
import type { ApiFixture, ApiPlayer, ApiSquad, ApiStandingsLeague } from '@/lib/api-football/types';
import { TEAM_SLUGS, TEAMS, TRACKED_TEAM_IDS } from '@/lib/teams';
import { matchPhase } from '@/lib/match';
import type { MatchRow } from '@/lib/data/rows';
import {
  fixtureToBasicRow,
  fixtureToDetailedRow,
  playerBio,
  playerStatsToRow,
  squadToRows,
  standingToRow,
} from './mappers';

export interface JobResult {
  job: string;
  calls: number;
  detail: string;
}

const TRACKED_FILTER = `home_team_id.in.(${TRACKED_TEAM_IDS}),away_team_id.in.(${TRACKED_TEAM_IDS})`;

function db() {
  return getAdminClient();
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

async function upsertCompetitions(list: Array<{ id: number; name: string; logo?: string | null; country?: string | null; type?: string }>) {
  const unique = [...new Map(list.map((c) => [c.id, c])).values()];
  if (unique.length === 0) return;
  await must(
    db()
      .from('competitions')
      .upsert(
        unique.map((c) => ({
          id: c.id,
          name: c.name,
          logo_url: c.logo ?? null,
          country: c.country ?? null,
          ...(c.type ? { type: c.type } : {}),
          updated_at: new Date().toISOString(),
        })),
      ),
  );
}

// ---------------------------------------------------------------------------
// Calendario y resultados · 1 petición por equipo
// ---------------------------------------------------------------------------
export async function syncFixtures(): Promise<JobResult> {
  const rows = new Map<number, ReturnType<typeof fixtureToBasicRow>>();
  const competitions: Parameters<typeof upsertCompetitions>[0] = [];

  for (const slug of TEAM_SLUGS) {
    const res = await apiFootball<ApiFixture>('/fixtures', { team: TEAMS[slug].apiId, season: apiConfig.season });
    for (const f of res.response) {
      // Un Clásico o un derbi aparece en dos equipos: el Map lo deja una vez.
      rows.set(f.fixture.id, fixtureToBasicRow(f));
      competitions.push({ id: f.league.id, name: f.league.name, logo: f.league.logo, country: f.league.country });
    }
  }

  await upsertCompetitions(competitions);
  // Sin columnas jsonb: no se pisan eventos ni alineaciones ya guardados.
  if (rows.size) await must(db().from('matches').upsert([...rows.values()]));
  return { job: 'fixtures', calls: TEAM_SLUGS.length, detail: `${rows.size} partidos` };
}

// ---------------------------------------------------------------------------
// Clasificaciones · 1 petición por competición de liga
// ---------------------------------------------------------------------------
export async function syncStandings(): Promise<JobResult> {
  let total = 0;
  for (const league of apiConfig.standingsLeagues) {
    const res = await apiFootball<ApiStandingsLeague>('/standings', { league, season: apiConfig.season });
    const data = res.response[0]?.league;
    if (!data) continue;

    await upsertCompetitions([{ id: data.id, name: data.name, logo: data.logo, country: data.country, type: 'League' }]);
    const rows = data.standings.flatMap((group) =>
      group.map((entry) => standingToRow(entry, data.id, data.season, data.standings.length > 1 ? entry.group : '')),
    );
    if (rows.length) await must(db().from('standings').upsert(rows));
    total += rows.length;
  }
  return { job: 'standings', calls: apiConfig.standingsLeagues.length, detail: `${total} filas` };
}

// ---------------------------------------------------------------------------
// Plantillas · 1 petición por equipo
// ---------------------------------------------------------------------------
export async function syncSquads(): Promise<JobResult> {
  let total = 0;
  for (const slug of TEAM_SLUGS) {
    const teamId = TEAMS[slug].apiId;
    const res = await apiFootball<ApiSquad>('/players/squads', { team: teamId });
    const squad = res.response[0];
    if (!squad) continue;

    // Solo columnas que trae /players/squads: nacionalidad y altura se
    // conservan de la última sincronización de /players.
    const rows = squadToRows(squad, teamId).map(({ id, team_id, name, number, position, age, photo_url, is_active, updated_at }) => ({
      id,
      team_id,
      name,
      number,
      position,
      age,
      photo_url,
      is_active,
      updated_at,
    }));
    await must(db().from('players').upsert(rows));

    const ids = rows.map((r) => r.id);
    await must(
      db()
        .from('players')
        .update({ is_active: false })
        .eq('team_id', teamId)
        .not('id', 'in', `(${ids.join(',')})`),
    );
    total += rows.length;
  }
  return { job: 'squads', calls: TEAM_SLUGS.length, detail: `${total} jugadores` };
}

// ---------------------------------------------------------------------------
// Estadísticas de jugadores · ~2-3 páginas por equipo (20 jugadores/página)
// ---------------------------------------------------------------------------
export async function syncPlayerStats(): Promise<JobResult> {
  let calls = 0;
  let total = 0;

  for (const slug of TEAM_SLUGS) {
    const teamId = TEAMS[slug].apiId;
    const known = await must(db().from('players').select('id, name').eq('team_id', teamId).eq('is_active', true));
    const names = new Map((known ?? []).map((p) => [p.id as number, p.name as string]));

    let page = 1;
    let pages = 1;
    do {
      const res = await apiFootball<ApiPlayer>('/players', { team: teamId, season: apiConfig.season, page });
      calls++;
      pages = res.paging.total;

      // La API devuelve también a cedidos y bajas de la temporada: solo
      // actualizamos a quien está en la plantilla actual.
      const current = res.response.filter((p) => names.has(p.player.id));
      const blocks = current.flatMap((p) => p.statistics.filter((s) => s.team.id === teamId && s.league.id));

      await upsertCompetitions(blocks.map((s) => ({ id: s.league.id, name: s.league.name, logo: s.league.logo, country: s.league.country })));

      if (current.length) {
        await must(
          db()
            .from('players')
            .upsert(current.map((p) => ({ ...playerBio(p), team_id: teamId, name: names.get(p.player.id)! }))),
        );
      }

      const statRows = current.flatMap((p) =>
        p.statistics
          .filter((s) => s.team.id === teamId && s.league.id)
          .map((s) => playerStatsToRow(p.player.id, teamId, s)),
      );
      if (statRows.length) await must(db().from('player_stats').upsert(statRows));
      total += statRows.length;
      page++;
    } while (page <= pages);
  }
  return { job: 'player_stats', calls, detail: `${total} filas` };
}

// ---------------------------------------------------------------------------
// Detalle de partidos terminados (eventos, alineaciones, estadísticas)
// /fixtures?ids= admite 20 partidos por petición.
// ---------------------------------------------------------------------------
export async function syncMatchDetails(limit = 20): Promise<JobResult> {
  const pending = await must(
    db()
      .from('matches')
      .select('id')
      .or(TRACKED_FILTER)
      .in('status_short', ['FT', 'AET', 'PEN'])
      .is('detail_synced_at', null)
      .order('kickoff_at', { ascending: false })
      .limit(limit),
  );
  if (!pending?.length) return { job: 'match_details', calls: 0, detail: 'al día' };

  const res = await apiFootball<ApiFixture>('/fixtures', { ids: pending.map((m) => m.id).join('-') });
  await must(db().from('matches').upsert(res.response.map(fixtureToDetailedRow)));
  return { job: 'match_details', calls: 1, detail: `${res.response.length} partidos` };
}

// ---------------------------------------------------------------------------
// Directo
// ---------------------------------------------------------------------------
interface LiveState {
  lastPollAt?: string;
}

async function readState<T>(key: string): Promise<T> {
  const row = await must(db().from('sync_state').select('value').eq('key', key).maybeSingle());
  return ((row as { value?: T } | null)?.value ?? {}) as T;
}

async function writeState(key: string, value: unknown) {
  await must(db().from('sync_state').upsert({ key, value, updated_at: new Date().toISOString() }));
}

export interface LiveResult {
  polled: boolean;
  reason: string;
  updated: number[];
  finished: number[];
}

/**
 * Se llama cada 1-2 minutos (cron), pero solo gasta una petición si:
 *   1. algún equipo seguido tiene un partido en curso o a punto de empezar, y
 *   2. ha pasado el intervalo mínimo desde la última consulta.
 * Fuera de los partidos el coste es cero.
 */
export async function pollLive(now = new Date()): Promise<LiveResult> {
  const from = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

  const candidates = await must(
    db()
      .from('matches')
      .select('id, status_short, kickoff_at')
      .or(TRACKED_FILTER)
      .gte('kickoff_at', from)
      .lte('kickoff_at', to),
  );
  const active = (candidates ?? []).filter((m) => {
    const phase = matchPhase(m.status_short as string);
    return phase === 'live' || phase === 'scheduled';
  });
  if (active.length === 0) return { polled: false, reason: 'sin partidos activos', updated: [], finished: [] };

  // En el descanso el marcador no se mueve: espaciamos las consultas.
  const allAtBreak = active.every((m) => m.status_short === 'HT' || m.status_short === 'BT');
  const interval = allAtBreak ? Math.max(apiConfig.livePollIntervalMs, 5 * 60 * 1000) : apiConfig.livePollIntervalMs;

  const state = await readState<LiveState>('live');
  const since = state.lastPollAt ? now.getTime() - new Date(state.lastPollAt).getTime() : Infinity;
  // 10 s de margen para que un cron de 2 min no se salte un ciclo por milisegundos.
  if (since < interval - 10_000) {
    return { polled: false, reason: `próxima consulta en ${Math.round((interval - since) / 1000)} s`, updated: [], finished: [] };
  }
  await writeState('live', { lastPollAt: now.toISOString() } satisfies LiveState);

  const fetchByIds = async (ids: number[]) =>
    (await apiFootball<ApiFixture>('/fixtures', { ids: ids.join('-') })).response.map(fixtureToDetailedRow);

  // Cada lote se guarda por separado: un upsert múltiple pone a NULL las
  // columnas que falten en alguna fila, y live=all no trae alineaciones.
  const batches: Array<Array<Omit<MatchRow, 'lineups' | 'statistics'>>> = [];
  if (process.env.LIVE_SOURCE === 'live-all') {
    const live = await fetchLiveAll();
    batches.push(live);
    // Un partido que acaba desaparece de live=all: lo cerramos con una
    // petición por id para guardar el resultado final y las estadísticas.
    const seen = new Set(live.map((r) => r.id));
    const vanished = active.filter((m) => matchPhase(m.status_short as string) === 'live' && !seen.has(m.id));
    if (vanished.length) batches.push(await fetchByIds(vanished.map((m) => m.id)));
  } else {
    // Por defecto, /fixtures?ids=: una sola petición devuelve marcador,
    // eventos, alineaciones y estadísticas de todos nuestros partidos.
    batches.push(await fetchByIds(active.map((m) => m.id)));
  }

  for (const batch of batches) if (batch.length) await must(db().from('matches').upsert(batch));
  const rows = batches.flat();

  return {
    polled: true,
    reason: 'ok',
    updated: rows.map((r) => r.id),
    finished: rows.filter((r) => matchPhase(r.status_short) === 'finished').map((r) => r.id),
  };
}

/**
 * Variante con /fixtures?live=all: trae todos los partidos en juego del mundo
 * (con eventos, pero sin alineaciones ni estadísticas) y filtra los nuestros.
 * Actívala con LIVE_SOURCE=live-all.
 */
async function fetchLiveAll() {
  const res = await apiFootball<ApiFixture>('/fixtures', { live: 'all' });
  return res.response
    .filter((f) => TRACKED_TEAM_IDS.includes(f.teams.home.id) || TRACKED_TEAM_IDS.includes(f.teams.away.id))
    .map((f) => {
      const { lineups: _l, statistics: _s, detail_synced_at: _d, ...row } = fixtureToDetailedRow(f);
      return row;
    });
}
