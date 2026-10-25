import { naira } from "@/lib/format";
import type { Prefs } from "./local";
import type { BrowseItem } from "./types";

/** Keyword search across title, place, deal and price. "under 150m" / "below 90" caps the price; every other word must appear. */
function matchesSearch(l: BrowseItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${l.title} ${l.loc} ${l.deal} ${naira(l.priceN)}`.toLowerCase();
  const capping = /(^|\s)(under|below|<)/.test(q);
  return q.split(/\s+/).every((term) => {
    const num = term.match(/^(?:under|below|<)?₦?(\d+)m?$/);
    if (num && capping) {
      const n = parseInt(num[1], 10);
      const cap = n * (term.includes("m") || n < 10000 ? 1e6 : 1);
      return l.priceN <= cap;
    }
    if (/^(under|below|<)$/.test(term)) return true;
    return hay.includes(term);
  });
}

export function applyFilters(items: BrowseItem[], prefs: Prefs, query: string, areaIds: Set<string> | null): BrowseItem[] {
  return items.filter(
    (l) =>
      matchesSearch(l, query) &&
      (prefs.deal === "all" || l.cats.includes(prefs.deal)) &&
      (!prefs.verifiedOnly || l.vstatus === "verified") &&
      (!areaIds || areaIds.has(l.id)),
  );
}

/** "Best match" needs match scores, which nothing produces yet, so it falls back to newest first (also how the feed is fetched). */
export function sortItems(items: BrowseItem[], sort: Prefs["sort"]): BrowseItem[] {
  const out = items.slice();
  const newest = (a: BrowseItem, b: BrowseItem) => String(b.listedAt ?? "").localeCompare(String(a.listedAt ?? ""));
  out.sort((a, b) => (sort === "price" ? a.priceN - b.priceN : sort === "trust" ? (b.score ?? 0) - (a.score ?? 0) : newest(a, b)));
  return out;
}
