/**
 * A price in the listing's own currency, abbreviated only when it is long: ₦165M reads naturally for a home; £0.4M does not.
 * `narrowSymbol` is what turns NGN into ₦ (without it a phone set to en-GB prints "NGN 3.2M").
 */
export function moneyShort(n: number | null | undefined, currency?: string | null): string {
  const v = Number(n) || 0;
  const code = /^[A-Za-z]{3}$/.test(currency || "") ? String(currency).toUpperCase() : "NGN";
  const fmt = (value: number, maximumFractionDigits = 0) => {
    const base = { style: "currency" as const, currency: code, maximumFractionDigits };
    try {
      return new Intl.NumberFormat(undefined, { ...base, currencyDisplay: "narrowSymbol" }).format(value);
    } catch {
      try {
        return new Intl.NumberFormat(undefined, base).format(value);
      } catch {
        return `${code} ${Math.round(value).toLocaleString()}`;
      }
    }
  };
  if (Math.abs(v) >= 1e9) return `${fmt(v / 1e9, 1)}B`;
  if (Math.abs(v) >= 1e6) return `${fmt(v / 1e6, v % 1e6 === 0 ? 0 : 1)}M`;
  return fmt(v);
}
