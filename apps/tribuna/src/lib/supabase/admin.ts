import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

let client: SupabaseClient | null = null;

/** Cliente con service_role. Solo para Route Handlers del servidor (cron). */
export function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  }
  client ??= createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
