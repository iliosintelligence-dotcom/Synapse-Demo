/** Naira, short: ₦1.5M, ₦4.8M, ₦1.2B. Used on every listing card. */
export function naira(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  if (v >= 1e9) return `₦${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `₦${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
  return `₦${v.toLocaleString("en-NG")}`;
}

const PERIOD: Record<string, string> = { total: "", per_year: "/yr", per_month: "/mo", per_night: "/night" };
export const pricePeriod = (p: string | null | undefined): string => PERIOD[p ?? ""] ?? "";

/** "123456" becomes "RC 123456"; a number that already starts with letters is left as typed. */
export function cacLabel(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  return /^[a-z]/i.test(v) ? v : `RC ${v}`;
}

/** Full currency amount for the cost slip: ₦1,200,000. */
export function money(n: number | null | undefined, currency = "NGN"): string {
  if (n == null) return "";
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Number(n));
  } catch {
    return String(n);
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/** Agencies often type the city into the address line; drop a part already contained in an earlier one. */
export function joinPlace(parts: Array<string | null | undefined>): string {
  const seen: string[] = [];
  for (const raw of parts) {
    const k = String(raw ?? "").trim();
    if (!k) continue;
    const low = k.toLowerCase();
    if (seen.some((p) => p.toLowerCase().includes(low))) continue;
    seen.push(k);
  }
  return seen.join(", ");
}
