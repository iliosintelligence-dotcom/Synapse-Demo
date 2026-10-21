import { supabase } from "@/lib/supabase";
import { agencyId } from "./agency";

/**
 * Instagram captions never linkify, so a listing posted there ends at a dead end. Meta allows ONE private message to somebody who commented, and it may carry a
 * link: the only route off an Instagram caption there is. It sends in the agency's name to somebody who has never used Synapse, so it is OFF until an owner or
 * admin says otherwise, and the exact message is on screen before it can ever go anywhere.
 */
export interface ReplySettings { agency_id?: string; enabled: boolean; keyword: string; message: string }
export const DEFAULT_REPLY: ReplySettings = { enabled: false, keyword: "PRICE", message: "" };

/** A missing row means OFF, and so does a row that exists: nobody is enrolled by the row appearing. */
export async function fetchReplySettings(): Promise<ReplySettings> {
  const aid = await agencyId();
  if (!aid) return DEFAULT_REPLY;
  const r = await supabase.from("social_reply_settings").select("agency_id, enabled, keyword, message, updated_at").eq("agency_id", aid).limit(1);
  if (r.error) throw r.error;
  const row = r.data?.[0] as ReplySettings | undefined;
  return row ? { agency_id: row.agency_id, enabled: !!row.enabled, keyword: row.keyword || "PRICE", message: row.message || "" } : DEFAULT_REPLY;
}

/** Upsert, because the row may not exist yet and "turn it on" should not fail for an agency that has never opened this screen. RLS restricts the write to owner and admin. */
export async function saveReplySettings(s: { enabled: boolean; keyword: string; message: string }): Promise<void> {
  const aid = await agencyId();
  if (!aid) throw new Error("No agency on this account");
  const me = (await supabase.auth.getUser()).data.user?.id ?? null;
  const r = await supabase.from("social_reply_settings").upsert({ agency_id: aid, enabled: s.enabled, keyword: s.keyword.trim(), message: s.message, updated_at: new Date().toISOString(), updated_by: me }, { onConflict: "agency_id" });
  if (r.error) throw r.error;
}

export const LINK_STAND_IN = "synapsecore.dev/s/…";
/**
 * What the person who commented will actually receive, so nobody is surprised by what went into somebody's inbox: the link when the template leaves {{link}}
 * out, and the automated notice when the wording does not already say so.
 */
export function replyPreview(message: string): string {
  let text = String(message || "").replace(/\{\{\s*link\s*\}\}/g, LINK_STAND_IN);
  if (!text.includes(LINK_STAND_IN)) text = `${text.trim()}\n\n${LINK_STAND_IN}`;
  if (!/automat|bot\b|auto-?reply/i.test(text)) text += "\n\n(Automated reply, say anything here and a real person will see it.)";
  return text;
}

export const validKeyword = (k: string): boolean => k.trim().length > 0 && k.trim().length <= 24;
