import { createClient } from "@supabase/supabase-js";

/**
 * One Supabase client for the whole app. Never put a service-role key anywhere under `web/`.
 *
 * The auth options match the static site's client (`app/auth.js`): the same storage key and the PKCE flow, so a buyer who signed in
 * on an old page is already signed in here, and the other way round. Sign-in itself still happens on the old sign-in page until
 * that page moves, so this client never consumes a sign-in code from the address (`detectSessionInUrl: false`).
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "synapse_auth_v1", flowType: "pkce" } },
);
