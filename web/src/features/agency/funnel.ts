/**
 * The sales funnel, counted from what the database recorded: how long new leads wait for a first reply, when each lead's
 * next step is due, and the agency-wide report (how many leads get from each stage to the next, how long they sit, which
 * channels win, why deals are lost). Pure functions, so the CRM and the bell share them and the tests can call them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** The stages the table shows, in order. Lost sits outside the line: a lead can fall out of any stage. */
export const FUNNEL = ["New", "Contacted", "Viewing", "Negotiation", "Won"] as const;
const RANK: Record<string, number> = {
  new: 0, contacted: 1, qualified: 1, viewing_scheduled: 2, viewing_completed: 2, negotiating: 3, commitment: 3, closed: 4,
};
const FOLD: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Contacted", viewing_scheduled: "Viewing", viewing_completed: "Viewing",
  negotiating: "Negotiation", commitment: "Negotiation", closed: "Won", lost: "Lost",
};

/** Why a deal was lost: a short fixed list, so the report can count them. */
export const LOST_REASONS = ["Price", "Timing", "Not a fit", "No reply", "Bought elsewhere"];

/** A first reply inside five minutes is the line the CRM holds new leads to. */
export const REPLY_MINUTES = 5;

const plural = (n: number, w: string) => n + " " + w + (n === 1 ? "" : "s");
export function spanWords(mins: number): string {
  if (mins < 60) return Math.max(0, Math.round(mins)) + " min";
  if (mins < 1440) return Math.round(mins / 60) + " hr";
  return plural(Math.round(mins / 1440), "day");
}

/** How long a New lead has waited for its first reply, or null once someone has moved it on. */
export function waiting(l: any, now = Date.now()): { mins: number; text: string; urgent: boolean } | null {
  if (!l || l.stage !== "New" || !l.createdAt) return null;
  const t = new Date(l.createdAt).getTime();
  if (isNaN(t)) return null;
  const mins = Math.max(0, (now - t) / 60000);
  return { mins, text: "Waiting " + spanWords(mins), urgent: mins >= REPLY_MINUTES };
}

/** When the lead's next step is due, in the fewest words: "Overdue 2 days", "Today", "Tomorrow", "In 5 days". */
export function due(iso: string | null | undefined, now = Date.now()): { text: string; late: boolean; today: boolean } | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const day = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((day(t) - day(now)) / 864e5);
  if (t < now && days < 0) return { text: "Overdue " + plural(-days, "day"), late: true, today: false };
  if (t < now) return { text: "Due now", late: true, today: true };
  if (days === 0) return { text: "Today", late: false, today: true };
  if (days === 1) return { text: "Tomorrow", late: false, today: false };
  return { text: "In " + plural(days, "day"), late: false, today: false };
}

const median = (a: number[]) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

type Move = { lead_id: string; from_stage: string | null; to_stage: string; moved_at: string; reason?: string | null };
/* move_lead_stage writes its own history row and the 0111 trigger then writes the same move again, so one Lost move can
   arrive as two rows seconds apart. They are folded into one, keeping the reason. */
export function foldMoves(moves: Move[]): Move[] {
  const out: Move[] = [];
  const last: Record<string, Move> = {};
  moves.slice().sort((a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()).forEach((m) => {
    const p = last[m.lead_id];
    if (p && p.to_stage === m.to_stage && Math.abs(new Date(m.moved_at).getTime() - new Date(p.moved_at).getTime()) < 60000) {
      if (!p.reason && m.reason) p.reason = m.reason;
      return;
    }
    const c = { ...m };
    out.push(c);
    last[m.lead_id] = c;
  });
  return out;
}

export type Report = {
  leads: number;
  steps: { from: string; to: string; reached: number; moved: number; pct: number | null }[];
  daysIn: { stage: string; mins: number | null; n: number }[];
  reply: { mins: number | null; within: number; n: number; waitingNow: number; urgentNow: number };
  channels: { channel: string; leads: number; won: number; lost: number }[];
  lost: { reason: string; n: number }[];
  lostTotal: number;
};

/**
 * The agency-wide report. `leads` are the CRM's rows (every stage but Lost), `lost` the lost leads, `moves` every recorded
 * stage move. Each lead counts as having reached the furthest stage its history or its current stage shows.
 */
export function report(leads: any[], lost: { id: string; created_at?: string; channel: string }[], moves: Move[], now = Date.now()): Report {
  const fm = foldMoves(moves);
  const byLead: Record<string, Move[]> = {};
  fm.forEach((m) => { (byLead[m.lead_id] = byLead[m.lead_id] || []).push(m); });

  type L = { id: string; created: number | null; rank: number; channel: string; state: "won" | "lost" | "open" };
  const rows: L[] = [];
  const ts = (iso?: string | null) => { const t = iso ? new Date(iso).getTime() : NaN; return isNaN(t) ? null : t; };
  leads.forEach((l) => rows.push({ id: l.id, created: ts(l.createdAt), rank: RANK[l.dbStage] ?? 0, channel: (l.attr && l.attr.channel) || "direct", state: l.stage === "Won" ? "won" : "open" }));
  lost.forEach((l) => rows.push({ id: l.id, created: ts(l.created_at), rank: 0, channel: l.channel || "direct", state: "lost" }));
  rows.forEach((r) => (byLead[r.id] || []).forEach((m) => {
    r.rank = Math.max(r.rank, RANK[m.to_stage] ?? -1, m.from_stage ? RANK[m.from_stage] ?? -1 : -1);
  }));

  const reached = FUNNEL.map((_, k) => rows.filter((r) => r.rank >= k).length);
  const steps = FUNNEL.slice(0, -1).map((from, k) => ({
    from, to: FUNNEL[k + 1], reached: reached[k], moved: reached[k + 1],
    pct: reached[k] ? Math.round((reached[k + 1] / reached[k]) * 100) : null,
  }));

  /* Time in a stage = from arriving in it to leaving it, measured between recorded moves (the first from the lead's arrival).
     Measured from the timestamps rather than the stored seconds, which the double-written Lost move would halve. */
  const spent: Record<string, number[]> = {};
  const firstReply: number[] = [];
  rows.forEach((r) => {
    let since = r.created;
    (byLead[r.id] || []).forEach((m, i) => {
      const at = ts(m.moved_at);
      if (at == null) return;
      if (since != null && m.from_stage) {
        const mins = (at - since) / 60000;
        const st = FOLD[m.from_stage];
        if (st && st !== "Lost" && st !== "Won" && mins >= 0) (spent[st] = spent[st] || []).push(mins);
        if (i === 0 && m.from_stage === "new" && mins >= 0) firstReply.push(mins);
      }
      since = at;
    });
  });
  const daysIn = FUNNEL.slice(0, -1).map((st) => ({ stage: st, mins: median(spent[st] || []), n: (spent[st] || []).length }));

  const waits = leads.map((l) => waiting(l, now)).filter(Boolean) as { urgent: boolean }[];
  const reply = { mins: median(firstReply), within: firstReply.filter((m) => m <= REPLY_MINUTES).length, n: firstReply.length,
    waitingNow: waits.length, urgentNow: waits.filter((w) => w.urgent).length };

  const ch: Record<string, { channel: string; leads: number; won: number; lost: number }> = {};
  rows.forEach((r) => {
    const c = (ch[r.channel] = ch[r.channel] || { channel: r.channel, leads: 0, won: 0, lost: 0 });
    c.leads++; if (r.state === "won") c.won++; if (r.state === "lost") c.lost++;
  });
  const channels = Object.values(ch).sort((a, b) => b.won - a.won || b.leads - a.leads);

  /* The reason on each lost lead's latest move into Lost; a lead lost without one counts as "Not given". */
  const lostIds = new Set(lost.map((l) => l.id));
  const why: Record<string, number> = {};
  lostIds.forEach((id) => {
    const into = (byLead[id] || []).filter((m) => m.to_stage === "lost").pop();
    const k = (into && into.reason) || "Not given";
    why[k] = (why[k] || 0) + 1;
  });
  const lostRows = Object.keys(why).map((reason) => ({ reason, n: why[reason] })).sort((a, b) => b.n - a.n);

  return { leads: rows.length, steps, daysIn, reply, channels, lost: lostRows, lostTotal: lostIds.size };
}
