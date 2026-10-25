"use client";
/**
 * Tours, as React (was renderTours/loadTours in src/legacy/agency/inline-3.js). Upcoming group inspections. The agency confirms
 * a slot it has already pre-cleared -- accept or adjust, not open-ended scheduling -- and can see exactly who is coming.
 *
 * Headcount is deliberately split into "booked" and "confirmed": someone who has not answered the reconfirmation is not a body
 * at the door, and the whole point of reconfirming is that the agent learns that in advance rather than standing outside a house.
 *
 * portalShell's loadTours() survives as a name (goToPane calls it) and fires `syn:tours-load`. The filter row keeps its
 * data-pane-filters, so the phone dock can still lend it to its sheet; React only changes its classes.
 */
import { useEffect, useState } from "react";
import { Icon } from "./VerificationPane";
import { useRevealed } from "./useRevealed";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);

type Person = { id: string; leadId?: string; name: string; status: string };
type Tour = { id: string; at: string; status: string; property: string; city?: string; agent: string; capacity: number; confirmed: number; people: Person[] };

const TOUR_ST: Record<string, string> = { open: "Needs confirming", confirmed: "Confirmed", completed: "Done", cancelled: "Cancelled" };
const FILTERS: [string, string][] = [["all", "All"], ["open", "Needs confirming"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]];

function tourWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
/* Reconfirmation is due inside 48h, the window where an accurate headcount still changes what the agent does with their day. */
const tourDueSoon = (iso: string) => {
  const h = (new Date(iso).getTime() - Date.now()) / 36e5;
  return h > 0 && h <= 48;
};
const n = (k: number, one: string, many: string) => k + " " + (k === 1 ? one : many);

/* A button that says what it is doing while its call is out, and comes back if the call fails. */
function Act({ cls, label, busyLabel, run, ...data }: { cls: string; label: string; busyLabel?: string; run: () => Promise<unknown> | void } & Record<string, any>) {
  const [busy, setBusy] = useState(false);
  const click = () => {
    const p = run();
    if (!p) return;
    setBusy(true);
    p.then((ok) => { if (!ok) setBusy(false); });
  };
  return <button className={cls} disabled={busy} onClick={click} {...data}>{busy && busyLabel ? busyLabel : label}</button>;
}

function TourCard({ t, reload }: { t: Tour; reload: () => void }) {
  const soon = tourDueSoon(t.at);
  const dead = t.status === "cancelled";
  const el = useRevealed("card tour" + (dead ? " is-cancelled" : ""));   // cancelling must not cost it motion.js's .in
  const L = () => W().SynListings;
  /* Each returns a promise that resolves true when the button should stay spent, false when it should come back. */
  const confirm = () => L().setSlotStatus(t.id, "confirmed")
    .then(() => { toast("Tour confirmed — everyone booked in will be told."); reload(); return true; })
    .catch(() => { toast("Could not confirm that."); return false; });
  /* One call: the slot, its attendance rows and the affected leads move together, and anyone whose only tour this was goes back
     to `qualified` so they can be offered a new time. */
  const cancel = () => L().cancelTour(t.id)
    .then((res: any) => {
      toast("Tour cancelled, " + n(res.affected, "buyer", "buyers") + " affected" + (res.leadsReset ? ", " + res.leadsReset + " back in the pipeline" : "") + ".");
      reload(); return true;
    })
    .catch(() => { toast("Could not cancel that."); return false; });
  /* The pathway back. Cancelling already returned these buyers to `qualified`; this tells them so, through the same outbox every
     other message to a buyer uses. */
  const rebook = () => {
    const leadIds = t.people.map((p) => p.leadId).filter(Boolean);
    if (!leadIds.length) { toast("These buyers have no lead to message on."); return; }
    return L().queueMessages(leadIds, "The viewing you booked has been cancelled, and we are sorry for the change. "
      + "New times are open on the listing now, you can pick one that suits you.")
      .then((res: any) => { toast("Queued for " + n(res.queued, "buyer", "buyers") + " in the outbox."); return true; })
      .catch((err: any) => { toast((err && err.message) || "Could not queue that."); return false; });
  };
  /* A real state change on each attendance row: everyone still unanswered is put back to `requested`, so the headcount stops
     counting them as confirmed until they say yes. */
  const remind = () => {
    const pending = t.people.filter((p) => p.status !== "confirmed");
    if (!pending.length) { toast("Everyone has already confirmed."); return; }
    return Promise.all(pending.map((p) => L().setViewingStatus(p.id, "requested")))
      .then(() => { toast("Asked " + n(pending.length, "buyer", "buyers") + " to reconfirm."); reload(); return true; })
      .catch(() => { toast("Could not send that."); return false; });
  };

  return (
    <div ref={el} className={"card tour" + (dead ? " is-cancelled" : "")}>
      <div className="tour-top"><div>
        <div className="tour-when">{tourWhen(t.at)}</div>
        <div className="tour-what">{t.property}{t.city ? " · " + t.city : ""} · {t.agent}</div>
      </div>
      <span className={"tour-state " + t.status}>{TOUR_ST[t.status] || t.status}</span>
      </div>
      <div className="tour-count"><b>{t.people.length}</b>
        {dead ? <span>had booked · this tour was cancelled</span>
          : <span>booked of {t.capacity} · <b style={{ font: "inherit", color: "inherit" }}>{t.confirmed}</b> confirmed</span>}
      </div>
      {t.people.length ? (
        <div className="tour-people">{t.people.map((p) => {
          const yes = p.status === "confirmed";
          return <span key={p.id} className={"tour-person " + (yes ? "yes" : "no")}><i>{yes ? "✓" : "○"}</i>{p.name}</span>;
        })}</div>
      ) : null}
      {dead ? (t.people.length ? (
        <div className="tour-acts"><Act cls="tour-btn solid" data-tour-rebook={t.id} label={"Invite " + t.people.length + " back to pick a new time"} busyLabel="Inviting…" run={rebook} /></div>
      ) : null) : (
        <div className="tour-acts">
          {t.status === "open" ? <Act cls="tour-btn solid" data-tour-confirm={t.id} label="Confirm this tour" busyLabel="Confirming…" run={confirm} /> : null}
          {soon ? <Act cls="tour-btn" data-tour-remind={t.id} label="Ask everyone to reconfirm" busyLabel="Asking…" run={remind} /> : null}
          <Act cls="tour-btn" data-tour-cancel={t.id} label="Cancel" run={cancel} />
        </div>
      )}
    </div>
  );
}

export function ToursPane() {
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [gen, setGen] = useState(0);   // every load draws fresh cards, as the old innerHTML did
  const load = () => {
    const L = W().SynListings;
    if (!L || !L.tours) return;
    L.tours(45).then((rows: Tour[]) => { setTours(rows); setErr(null); setGen((g) => g + 1); })
      .catch((e: any) => setErr((e && e.message) || "please refresh"));
  };
  useEffect(() => {
    window.addEventListener("syn:tours-load", load);
    return () => window.removeEventListener("syn:tours-load", load);
  }, []);

  let list;
  if (err) list = <div className="ov-blank"><b>Could not load tours</b><p>{err}</p></div>;
  else if (!tours) list = <p className="muted" style={{ fontSize: "13px" }}>Loading…</p>;
  else if (!tours.length) {
    list = (
      <div className="ov-blank"><span className="ov-blank-i"><Icon name="calendar" /></span><b>No tours booked yet</b>
        <p>Set when an agent can show {"—"} open their profile on the Agents page {"—"} and Tayo offers those times to buyers it has already
          qualified. Several buyers on one visit means one trip, not four.</p></div>
    );
  } else {
    const rows = filter === "all" ? tours : tours.filter((t) => t.status === filter);
    list = rows.length ? rows.map((t) => <TourCard key={t.id + ":" + gen} t={t} reload={load} />)
      : <div className="ov-blank"><b>Nothing at that status</b><p>No tour is {(TOUR_ST[filter] || filter).toLowerCase()} right now.</p></div>;
  }

  return (
    <>
      <div className="eyebrow" data-agency-eyebrow="">Your team</div>
      <div className="h1">Tours</div>
      <p className="muted" style={{ fontSize: "14px", marginTop: "4px" }}>One trip, several buyers. Tayo only ever offers times your agents have already cleared.</p>
      <div className="crm-tools" data-pane-filters="" style={{ marginTop: "18px" }}>
        <div className="crm-tools-l">
          <div className="seg" id="tourFilter">
            {FILTERS.map(([k, label]) => <button key={k} className={"seg-b" + (filter === k ? " on" : "")} data-tf={k} onClick={() => setFilter(k)}>{label}</button>)}
          </div>
        </div>
      </div>
      <div id="toursList">{list}</div>
    </>
  );
}
