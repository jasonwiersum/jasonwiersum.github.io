import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

let client: SupabaseClient | null = null;

/**
 * Cliente de solo lectura (anon key + RLS). Sirve tanto en Server Components
 * como en el navegador, donde además abre el WebSocket de Realtime.
 */
export function getPublicClient() {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
}
