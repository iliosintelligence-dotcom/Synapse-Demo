import type { ReplyTo } from "./types";

/** Money in the listing's own currency, with the period: ₦120,000,000 or ₦4,500,000/yr. */
export function priceLine(p: Pick<ReplyTo, "price" | "price_period" | "currency">): string {
  const n = Number(p.price);
  if (!Number.isFinite(n) || n <= 0) return "price on request";
  const suffix = p.price_period === "per_year" ? "/yr" : p.price_period === "per_month" ? "/mo" : p.price_period === "per_night" ? "/night" : "";
  let money: string;
  try {
    money = new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency || "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(n);
  } catch {
    money = `${p.currency || "NGN"} ${n.toLocaleString()}`;
  }
  return money + suffix;
}

/**
 * A bracketed aside the model reads as context and does not repeat back (the page writes it, the person did not, so it never counts as a
 * turn). The rent/sale split is the point: a landlord sets a rent and it is the rent, so Tayo offering to "get that down" on a rental
 * teaches a buyer to haggle over something nobody will move on. The negotiation floor is NOT here: it is decided on the server and never
 * leaves it.
 */
export function replyContext(r: ReplyTo | null): string | null {
  if (!r) return null;
  const rent = String(r.listing_type || "").toLowerCase() === "rent";
  let t = `[The buyer is replying about one specific listing, so answer about THIS home unless they clearly change the subject: "${r.title || "a listing"}"${r.city ? ` in ${r.city}` : ""}, ${priceLine(r)}${r.bedrooms ? `, ${r.bedrooms} bed` : ""}. `;
  t += rent
    ? "This is a RENTAL: the rent is set by the agency and is not negotiable. Do not invite an offer or suggest a lower figure. Answer what they ask, tell them what to check before paying, and when they are genuinely interested say you will introduce them to the agent."
    : "This is a SALE: a number is a fair question. Stay within the asking price the agency set and never suggest going below it, and be clear you can carry an offer but only the agency can accept one.";
  return `${t} Never claim the home is verified unless told it is.]`;
}

export const DREAM_CTX_PREFIX = "[Background from my Dream Home";

/** The dream-home note is sent to the model but must never surface in the UI (the server persists it, so restored threads carry it). */
export const isHiddenNote = (m: { role: string; content: string } | null | undefined): boolean =>
  !!m && m.role === "user" && typeof m.content === "string" && m.content.startsWith(DREAM_CTX_PREFIX);

interface MoodBoard {
  name?: string; mode?: string; vibe?: unknown[]; areas?: unknown[]; housing?: unknown[]; lifestyle?: unknown[]; aesthetic?: unknown[];
  images?: Array<{ c?: string } | null>;
}

/** Folds the visitor's Dream Home mood board into the conversation as silent context. Returns null when there is no board or nothing in it. */
export function dreamContext(board: MoodBoard | null): string | null {
  if (!board) return null;
  const clean = (a: unknown): string[] => (Array.isArray(a) ? [...new Set(a.filter(Boolean).map(String))] : []);
  const vibes = clean(board.vibe), areas = clean(board.areas), housing = clean(board.housing), lifestyle = clean(board.lifestyle), aesthetic = clean(board.aesthetic);
  const caps = clean(Array.isArray(board.images) ? board.images.map((i) => i?.c) : []);
  const hasCat = areas.length || housing.length || lifestyle.length || aesthetic.length;
  if (!vibes.length && !caps.length && !hasCat) return null;
  let s = `${DREAM_CTX_PREFIX} ${board.mode || "dream"} board, use it to shape what you recommend without repeating it back: board "${board.name || "My dream home"}"`;
  if (vibes.length) s += ` · the vibe I love: ${vibes.join(", ")}`;
  if (housing.length) s += ` · home types I want: ${housing.join(", ")}`;
  if (areas.length) s += ` · neighbourhoods/settings that feel right: ${areas.join(", ")}`;
  if (lifestyle.length) s += ` · lifestyle I want: ${lifestyle.join(", ")}`;
  if (aesthetic.length) s += ` · interior aesthetic: ${aesthetic.join(", ")}`;
  if (!hasCat && caps.length) s += ` · spaces I keep pinning: ${caps.join(", ")}`;
  return `${s}. Weight neighbourhood and home-type signals for what you surface; treat aesthetic/vibe as tone, not a hard filter.]`;
}

/** Whether a message counts as something the PERSON said. Bracketed notes are written by the page, not the person. */
export const isPersonTurn = (m: { role: string; content: string }): boolean => m.role === "user" && !String(m.content || "").startsWith("[");
