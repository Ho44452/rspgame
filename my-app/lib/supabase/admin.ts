import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Use only for trusted server-side administrative operations; this key bypasses RLS. */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing server-only Supabase admin environment variables.");
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
