/**
 * Which channel brought this visitor (a social post, a bio link, a campaign), remembered when they land WHEREVER they land, so the
 * attribution is still there when they open a listing a few pages later. Only the values the database's `attribution_channel` enum
 * accepts are stored: a channel the enum rejects fails at the INSERT, long after this page is gone.
 */
const KEY = "syn_arrival_v1";

const ALLOWED = new Set(["instagram", "facebook", "tiktok", "x", "whatsapp_campaign", "organic", "referral", "telegram"]);
/** What a person would put in a link, mapped to what the enum calls it. */
const ALIAS: Record<string, string> = { whatsapp: "whatsapp_campaign", tg: "telegram", ig: "instagram", fb: "facebook" };

/** Referrer hosts we can read a channel from. Instagram sends people through l.instagram.com, Facebook through l.facebook.com, X rewrites everything to t.co. */
function channelFromReferrer(ref: string): string {
  let host = "";
  try { host = new URL(ref).hostname.toLowerCase(); } catch { return ""; }
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)facebook\.com$/.test(host) || host === "fb.me") return "facebook";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(twitter|x)\.com$/.test(host) || host === "t.co") return "x";
  if (/(^|\.)whatsapp\.com$/.test(host)) return "whatsapp_campaign";
  if (host === "t.me" || /(^|\.)telegram\.(org|me)$/.test(host)) return "telegram";
  return "";
}

interface ArrivalRecord { channel: string; post: string | null; at: string }

function read(): ArrivalRecord | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

/** Call once per page load. An explicit tracked link always writes; anything inferred only fills a gap, so the first channel to introduce a visitor keeps the credit. */
export function captureArrival(search: string, referrer: string): void {
  const q = new URLSearchParams(search);
  let explicit = String(q.get("ch") ?? "").toLowerCase();
  explicit = ALIAS[explicit] ?? explicit;
  const post = q.get("post");

  let channel = ALLOWED.has(explicit) ? explicit : "";
  if (!channel && referrer) channel = channelFromReferrer(referrer);
  // Instagram's in-app browser often sends no referrer; via=bio is set by the /tayo rewrite and nothing else, and exists for one purpose.
  if (!channel && q.get("via") === "bio") channel = "instagram";
  if (!channel) return; // an ordinary visit; nothing to remember

  const prev = read();
  if (prev?.channel && !ALLOWED.has(explicit)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ channel, post: post || prev?.post || null, at: new Date().toISOString() })); } catch { /* private mode */ }
}

/** The remembered channel, or "" when this visitor arrived plainly. */
export const arrivalChannel = (): string => read()?.channel ?? "";
/** The short-link token that brought them, when there was one. */
export const arrivalPost = (): string | null => read()?.post ?? null;
