"use client";
// @ts-nocheck (attribute values are the original page's strings)
/**
 * Your data: how Synapse knows you, what is held on this device, a copy to take away, and erasure (React since 2026-10-24,
 * was src/legacy/your-data/inline-3.js). Sign-in (auth.js) and the loader overlay (loader.js) run after hydration.
 */
import { useEffect, useState } from "react";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { usePageScripts } from "@/legacy/usePageScripts";

const SCRIPTS: PageScript[] = [
  { src: "auth.js" },
  { src: "cust-nav.js" },
  { src: "loader.js" },
];

/* Every local key this app writes about a person. Enumerated rather than matched on a prefix, because a prefix would sweep up
   whatever a future feature happens to name similarly, and a delete button that removes more than it says is as bad as one
   that removes less. */
const LOCAL_KEYS: Array<[string, string]> = [
  ["toju_visitor_v1", "Your visitor id"],
  ["toju_chat_v1", "Conversations with Tayo"],
  ["toju_sessions_v1", "Past conversations"],
  ["synapse_saved", "Saved homes"],
  ["synapse_recent_views", "Listings you opened"],
  ["synapse_dream_boards_v1", "Dream board"],
  ["synapse_moodboard_v1", "Mood board"],
  ["synapse_browse_prefs", "Search preferences"],
  ["synapse_proximity_v1", "Proximity alerts"],
  ["synapse_last_visit", "When you last visited"],
  ["syn_arrival_v1", "How you first arrived"],
  ["syn_seam_scroll", "Where you were on each page"],
];
function readLocal(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function sizeOf(v: string | null) {
  if (v == null) return 0;
  try { const p = JSON.parse(v); if (Array.isArray(p)) return p.length; if (p && typeof p === "object") return Object.keys(p).length; } catch { /* a plain string counts as one thing */ }
  return 1;
}
function readHeld(): Array<[string, number]> {
  const rows: Array<[string, number]> = [];
  LOCAL_KEYS.forEach(([k, label]) => { const v = readLocal(k); if (v != null) rows.push([label, sizeOf(v)]); });
  return rows;
}

export function YourDataBody() {
  const scripts = usePageScripts();
  const [ids, setIds] = useState<{ profile: string | null; visitor: string | null; known: boolean }>({ profile: null, visitor: null, known: false });
  const [held, setHeld] = useState<Array<[string, number]> | null>(null);
  const [exported, setExported] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [del, setDel] = useState<{ busy: boolean; note: string; cls: string }>({ busy: false, note: "", cls: "yd-note" });
  const [copied, setCopied] = useState(false);

  /* Signed in or not, the page works; it just has a different handle on you. */
  useEffect(() => {
    if (!scripts) return;
    const visitor = readLocal("toju_visitor_v1");
    const done = (profile: string | null) => { setIds({ profile, visitor, known: true }); setHeld(readHeld()); };
    const a = window.SynAuth as unknown as { client?: () => Promise<{ auth: { getUser: () => Promise<{ data?: { user?: { id?: string } } }> } }> } | undefined;
    if (a && a.client) a.client().then((c) => c.auth.getUser()).then((u) => done((u && u.data && u.data.user && u.data.user.id) || null)).catch(() => done(null));
    else done(null);
  }, [scripts]);

  const id = ids.profile || ids.visitor;
  const whoText = !ids.known ? "Checking…" : ids.profile
    ? "You are signed in. Your data is stored against your account."
    : ids.visitor
      ? "You are not signed in. Your data is stored against a random id created by this browser, it is not linked to your name."
      : "Nothing identifies you yet. You have not talked to Tayo or saved anything from this browser.";

  const exportData = () => {
    const out: Record<string, unknown> & { this_device: Record<string, unknown> } = {
      exported_at: new Date().toISOString(),
      identifier: id || null,
      identifier_kind: ids.profile ? "account" : ids.visitor ? "visitor" : "none",
      this_device: {},
    };
    LOCAL_KEYS.forEach(([k]) => {
      const v = readLocal(k); if (v == null) return;
      /* Parsed where it parses, so the file reads as data rather than as escaped JSON strings. */
      try { out.this_device[k] = JSON.parse(v); } catch { out.this_device[k] = v; }
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "synapse-my-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setExported(true);
  };

  /* The server first: clearing this browser before the call would throw away the visitor id the call needs. If the server
     refuses, nothing is cleared, so the id stays on screen as the handle for finishing it by hand. */
  const erase = async () => {
    const loader = (window as unknown as { SynLoader?: { show: (t: string) => void; hide: () => void } }).SynLoader;
    setDel({ busy: true, note: "Deleting…", cls: "yd-note" });
    loader?.show("Deleting your data…");
    let res: { ok: boolean; error?: string } = { ok: true };
    const a = window.SynAuth as unknown as { client?: () => Promise<{ rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error?: { message?: string } | null }> }> } | undefined;
    if (a && a.client && id) {
      try {
        const c = await a.client();
        const rr = ids.profile ? await c.rpc("erase_personal_data", { p_profile_id: ids.profile }) : await c.rpc("forget_visitor", { p_visitor_id: ids.visitor });
        res = { ok: !rr.error, error: rr.error ? rr.error.message : undefined };
      } catch (e) { res = { ok: false, error: (e instanceof Error && e.message) || "could not reach the server" }; }
    }
    if (!res.ok) {
      loader?.hide();
      setDel({ busy: false, cls: "yd-note yd-bad",
        note: "The server refused: " + String(res.error || "unknown error").slice(0, 120).replace(/[<>&]/g, "")
          + ". Nothing was cleared, so you can try again. If it keeps failing, email ilios.intelligence@gmail.com and quote the id above." });
      return;
    }
    LOCAL_KEYS.forEach(([k]) => { try { localStorage.removeItem(k); } catch { /* blocked storage */ } });
    setIds({ profile: null, visitor: null, known: true }); setHeld(readHeld());
    loader?.hide();
    /* Says what was done, not what sounds most final. */
    setDel({ busy: true, cls: "yd-note yd-ok", note: "Done. This device is cleared and your personal details have been removed from our records. Your sign-in still works." });
  };

  const copyId = () => {
    if (!id) return;
    try { navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }
    catch { /* the id is user-select: all, so it can be copied by hand */ }
  };

  return (
    <>
      <div className="yd-wrap">
        <h1 className="yd-h">
          Your data
        </h1>
        <p className="yd-p">
          {"\n      What Synapse holds about you, a copy you can take with you, and a way to have it\n      erased. You do not need an account to use any of this.\n      "}
          <a href="/privacy">
            The full privacy policy
          </a>
          {" explains why we hold each of these things.\n    "}
        </p>
        <section className="yd-card">
          <h2>
            How we know you
          </h2>
          <p id="whoP">{whoText}</p>
          <div className={"yd-id" + (ids.known && !id ? " yd-none" : "")} id="whoId">{id || "-"}</div>
          <p className="yd-note">
            {"\n        This is the identifier your data is stored against. Quote it if you write to us about\n        your data, without it we cannot find you, because there is no name attached to it.\n      "}
          </p>
          <div className="yd-row" style={{ "marginTop": "12px" }}>
            <button className="yd-btn" id="copyId" type="button" onClick={copyId}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </section>
        <section className="yd-card">
          <h2>
            What is held
          </h2>
          <p>
            On this device, and on our servers where we can reach it from here.
          </p>
          <ul className="yd-list" id="heldList">
            {held === null ? <li>Checking…</li>
              : held.length ? held.map(([label, n]) => <li key={label}><span>{label}</span><b>{n}</b></li>)
              : <li><span className="yd-none">Nothing stored on this device.</span></li>}
          </ul>
          <p className="yd-note" id="heldNote">
            {held === null ? null : <>This lists what is on this device. We also hold records on our servers, conversations, leads, and alerts. The download below is a copy of this device only; to get the server records, email ilios.intelligence@gmail.com. Deleting below removes both. <a href="/privacy">The policy</a> lists them all.</>}
          </p>
        </section>
        <section className="yd-card">
          <h2>
            Take a copy
          </h2>
          <p>
            {"\n        Downloads everything listed above, from this device, as a JSON file. It is the data itself, not a summary. For a copy of what we hold on our servers, email ilios.intelligence@gmail.com and quote your identifier.\n      "}
          </p>
          <div className="yd-row">
            <button className="yd-btn" id="exportBtn" type="button" onClick={exportData}>
              Download my data
            </button>
            <span className={exported ? "yd-note yd-ok" : "yd-note"} id="exportNote">{exported ? "Downloaded." : ""}</span>
          </div>
        </section>
        <section className="yd-card">
          <h2>
            Erase my personal data
          </h2>
          <p>
            {"\n        Removes everything we hold about "}
            <em>
              you
            </em>
            {": your conversations with Tayo, your income,\n        occupation and household details, the places you told us matter to you, your saved homes,\n        your dream board, and the record of which listings you opened. It cannot be undone.\n      "}
          </p>
          <p className="yd-note" id="signinNote" hidden={!ids.profile}>
            <b>
              Your sign-in stays.
            </b>
            {" We keep your email address and password so the account still\n        works, nothing else. If you want the account itself gone as well, say so when you write\n        to us and we will remove it; you are entitled to that and we will not argue about it.\n      "}
          </p>
          <p className="yd-note">
            {"\n        If an agency has already been introduced to you, they keep the record that an\n        introduction happened, which home, which agency, and when. Your name, number, budget\n        and preferences are removed from it.\n      "}
          </p>
          <div className="yd-confirm">
            <label className="yd-note" htmlFor="confirmBox">
              {"Type "}
              <b>
                DELETE
              </b>
              {" to confirm."}
            </label>
            {" "}
            <input id="confirmBox" type="text" autoComplete="off" placeholder="DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="yd-row" style={{ "marginTop": "12px" }}>
            <button className="yd-btn danger" id="deleteBtn" type="button" disabled={del.busy || confirm.trim().toUpperCase() !== "DELETE"} onClick={erase}>
              Erase my personal data
            </button>
            <span className={del.cls} id="deleteNote">{del.note}</span>
          </div>
        </section>
        <section className="yd-card" id="social">
          <h2>
            If you connected a social account
          </h2>
          <p>
            {"\n        Agencies can connect a Facebook Page, an Instagram professional account, a TikTok\n        account or a Telegram channel so Synapse can publish their listings there.\n      "}
          </p>
          <p>
            <strong>
              To remove Synapse's access:
            </strong>
            {" in the agency portal, open Social studio,\n        then Channels, and press "}
            <strong>
              Disconnect
            </strong>
            {" on the account. Its access tokens\n        are deleted at once. You can also remove Synapse from Facebook's Business integrations\n        settings or TikTok's app permissions settings, or remove our bot from the Telegram channel.\n      "}
          </p>
          <p>
            <strong>
              To have everything deleted
            </strong>
            {" that we hold from a connected account,\n        including the record that it was connected, email\n        "}
            <a href="mailto:ilios.intelligence@gmail.com?subject=Delete%20my%20connected%20account%20data">
              ilios.intelligence@gmail.com
            </a>
            {"\n        with the account's name. We confirm by email when it is done.\n      "}
          </p>
          <p>
            <strong>
              If you commented on an agency's post
            </strong>
            {" that Synapse published, we hold only\n        your display name and the comment's text, and delete them automatically after 90 days.\n        Email the same address with your name and the post to have them deleted sooner.\n      "}
          </p>
        </section>
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
