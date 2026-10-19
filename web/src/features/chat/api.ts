import { accessToken, callFunction } from "@/lib/functions";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, ReplyMode, ReplyTo, TojuResponse } from "./types";

/* Everything the chat asks of the server. */

export const ASK_TIMEOUT_MS = 50_000; // a market-history search can take ~30 s

export function askTayo(body: { visitorId: string; messages: Array<{ role: string; content: string }>; listingId?: string; agencyId?: string; mode?: ReplyMode }, signal: AbortSignal) {
  return callFunction<TojuResponse>("toju-demo", body, { signal });
}

/** The server's copy of a thread, for continuing on another device, plus the live inventory count and what Tayo remembers of the brief. */
export async function restoreThread(visitorId: string) {
  const { data } = await callFunction<{ messages?: ChatMessage[]; criteria?: { brief?: string } | null; listingCount?: number }>("toju-demo", { action: "restore", visitorId });
  return { messages: Array.isArray(data.messages) ? data.messages : [], criteria: data.criteria ?? null, listingCount: Number(data.listingCount) };
}

const REPLY_SELECT = "id,title,price,price_period,currency,listing_type,city,bedrooms,bathrooms,area_sqm,latitude,longitude,verification_status,trust_score,property_media(url,display_order,media_type)";

/** The home a buyer is replying about: its photograph, where the pin goes, and whether it has been checked. Null if it is gone or unpublished (no quote). */
export async function fetchReplyListing(id: string): Promise<ReplyTo | null> {
  try {
    const { data } = await supabase.from("properties").select(REPLY_SELECT).eq("id", id).limit(1).maybeSingle();
    return (data as unknown as ReplyTo | null) ?? null;
  } catch {
    return null; // the chat still works without it
  }
}

/**
 * Opening chips built from live inventory, not invented: the city we actually have most homes in and a ceiling above a real asking price,
 * so the first thing a buyer taps can never come back "nothing fits". If the read fails the static three stay, because they name no place.
 */
export async function groundedSuggestions(): Promise<string[] | null> {
  try {
    const { data } = await supabase.from("properties").select("city,bedrooms,price,listing_type").eq("status", "live").eq("is_active", true).limit(200);
    const rows = (data ?? []) as Array<{ city: string | null; bedrooms: number | null; price: number | null }>;
    if (!rows.length) return null;
    const byCity = new Map<string, number>();
    rows.forEach((r) => r.city && byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1));
    const city = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!city) return null;
    const inCity = rows.filter((r) => r.city === city && Number(r.price) > 0);
    if (!inCity.length) return null;
    const beds = inCity.map((r) => Number(r.bedrooms)).filter((b) => b > 0).sort((a, b) => a - b)[0];
    // size the ceiling to the smallest home at that size, so a suggestion never excludes everything
    const sized = beds ? inCity.filter((r) => Number(r.bedrooms) === beds) : inCity;
    const cheapest = Math.min(...sized.map((r) => Number(r.price)));
    const ceiling = cheapest >= 1e6 ? `${Math.ceil(cheapest / 1e6 / 5) * 5}M` : `${Math.ceil(cheapest / 1e5) * 100}k`;
    return [
      beds ? `${beds}-bed in ${city} under ₦${ceiling}` : `What is available in ${city}?`,
      "What can I afford on ₦250,000 a month?",
      "What should I check before paying?",
    ];
  } catch {
    return null;
  }
}

export interface Handover {
  message: string;
  openingOffer?: number | null;
  home?: { title?: string };
  summary?: { wants?: string; budget?: string; financing?: string; timeline?: string; household?: string; position?: string; questions?: string[]; concerns?: string[]; nextStep?: string };
}

/** Tayo writes the summary and the message to the agent, from what was actually said. Nothing is sent. */
export async function prepareHandover(visitorId: string, listingId: string, messages: ChatMessage[]): Promise<Handover> {
  const { ok, data } = await callFunction<Handover & { error?: string }>("toju-demo", {
    action: "handover", visitorId, listingId, messages: messages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
  });
  if (!ok || !data.message) throw new Error(data.error || "I could not put the summary together just now.");
  return data;
}

export interface LeadResult { lead_id?: string; delivery_status?: string; email?: string; viewing?: { ok: boolean; startsAt: string }; error?: string }

/** The introduction. The lead is written before any WhatsApp is attempted, so a messaging outage costs the message and never the enquiry. 207 = saved, message not sent. */
export async function createLead(h: Handover, listingId: string, visitorId: string, slot: string | null): Promise<LeadResult> {
  const token = await accessToken();
  if (!token) throw new Error("Please sign in again to be introduced.");
  const sm = h.summary ?? {};
  const res = await callFunction<LeadResult>("create-lead", {
    property_id: listingId, source: "toju_chat", session_id: visitorId || null,
    negotiation: { offer: h.openingOffer ?? null, advice: String(sm.position ?? "").slice(0, 1000), draft: h.message, summary: sm },
    slot: slot || undefined,
  }, { token });
  if (!(res.ok || res.status === 207) || !res.data.lead_id) throw new Error(res.data.error || "That introduction did not go through.");
  // credit the channel that brought this buyer; the lead stands whether or not this succeeds
  void supabase.rpc("attribute_lead", { p_lead_id: res.data.lead_id, p_session_id: visitorId }).then(() => {}, () => {});
  return res.data;
}

/** A thumbs up or down. Sent to the team so ratings teach something; the visitor's own words are never sent, only the start of Tayo's reply. */
export function recordFeedback(replyId: string, rating: "up" | "down", excerpt: string): void {
  void fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/record_toju_feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ p_reply_id: replyId, p_rating: rating, p_excerpt: excerpt.slice(0, 300) }),
    keepalive: true,
  }).catch(() => {});
}
