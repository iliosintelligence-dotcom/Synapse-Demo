import { createClient } from "@supabase/supabase-js";

/** One Supabase client for the whole app. Never put a service-role key anywhere under `web/`. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
