/**
 * The Supabase project this build talks to, for the code that cannot take a client from src/lib/supabase.ts (the ported
 * page scripts, the shared scripts, the map). It is NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY, the same settings the
 * React parts read: .env.local on a PC (staging, while testing), Vercel's settings when deployed. Those files used to
 * write production's address out in full, so a PC pointed at staging still read and wrote production.
 *
 * With neither setting present the build falls back to production, so a build without them behaves as the site always has.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bhrhejpekmhbhwryjhgk.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
