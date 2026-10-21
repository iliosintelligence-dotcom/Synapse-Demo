import { supabase } from "@/lib/supabase";

/**
 * "After a user makes a post, when they come back, ask them if they want to also share it to their WhatsApp Status." Synapse cannot post to anyone's Status, so
 * the share kit does it the way agents already do it: the photo and a Status caption, through the phone's own share sheet.
 *
 * Which posts count is remembered on THIS device, from the moment this person schedules one, so the offer goes to the person who made the post and not to every
 * colleague who opens the portal. It is made once the post is really live, and forgotten after three days or once answered.
 */
export interface Watch { postId: string; propertyId: string; at: number }
export interface Live { id: string; propertyId: string; title: string; publishedAt: string }

const KEY = "syn_status_watch_v1";
const MAX_AGE = 3 * 864e5;

export function readWatches(): Watch[] {
  try { const v = JSON.parse(window.localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
const write = (list: Watch[]): void => { try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(-20))); } catch { /* the offer is a nicety */ } };
export function addWatch(postId: string, propertyId: string, now = Date.now()): void {
  if (!postId || !propertyId) return;
  write([...readWatches().filter((w) => w.postId !== postId), { postId, propertyId, at: now }]);
}
export const removeWatch = (postId: string): void => write(readWatches().filter((w) => w.postId !== postId));
/** Watches that are still worth keeping: not older than three days. */
export const fresh = (list: Watch[], now = Date.now()): Watch[] => list.filter((w) => now - w.at <= MAX_AGE);

/** The first watched post that is live now and went live recently enough to ask about. */
export function pickOffer(watches: Watch[], live: Live[], now = Date.now()): Live | null {
  for (const w of watches) {
    const p = live.find((x) => x.id === w.postId);
    if (p && now - new Date(p.publishedAt).getTime() <= MAX_AGE) return p;
  }
  return null;
}

export async function fetchLive(ids: string[]): Promise<Live[]> {
  if (!ids.length) return [];
  const r = await supabase.from("social_posts").select("id, property_id, status, published_at, properties(title)").in("id", ids).eq("status", "published");
  if (r.error) throw r.error;
  return ((r.data ?? []) as unknown as Array<{ id: string; property_id: string; published_at: string | null; properties: { title?: string } | null }>)
    .filter((x) => x.published_at)
    .map((x) => ({ id: x.id, propertyId: x.property_id, title: x.properties?.title || "this listing", publishedAt: x.published_at! }));
}

/** Checks the watches against what is live; drops the stale ones; returns what to offer, if anything. */
export async function nextOffer(now = Date.now()): Promise<Live | null> {
  const keep = fresh(readWatches(), now);
  write(keep);
  if (!keep.length) return null;
  const live = await fetchLive(keep.map((w) => w.postId)).catch(() => []);
  return pickOffer(keep, live, now);
}
