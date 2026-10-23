"use client";
/**
 * The portal's account pieces, as React (were src/legacy/agency/inline-4.js and inline-7.js): the sign-in gate, the account menu
 * in the top bar, and the banner that asks for the number Tayo hands leads to.
 */
import { useEffect, useRef, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

/** The portal is an agency workspace; there is no anonymous view of it. This is a UX gate: it stops the screen rendering for a
 *  signed-out visitor. The actual protection for agency data is RLS in Postgres. */
export function AuthGate() {
  const scripts = usePageScripts();
  useEffect(() => {
    if (scripts && W().SynAuth) W().SynAuth.requireAuth({ role: "agency", reason: "agency" });
  }, [scripts]);
  return null;
}

const Person = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20.5c0-4 3.3-6.4 7.5-6.4s7.5 2.4 7.5 6.4" />
  </svg>
);

/** The account menu: a person icon in the top bar. One floating panel at a time, so opening it closes the bell and Contact
 *  Synapse; the portal's closeAgencyPopups() closes it with `syn:acct-close`. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<{ name: string; mail: string }>({ name: "Your account", mail: "" });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const scripts = usePageScripts();

  const fill = () => {
    const u = W().SynAuth?.user?.();
    if (!u) return;
    const name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "";
    setWho({ name: name || u.email || "Your account", mail: name ? u.email || "" : "" });
  };
  useEffect(() => {
    if (!scripts) return;
    W().SynIcons?.hydrate?.(menu.current);
    W().SynAuth?.ready?.().then(fill);
  }, [scripts]);

  const setMenu = (on: boolean) => {
    setOpen(on);
    if (!on) return;
    fill();
    try { W().toggleNoti?.(false); } catch { /* not ready */ }
    try { W().toggleRm?.(false); } catch { /* not ready */ }
    requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>(".acct-item")?.focus());
  };

  useEffect(() => {
    const shut = () => setOpen(false);
    window.addEventListener("syn:acct-close", shut);
    return () => window.removeEventListener("syn:acct-close", shut);
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [...(menu.current?.querySelectorAll<HTMLElement>(".acct-item") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    };
    document.addEventListener("click", away);
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("click", away); document.removeEventListener("keydown", keys); };
  }, [open]);

  const billing = () => { setOpen(false); document.querySelector<HTMLElement>('#tabs a[data-pane="billing"]')?.click(); };
  const signOut = () => {
    setOpen(false);
    /* auth.js owns sign-out (it answers at once and cannot be pressed twice); this only routes to it. */
    const real = document.querySelector<HTMLElement>("[data-auth-slot] .auth-out");
    if (real) real.click(); else W().SynAuth?.signOut().then(() => location.reload());
  };

  return (
    <span className="acct-wrap" style={{ marginRight: "16px" }}>
      <button ref={btn} className="bell" id="acctBtn" type="button" aria-label="Account" aria-haspopup="menu" aria-expanded={open} aria-controls="acctMenu"
        onClick={(e) => { e.stopPropagation(); setMenu(!open); }}>
        <Person />
      </button>
      <div ref={menu} className="acct-menu" id="acctMenu" role="menu" aria-label="Account" hidden={!open}
        onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-acct], a")) setOpen(false); }}>
        <div className="acct-who">
          <span className="acct-av"><Person /></span>
          <div>
            <b id="acctName">{who.name}</b>
            <small id="acctMail">{who.mail}</small>
          </div>
        </div>
        <button className="acct-item" type="button" role="menuitem" data-acct="billing" onClick={billing}>
          <span data-icon="card"></span>
          {"Plan & billing"}
        </button>
        <a className="acct-item" role="menuitem" href="your-data.html" onClick={() => setOpen(false)}>
          <span data-icon="shield"></span>
          {"Data & privacy"}
        </a>
        {" "}
        <a className="acct-item" role="menuitem" href="../index.html" onClick={() => setOpen(false)}>
          <span data-icon="home"></span>
          Back to the landing page
        </a>
        <div className="acct-sep"></div>
        <button className="acct-item acct-out" type="button" role="menuitem" data-acct="out" onClick={signOut}>
          <span data-icon="user"></span>
          Sign out
        </button>
      </div>
    </span>
  );
}

/** THE NUMBER TAYO HANDS A LEAD TO. Registration asks for it, but it cannot reach an account that already exists, and on
 *  2026-09-06 not one of the 41 agency members had a number on file -- so every live lead resolved to nobody reachable. Not
 *  dismissible: the consequence of ignoring it is silent. It goes away by being answered, and only by that. */
export function NeedPhone() {
  const scripts = usePageScripts();
  const [shown, setShown] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const L = W().SynListings;
    if (!scripts || !L || !L.myPhone) return;
    L.myPhone().then((me: any) => {
      // null means we could not tell -- an unknown is not a missing number.
      if (!me || String(me.phone || "").trim()) return;
      setShown(true);
    });
  }, [scripts]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const val = (input.current?.value || "").trim();
    if (!val) { input.current?.focus(); return; }
    setSaving(true);
    W().SynListings.setMyPhone(val)
      .then((stored: string) => { setShown(false); W().toast?.("Saved. Tayo will reach you on " + stored); })
      .catch((e2: any) => { setSaving(false); setErr((e2 && e2.message) || "That number could not be saved"); });
  };
  return (
    <div className="need-phone" id="needPhone" hidden={!shown}>
      {shown ? (
        <>
          <div className="np-txt"><b>Tayo has no way to reach you</b>
            <span>Leads are handed over on WhatsApp. Without a number here, a lead assigned to you cannot be sent anywhere.</span></div>
          <form id="npForm" noValidate onSubmit={save}>
            <input ref={input} id="npInput" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" aria-label="Your WhatsApp number" />
            <button type="submit" id="npSave" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </form>
          {err ? <div className="np-err" role="alert">{err}</div> : null}
        </>
      ) : null}
    </div>
  );
}
