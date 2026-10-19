import { supabase } from "./supabase";

/**
 * Calls a Supabase edge function over plain fetch, so a call can be aborted (a market-history search can take ~30 s and the chat gives up
 * after 50). `token` is a signed-in buyer's access token; without it the call goes out with the public key, as an anonymous visitor.
 */
export async function callFunction<T = unknown>(name: string, body: unknown, opts: { signal?: AbortSignal; token?: string | null } = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${opts.token ?? key}` },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** The signed-in buyer's access token, or null. */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
