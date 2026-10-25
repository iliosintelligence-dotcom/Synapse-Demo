/**
 * LEFT FOR A COUPLE OF HOURS. For security, somebody who has been away for two hours is signed out and has to sign in again; they are not taken back to the page they
 * were on. "Away" is measured from the last time they did anything in ANY tab of this browser (a timestamp in localStorage, shared between tabs, and with the original
 * static site, which uses the same key), so a second tab left open does not keep a first one alive and a busy tab is never cut off.
 */
const IDLE_KEY = "synapse_last_active_v1";
export const IDLE_MS = 2 * 60 * 60 * 1000;

export const idleExpired = (stamp: number, now = Date.now()): boolean => stamp > 0 && now - stamp > IDLE_MS;

export function readStamp(): number {
  try { return Number(window.localStorage.getItem(IDLE_KEY)) || 0; } catch { return 0; }
}
export function writeStamp(now = Date.now()): void {
  try { window.localStorage.setItem(IDLE_KEY, String(now)); } catch { /* storage blocked: the guard simply cannot tell */ }
}
export function clearStamp(): void {
  try { window.localStorage.removeItem(IDLE_KEY); } catch { /* nothing to clear */ }
}

/** What to do on a check: leave when the stamp is stale, stamp "now" when there is none yet (a session from before this existed must not be signed out by the rollout), otherwise carry on. */
export function idleAction(stamp: number, now = Date.now()): "leave" | "stamp" | "ok" {
  if (idleExpired(stamp, now)) return "leave";
  return stamp ? "ok" : "stamp";
}
