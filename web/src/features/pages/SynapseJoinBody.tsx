"use client";
/**
 * Joining the Synapse team (the studio's invitation page; React since 2026-10-24, was src/legacy/synapse-join/inline-2.js).
 *
 * The invitation email links here with a one-time token. The page checks it, asks for a name and a password, creates the
 * account, and goes into the studio if the email is on the team; otherwise it says so plainly. The token leaves the address as
 * soon as it has been read. Sign-in is the shared auth.js, run after hydration.
 */
import { useEffect, useState } from "react";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { usePageScripts } from "@/legacy/usePageScripts";

const SCRIPTS: PageScript[] = [{ shared: "auth" }];

type View = "working" | "form" | "bad" | "done";
type Client = {
  rpc: (fn: string) => Promise<{ data: unknown }>;
  auth: {
    verifyOtp: (o: { token_hash: string; type: string }) => Promise<{ error?: unknown; data?: { session?: unknown; user?: { user_metadata?: { full_name?: string } } } }>;
    updateUser: (o: Record<string, unknown>) => Promise<{ error?: { message?: string }; data?: { user?: { id: string } } }>;
  };
  from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<unknown> } };
};
const auth = () => window.SynAuth as unknown as { client: () => Promise<Client>; ready: () => Promise<{ id?: string } | null> } | undefined;

export function SynapseJoinBody() {
  const scripts = usePageScripts();
  const [view, setView] = useState<View>("working");
  const [badWhy, setBadWhy] = useState("The link has expired or was already used. Ask whoever invited you to send a new one.");
  const [doneMsg, setDoneMsg] = useState("Taking you to the studio…");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const bad = (why?: string) => { if (why) setBadWhy(why); setView("bad"); };
  /* Into the studio if the account is on the team; otherwise say so plainly. */
  const enter = async (c: Client) => {
    const r = await c.rpc("synapse_staff_role");
    setView("done");
    if (r && r.data) setTimeout(() => location.replace("synapse.html"), 700);
    else setDoneMsg("Your account is ready, but this email is not on the Synapse team yet. Ask your admin to add it.");
  };

  useEffect(() => {
    if (!scripts) return;
    const params = new URLSearchParams(location.search);
    const type = params.get("type") === "magiclink" ? "magiclink" : params.get("type") === "invite" ? "invite" : "";
    const token = params.get("token_hash") || "";
    try { history.replaceState(null, "", location.pathname); } catch { /* old browsers */ }
    (async () => {
      try {
        const a = auth(); if (!a) throw new Error("no sign-in");
        const c = await a.client();
        if (!token || !type) {
          /* No invitation in the link: if they are already signed in, send them on. */
          const u = await a.ready();
          if (u) await enter(c); else bad("This page needs the link from your invitation email.");
          return;
        }
        const r = await c.auth.verifyOtp({ token_hash: token, type });
        if (r.error || !r.data || !r.data.session) { bad(); return; }
        const nm = r.data.user?.user_metadata?.full_name;
        if (nm) setName(nm);
        setView("form");
      } catch {
        bad("Something went wrong opening the invitation. Try the link again, or ask for a new one.");
      }
    })();
  }, [scripts]);

  /* The password box takes the cursor as soon as the form shows. */
  useEffect(() => { if (view === "form") document.getElementById("pw")?.focus(); }, [view]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    if (pw.length < 8) { setMsg("Use at least 8 characters."); return; }
    if (pw !== pw2) { setMsg("The two passwords are not the same."); return; }
    setBusy(true);
    const nm = name.trim().slice(0, 80);
    try {
      const c = await auth()!.client();
      const r = await c.auth.updateUser(Object.assign({ password: pw }, nm ? { data: { full_name: nm } } : {}));
      if (r.error) throw new Error(r.error.message || "That password was not accepted.");
      if (nm && r.data?.user) c.from("profiles").update({ full_name: nm }).eq("id", r.data.user.id).then(() => {}, () => {});
      await enter(c);
    } catch (err) {
      setBusy(false); setMsg(err instanceof Error && err.message ? err.message : "That did not work. Try again.");
    }
  };

  return (
    <>
      <main className="card">
        <div className="brand">Synapse</div>
        <section id="working" hidden={view !== "working"}>
          <h1>Opening your invitation…</h1>
        </section>
        <section id="form" hidden={view !== "form"}>
          <h1>Welcome to the Synapse team</h1>
          <p>Choose a password to create your account. You will use this email and password to sign in.</p>
          <form id="f" noValidate onSubmit={submit}>
            <label htmlFor="name">Your name</label>{" "}
            <input id="name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />{" "}
            <label htmlFor="pw">Password</label>{" "}
            <input id="pw" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />{" "}
            <label htmlFor="pw2">Password again</label>{" "}
            <input id="pw2" type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <div id="msg" className="note bad" role="alert" hidden={!msg}>{msg}</div>
            <button className="btn" id="go" type="submit" disabled={busy}>{busy ? "Creating your account…" : "Create my account"}</button>
          </form>
        </section>
        <section id="bad" hidden={view !== "bad"}>
          <h1>This invitation can&apos;t be opened</h1>
          <p id="badWhy">{badWhy}</p>
          <p className="note">{"Already made your password? "}<a href="signin.html?next=synapse.html">Sign in</a>.</p>
        </section>
        <section id="done" hidden={view !== "done"}>
          <h1>You&apos;re in</h1>
          <p id="doneMsg">{doneMsg}</p>
        </section>
      </main>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
