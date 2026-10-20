import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { unauthorized } from '@/lib/server/cron-auth';
import { pollLive, syncStandings } from '@/lib/sync/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Polling en directo. Las páginas no esperan a este endpoint: cada fila que
 * escribe en `matches` llega a los navegadores por Supabase Realtime.
 */
export async function GET(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;

  try {
    const result = await pollLive();

    if (result.finished.length) {
      // Al pitido final: clasificación nueva (2 peticiones) y páginas regeneradas.
      await syncStandings().catch(() => null);
      revalidatePath('/', 'layout');
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
