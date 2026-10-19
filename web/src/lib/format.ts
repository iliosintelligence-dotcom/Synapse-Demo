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
