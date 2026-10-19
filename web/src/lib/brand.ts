/** Agency brand input is typed by agencies, so every value is checked before it is used. */
export function brandHex(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : null;
}

/** Only plain http(s) addresses are ever linked; a bare domain gets https://. */
export function safeUrl(raw: string | null | undefined): string | null {
  let v = String(raw ?? "").trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : null;
  } catch {
    return null;
  }
}
