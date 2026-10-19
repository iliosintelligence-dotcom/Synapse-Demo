"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRoster, type Teammate } from "../data/agents";
import {
  CHANNEL_NAME, DB_STAGES, STAGES, TEMP_LABEL, activityLine, assignLeads, bucketTasks, completeTask, deleteLeads, dueWords, fetchLeadActivity, fetchLeadTasks, fetchOpenTasks,
  filterLeads, setLeadStage, sortLeads, stageCounts, toCsv, type Activity, type SortKey, type Task,
} from "../data/crm";
import { fetchLeads, nairaShort, type Lead, type Stage } from "../data/leads";
import { queueHandoffs } from "../data/tours";
import { useToast } from "../ui/Toast";
import s from "./Crm.module.css";

const reason = (e: unknown, fb: string) => (e instanceof Error && e.message ? e.message : fb);
const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const SORTS: Array<[SortKey, string]> = [["recent", "Most recent"], ["score", "Lead score"], ["budget", "Budget"], ["stage", "Pipeline stage"], ["lead", "Name"]];
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const waHref = (p: string, text: string) => `https://wa.me/${p.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Every lead in the pipeline: who they are, what they want, where they stand, what to do next. */
export function CrmPane() {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [team, setTeam] = useState<Teammate[]>([]);
  const [failed, setFailed] = useState("");
  const [view, setView] = useState<"table" | "today">("table");
  const [stage, setStage] = useState<Stage | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [per, setPer] = useState(10);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"assign" | "message" | { stageFor: Lead } | null>(null);

  const load = useCallback(async () => {
    try { setLeads(await fetchLeads()); setFailed(""); } catch (e) { setFailed(reason(e, "please refresh")); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); fetchRoster().then(setTeam).catch(() => {}); }, [load]);

  const nameOf = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t.name])), [team]);
  const channels = useMemo(() => [...new Set((leads ?? []).map((l) => l.channel))], [leads]);
  const counts = useMemo(() => stageCounts(leads ?? []), [leads]);
  const rows = useMemo(() => sortLeads(filterLeads(leads ?? [], { stage, channel }), sortKey, sortKey === "lead" || sortKey === "stage" ? 1 : -1), [leads, stage, channel, sortKey]);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * per, cur * per);
  const open = (leads ?? []).find((l) => l.id === openId) ?? null;
  const chosen = (leads ?? []).filter((l) => picked.has(l.id));

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "synapse-pipeline.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${chosen.length} lead${chosen.length === 1 ? "" : "s"}? They will be removed from your CRM.`)) return;
    try {
      const r = await deleteLeads(chosen.map((l) => l.id));
      toast(r.deleted === r.requested ? `${r.deleted} lead${r.deleted === 1 ? "" : "s"} deleted` : `${r.deleted} of ${r.requested} deleted: ${r.error || "the rest could not be removed"}`);
      setPicked(new Set()); await load();
    } catch (e) { toast(reason(e, "Could not delete those leads"), "error"); }
  };

  if (failed) return <div className={s.blank}><b>Could not load your leads</b><p className={s.muted}>{failed}</p><button type="button" className={`${s.btn} ${s.solid}`} onClick={() => void load()}>Try again</button></div>;
  if (!leads) return <p className={s.muted} aria-busy="true">Loading your leads…</p>;

  return (
    <>
      <div className={s.tools}>
        <div className={s.seg} role="group" aria-label="View">
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
          <button type="button" aria-pressed={view === "today"} onClick={() => setView("today")}>Today</button>
        </div>
        <div className={s.seg} style={{ background: "transparent", padding: 0 }}>
          <select className={s.btn} aria-label="Source" value={channel ?? ""} onChange={(e) => { setChannel(e.target.value || null); setPage(1); }}>
            <option value="">All sources</option>
            {channels.map((c) => <option key={c} value={c}>{CHANNEL_NAME[c] ?? c}</option>)}
          </select>
          <select className={s.btn} aria-label="Sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>Sort: {l}</option>)}
          </select>
          <button type="button" className={s.btn} disabled={!rows.length} onClick={download}>Export</button>
          <button type="button" className={s.btn} onClick={() => void load()}>Refresh</button>
        </div>
      </div>

      {view === "today" ? <Today leads={leads} onOpen={(id) => { setOpenId(id); }} /> : !leads.length ? (
        <div className={`${s.card} ${s.blank}`}>
          <b>No leads yet</b>
          <p className={s.muted}>A lead lands here the moment a buyer taps Contact agent on one of your listings, with what they told Tayo, the listing they asked about, and where they came from already filled in.</p>
          <a className={`${s.btn} ${s.solid}`} href="#listings">See your listings</a>
        </div>
      ) : (
        <>
          <div className={s.funnel}>
            {STAGES.map((st) => {
              const max = Math.max(...Object.values(counts), 1);
              return (
                <button key={st} type="button" className={s.fn} aria-pressed={stage === st} onClick={() => { setStage(stage === st ? null : st); setPage(1); }}>
                  <span>{st}</span><b>{counts[st]}</b><i style={{ width: `${(counts[st] / max) * 100}%` }} />
                </button>
              );
            })}
          </div>
          <div className={s.card}>
            {!rows.length ? <div className={s.blank}><p className={s.muted}>No leads match this filter.</p></div> : (
              <div className={s.scroll}>
                <table className={s.tbl}>
                  <caption className="sr-only">Leads pipeline</caption>
                  <thead><tr><th /><th>Lead</th><th>Interested in</th><th>Stage</th><th>Next step</th><th>Heat</th><th>Last activity</th><th /></tr></thead>
                  <tbody>
                    {shown.map((l) => {
                      const want = l.property.split(" · ");
                      return (
                        <tr key={l.id} className={`${s.row} ${picked.has(l.id) ? s.sel : ""}`} onClick={() => setOpenId(l.id)}>
                          <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} /></td>
                          <td><div className={s.who}><span className={s.av}>{initialsOf(l.name)}</span><div><div className={s.nm}>{l.name}</div><div className={s.sm}>{l.agentId ? nameOf[l.agentId] ?? "Assigned" : l.phone || "No phone yet"}</div></div></div></td>
                          <td><div>{want[0]}</div><div className={s.sm}><b>{nairaShort(l.budgetMax ?? l.listPrice)}</b>{want[1] ? ` · ${want[1]}` : ""} · via {CHANNEL_NAME[l.channel] ?? l.channel}</div></td>
                          <td onClick={(e) => e.stopPropagation()}><button type="button" className={s.pill} aria-label={`Change stage for ${l.name}, currently ${l.stage}`} onClick={() => setDialog({ stageFor: l })}>{l.stage} ▾</button></td>
                          <td className={s.sm}>→ {l.nextAction}</td>
                          <td><span className={`${s.heat} ${s[l.temp] ?? ""}`}>{TEMP_LABEL[l.temp]}</span>{l.score != null && <span className={s.sm}> {l.score}</span>}{l.failed && <div className={s.fail} title={l.failReason ?? ""}>Failed</div>}</td>
                          <td className={s.sm}>{l.ageLabel}</td>
                          <td onClick={(e) => e.stopPropagation()}>{l.phone && <a className={s.btn} href={telHref(l.phone)} aria-label={`Call ${l.name}`}>Call</a>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && (
              <div className={s.pager}>
                <span>Showing <select className={s.btn} aria-label="Rows per page" value={per} onChange={(e) => { setPer(+e.target.value); setPage(1); }}>{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select> of {rows.length}</span>
                <span><button type="button" className={s.btn} disabled={cur <= 1} onClick={() => setPage(cur - 1)}>‹ Prev</button> {cur} / {pages} <button type="button" className={s.btn} disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next ›</button></span>
              </div>
            )}
          </div>
        </>
      )}

      {picked.size > 0 && (
        <div className={s.bulk} role="toolbar" aria-label="Bulk actions">
          <span>{picked.size} selected</span>
          <button type="button" className={s.btn} onClick={() => setDialog("assign")}>Assign</button>
          <button type="button" className={s.btn} onClick={() => setDialog("message")}>Message</button>
          <button type="button" className={`${s.btn} ${s.danger}`} onClick={() => void bulkDelete()}>Delete</button>
          <button type="button" className={s.btn} aria-label="Clear selection" onClick={() => setPicked(new Set())}>×</button>
        </div>
      )}

      {open && <Drawer lead={open} assignee={open.agentId ? nameOf[open.agentId] : undefined} onClose={() => setOpenId(null)} />}

      {dialog === "assign" && (
        <Modal title={`Assign ${chosen.length} lead${chosen.length === 1 ? "" : "s"}`} onClose={() => setDialog(null)}>
          {team.filter((t) => t.role === "agent" || t.role.startsWith("agency")).map((t) => (
            <button key={t.id} type="button" className={s.btn} onClick={async () => {
              try { const r = await assignLeads(chosen.map((l) => l.id), t.id); toast(`${r.updated} of ${r.requested} assigned to ${t.name}`); setDialog(null); setPicked(new Set()); await load(); } catch (e) { toast(reason(e, "Could not assign"), "error"); }
            }}>{t.name}</button>
          ))}
          <button type="button" className={s.btn} onClick={async () => { try { await assignLeads(chosen.map((l) => l.id), null); toast("Unassigned"); setDialog(null); setPicked(new Set()); await load(); } catch (e) { toast(reason(e, "Could not unassign"), "error"); } }}>Nobody (unassign)</button>
        </Modal>
      )}
      {dialog === "message" && <MessageDialog leads={chosen} onClose={() => setDialog(null)} />}
      {dialog && typeof dialog === "object" && "stageFor" in dialog && (
        <Modal title={`Move ${dialog.stageFor.name}`} onClose={() => setDialog(null)}>
          {DB_STAGES.map(([code, label]) => (
            <button key={code} type="button" className={`${s.btn} ${dialog.stageFor.dbStage === code ? s.solid : ""}`} onClick={async () => {
              try { await setLeadStage(dialog.stageFor.id, code); toast(`Moved to ${label}`); setDialog(null); await load(); } catch (e) { toast(reason(e, "Could not move that lead"), "error"); }
            }}>{label}</button>
          ))}
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={s.scrim} onClick={onClose}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <b>{title}</b>{children}<button type="button" className={s.btn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function MessageDialog({ leads, onClose }: { leads: Lead[]; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Hand off ${leads.length} lead${leads.length === 1 ? "" : "s"} to the agent`} onClose={onClose}>
      <p className={s.muted}>This goes to the agent each lead is assigned to (or the owner when nobody is), never to the buyer.</p>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)", font: "inherit" }} />
      <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy || !text.trim()} onClick={async () => {
        setBusy(true);
        try { const n = await queueHandoffs(leads.map((l) => l.id), text.trim()); toast(`Queued for ${n} lead${n === 1 ? "" : "s"} in the outbox.`); onClose(); } catch (e) { toast(reason(e, "Could not queue those messages"), "error"); setBusy(false); }
      }}>{busy ? "Queuing…" : "Queue message"}</button>
    </Modal>
  );
}

function Today({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let live = true; fetchOpenTasks().then((t) => live && setTasks(t)).catch(() => live && setFailed(true)); return () => { live = false; }; }, []);
  const who = (id?: string | null) => leads.find((l) => l.id === id)?.name ?? "";
  if (failed) return <div className={`${s.card} ${s.today}`}>Could not load your follow-ups.</div>;
  if (!tasks) return <div className={`${s.card} ${s.today}`}>Loading…</div>;
  if (!tasks.length) return <div className={`${s.card} ${s.today}`}>Nothing owed right now. Follow-ups appear here the moment a lead moves stage.</div>;
  const b = bucketTasks(tasks);
  const group = (label: string, list: Task[], late = false) => list.length > 0 && (
    <>
      <div className={`${s.th} ${late ? s.late : ""}`}>{label} · {list.length}</div>
      {list.map((t) => { const d = dueWords(t.due_at); return (
        <div key={t.id} className={s.tr} onClick={() => t.lead_id && onOpen(t.lead_id)}>
          {who(t.lead_id) && <b>{who(t.lead_id)}</b>}<span className={s.what}>{t.title || "Follow up"}</span><span className={late ? s.late : s.sm}>{d.text}</span>
        </div>
      ); })}
    </>
  );
  return <div className={`${s.card} ${s.today}`}>{group("Overdue", b.late, true)}{group("Today", b.today)}{group("Later", b.later)}</div>;
}

function Drawer({ lead: l, assignee, onClose }: { lead: Lead; assignee?: string; onClose: () => void }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [trail, setTrail] = useState<Activity[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchLeadTasks(l.id).then((t) => live && setTasks(t)).catch(() => live && setTasks([]));
    fetchLeadActivity(l.id).then((t) => live && setTrail(t)).catch(() => live && setTrail([]));
    return () => { live = false; };
  }, [l.id]);
  const done = async (id: string) => {
    try { await completeTask(id); setTasks((v) => (v ?? []).filter((t) => t.id !== id)); toast("Done"); fetchLeadActivity(l.id).then(setTrail).catch(() => {}); } catch (e) { toast(reason(e, "Could not mark that done"), "error"); }
  };
  return (
    <div className={s.scrim} onClick={onClose}>
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={l.name} onClick={(e) => e.stopPropagation()}>
        <div className={s.dh}><div><h2>{l.name}</h2><div className={s.sm}>{l.phone ? <a href={telHref(l.phone)}>{l.phone}</a> : "No phone number yet"}</div></div><button type="button" className={s.x} aria-label="Close" onClick={onClose}>×</button></div>
        <div className={s.acts}>
          <span className={`${s.heat} ${s[l.temp] ?? ""}`}>{TEMP_LABEL[l.temp]}</span><span className={s.heat}>{l.stage}</span><span className={s.heat}>{CHANNEL_NAME[l.channel] ?? l.channel}</span>
          {l.phone && <a className={s.btn} href={waHref(l.phone, `Hi ${l.name}, about ${l.property.split(" · ")[0]}`)} target="_blank" rel="noreferrer">WhatsApp</a>}
        </div>
        {l.failed && <div className={s.sec}><div className={s.k}>⚠ Not delivered</div><div>{l.failReason || "Could not notify the agency automatically."}</div></div>}
        <div className={s.sec}><div className={s.k}>✦ Next best action</div><div>{l.nextAction}</div></div>
        {l.neg && (
          <div className={s.sec}>
            <div className={s.k}>✦ Tayo already negotiated</div>
            {l.neg.offer != null && <div className={s.big}>{nairaShort(l.neg.offer)}</div>}
            {l.neg.advice && <div className={s.muted}>{l.neg.advice}</div>}
            {l.neg.draft && <div className={s.quote}>{l.neg.draft}</div>}
          </div>
        )}
        <div className={s.sec}><div className={s.k}>Assigned to</div><b>{l.agentId ? assignee ?? "A teammate" : "Nobody yet"}</b></div>
        <div className={s.sec}><div className={s.k}>Interested in</div><b>{l.property.split(" · ")[0]}</b><div className={s.sm}>{l.listPrice != null ? `Listed ${nairaShort(l.listPrice)}` : ""}{l.budgetMax != null ? ` · Budget up to ${nairaShort(l.budgetMax)}` : ""}</div></div>
        <div className={s.sec}>
          <div className={s.k}>Follow-ups</div>
          {!tasks ? <div className={s.sm}>Loading…</div> : !tasks.length ? <div className={s.sm}>Nothing outstanding on this lead.</div> : tasks.map((t) => {
            const d = dueWords(t.due_at);
            return <div key={t.id} className={s.tk}><button type="button" title="Mark done" onClick={() => void done(t.id)}>✓</button><div><div>{t.title || "Follow up"}</div>{t.description && <div className={s.sm}>{t.description}</div>}<div className={d.late ? s.late : s.sm}>{d.text}</div></div></div>;
          })}
        </div>
        <div className={s.sec}>
          <div className={s.k}>History</div>
          {!trail ? <div className={s.sm}>Loading…</div> : !trail.length ? <div className={s.sm}>Nothing recorded yet. Moving this lead will start the trail.</div> : (
            <div className={s.tl}>{trail.map((a) => { const x = activityLine(a); return <div key={a.id} className={`${s.tli} ${x.mark ? s.mark : ""}`}>{x.text}<span className={s.tlw}>{when(a.created_at)}</span></div>; })}</div>
          )}
        </div>
        <div className={s.sec}>
          <div className={s.k}>How this lead reached you</div>
          {l.unattributed ? <div className={s.sm}>No touch was recorded, so this is the lead’s own source: {CHANNEL_NAME[l.channel] ?? l.channel}.</div> : (
            <div className={s.chain}>{l.touches.map((t, i) => <div key={i}>{CHANNEL_NAME[t.channel] ?? t.channel}{t.first ? " · first touch" : ""}{t.last ? " · last touch" : ""}{t.at && <span className={s.sm}> · {when(t.at)}</span>}</div>)}</div>
          )}
        </div>
      </aside>
    </div>
  );
}
