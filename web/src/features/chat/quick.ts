/**
 * Tap-to-answer buttons under a reply from Tayo. Only a CLOSED question gets them: one whose answers could be listed ("rent or buy?",
 * yes/no, how many bedrooms). The server's own suggested replies are used when the question is one they answer; an open question
 * ("what's prompting the move?") gets none, because buttons there would be guesses.
 */
export function quickAnswers(text: string, suggestions: unknown): string[] {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const m = t.match(/([^.!?]*\?)\s*$/);
  if (!m) return [];
  const ql = m[1].trim().toLowerCase();

  const open = /^(why|what|which|where|when|who|whom|whose|how|tell me|describe)\b/.test(ql) && !/ or /.test(ql) && !/^how many (bed|bedroom|bath|toilet)/.test(ql);
  if (open) return [];

  // An answer, not an action: "Alert me" is a different thing to tap.
  const good = (Array.isArray(suggestions) ? suggestions : [])
    .map((x) => String(x || "").trim())
    .filter((x) => x && x.length <= 40 && !/\?$/.test(x) && !/^alert me/i.test(x));
  if (good.length >= 2 && good.length <= 6) return good;

  if (/how many (bed|bedroom)/.test(ql)) return ["1 bedroom", "2 bedrooms", "3 bedrooms", "4 bedrooms", "5+ bedrooms"];
  if (/how many (bath|toilet)/.test(ql)) return ["1 bathroom", "2 bathrooms", "3 bathrooms", "4+ bathrooms"];
  if (/\b(rent|renting)\b/.test(ql) && /\b(buy|buying|purchase)\b/.test(ql) && / or /.test(ql)) return ["Rent", "Buy"];
  if (/^(do|does|did|are|is|am|would|will|can|could|should|have|has|shall|was|were)\b/.test(ql) && !/ or /.test(ql)) return ["Yes", "No"];
  return [];
}
