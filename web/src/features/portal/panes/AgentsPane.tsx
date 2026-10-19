"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { initialsOf } from "../data/agency";
import {
  createInvite, fetchInvites, fetchOpenLeadCounts, fetchRoster, fetchThread, inviteLink, revokeInvite, sendTeamMessage, statusOf, validEmail,
  type Invite, type TeamMessage, type Teammate,
} from "../data/agents";
import { useIntent } from "../intent";
import { useToast } from "../ui/Toast";
import s from "./Agents.module.css";

const dash = (v: number | null) => (v == null ? "—" : String(v));
const reason = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** Your team: who is on the floor, how loaded they are, who has an invite out. */
export function AgentsPane() {
  const toast = useToast();
  const [team, setTeam] = useState<Teammate[] | null>(null);
  const [open, setOpen] = useState<Record<string, number>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sort, setSort] = useState<"name" | "open">("name");
  const [dialog, setDialog] = useState<"invite" | Teammate | null>(null);
  const [failed, setFailed] = useState(false);
  useIntent("invite", () => setDialog("invite"));

  const load = useCallback(async () => {
    try {
      const [r, o, i] = await Promise.all([fetchRoster(), fetchOpenLeadCounts().catch(() => ({})), fetchInvites().catch(() => [])]);
      setTeam(r); setOpen(o); setInvites(i); setFailed(false);
    } catch { setFailed(true); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const agents = useMemo(() => {
    const list = (team ?? []).filter((m) => m.role === "agent");
    return sort === "open" ? [...list].sort((a, b) => (open[b.id] ?? 0) - (open[a.id] ?? 0)) : list;
  }, [team, open, sort]);
  const topCloser = useMemo(() => Math.max(0, ...agents.map((a) => a.closed ?? 0)), [agents]);

  if (failed) return <div className={s.empty}><p className={s.muted}>The team could not be loaded.</p><button type="button" className={s.primary} onClick={() => void load()}>Try again</button></div>;
  if (!team) return <p className={s.muted} aria-busy="true">Loading your team…</p>;

  return (
    <>
      <div className={s.bar}>
        <div className={s.sort} role="group" aria-label="Sort agents">
          <button type="button" aria-pressed={sort === "name"} onClick={() => setSort("name")}>Name</button>
          <button type="button" aria-pressed={sort === "open"} onClick={() => setSort("open")}>Open leads</button>
        </div>
        <button type="button" className={s.primary} onClick={() => setDialog("invite")}>+ Invite agent</button>
      </div>

      {agents.length === 0 ? (
        <div className={s.empty}>
          <h2 className={s.h3}>Just you so far</h2>
          <p className={s.muted}>Invite your agents and they can take leads, post listings and appear on your page.</p>
        </div>
      ) : (
        <div className={s.grid}>
          {agents.map((a) => {
            const n = open[a.id] ?? 0;
            const st = statusOf(n);
            return (
              <article key={a.id} className={s.card}>
                <div className={s.head}>
                  <span className={s.avatar}>{a.avatar ? <img src={a.avatar} alt="" /> : initialsOf(a.name)}</span>
                  <div>
                    <div className={s.nm}>{a.name}{topCloser > 0 && a.closed === topCloser ? " ✓" : ""}</div>
                    <div className={s.meta}>{[a.years != null ? `${a.years} yrs` : "", a.areas.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || "Agent"}</div>
                  </div>
                  <span className={`${s.pill} ${st === "full" ? s.full : s.free}`}>{st === "full" ? "At capacity" : "Available"}</span>
                </div>
                <div className={s.figs}>
                  <div><b>{n}</b><span>Open</span></div>
                  <div><b>{dash(a.closed)}</b><span>Closed</span></div>
                  <div><b>{dash(a.followers)}</b><span>Followers</span></div>
                  <div><b>{dash(a.likes)}</b><span>Likes</span></div>
                </div>
                <div className={s.acts}><button type="button" className={s.ghost} onClick={() => setDialog(a)}>Message</button></div>
              </article>
            );
          })}
        </div>
      )}

      {invites.length > 0 && (
        <section className={s.invites}>
          <h2 className={s.h3}>Invites waiting</h2>
          {invites.map((i) => (
            <div key={i.id} className={s.inv}>
              <span>{i.email}</span>
              <button type="button" className={s.ghost} onClick={() => navigator.clipboard.writeText(inviteLink(i.token)).then(() => toast("Invite link copied"), () => toast("Could not copy the link", "error"))}>Copy link</button>
              <button type="button" className={s.ghost} onClick={() => revokeInvite(i.id).then(() => { setInvites((v) => v.filter((x) => x.id !== i.id)); toast("Invite revoked"); }, (e) => toast(reason(e), "error"))}>Revoke</button>
            </div>
          ))}
        </section>
      )}

      {dialog === "invite" && <InviteDialog onClose={() => setDialog(null)} onDone={(inv) => { setInvites((v) => [inv, ...v]); setDialog(null); }} />}
      {dialog && dialog !== "invite" && <ChatDialog mate={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: (i: Invite) => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) { setErr("Enter a valid email address."); return; }
    setBusy(true); setErr("");
    try {
      const inv = await createInvite(email);
      await navigator.clipboard.writeText(inviteLink(inv.token)).then(() => toast("Invite created. Link copied, send it to them."), () => toast("Invite created. Copy the link from the list."));
      onDone(inv);
    } catch (x) { setErr(reason(x)); setBusy(false); }
  };
  return (
    <div className={s.scrim} onClick={onClose}>
      <form className={s.dialog} role="dialog" aria-modal="true" aria-label="Invite an agent" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className={s.h3}>Invite an agent</h2>
        <p className={s.muted}>They get a link that expires in a few days. It only works for the address you enter.</p>
        <input type="email" autoFocus placeholder="agent@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
        {err && <div className={s.err} role="alert">{err}</div>}
        <div className={s.row}><button type="button" className={s.ghost} onClick={onClose}>Cancel</button><button type="submit" className={s.primary} disabled={busy}>{busy ? "Creating…" : "Create invite"}</button></div>
      </form>
    </div>
  );
}

function ChatDialog({ mate, onClose }: { mate: Teammate; onClose: () => void }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<TeamMessage[] | null>(null);
  const [text, setText] = useState("");
  useEffect(() => { let live = true; fetchThread(mate.id).then((m) => live && setMsgs(m)).catch((e) => live && (setMsgs([]), toast(reason(e), "error"))); return () => { live = false; }; }, [mate.id, toast]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { const m = await sendTeamMessage(mate.id, text); setMsgs((v) => [...(v ?? []), m]); setText(""); } catch (x) { toast(reason(x), "error"); }
  };
  return (
    <div className={s.scrim} onClick={onClose}>
      <form className={s.dialog} role="dialog" aria-modal="true" aria-label={`Message ${mate.name}`} onClick={(e) => e.stopPropagation()} onSubmit={send}>
        <h2 className={s.h3}>{mate.name}</h2>
        <div className={s.thread}>
          {msgs === null ? <p className={s.muted}>Loading…</p> : msgs.length === 0 ? <p className={s.muted}>No messages yet. Say hello.</p> : msgs.map((m) => <div key={m.id} className={`${s.msg} ${m.mine ? s.mine : ""}`}>{m.body}</div>)}
        </div>
        <textarea rows={2} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" />
        <div className={s.row}><button type="button" className={s.ghost} onClick={onClose}>Close</button><button type="submit" className={s.primary}>Send</button></div>
      </form>
    </div>
  );
}
