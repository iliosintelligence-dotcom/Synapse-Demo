/* The robot's sprout is its own picture (zyn-<state>-sprout.webp) laid over the body (zyn-<state>-body.webp), so it can sway and
   show how healthy it is. These are the stem's base in each picture, in percent of the image: the point the sprout pivots on.
   Measured from the pictures by the script that cut the sprout out (2026-11-22); redo them whenever the pictures change. */
export const SPROUT_PIVOT: Record<string, [number, number]> = {
  alert: [54.0, 14.9],
  calculating: [50.2, 14.7],
  calling: [45.2, 14.1],
  celebrating: [55.6, 14.5],
  comparing: [49.8, 13.6],
  confused: [41.8, 17.6],
  curious: [42.2, 18.6],
  delighted: [53.7, 15.5],
  documents: [46.5, 12.8],
  excited: [52.1, 14.7],
  happy: [56.5, 14.4],
  headsup: [52.3, 14.5],
  helpful: [49.6, 13.7],
  home: [34.1, 14.8],
  intro: [50.4, 17.0],
  keys: [56.4, 12.5],
  listening: [46.4, 14.5],
  loading: [49.6, 14.4],
  navigating: [45.5, 15.6],
  nearby: [58.1, 13.9],
  nothing: [49.2, 13.4],
  offer: [51.2, 13.9],
  price: [41.6, 13.9],
  proud: [49.5, 14.2],
  saving: [49.3, 14.5],
  scheduling: [41.2, 14.5],
  searching: [49.9, 17.5],
  shared: [32.6, 20.0],
  sleepy: [40.3, 22.9],
  sorry: [51.0, 15.5],
  surprised: [50.5, 13.7],
  thinking: [42.0, 20.7],
  typing: [49.4, 14.6],
  verified: [45.4, 13.7],
  waving: [53.4, 15.0],
  winking: [55.8, 14.4],
};

/** How the sprout is doing. Thriving: bright and lively; healthy; thirsty: pale, drooping a little; wilting: brown, drooping, barely moving. */
export type SproutHealth = "thriving" | "healthy" | "thirsty" | "wilting";
export const SPROUT_HEALTHS: SproutHealth[] = ["thriving", "healthy", "thirsty", "wilting"];

/** The sprout follows his mood unless a page says otherwise. */
const BY_MOOD: Record<string, SproutHealth> = {};
"excited celebrating delighted proud keys verified offer".split(" ").forEach((s) => (BY_MOOD[s] = "thriving"));
"sorry nothing confused alert headsup".split(" ").forEach((s) => (BY_MOOD[s] = "thirsty"));
BY_MOOD.sleepy = "wilting";
export function sproutHealth(state: string): SproutHealth { return BY_MOOD[state] ?? "healthy"; }
export function sproutOrigin(state: string): string { const p = SPROUT_PIVOT[state] ?? [50, 15]; return p[0] + "% " + p[1] + "%"; }
