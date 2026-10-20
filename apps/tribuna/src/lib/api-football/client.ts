import { getAdminClient } from '@/lib/supabase/admin';
import type { ApiEnvelope } from './types';

const PROVIDERS = {
  apisports: {
    baseUrl: 'https://v3.football.api-sports.io',
    headers: (key: string): Record<string, string> => ({ 'x-apisports-key': key }),
  },
  rapidapi: {
    baseUrl: 'https://api-football-v1.p.rapidapi.com/v3',
    headers: (key: string): Record<string, string> => ({
      'x-rapidapi-key': key,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    }),
  },
} as const;

export class BudgetExceededError extends Error {
  constructor() {
    super('Presupuesto diario de API-Football agotado.');
    this.name = 'BudgetExceededError';
  }
}

export class ApiFootballError extends Error {
  constructor(message: string, readonly endpoint: string) {
    super(message);
    this.name = 'ApiFootballError';
  }
}

export const apiConfig = {
  get season() {
    return Number(process.env.API_FOOTBALL_SEASON ?? new Date().getUTCFullYear());
  },
  get dailyBudget() {
    return Number(process.env.API_FOOTBALL_DAILY_BUDGET ?? 95);
  },
  get standingsLeagues() {
    return (process.env.API_FOOTBALL_STANDINGS_LEAGUES ?? '140,2')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter(Number.isFinite);
  },
  get livePollIntervalMs() {
    return Number(process.env.LIVE_POLL_INTERVAL_SECONDS ?? 150) * 1000;
  },
};

/**
 * Reserva una llamada en `api_usage` antes de tocar la red. La reserva es
 * atómica en Postgres, así que dos cron concurrentes nunca superan el tope.
 */
async function reserveCall() {
  const { data, error } = await getAdminClient().rpc('reserve_api_call', { p_limit: apiConfig.dailyBudget });
  if (error) throw error;
  if (data === -1) throw new BudgetExceededError();
  return data as number;
}

export async function remainingBudget() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await getAdminClient().from('api_usage').select('calls').eq('day', today).maybeSingle();
  return apiConfig.dailyBudget - (data?.calls ?? 0);
}

type Params = Record<string, string | number | undefined>;

/** Una petición GET a API-Football, contabilizada contra el presupuesto diario. */
export async function apiFootball<T>(endpoint: string, params: Params = {}): Promise<ApiEnvelope<T>> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new ApiFootballError('Falta API_FOOTBALL_KEY.', endpoint);

  const provider = PROVIDERS[(process.env.API_FOOTBALL_PROVIDER as keyof typeof PROVIDERS) ?? 'apisports'] ?? PROVIDERS.apisports;
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );

  await reserveCall();

  const res = await fetch(`${provider.baseUrl}${endpoint}?${query}`, {
    headers: provider.headers(key),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new ApiFootballError(`HTTP ${res.status} ${res.statusText}`, endpoint);
  }

  const body = (await res.json()) as ApiEnvelope<T>;
  // API-Football responde 200 incluso con errores de plan o de parámetros.
  const errors = Array.isArray(body.errors) ? body.errors : Object.values(body.errors ?? {});
  if (errors.length > 0) {
    throw new ApiFootballError(errors.map(String).join(' · '), endpoint);
  }
  return body;
}
