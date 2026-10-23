"use client";
/**
 * Contact Synapse, as React (was the relationship-manager block of src/legacy/agency/inline-3.js): the phone button in the top
 * bar and its panel. inline-3's toggleRm(open, plan) survives as a name (the bell, the pricing cards and closeAgencyPopups call
 * it) and fires `syn:rm-toggle`; a pricing card passes the plan's name, and the panel then leads with an email about that plan.
 *
 * Call your relationship manager. Three states, and none of them invents a number:
 *   unassigned              -> say so, and give the Synapse line
 *   assigned, no number     -> name them, say we have no number on file, give the Synapse line
 *   assigned, with number   -> a tel: link
 * tel: rather than anything platform-mediated: Twilio is not configured, so Synapse cannot place or route a call, and a dialler
 * link needs no provider at all. my_relationship_manager() is SECURITY DEFINER (the manager is Synapse staff), scopes itself with
 * is_agency_member() and LEFT JOINs, so an unassigned agency gets a row of nulls. No agency has a manager assigned today;
 * assigning one is a single UPDATE on agencies.relationship_manager_id and this panel changes with no code.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

const RM_EMAIL = "ilios.intelligence@gmail.com";   // already public in terms.html and privacy.html
/* The general Synapse line. Every agency can reach a human by phone whether or not one has been assigned to them by name. A
   named manager replaces this number when there is one; it never replaces the ability to call. */
const SYN_PHONE = "+2348155136506";
/* Writing in is the top tier's channel (the pricing table's "Dedicated desk" row); the others get the phone, which is faster.
   Enum lives in the database as subscription_tier. */
const TOP_TIER = "market_leader";

type Rm = { assigned?: boolean; name?: string; phone?: string; hours?: string };
type Info = { rm: Rm; name: string | null; tier: string | null };

type State = { open: boolean; plan: string | null };
let state: State = { open: false, plan: null };
const subs = new Set<() => void>();
const set = (v: Partial<State>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useRmState = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

/** Opens or closes the panel. Opening closes the bell; closing forgets the plan. */
function toggle(open?: boolean, plan?: string | null) {
  const on = open === undefined ? !state.open : open;
  if (on) { try { W().toggleNoti?.(false); } catch { /* not ready */ } }
  set({ open: on, plan: on ? plan || null : null });
}

export function RmButton() {
  const { open } = useRmState();
  return (
    <button className="bell" id="rmBtn" type="button" aria-label="Contact Synapse" aria-haspopup="dialog" aria-expanded={open} onClick={() => toggle(undefined, null)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    </button>
  );
}

/** A button that puts the value on the clipboard, with the value shown in full beside it. Sits under every mailto:/tel: so the
 *  panel always has an affordance that cannot fail quietly. */
function CopyRow({ value }: { value: string }) {
  const [tag, setTag] = useState("Copy");
  const span = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const said = (word: string) => {
    setTag(word);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTag("Copy"), 2400);
  };
  /* Last resort: put the value under the caret ourselves and name the keystroke, rather than telling someone to "copy it
     manually" and leaving them to do the selecting. */
  const selectIt = () => {
    try {
      const range = document.createRange(); range.selectNodeContents(span.current!);
      const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
      said(/Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘C" : "Ctrl+C");
    } catch { said("Select it"); }
  };
  /* execCommand is the fallback rather than the primary: the async clipboard API needs a secure context, and a webview may still
     refuse it. If both fail the value is selected for them rather than leaving them thinking it worked. */
  const legacy = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:-9999px";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) said("Copied"); else selectIt();
    } catch { selectIt(); }
  };
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(() => said("Copied")).catch(legacy);
    else legacy();
  };
  return (
    <button type="button" className="rm-copy" data-copy={value} onClick={copy}>
      <span className="rm-copy-v" ref={span}>{value}</span>
      <span className="rm-copy-a">{tag}</span>
    </button>
  );
}

/* tel: wants the number without punctuation; the copy row keeps it. */
const Tel = ({ number, label }: { number: string; label: string }) => (
  <>
    <a className="rm-call" href={"tel:" + String(number).replace(/[^\d+]/g, "")}>{label}</a>
    <CopyRow value={number} />
  </>
);

const mailto = (subject: string, body: string[]) => "mailto:" + RM_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body.join("\n"));

/* The written route, for the tier that has it. Prefilled, because "email us" with an empty body gets back a sentence with none
   of what anyone needs to act on it. Blank lines, not example values: a template someone has to delete is worse than one they
   fill in. */
const Mail = ({ agency }: { agency: string | null }) => (
  <>
    <a className="rm-mail" href={mailto("Synapse support" + (agency ? " — " + agency : ""), [
      agency ? "Agency: " + agency : "Agency:", "", "Best number to call you back:", "Listing (name, or its SYN- reference):", "What you need:", "", "",
      "— sent from the Synapse agency portal"])}>Email Synapse instead</a>
    <CopyRow value={RM_EMAIL} />
  </>
);

/* Set when a pricing card opened the panel: an email about that plan leads, for every tier -- a sales conversation is not the
   top tier's support desk. */
const PlanMail = ({ plan, agency }: { plan: string; agency: string | null }) => (
  <>
    <div className="rm-role">{plan} plan</div>
    <div className="rm-none">{plan === "Enterprise"
      ? "Enterprise terms are agreed with you: a monthly fee, per project, or a commission on closed deals."
      : plan === "Free" ? "Tell us and we will move you to Free at the end of your paid period."
      : "Tell us about your agency and we will set it up with you."}</div>
    <a className="rm-mail" href={mailto(plan + " plan" + (agency ? " — " + agency : ""), [
      agency ? "Agency: " + agency : "Agency:", "Plan: " + plan, "", "Roughly how many listings:", "How many agents:",
      plan === "Enterprise" ? "How you would like to pay (monthly, per project, or commission on closed deals):" : "Best number to call you back:",
      "", "", "— sent from the Synapse agency portal"])}>Email us about {plan}</a>
    <div style={{ height: "18px" }}></div>
  </>
);

function Contact({ info }: { info: Info }) {
  const { rm, name: agency, tier } = info;
  const canEmail = tier === TOP_TIER;
  /* Assigned, with a number of their own: the best case, and the only one where the panel names a person. */
  if (rm.assigned && rm.phone) return (
    <>
      <div className="rm-role">Your relationship manager</div>
      <div className="rm-name">{rm.name}</div>
      {rm.hours ? <div className="rm-hours">{rm.hours}</div> : null}
      <Tel number={rm.phone} label={"Call " + rm.name} />
      {canEmail ? <Mail agency={agency} /> : null}
    </>
  );
  /* Assigned but with no number on file: say who they are, then the line that does work rather than stopping at an apology. */
  if (rm.assigned) return (
    <>
      <div className="rm-role">Your relationship manager</div>
      <div className="rm-name">{rm.name}</div>
      {rm.hours ? <div className="rm-hours">{rm.hours}</div> : null}
      <div className="rm-none">We have no direct number for them yet {"—"} the main line will reach them.</div>
      <Tel number={SYN_PHONE} label="Call Synapse" />
      {canEmail ? <Mail agency={agency} /> : null}
    </>
  );
  /* Nobody assigned. Still a phone call, not a dead end. */
  return (
    <>
      <div className="rm-role">Synapse support</div>
      <div className="rm-name">Talk to us</div>
      <div className="rm-none">You do not have a named manager yet. This line reaches the Synapse team.</div>
      <Tel number={SYN_PHONE} label="Call Synapse" />
      {canEmail ? <Mail agency={agency} /> : null}
    </>
  );
}

const NOBODY: Info = { rm: { assigned: false }, name: null, tier: null };
let cache: Info | null = null;

export function RmPanel() {
  const { open, plan } = useRmState();
  const [info, setInfo] = useState<Info | null>(cache);

  useEffect(() => {
    const onToggle = (e: Event) => { const d = (e as CustomEvent).detail || {}; toggle(d.open, d.plan); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") toggle(false); };
    window.addEventListener("syn:rm-toggle", onToggle);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("syn:rm-toggle", onToggle); document.removeEventListener("keydown", onKey); };
  }, []);

  /* Looked up each time it opens until one lookup succeeds. */
  useEffect(() => {
    if (!open) return;
    if (cache) { setInfo(cache); return; }
    setInfo(null);
    const L = W().SynListings;
    /* Signed out, or the data layer never loaded. Still give them the line rather than a spinner that never resolves. */
    if (!L || !L.relationshipManager) { setInfo(NOBODY); return; }
    let gone = false;
    Promise.all([L.relationshipManager(), L.agency ? L.agency().catch(() => null) : Promise.resolve(null)])
      .then(([rm, a]: [Rm, any]) => { cache = { rm, name: a && a.name, tier: a && a.subscription_tier }; if (!gone) setInfo(cache); })
      .catch((err: unknown) => {
        console.error("relationshipManager failed", err);
        /* A failed lookup is not a reason to strand someone who is trying to reach a human. */
        if (!gone) setInfo(NOBODY);
      });
    return () => { gone = true; };
  }, [open]);

  return (
    <>
      <div className={"rm-scrim" + (open ? " on" : "")} id="rmScrim" onClick={() => toggle(false)}></div>
      <div className={"rm" + (open ? " on" : "")} id="rmPanel" role="dialog" aria-label="Contact Synapse">
        <div className="rm-card" id="rmCard" aria-live="polite">
          {!info ? (
            <>
              <div className="rm-role">Synapse support</div>
              <div className="rm-none">Looking up your contact{"…"}</div>
            </>
          ) : (
            <>
              {plan ? <PlanMail plan={plan} agency={info.name} /> : null}
              <Contact info={info} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
