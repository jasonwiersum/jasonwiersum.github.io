import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { unauthorized } from '@/lib/server/cron-auth';
import { BudgetExceededError, remainingBudget } from '@/lib/api-football/client';
import {
  syncFixtures,
  syncMatchDetails,
  syncPlayerStats,
  syncSquads,
  syncStandings,
  type JobResult,
} from '@/lib/sync/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Orden pensado para el presupuesto: lo imprescindible primero. Si se agota
// la cuota a mitad, lo que queda espera a la siguiente ejecución.
//   fixtures 3 · standings 2 · squads 3 · player_stats ~8 · match_details 0-1
//   ≈ 17 peticiones/día, dejando ~80 para los directos.
const JOBS = {
  fixtures: syncFixtures,
  standings: syncStandings,
  details: syncMatchDetails,
  squads: syncSquads,
  stats: syncPlayerStats,
} as const;

type JobName = keyof typeof JOBS;

/**
 * GET /api/cron/sync            → todos los trabajos
 * GET /api/cron/sync?only=fixtures,standings
 */
export async function GET(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;

  const only = new URL(request.url).searchParams.get('only');
  const names = (only ? only.split(',') : Object.keys(JOBS)).filter((n): n is JobName => n in JOBS);

  const results: Array<JobResult | { job: string; error: string }> = [];
  for (const name of names) {
    try {
      results.push(await JOBS[name]());
    } catch (err) {
      results.push({ job: name, error: err instanceof Error ? err.message : String(err) });
      if (err instanceof BudgetExceededError) break;
    }
  }

  // Regenera todas las páginas ISR con los datos nuevos.
  revalidatePath('/', 'layout');

  return NextResponse.json({ results, remainingBudget: await remainingBudget().catch(() => null) });
}
