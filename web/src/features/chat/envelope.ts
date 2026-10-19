import type { TojuResponse } from "./types";

/**
 * The function is meant to return its fields at the top level, but when its own parse fails it passes the raw model text straight through,
 * and the buyer would see a screenful of {"reply": …} on the main product surface. This unwraps it so a server-side parse miss can never
 * surface as raw JSON. Mutates the response in place so every later reader (reply, matches, suggestions) sees the unwrapped values.
 */
const ENVELOPE_KEYS = /"(showMatches|criteria|suggestions|matches)"\s*:/;

/**
 * Prose followed by a tail of JSON the model appended AFTER it. Matching on the envelope's own key names rather than on any `{` keeps a
 * sentence that legitimately contains a brace intact. The prose is kept; a tail that parses and carries matches or suggestions has them
 * lifted out rather than thrown away.
 */
function splitTrailingEnvelope(data: TojuResponse): boolean {
  const text = data.reply ?? "";
  let at = -1;
  for (let i = text.indexOf("{"); i !== -1; i = text.indexOf("{", i + 1)) if (ENVELOPE_KEYS.test(text.slice(i, i + 400))) at = i;
  if (at <= 0) return false;
  const prose = text.slice(0, at).trim();
  if (!prose) return false; // nothing left to say: leave it alone
  data.reply = prose;
  try {
    const inner = JSON.parse(text.slice(at));
    if ((!Array.isArray(data.matches) || !data.matches.length) && Array.isArray(inner.matches)) data.matches = inner.matches;
    if ((!Array.isArray(data.suggestions) || !(data.suggestions as unknown[]).length) && Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
  } catch {
    /* the prose is already saved; the rest is not worth salvaging */
  }
  return true;
}

export function unwrapEnvelope(data: TojuResponse): void {
  if (typeof data.reply !== "string") return;
  let raw = data.reply.trim();
  if (!raw.startsWith("{") && !raw.startsWith("```")) {
    if (ENVELOPE_KEYS.test(raw)) splitTrailingEnvelope(data);
    return;
  }
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  if (!raw.startsWith("{")) return;
  let inner: { reply?: unknown; matches?: unknown; suggestions?: unknown };
  try {
    inner = JSON.parse(raw);
  } catch {
    // A strict parse is not enough: salvage just the reply string, which is the only part the reader needs. Never show the envelope itself.
    const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    let said = "";
    if (m) {
      try { said = JSON.parse(`"${m[1]}"`); } catch { said = ""; }
    }
    data.reply = said;
    return;
  }
  if (!inner || typeof inner.reply !== "string") {
    data.reply = "";
    return;
  }
  data.reply = inner.reply;
  if ((!Array.isArray(data.matches) || !data.matches.length) && Array.isArray(inner.matches)) data.matches = inner.matches as TojuResponse["matches"];
  if ((!Array.isArray(data.suggestions) || !(data.suggestions as unknown[]).length) && Array.isArray(inner.suggestions)) data.suggestions = inner.suggestions;
}
