"use client";
/**
 * Agents, as React (was loadAgents/renderAgents/openAgent/openAgentChat/openAssign/openInvite in src/legacy/agency/inline-3.js).
 *
 * The real roster: SynListings.roster() (agency_members + profiles + agent_profiles), agents only -- owners and admins are not
 * "on the floor" -- plus live invites as their own cards, so an invite does not vanish the moment its drawer closes. Numbers the
 * database keeps are shown; numbers it does not keep are "-", never computed from nothing. Active leads is counted off the leads
 * the portal already loaded (inline-3's `leads`, read through `window.SynLeads()`).
 *
 * inline-3 keeps the lead list, the team summary in the Ask-Tayo panel (renderAgentSummary, which reads `window.SynRoster()`),
 * the welcome after joining and accepting an invite link. Its renderAgents(), loadAgents() and openInvite() survive as names and
 * fire `syn:agents-render`, `syn:agents-load` and `syn:invite`.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { Icon } from "./VerificationPane";
import { showDrawer } from "./SideDrawer";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const first = (n: string) => String(n || "").split(" ")[0];
const initials = (n: string) => String(n || "").split(" ").map((w) => w[0]).join("").slice(0, 2);
/* "-" for absent, the number for present: `|| '-'` would turn a real 0 closed deals into a dash, a different statement. */
const agNum = (v: number | null | undefined, suffix = "") => (v == null ? "-" : v + suffix);
const leadsNow = (): any[] => (W().SynLeads && W().SynLeads()) || [];

type Agent = { id: string; nm: string; rl: string; phone?: string; avatar?: string; bio?: string; years?: number | null; areas?: string[]; specializations?: string[];
  languages?: string[]; certifications?: string[]; responseRate?: number | null; closed?: number | null; rating?: number | null; followers?: number | null; likes?: number | null;
  active: number; pending: false };
type Pending = { inviteId: string; token: string; nm: string; rl: string; pending: true };
const AG_ROLE: Record<string, string> = { agent: "Agent", agency_admin: "Admin", agency_owner: "Owner", platform_admin: "Platform admin", consumer: "Consumer" };

type State = { agents: Agent[]; pending: Pending[]; loaded: boolean; error: string | null; sort: "name" | "leads"; tick: number };
let state: State = { agents: [], pending: [], loaded: false, error: null, sort: "name", tick: 0 };
const subs = new Set<() => void>();
const set = (v: Partial<State>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useAgents = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

/* Open leads per agent, off the rows the CRM already fetched; sorted before anything reads it, so the top-performer mark, the
   cards and the Ask-Tayo summary agree on one order. Open leads descending, because sorting by workload is to find who carries it. */
function roster(s: State = state): Agent[] {
  if (!s.agents.length) return [];   // also keeps the static prerender, which has no window, off leadsNow()
  const open: Record<string, number> = {};
  leadsNow().forEach((l) => { if (l.agentId && l.stage !== "Won") open[l.agentId] = (open[l.agentId] || 0) + 1; });
  return s.agents.map((a) => ({ ...a, active: open[a.id] || 0 }))
    .sort((a, b) => (s.sort === "leads" && (b.active || 0) - (a.active || 0)) || String(a.nm || "").localeCompare(String(b.nm || "")));   // ties by name
}

function load() {
  const L = W().SynListings;
  if (!L || !L.roster) { set({ loaded: true, error: "the data layer did not load" }); return; }
  L.roster().then((people: any[]) => {
    if (L.invites) {
      L.invites().then((rows: any[]) => set({ pending: rows.map((r) => ({ inviteId: r.id, token: r.token, nm: r.email, pending: true as const, rl: r.role === "agency_admin" ? "Admin" : "Agent" })) }))
        .catch(() => {});
    }
    set({
      loaded: true, error: null,
      agents: people.filter((m) => m.role === "agent").map((m) => ({
        id: m.id, nm: m.name, rl: AG_ROLE[m.role] || m.role || "Agent", phone: m.phone, avatar: m.avatar, bio: m.bio, years: m.years, areas: m.areas,
        specializations: m.specializations, languages: m.languages, certifications: m.certifications, responseRate: m.responseRate, closed: m.closed,
        rating: m.rating, followers: m.followers, likes: m.likes, active: 0, pending: false as const,
      })),
    });
  }).catch((err: any) => {
    set({ loaded: true, error: (err && err.message) || "please refresh", agents: [] });
    console.error("roster load failed", err);
  });
}

/* ── when an agent can show ── The pool Tayo draws from. Nothing here proposes a time; it records the windows the agency has
   pre-cleared, and open_inspection_slots expands them into the concrete times a buyer sees. */
const AV_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const avTime = (t: string) => String(t || "").slice(0, 5);
type Window = { id: string; weekday: number; specific_date?: string | null; start_time: string; end_time: string; slot_minutes?: number; capacity: number };

function Availability({ a }: { a: Agent }) {
  const [rows, setRows] = useState<Window[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({ day: "6", cap: "4", from: "10:00", to: "13:00" });
  const reload = () => W().SynListings.availability(a.id).then((r: Window[]) => { setRows(r); setGone({}); }).catch(() => setFailed(true));
  useEffect(() => { if (a.id && W().SynListings && W().SynListings.availability) reload(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => {
    setGone((g) => ({ ...g, [id]: true }));
    W().SynListings.removeAvailability(id).then(() => { toast("Window removed."); reload(); })
      .catch(() => { setGone((g) => ({ ...g, [id]: false })); toast("Could not remove that."); });
  };
  const add = () => {
    if (!f.from || !f.to || f.to <= f.from) { toast("The end time has to be after the start."); return; }
    setAdding(true);
    W().SynListings.addAvailability({ agentId: a.id, weekday: +f.day, start: f.from, end: f.to, capacity: +f.cap })
      .then(() => { toast(first(a.nm) + " can now show at that time."); reload(); })
      .catch((err: any) => toast((err && err.message) || "Could not save that window."))
      .then(() => setAdding(false));
  };
  let list;
  if (failed) list = <p className="muted" style={{ fontSize: "12.5px" }}>Could not load these times.</p>;
  else if (!rows) list = <p className="muted" style={{ fontSize: "12.5px" }}>Loading…</p>;
  else if (!rows.length) list = <p className="muted" style={{ fontSize: "12.5px", margin: "0 0 4px" }}>No times set yet, so nothing can be booked with {first(a.nm)}.</p>;
  else list = rows.map((r) => {
    const when = r.specific_date ? new Date(r.specific_date).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : AV_DAYS[r.weekday] + "s";
    const perVisit = Math.max(1, Math.floor(((new Date("1970-01-01T" + r.end_time).getTime() - new Date("1970-01-01T" + r.start_time).getTime()) / 60000) / (r.slot_minutes || 60)));
    return (
      <div key={r.id} className="av-row"><div>
        <div className="av-when">{when} · {avTime(r.start_time)}–{avTime(r.end_time)}</div>
        <div className="av-meta">{perVisit} visit{perVisit === 1 ? "" : "s"} · up to {r.capacity} buyers each</div>
      </div><button className="av-del" type="button" data-av-del={r.id} aria-label="Remove this window" disabled={!!gone[r.id]} onClick={() => remove(r.id)}>×</button></div>
    );
  });
  return (
    <div className="ap-sec"><div className="k">When {first(a.nm)} can show</div>
      <p className="muted" style={{ fontSize: "11.5px", margin: "0 0 10px", lineHeight: 1.5 }}>Tayo only offers buyers a time from this list, and only buyers it has already qualified. Several can share one visit.</p>
      <div id="avList">{list}</div>
      <div className="av-add">
        <select id="avDay" aria-label="Day" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}>
          <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option>
          <option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option>
        </select>
        <select id="avCap" aria-label="Buyers per visit" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })}>
          <option value="2">2 buyers</option><option value="3">3 buyers</option><option value="4">4 buyers</option><option value="6">6 buyers</option>
        </select>
        <input id="avFrom" type="time" value={f.from} aria-label="From" onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input id="avTo" type="time" value={f.to} aria-label="To" onChange={(e) => setF({ ...f, to: e.target.value })} />
        <button className="btn btn-primary wide" id="avAdd" type="button" disabled={adding} onClick={add}>Add this window</button>
      </div>
    </div>
  );
}

const Chips = ({ list }: { list?: string[] }) => (list && list.length
  ? <div className="ag-chips">{list.map((x) => <span key={x} className="ag-chip">{x}</span>)}</div>
  : <p className="muted" style={{ fontSize: "12.5px", margin: 0 }}>Not set yet.</p>);
const Sec = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="ap-sec"><div className="k">{k}</div>{children}</div>;
function DoButtons({ a }: { a: Agent }) {
  return (
    <>
      <button className="ac-btn solid" data-msg="" onClick={(e) => { e.stopPropagation(); showDrawer(<Chat a={a} />); }}><Icon name="chat" /> Message</button>
      <button className="ac-btn ghost" data-assign="" onClick={(e) => { e.stopPropagation(); showDrawer(<Assign a={a} />); }}><Icon name="spark" /> Assign lead</button>
    </>
  );
}

/* The agent's profile: what agent_profiles actually stores. agent_daily_snapshots is empty, so no charts of a performance record
   for a named, real person. It is also the view a buyer will eventually see a version of, so it reads as a profile. */
function Profile({ a, me }: { a: Agent; me: string | null }) {
  return (
    <>
      <div className="dhead">
        <span className="av" style={{ width: "52px", height: "52px", fontSize: "16px", flex: "none" }}>{initials(a.nm)}</span>
        <div className="who"><div className="dnm">{a.nm}</div>
          <div className="rl">{a.rl}{a.years != null ? ` · ${a.years} year${a.years === 1 ? "" : "s"} experience` : ""}</div></div>
      </div>
      {/* The two things you open an agent to do, before anything you only want to read. */}
      {a.id === me ? null : <div className="ap-do"><DoButtons a={a} /></div>}
      <div className="ap-hero">
        <div><div className="v">{a.active}</div><div className="l">Active leads</div></div>
        <div><div className="v">{agNum(a.closed)}</div><div className="l">Closed · career</div></div>
        <div><div className="v">{agNum(a.followers)}</div><div className="l">Followers</div></div>
      </div>
      {/* Availability sits high: it is the other thing an owner comes here to change, and what makes this agent bookable. */}
      <Availability a={a} />
      {a.bio ? <Sec k="About"><p style={{ fontSize: "13px", lineHeight: 1.55, margin: 0 }}>{a.bio}</p></Sec> : null}
      <Sec k="Areas covered"><Chips list={a.areas} /></Sec>
      <Sec k="Specialises in"><Chips list={a.specializations} /></Sec>
      <Sec k="Speaks"><Chips list={a.languages} /></Sec>
      {a.responseRate != null ? (
        <Sec k="Response rate">
          <div className="ringwrap" dangerouslySetInnerHTML={{ __html: W().ringSVG ? W().ringSVG(a.responseRate, { size: 84, sw: 9, fs: 16 }) : "" }}></div>
          <p className="muted" style={{ fontSize: "11px", textAlign: "center", marginTop: "8px" }}>of buyer enquiries answered</p>
        </Sec>
      ) : null}
      {a.certifications && a.certifications.length ? <Sec k="Certifications"><Chips list={a.certifications} /></Sec> : null}
    </>
  );
}

/* ── message an agent, in the app ── There is no reason for an agency to leave the product to talk to its own staff, so the
   thread lives here: history above, composer pinned below. */
type Msg = { mine: boolean; body: string; at: string };
function Chat({ a }: { a: Agent }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const L = W().SynListings;
  const can = !!(L && L.thread);
  useEffect(() => {
    if (can) L.thread(a.id).then((t: any) => setMsgs(t.messages)).catch((e: any) => setErr((e && e.message) || "please try again"));
    const t = setTimeout(() => W().SynMatches?.focusUnlessTouch?.(input.current), 60);
    return () => clearTimeout(t);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (box.current && msgs && msgs.length) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setSending(true);
    L.sendTeamMessage(a.id, v)
      .then((m: Msg) => { setErr(null); setMsgs((x) => [...(x || []), m]); setText(""); })
      .catch((er: any) => toast("Not sent, " + ((er && er.message) || "please try again")))
      .then(() => { setSending(false); setTimeout(() => input.current?.focus(), 0); });
  };
  let thread;
  if (!can) thread = <div className="tm-empty">Messaging is unavailable right now.</div>;
  else if (err) thread = <div className="tm-empty">Could not load this thread, {err}</div>;
  else if (!msgs) thread = <p className="muted" style={{ fontSize: "12.5px" }}>Loading…</p>;
  else if (!msgs.length) thread = <div className="tm-empty">No messages yet. What you send lands in {first(a.nm)}’s Synapse inbox, not a personal WhatsApp.</div>;
  else thread = msgs.map((m, i) => <div key={i} className={"tm-msg " + (m.mine ? "mine" : "theirs")}><span>{m.body}</span><i>{W().agoLabel ? W().agoLabel(m.at) : ""}</i></div>);
  return (
    <>
      <div className="dhead">
        <span className="av" style={{ width: "44px", height: "44px", fontSize: "14px", flex: "none" }}>{initials(a.nm)}</span>
        <div className="who"><div className="dnm">{a.nm}</div><div className="rl">{a.rl}</div></div>
      </div>
      <div className="tm-wrap">
        <div className="tm-thread" id="tmThread" ref={box}>{thread}</div>
        <form className="tm-compose" id="tmForm" autoComplete="off" onSubmit={send}>
          <input id="tmInput" ref={input} placeholder={`Message ${first(a.nm)}…`} aria-label={`Message ${a.nm}`} maxLength={4000} value={text} disabled={sending} onChange={(e) => setText(e.target.value)} />
          <button className="tm-send" id="tmSend" type="submit" aria-label="Send" disabled={sending}><Icon name="arrow-right" /></button>
        </form>
      </div>
    </>
  );
}

/* ── assign a lead ── The agency's open leads with who currently holds each, assigned on tap. The rows are the same `leads` the
   portal already loaded, so there is no second source to disagree with the CRM. */
function Assign({ a }: { a: Agent }) {
  const [row, setRow] = useState<Record<string, "busy" | "done" | "fail">>({});
  const open = leadsNow().filter((l) => l.stage !== "Won");
  const holder = (l: any) => (l.agentId ? (W().SynRosterName && W().SynRosterName(l.agentId)) || "Someone else" : "Unassigned");
  const assign = (l: any) => {
    setRow((r) => ({ ...r, [l.id]: "busy" }));
    W().SynListings.assignLeads([l.id], a.id)
      .then(() => {
        l.agentId = a.id;   // the portal's own lead row, so the CRM and the roster's Active leads agree with this drawer
        setRow((r) => ({ ...r, [l.id]: "done" }));
        set({ tick: state.tick + 1 });
        if (typeof W().renderCrm === "function") W().renderCrm();
        toast(first(a.nm) + " now has this lead.");
      })
      .catch((err: any) => { setRow((r) => ({ ...r, [l.id]: "fail" })); toast((err && err.message) || "Could not assign that lead."); });
  };
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Assign a lead</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 16px" }}>To {a.nm}. Tap a lead to move it, whoever holds it now is shown under each one.</p>
      <div id="asgList">
        {open.length ? open.map((l) => {
          const st = row[l.id];
          const mine = l.agentId === a.id;
          return (
            <button key={l.id} className="asg" type="button" data-lead={l.id} disabled={mine || st === "busy"} onClick={() => assign(l)}>
              <span className="asg-l"><b>{l.nm}</b><i>{l.pr}</i></span>
              <span className={"asg-r" + (mine ? " on" : "")}>{st === "busy" ? "Assigning…" : st === "fail" && !mine ? "Could not assign" : mine ? "Already theirs" : holder(l)}</span>
            </button>
          );
        }) : <div className="tm-empty">No open leads to assign yet.</div>}
      </div>
    </>
  );
}

/* ── Invite a teammate ── The link is the deliverable, since Synapse cannot email it out yet: only the address invited can use it,
   and it lasts 14 days. */
function Invite() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ email: string; url: string } | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const link = useRef<HTMLDivElement>(null);
  useEffect(() => { field.current?.focus(); }, []);
  const v = email.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  /* Shown only once something has been typed: an empty field is not yet wrong. */
  const showing = !!(v && !ok);
  const send = () => {
    if (!ok) return;
    setBusy(true);
    W().SynListings.createInvite(v, role)
      .then((inv: any) => { setMade({ email: inv.email, url: location.origin + location.pathname + "?invite=" + inv.token }); load(); })
      .catch((err: any) => { setBusy(false); toast((err && err.message) || "Could not create that invite."); });
  };
  const copy = () => {
    if (!made) return;
    /* Clipboard access can be refused; selecting the text means the agency can still copy it by hand. */
    const selectLink = () => {
      const rng = document.createRange(); rng.selectNodeContents(link.current!);
      const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(rng);
      toast("Select and copy the link above.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(made.url).then(() => toast("Link copied, send it to " + made.email + ".")).catch(selectLink);
    else selectLink();
  };
  if (made) return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Invite ready</div>
      <p className="muted" style={{ fontSize: "12.5px", margin: "8px 0 14px", lineHeight: 1.55 }}>Send this to <b>{made.email}</b>. Only that address can use it, and it expires in 14 days.</p>
      <div className="inv-link" id="invLink" ref={link}>{made.url}</div>
      <button className="btn btn-primary btn-block" id="invCopy" style={{ marginTop: "12px" }} onClick={copy}>Copy link</button>
    </>
  );
  return (
    <>
      <div style={{ fontSize: "19px", fontWeight: 700 }}>Invite a teammate</div>
      <p className="muted" style={{ fontSize: "12px", margin: "6px 0 18px" }}>You&apos;ll get a link to send them yourself — we can&apos;t email it out yet. Only the address you invite can use it, and it lasts 14 days.</p>
      <div className="inv">
        <div className="field"><label htmlFor="invEmail">Work email</label>
          <input type="email" id="invEmail" ref={field} placeholder="name@agency.com" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={showing ? true : undefined} aria-describedby={showing ? "invErr" : undefined} />
          <span className="err" id="invErr" role="alert" style={{ display: showing ? "block" : "none" }}>⚠ Enter a valid email address</span></div>
        <div className="field"><label htmlFor="invRole">Role</label>
          <select id="invRole" value={role} onChange={(e) => setRole(e.target.value)}><option value="agent">Agent — works leads and shows homes</option><option value="agency_admin">Admin — can also invite and manage</option></select></div>
        <button className="send" id="invSend" disabled={!ok || busy} aria-disabled={!ok} onClick={send}>{busy ? "Creating…" : "Send invite"}</button>
      </div>
    </>
  );
}
export const openInvite = () => showDrawer(<Invite />);

function inviteLink(token: string) {
  const url = location.origin + location.pathname + "?invite=" + token;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => toast("Invite link copied.")).catch(() => toast(url));
  else toast(url);
}

function PendingCard({ a, i }: { a: Pending; i: number }) {
  const [revoking, setRevoking] = useState(false);
  const revoke = (e: React.MouseEvent) => {
    e.stopPropagation(); setRevoking(true);
    W().SynListings.revokeInvite(a.inviteId).then(() => { setRevoking(false); toast("Invite revoked, that link no longer works."); load(); })
      .catch(() => { setRevoking(false); toast("Could not revoke that."); });
  };
  return (
    <div className="card acard pending enter" style={{ animationDelay: i * 45 + "ms" }}>
      <div className="ac-cover"><span className="ac-dot me">Invited</span></div>
      <div className="ac-body">
        <div className="ac-face">{initials(a.nm)}</div>
        <div className="ac-nm" style={{ wordBreak: "break-all" }}>{a.nm}</div>
        <div className="ac-rl">{a.rl} · hasn&apos;t joined yet</div>
        <div className="ac-acts">
          <button className="ac-btn solid" data-inv-copy={a.token} onClick={(e) => { e.stopPropagation(); inviteLink(a.token); }}><Icon name="share" /> Copy link</button>
          <button className="ac-btn ghost" data-inv-revoke={a.inviteId} disabled={revoking} onClick={revoke}>Revoke</button>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ a, i, me, top }: { a: Agent; i: number; me: string | null; top: boolean }) {
  const busy = a.active >= 10;
  const isMe = a.id === me;
  const open = () => showDrawer(<Profile a={a} me={me} />);
  /* Only figures the database actually holds. Followers and likes are counted rows; no stars anywhere. */
  const figs: [string | number, string][] = [[a.active, "active"], [agNum(a.closed), "closed"], [agNum(a.followers), "followers"], [agNum(a.likes), "likes"]];
  return (
    <div className="card acard enter" role="button" tabIndex={0} data-agent={i} aria-label={`Open ${a.nm}'s profile, ${a.rl}`} style={{ animationDelay: i * 45 + "ms" }}
      onClick={open} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }}>
      <div className="ac-cover">
        {a.avatar ? <img src={a.avatar} alt="" loading="lazy" /> : null}
        <span className={"ac-dot " + (isMe ? "me" : busy ? "busy" : "free")}>{isMe ? "You" : busy ? "At capacity" : "Available"}</span>
      </div>
      <div className="ac-body">
        <div className="ac-face">{a.avatar ? <img src={a.avatar} alt="" loading="lazy" /> : initials(a.nm)}</div>
        <div className="ac-nm">{a.nm}{top ? <span className="ac-vf" title="Most deals closed on this team">✓</span> : null}</div>
        <div className="ac-rl">{a.rl}{a.years != null ? ` · ${a.years} yr${a.years === 1 ? "" : "s"}` : ""}{a.areas && a.areas.length ? " · " + a.areas.join(", ") : ""}</div>
        {isMe ? (
          <div className="ac-acts"><button className="ac-btn solid" data-myprofile="" onClick={(e) => { e.stopPropagation(); W().openMyProfile(); }}><Icon name="user" /> {a.bio ? "Edit my profile" : "Complete your profile"}</button></div>
        ) : <div className="ac-acts"><DoButtons a={a} /></div>}
        <div className="ac-figs">{figs.map(([v, l]) => <div key={l} className="ac-fig"><span className="ac-v">{v}</span><span className="ac-l">{l}</span></div>)}</div>
      </div>
    </div>
  );
}

export function AgentsPane() {
  const s = useAgents();
  const scripts = usePageScripts();
  const [me, setMe] = useState<string | null>(null);
  const list = roster(s);

  useEffect(() => {
    const render = () => set({ tick: state.tick + 1 });
    const invite = () => openInvite();
    window.addEventListener("syn:agents-render", render);
    window.addEventListener("syn:agents-load", load);
    window.addEventListener("syn:invite", invite);
    W().SynRoster = () => roster();
    return () => {
      window.removeEventListener("syn:agents-render", render);
      window.removeEventListener("syn:agents-load", load);
      window.removeEventListener("syn:invite", invite);
    };
  }, []);
  useEffect(() => {
    if (!scripts) return;
    load();
    /* Your own profile id, so the roster can tell you apart from your team. A card that cannot tell shows the ordinary actions,
       which is the safe way to be wrong. */
    W().SynAuth?.client?.().then((c: any) => c.auth.getSession())
      .then((r: any) => setMe((r && r.data && r.data.session && r.data.session.user && r.data.session.user.id) || null)).catch(() => {});
  }, [scripts]);
  /* The team summary in the Ask-Tayo panel is drawn from the same roster, so it follows every change here. */
  useEffect(() => { try { W().renderAgentSummary?.(); } catch { /* the panel is not open */ } });

  /* Ranked on closed deals alone. Only agents with a recorded count can top the list: no number is unranked, not last. */
  const ranked = list.filter((a) => a.closed != null);
  const top = ranked.length ? ranked.reduce((b, a) => (a.closed! > b.closed! ? a : b), ranked[0]) : null;
  let grid;
  if (!s.loaded) grid = <p className="muted" style={{ fontSize: "13px" }}>Loading your team…</p>;
  else if (s.error) grid = <div className="ov-blank"><b>Could not load your team</b><p>{s.error}</p></div>;
  /* Pending invites count as team: an agency whose first invite nobody has accepted yet must still see that invite. */
  else if (!list.length && !s.pending.length) grid = (
    <div className="ov-blank"><span className="ov-blank-i"><Icon name="user" /></span><b>Just you so far</b>
      <p>Invite your agents and Synapse routes leads to them, tracks who closes what, and builds the performance read on this page from their real numbers.</p>
      <button className="btn btn-primary" type="button" data-ag-invite="" onClick={openInvite}>+ Invite an agent</button></div>
  );
  else grid = [
    ...list.map((a, i) => <AgentCard key={a.id} a={a} i={i} me={me} top={a === top} />),
    ...s.pending.map((a, j) => <PendingCard key={a.inviteId} a={a} i={list.length + j} />),
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" data-agency-eyebrow="">Your team</div>
          <div className="h1">Agents</div>
          <p className="muted" style={{ fontSize: "14px", marginTop: "4px" }}>Who&apos;s on the floor, and how they&apos;re performing.</p>
        </div>
        <button className="btn btn-primary" id="inviteAgentBtn" onClick={openInvite}>+ Invite agent</button>
      </div>
      <div className="crm-tools" data-pane-filters="">
        <div className="crm-tools-l">
          <div className="seg" id="agentSort">
            <button className={"seg-b" + (s.sort === "name" ? " on" : "")} data-as="name" onClick={() => set({ sort: "name" })}>Name</button>
            <button className={"seg-b" + (s.sort === "leads" ? " on" : "")} data-as="leads" onClick={() => set({ sort: "leads" })}>Open leads</button>
          </div>
        </div>
      </div>
      <div className="agrid" id="agrid">{grid}</div>
    </>
  );
}
