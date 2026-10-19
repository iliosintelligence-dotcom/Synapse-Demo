export interface MatchLike { verificationStatus?: string | null }
export interface ReplyLike {
  text?: string;
  matches?: MatchLike[];
  searched?: { live?: number } | null;
  priceHistory?: { rows?: unknown[] } | null;
  greeting?: boolean;
  failed?: boolean;
}

/**
 * Which state fits a reply? Reads what the reply actually carries, never what it hopes to seem: the shield (verified) only when a home
 * shown is verified, the empty box only when the search really found nothing.
 */
export function zynForReply(r: ReplyLike): string {
  const text = String(r.text ?? "");
  const matches = Array.isArray(r.matches) ? r.matches : [];
  if (r.greeting) return "waving";
  if (r.failed || /\b(sorry|could not|couldn[’']t|unable to|did not work)\b/i.test(text)) return "sorry";
  if (r.searched && Number(r.searched.live) === 0 && !matches.length) return "nothing";
  if (r.priceHistory?.rows?.length) return "price";
  if (matches.length) return matches.some((m) => m?.verificationStatus === "verified") ? "verified" : "home";
  if (/\?\s*$/.test(text.trim())) return "curious";
  if (/\b(alert|notify|let you know)\b/i.test(text)) return "alert";
  return "helpful";
}
