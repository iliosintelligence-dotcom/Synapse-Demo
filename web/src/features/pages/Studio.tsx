"use client";
/**
 * The Synapse studio, the team's own social desk (React since 2026-10-24, was src/legacy/synapse/inline-2.js).
 *
 * Every rule of the old page is kept:
 *  - only the team gets in: signed out goes to sign-in, signed in but not on the team is told which address is signed in
 *  - Synapse connects Facebook (our own Facebook login, then a Page choice on return) and Telegram (our bot) itself
 *  - a channel takes a listing only when it matches all of its rules; a rule left blank matches anything
 *  - a channel card does not redraw under someone typing in it; it catches up when they leave the box
 *  - "Schedule and write another" keeps the accounts and times and clears only the post
 * Sign-in is the shared auth.js (window.SynAuth), run after hydration.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-location-assign-relative-destination */
const SB_URL = "https://bhrhejpekmhbhwryjhgk.supabase.co";
const SB_KEY = "sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV";
const SB_FN = SB_URL + "/functions/v1/social-connect";
const auth = () => (window as any).SynAuth;
const PL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", x: "X", telegram: "Telegram", youtube: "YouTube" };
const GLYPH: Record<string, string> = { instagram: "◎", facebook: "f", tiktok: "♪", linkedin: "in", x: "X", telegram: "➤", youtube: "▶" };
/* Where to make the account, and the one thing people get wrong. */
const MAKE: Record<string, { url: string; tip: string; what: string }> = {
  facebook: { url: "https://www.facebook.com/pages/create", tip: "Make a Page, not a personal profile. Posts go to the Page.", what: "Page posts" },
};
/* What Synapse can connect to itself today (2026-10-23, TryPost disconnected): a Facebook Page through our own Facebook
   login, and a Telegram channel through our bot. Other networks are added here when Synapse connects to them directly. */
const CONNECTABLE = ["facebook", "telegram"];
const VIDEO_RE = /\.(mp4|mov)(\?|#|$)/i;
type Tab = "home" | "channels" | "compose" | "auto" | "activity" | "guide" | "team";
type Overview = { channels: any[]; legacy: any[]; twins_enabled: boolean; live_listings: number };
const EMPTY: Overview = { channels: [], legacy: [], twins_enabled: false, live_listings: 0 };

function token(): Promise<string | undefined> {
  return auth().client().then((c: any) => c.auth.getSession()).then((r: any) => r && r.data && r.data.session && r.data.session.access_token);
}
const readJson = (r: Response) => r.json().catch(() => ({})).then((d: any) => {
  if (!r.ok) throw new Error(d && d.error ? d.error : "Something went wrong. Try again.");
  return d;
});
/* One door to the function. Resolves the JSON; rejects with a sentence. */
function api(action: string, body?: object): Promise<any> {
  return token().then((tok) => {
    if (!tok) throw new Error("Please sign in again.");
    return fetch(SB_URL + "/functions/v1/synapse-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + tok },
      body: JSON.stringify(Object.assign({ action }, body || {})),
    });
  }).then(readJson);
}
/* The connect function, signed in as this staff member. */
function connectApi(query: string, body?: object): Promise<any> {
  return token().then((tok) => {
    if (!tok) throw new Error("Please sign in again.");
    return fetch(SB_FN + query, {
      method: body ? "POST" : "GET",
      headers: { apikey: SB_KEY, Authorization: "Bearer " + tok, ...(body ? { "Content-Type": "application/json" } : {}) } as Record<string, string>,
      body: body ? JSON.stringify(body) : undefined,
    });
  }).then(readJson);
}
function when(ts: any) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
function dayLabel(ts: any) {
  try {
    const d = new Date(ts), now = new Date();
    const key = (x: Date) => x.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" });
    const tom = new Date(now.getTime() + 86400e3);
    if (key(d) === key(now)) return "Today";
    if (key(d) === key(tom)) return "Tomorrow";
    return d.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "short" });
  } catch { return ""; }
}
/* A datetime-local value in this device's clock, from a Date. */
function localStamp(d: Date) {
  const z = (n: number) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes());
}
function money(p: any, per?: any) { const n = Number(p); if (!isFinite(n) || n <= 0) return ""; return "₦" + n.toLocaleString("en-NG") + (per ? "/" + String(per).replace(/ly$/, "").replace(/^per[ _]?/, "") : ""); }

/* ── what each channel takes ─────────────────────────────────────────
   The studio, not the agent, decides which Synapse page a listing goes to. A channel takes a listing when it matches ALL of
   its rules; a rule left blank matches anything. Agents only ever choose their own accounts. */
const ROUTE_KINDS = [["sale", "For sale"], ["rent", "For rent"], ["shared", "Shared room"], ["land", "Land"], ["shortlet", "Short-let"], ["offplan", "Off-plan"], ["commercial", "Commercial"]];
function moneyWord(n: any) { n = Number(n); if (!n) return ""; return n >= 1e9 ? +(n / 1e9).toFixed(2) + "bn" : n >= 1e6 ? +(n / 1e6).toFixed(2) + "m" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n); }
/* "3m", "500k", "2.5 million", "₦4,000,000" -> whole naira; blank -> null; anything else -> undefined. */
function readMoney(v: any): number | null | undefined {
  const t = String(v == null ? "" : v).toLowerCase().replace(/[₦,\s]/g, "").replace(/naira|ngn/g, "");
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)(k|thousand|m|mn|million|b|bn|billion)?$/);
  if (!m) return undefined;
  const mult = ({ k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 } as Record<string, number>)[m[2]] || 1;
  return Math.round(Number(m[1]) * mult);
}
const hasRules = (c: any) => !!((c.route_kinds || []).length || c.route_min_beds != null || c.route_max_beds != null || c.route_min_price || c.route_max_price || (c.route_areas || []).length);
function ruleText(c: any) {
  const parts: string[] = [];
  const k = (c.route_kinds || []).map((x: string) => { const f = ROUTE_KINDS.filter((r) => r[0] === x)[0]; return f ? f[1] : x; });
  if (k.length) parts.push(k.join(" or "));
  const lo = c.route_min_beds, hi = c.route_max_beds;
  if (lo != null || hi != null) parts.push(lo != null && lo === hi ? lo + "-bedroom" : (lo != null ? lo : 0) + (hi != null ? "–" + hi : "+") + " bedrooms");
  if (c.route_min_price || c.route_max_price) parts.push((c.route_min_price ? "₦" + moneyWord(c.route_min_price) : "") + (c.route_min_price && c.route_max_price ? " to " : c.route_max_price ? "up to " : " and up") + (c.route_max_price ? "₦" + moneyWord(c.route_max_price) : ""));
  if ((c.route_areas || []).length) parts.push(c.route_areas.join(", "));
  parts.push(c.city ? c.city : "every city");
  return parts.join(" · ");
}

function Badge({ p, size, avatar }: { p: string; size?: string; avatar?: string }) {
  const k = PL[p] ? p : "x";
  return (
    <span className={"pf " + (size || "") + " pf-" + k}>
      {avatar ? <img alt="" src={avatar} referrerPolicy="no-referrer" onError={(e) => e.currentTarget.remove()} /> : null}
      {GLYPH[k] || "?"}
    </span>
  );
}
function Sw({ on, label, onClick, ...rest }: { on: boolean; label: string; onClick: () => void; [k: string]: any }) {
  return <button type="button" className="sw" role="switch" aria-label={label} aria-checked={on ? "true" : "false"} onClick={onClick} {...rest} />;
}
function StatusPill({ s }: { s: string }) {
  if (s === "live") return <span className="pill ok">Live</span>;
  if (s === "sent") return <span className="pill warn">Sent, not live yet</span>;
  if (s === "failed") return <span className="pill bad">Failed</span>;
  if (s === "cancelled") return <span className="pill">Stopped</span>;
  if (s === "publishing") return <span className="pill warn">Sending</span>;
  return <span className="pill hot">Scheduled</span>;
}
const KIND: Record<string, string> = { autopilot: "Autopilot", mirrored: "Shared from an agency", studio: "Studio post" };
function ActRow({ x }: { x: any }) {
  const st = x.status === "published" || x.delivery === "live" || x.status === "live" ? "live" : x.status;
  return (
    <div className="item">
      <div className="item-top"><Badge p={x.platform} size="sm" /><b>{x.channel || PL[x.platform]}</b><span className="pill">{KIND[x.kind] || x.kind}</span>
        <StatusPill s={st === "published" ? "live" : st} /><span className="muted small">{when(x.at)}</span></div>
      <div className="item-text">{String(x.text || "").slice(0, 200)}</div>
      {x.failure ? <div className="small" style={{ color: "var(--bad)" }}>{x.failure}</div> : null}
    </div>
  );
}
const DAY_HEAD = { margin: "18px 0 2px", fontSize: "12px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--dim)" } as const;
const PLUS = <svg className="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;

type Wiz = { step: number; platform: string | null; pick: string | null; pages: any[] | null; chosen: Record<string, boolean>; bot: string | null; tgId: string | null };
const NEW_WIZ: Wiz = { step: 1, platform: null, pick: null, pages: null, chosen: {}, bot: null, tgId: null };
type Gate = { kind: "opening" } | { kind: "nothing" } | { kind: "outsider"; email: string } | null;
type Invite = { kind: "emailed"; email: string } | { kind: "existing"; email: string } | { kind: "link"; email: string; link: string; why: string } | null;

export function Studio({ guide }: { guide: ReactNode }) {
  const scripts = usePageScripts();
  const [gate, setGate] = useState<Gate>({ kind: "opening" });
  const [who, setWho] = useState("");
  const [name, setName] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const ovRef = useRef<Overview | null>(null);
  ovRef.current = overview;
  const [posts, setPosts] = useState<any[] | null>(null);
  const [postsErr, setPostsErr] = useState("");
  const [activity, setActivity] = useState<any[] | null>(null);
  const [actErr, setActErr] = useState("");
  const [homes, setHomes] = useState<any[] | null>(null);
  const [homesErr, setHomesErr] = useState(false);
  const [staff, setStaff] = useState<any[] | null>(null);
  const [staffErr, setStaffErr] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 3800);
  };

  /* ── overview, shared by every page ───────────────────────────────── */
  const loadOverview = (): Promise<void> => api("overview").then((o) => { setOverview(o); setLoadFailed(false); })
    .catch((e) => {
      toast(e.message);
      if (!ovRef.current) { setOverview(EMPTY); setLoadFailed(true); }
    });
  const loadPosts = (): Promise<void> => api("posts").then((d) => { setPosts(d.posts || []); setPostsErr(""); })
    .catch((e) => setPostsErr(e.message));
  const loadActivity = () => {
    api("activity").then((d) => { setActivity(Array.isArray(d) ? d : []); setActErr(""); }).catch((e) => setActErr(e.message));
  };
  const loadStaff = () => {
    api("staff_list").then((d) => { setStaff(d.staff || []); setStaffErr(""); }).catch((e) => setStaffErr(e.message));
  };
  /* Real homes to post about: live listings, with their photos. */
  const loadHomes = () => {
    const q = SB_URL + "/rest/v1/properties?select=id,title,city,area_name,price,price_period,bedrooms,listing_type,property_media(url,display_order,media_type)"
      + "&status=eq.live&is_active=eq.true&deleted_at=is.null&order=created_at.desc&limit=14";
    fetch(q, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } }).then((r) => (r.ok ? r.json() : [])).then((rows) => {
      setHomes((Array.isArray(rows) ? rows : []).map((p: any) => {
        const pics = (p.property_media || []).filter((m: any) => m && m.url && (!m.media_type || /image|photo/i.test(m.media_type)))
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)).map((m: any) => m.url);
        return { id: p.id, title: p.title, city: p.city, area: p.area_name, price: p.price, per: p.price_period, beds: p.bedrooms, type: p.listing_type, pics };
      }).filter((h: any) => h.pics.length));
    }).catch(() => setHomesErr(true));
  };

  /* ── the door ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!scripts) return;
    const A = auth();
    if (!A || !A.ready) { setGate({ kind: "nothing" }); return; }
    A.ready().then((u: any) => {
      if (!u) { location.replace("signin.html?next=" + encodeURIComponent("synapse.html")); return; }
      /* The name they gave when they joined (the join page asks for it); the email only as a last resort. */
      const full = String((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "").trim();
      setWho(full ? full + " · " + (u.email || "") : (u.email || ""));
      setName((full || String(u.email || "").split("@")[0].replace(/[._-]+/g, " ")).split(" ")[0].replace(/^./, (c: string) => c.toUpperCase()));
      return api("me").then((d) => {
        setGate(null);
        if (d.can_manage || d.role === "platform_admin") setCanManage(true);
        return loadOverview().then(() => { loadPosts(); loadActivity(); loadHomes(); facebookReturn(); });
      }).catch(() => {
        /* Signed in, but not on the team. Say which sign-in this is, so the right address can be added. */
        setGate({ kind: "outsider", email: u.email || "this account" });
      });
    }).catch(() => setGate({ kind: "nothing" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);
  const signOut = () => { auth().signOut().then(() => { location.href = "signin.html"; }); };

  /* ── navigation ───────────────────────────────────────────────────── */
  const show = (t: Tab) => {
    setTab(t);
    if (t === "compose") loadPosts();
    if (t === "activity" || t === "home") loadActivity();
    if (t === "team") loadStaff();
    window.scrollTo(0, 0);
  };

  /* ── the add-a-channel guide ─────────────────────────────────────────
     Synapse connects these itself. Facebook: our own Facebook login, then tick which Pages are Synapse's (Facebook sends the
     person back here with ?connected=choose). Telegram: the channel's @name, then make our bot a posting admin of it; the
     channel switches itself on when Telegram tells us. */
  const [wizOpen, setWizOpen] = useState(false);
  const [W, setW] = useState<Wiz>(NEW_WIZ);
  const [wzBusy, setWzBusy] = useState(false);
  const wzRef = useRef<HTMLDivElement>(null);
  const tgRef = useRef<HTMLInputElement>(null);
  const tgCityRef = useRef<HTMLInputElement>(null);
  const openWizard = () => { setW(NEW_WIZ); setWzBusy(false); setWizOpen(true); };
  const closeWizard = () => setWizOpen(false);
  useEffect(() => {
    document.body.style.overflow = wizOpen ? "hidden" : "";
    if (!wizOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeWizard(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [wizOpen]);
  useEffect(() => {
    if (!wizOpen || !wzRef.current) return;
    const f = wzRef.current.querySelector<HTMLElement>("input, button, a");
    if (f && (W.step === 1 || f.tagName === "INPUT")) f.focus();
  }, [wizOpen, W.step, W.platform]);
  const goStep = (patch: Partial<Wiz>) => { setWzBusy(false); setW((w) => ({ ...w, ...patch })); };
  const startFacebook = () => {
    setWzBusy(true);
    connectApi("?action=start&platform=facebook&for=studio")
      .then((d) => { if (!d.url) throw new Error("Facebook could not be opened. Try again."); location.href = d.url; })
      .catch((er) => { setWzBusy(false); toast(er.message); });
  };
  const addPages = () => {
    const ids = Object.keys(W.chosen).filter((k) => W.chosen[k]);
    setWzBusy(true);
    connectApi("?action=studio-pick", { pick: W.pick, page_ids: ids })
      .then((d) => {
        closeWizard();
        toast("Added " + (d.connected || []).join(", ") + ". Switch on what it should do in Channels." + ((d.problems || []).length ? " Not added: " + d.problems.join("; ") : ""));
        return loadOverview().then(() => show("channels"));
      })
      .catch((er) => { setWzBusy(false); toast(er.message); });
  };
  const addTelegram = () => {
    const handle = (tgRef.current?.value || "").trim(), city = (tgCityRef.current?.value || "").trim();
    if (!handle) { toast("Write the channel’s public name."); return; }
    setWzBusy(true);
    let tgId: string | null = null;
    api("channel_add_telegram", { handle, city })
      .then((d) => {
        tgId = d.id;
        return fetch(SB_FN + "?action=status").then((r) => r.json()).catch(() => ({}));
      })
      .then((s: any) => goStep({ tgId, bot: s && s.platforms && s.platforms.telegram && s.platforms.telegram.bot, step: 3 }))
      .catch((er) => { setWzBusy(false); toast(er.message); });
  };
  /* Back from Facebook: ?connected=choose&detail=<pick> opens the Page choice; anything else says what happened. */
  function facebookReturn() {
    let q: URLSearchParams; try { q = new URLSearchParams(location.search); } catch { return; }
    const status = q.get("connected"); if (!status) return;
    const detail = q.get("detail") || "";
    try { history.replaceState(null, "", location.pathname + location.hash); } catch { /* cosmetic */ }
    if (status !== "choose") { toast(status === "cancelled" ? "Facebook was cancelled. Nothing was connected." : (detail || "Facebook did not connect.")); return; }
    connectApi("?action=studio-pick&pick=" + encodeURIComponent(detail))
      .then((d) => {
        const pages = d.pages || [], chosen: Record<string, boolean> = {};
        if (pages.length === 1) chosen[pages[0].id] = true;
        setW({ step: 3, platform: "facebook", pick: detail, pages, chosen, bot: null, tgId: null });
        setWzBusy(false); setWizOpen(true);
      })
      .catch((er) => toast(er.message));
  }

  /* ── channels ─────────────────────────────────────────────────────── */
  /* The cards follow the overview, except while someone is typing in one of their boxes: then they catch up on leaving it. */
  const chanBox = useRef<HTMLDivElement>(null);
  const [chanView, setChanView] = useState<Overview | null>(null);
  /* Each redraw puts the saved values back in the boxes, as the old page did: a price it could not read does not linger. */
  const [chanGen, setChanGen] = useState(0);
  const showChannels = (o: Overview | null) => { setChanView(o); setChanGen((g) => g + 1); };
  const pendingRender = useRef(false);
  const typingInCards = () => { const a = document.activeElement; return !!(a && chanBox.current && chanBox.current.contains(a) && a.matches("input")); };
  useEffect(() => {
    if (!overview) return;
    if (typingInCards()) { pendingRender.current = true; return; }
    showChannels(overview);
  }, [overview]);
  const onChanBlur = () => {
    setTimeout(() => {
      if (pendingRender.current && !typingInCards()) { pendingRender.current = false; showChannels(ovRef.current); }
    }, 0);
  };
  const openMap = useRef<Record<string, boolean>>({});
  const patchChannel = (id: string, patch: object) => setOverview((o) => (o ? { ...o, channels: o.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : o));
  const toggleKind = (c: any, rk: string) => {
    const cur = (c.route_kinds || []).slice(), at = cur.indexOf(rk);
    if (at > -1) cur.splice(at, 1); else cur.push(rk);
    patchChannel(c.id, { route_kinds: cur });
    api("channel_update", { id: c.id, route_kinds: cur }).then(() => loadOverview()).catch((er) => { toast(er.message); loadOverview(); });
  };
  const clearRoute = (id: string) => {
    api("channel_update", { id, route_kinds: [], route_min_beds: null, route_max_beds: null, route_min_price: null, route_max_price: null, route_areas: [] })
      .then(() => { toast("This page takes everything again."); return loadOverview(); }).catch((er) => toast(er.message));
  };
  const flip = (c: any, k: string) => {
    const on = !c[k];
    patchChannel(c.id, { [k]: on });
    api("channel_update", { id: c.id, [k]: on }).then(loadOverview).catch((er) => { toast(er.message); loadOverview(); });
  };
  const removeChannel = (id: string) => {
    if (!window.confirm("Remove this account from the studio? Its past posts stay in the record.")) return;
    api("channel_remove", { id }).then((d) => { toast(d.kept ? "Switched off. Its history is kept." : "Removed."); return loadOverview(); })
      .catch((er) => toast(er.message));
  };
  /* A box saves when it is committed (the native change event: on leaving it, Enter, or a spinner click), not per keystroke. */
  const onFieldChange = useRef<(i: HTMLInputElement) => void>(() => {});
  onFieldChange.current = (i) => {
    const f = i.dataset.f!, v = i.value, patch: Record<string, any> = { id: i.dataset.id };
    if (f === "gap_hours") { patch.min_gap_minutes = Math.round(Number(v) * 60); }
    else if (f === "label" || f === "city") { patch[f] = v; }
    else if (f === "route_min_beds" || f === "route_max_beds") { patch[f] = v === "" ? null : Number(v); }
    else if (f === "route_min_price" || f === "route_max_price") {
      const m = readMoney(v);
      if (m === undefined) { toast("Write a price like 3m, 500k or 2500000."); loadOverview(); return; }
      patch[f] = m;
    }
    else if (f === "route_areas") { patch[f] = v; }
    else { patch[f] = Number(v); }
    api("channel_update", patch).then(() => { toast("Saved."); return loadOverview(); }).catch((er) => { toast(er.message); loadOverview(); });
  };
  useEffect(() => {
    const box = chanBox.current; if (!box) return;
    const on = (e: Event) => { const i = (e.target as HTMLElement).closest<HTMLInputElement>("[data-f]"); if (i) onFieldChange.current(i); };
    box.addEventListener("change", on);
    return () => box.removeEventListener("change", on);
  }, []);
  const field = (c: any, f: string, val: any, props: object) => (
    <input key={chanGen + ":" + c.id + ":" + f} data-f={f} data-id={c.id} defaultValue={val} {...props} />
  );
  const num = (label: string, c: any, f: string, val: any, min: number, max: number) => (
    <div><label className="f">{label}</label>{field(c, f, val == null ? "" : val, { type: "number", min, max })}</div>
  );
  const details = (key: string, initial: boolean, className: string, attrs: object, children: ReactNode) => (
    <details className={className} open={openMap.current[key] ?? initial}
      onToggle={(e) => { openMap.current[key] = (e.currentTarget as HTMLDetailsElement).open; }} {...attrs}>{children}</details>
  );
  const routeBox = (c: any) => {
    const kinds = c.route_kinds || [], any = !hasRules(c);
    return details("r" + c.id, !any, "pace route", { "data-rid": c.id, "data-id": c.id }, <>
      <summary>What this page takes: <b style={{ color: "var(--ink)" }}>{any ? (c.city ? c.city + ", every kind of listing" : "every listing") : ruleText(c)}</b></summary>
      <p className="muted small" style={{ margin: "2px 0 12px" }}>Agencies’ posts and autopilot go to this page only when the listing matches everything below. Leave a box empty to take anything.</p>
      <label className="f">Kind of listing</label>
      <div className="picks">{ROUTE_KINDS.map((r) => (
        <button key={r[0]} type="button" className="pick plain" data-rk={r[0]} data-id={c.id} aria-pressed={kinds.indexOf(r[0]) > -1 ? "true" : "false"} onClick={() => toggleKind(c, r[0])}>{r[1]}</button>
      ))}</div>
      <div className="pace-grid" style={{ marginTop: "14px" }}>
        <div><label className="f">Fewest bedrooms</label>{field(c, "route_min_beds", c.route_min_beds == null ? "" : c.route_min_beds, { type: "number", min: 0, max: 20, placeholder: "any" })}</div>
        <div><label className="f">Most bedrooms</label>{field(c, "route_max_beds", c.route_max_beds == null ? "" : c.route_max_beds, { type: "number", min: 0, max: 20, placeholder: "any" })}</div>
        <div><label className="f">Lowest price</label>{field(c, "route_min_price", moneyWord(c.route_min_price), { type: "text", placeholder: "e.g. 3m" })}</div>
        <div><label className="f">Highest price</label>{field(c, "route_max_price", moneyWord(c.route_max_price), { type: "text", placeholder: "e.g. 50m" })}</div>
      </div>
      <div style={{ marginTop: "12px" }}><label className="f">Areas <span className="muted">(optional, separate with commas)</span></label>{field(c, "route_areas", (c.route_areas || []).join(", "), { type: "text", placeholder: "e.g. Bodija, Agodi", maxLength: 200 })}</div>
      <p className="small" style={{ marginTop: "12px" }}><b>{c.reach == null ? "" : c.reach}</b> <span className="muted">of {(overview || EMPTY).live_listings || 0} live listings match these rules right now.</span></p>
      {hasRules(c) ? <button className="btn sm" type="button" data-clearroute={c.id} onClick={() => clearRoute(c.id)}>Take everything again</button> : null}
    </>);
  };
  const channelCard = (c: any) => {
    const nm = c.label || c.handle || PL[c.platform] || "account";
    const gap = Math.round((c.min_gap_minutes || 0) / 6) / 10;
    const yt = c.platform === "youtube";
    return (
      <div className="card chan" key={c.id}>
        <div className="chan-head"><Badge p={c.platform} size="lg" /><div className="grow"><div className="chan-name">{nm}</div>
          <div className="muted small">{(PL[c.platform] || c.platform) + (c.handle ? " · " + c.handle : "")}</div>
          <div className="tags"><span className={"pill " + (c.is_active ? "ok" : "")}>{c.is_active ? "On" : "Off"}</span>
            {c.autopilot ? <span className="pill hot">Autopilot</span> : null}{c.mirror ? <span className="pill hot">Agency posts</span> : null}
            <span className="pill">{c.city ? c.city : "Every city"}</span>
            {hasRules(c) ? <span className="pill hot">Sorted</span> : null}</div></div></div>
        <div className="chan-body">
          <div className="opt"><div className="grow"><b>Switched on</b><small>Off keeps the account here but posts nothing to it.</small></div><Sw on={!!c.is_active} data-id={c.id} data-k="is_active" label={"Switched on: " + nm} onClick={() => flip(c, "is_active")} /></div>
          {yt ? <p className="muted small" style={{ margin: "4px 0 10px" }}>Videos only. Post to this channel from Create; it cannot post homes by itself or share agencies’ posts.</p> : <>
            <div className="opt"><div className="grow"><b>Post homes by itself</b><small>Autopilot: one live listing at a time. {c.posts_today} so far today.</small></div><Sw on={!!c.autopilot} data-id={c.id} data-k="autopilot" label={"Autopilot: " + nm} onClick={() => flip(c, "autopilot")} /></div>
            <div className="opt"><div className="grow"><b>Share agencies’ posts</b><small>Also posts what agencies publish, if the listing matches what this page takes (needs sharing on in Automation).</small></div><Sw on={!!c.mirror} data-id={c.id} data-k="mirror" label={"Share agencies’ posts: " + nm} onClick={() => flip(c, "mirror")} /></div>
          </>}
          {yt ? null : routeBox(c)}
          {details("p" + c.id, false, "pace", { "data-id": c.id }, <>
            <summary>Name, city and pacing</summary>
            <div className="pace-grid">
              <div><label className="f">Name</label>{field(c, "label", c.label || "", { type: "text", maxLength: 80 })}</div>
              <div><label className="f">City (blank = every city)</label>{field(c, "city", c.city || "", { type: "text", maxLength: 60 })}</div>
              {num("Posts a day", c, "daily_cap", c.daily_cap, 1, 24)}
              {num("Hours between posts", c, "gap_hours", gap, 0.5, 24)}
              {num("Starts at (hour, Lagos)", c, "window_start", c.window_start, 0, 23)}
              {num("Stops at (hour, Lagos)", c, "window_end", c.window_end, 1, 24)}
              {num("Repeat a home after (days)", c, "repost_days", c.repost_days, 1, 365)}
            </div>
            <div style={{ marginTop: "14px" }}><button className="btn sm danger" data-remove={c.id} type="button" onClick={() => removeChannel(c.id)}>Remove this account</button></div>
          </>)}
        </div>
      </div>
    );
  };

  /* ── create ───────────────────────────────────────────────────────── */
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [media, setMedia] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [brief, setBrief] = useState("");
  const [caption, setCaption] = useState("");
  const [suggs, setSuggs] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [sending, setSending] = useState<"" | "send" | "more">("");
  const [whenMode, setWhenMode] = useState<"now" | "later" | "many">("now");
  const [at, setAt] = useState("");
  const [times, setTimes] = useState<string[]>([""]);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [rpStart, setRpStart] = useState("");
  const [rpEvery, setRpEvery] = useState("1");
  const [rpCount, setRpCount] = useState("7");
  const briefRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const picRef = useRef<HTMLInputElement>(null);
  /* What Synapse posts to itself: a connected Facebook Page or a Telegram channel our bot administers. */
  const postable = (overview || EMPTY).channels.filter((c) => c.is_active && c.direct && PL[c.platform]);
  /* A channel switched off or removed is no longer a choice, and must not stay selected out of sight. */
  useEffect(() => {
    if (!overview) return;
    const ok = new Set(postable.map((c) => c.id));
    setPicked((p) => { const n: Record<string, boolean> = {}; let gone = false; for (const k of Object.keys(p)) { if (ok.has(k)) n[k] = p[k]; else gone = true; } return gone ? n : p; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);
  const chosenList = postable.filter((c) => picked[c.id]);
  const pickedPlatforms = chosenList.map((c) => c.platform);
  const anyPicked = Object.keys(picked).some((k) => picked[k]);
  let countMsg = caption.length + " characters";
  if (pickedPlatforms.indexOf("x") > -1) countMsg += " · X keeps about 280, so it will be shortened there";

  /* Captions: from what the post is about, written by the AI in Synapse's voice. */
  const suggest = (about?: string) => {
    const b = (about ?? brief).trim();
    if (!b) { toast("Say what the post is about first, or pick a home."); briefRef.current?.focus(); return; }
    setSuggesting(true);
    api("suggest_caption", { brief: b, platform: pickedPlatforms[0] || "" }).then((d) => {
      const o = d.options || []; setSuggs(o);
      if (o.length) toast("Pick the one you like. You can edit it after.");
    }).catch((e) => toast(e.message)).then(() => setSuggesting(false));
  };
  const takeSugg = (i: number) => {
    let cap = suggs[i] || "";
    /* A post about a real home carries its link, so a tap lands on that home. */
    if (link && cap.indexOf(link) < 0) cap += "\n\n" + link;
    setCaption(cap); captionRef.current?.focus();
  };
  const pickHome = (h: any) => {
    setMedia(h.pics.slice(0, 3));
    setLink("https://www.synapsecore.dev/app/property.html?id=" + encodeURIComponent(h.id));
    const where = [h.area, h.city].filter(Boolean).join(", ");
    const price = money(h.price, h.type === "rent" ? h.per : "");
    const b = (h.type === "rent" ? "A home to rent" : "A home for sale") + ": " + h.title + (where ? " in " + where : "") + (h.beds ? ", " + h.beds + " bedroom" + (h.beds === 1 ? "" : "s") : "") + (price ? ", " + price : "") + ". Checked on Synapse.";
    setBrief(b);
    toast("Photos added. Writing captions…");
    suggest(b);
  };

  /* pictures: your own uploads, or the ones taken from a home */
  const mediaRef = useRef<string[]>(media);
  mediaRef.current = media;
  const onPics = () => {
    const input = picRef.current!;
    const files = Array.from(input.files || []).slice(0, 10 - mediaRef.current.length);
    if (!files.length) return;
    setUploading((n) => n + 1);
    const added: string[] = [];
    auth().client().then((c: any) => files.reduce((p: Promise<void>, f) => p.then(() => {
      const isVid = /^video\/(mp4|quicktime)$/.test(f.type);
      if (!isVid && !/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Use JPG, PNG or WEBP pictures, or an MP4 or MOV video."); return; }
      if (!isVid && f.size > 8 * 1024 * 1024) { toast(f.name + " is over 8MB."); return; }
      if (isVid && f.size > 50 * 1024 * 1024) { toast(f.name + " is over 50MB. Compress it or trim it, then add it again."); return; }
      const ext = isVid ? (f.type === "video/quicktime" ? "mov" : "mp4") : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const d = new Date(), path = d.getUTCFullYear() + "/" + (d.getUTCMonth() + 1) + "/" + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())) + "." + ext;
      return c.storage.from("synapse-media").upload(path, f, { contentType: f.type, cacheControl: "31536000", upsert: false }).then((r: any) => {
        if (r.error) { toast("Could not upload " + f.name + "."); return; }
        added.push(c.storage.from("synapse-media").getPublicUrl(path).data.publicUrl);
      });
    }), Promise.resolve()))
      .catch(() => toast("Upload failed. Try again."))
      .then(() => {
        setMedia((m) => m.concat(added));
        setUploading((n) => Math.max(0, n - 1));
        input.value = "";
      });
  };

  /* ── when: now, one time, or several ─────────────────────────────── */
  const addTime = () => {
    /* The new row starts a day after the last one, at the same hour: the usual next thing. */
    const last = times.filter(Boolean).slice(-1)[0]; let nxt = "";
    if (last) { const d = new Date(last); d.setDate(d.getDate() + 1); nxt = localStamp(d); }
    setTimes(times.length === 1 && !times[0] ? [nxt] : times.concat(nxt));
  };
  const toggleRepeat = () => {
    const open = !repeatOpen; setRepeatOpen(open);
    if (open && !rpStart) { const d = new Date(Date.now() + 3600e3); d.setMinutes(0, 0, 0); setRpStart(localStamp(d)); }
  };
  const fillRepeat = () => {
    if (!rpStart) { toast("Choose the first time."); return; }
    const every = Number(rpEvery), count = Math.max(2, Math.min(30, Math.round(Number(rpCount) || 7))), out: string[] = [];
    let d = new Date(rpStart);
    for (let i = 0; i < count; i++) { out.push(localStamp(d)); d = new Date(d.getTime()); d.setDate(d.getDate() + every); }
    setTimes(out); setRepeatOpen(false);
  };
  const timesShown = times.length ? times : [""];
  const nTimes = times.filter(Boolean).length, nAccts = Object.keys(picked).filter((k) => picked[k]).length, nPosts = nTimes * Math.max(nAccts, 1);

  /* Send. "Schedule and write another" keeps the accounts and the times, and clears only the post itself, so a week of
     posts can be set up one after another without choosing the same things again. */
  const submit = (another: boolean) => {
    if (uploading) { toast("Wait for the pictures to finish uploading."); return; }
    const ids = chosenList.map((c) => c.id);
    if (!ids.length) { toast("Tap the accounts that should get this post."); return; }
    const wantsVideo = chosenList.some((c) => c.platform === "youtube");
    const hasVid = media.some((u) => VIDEO_RE.test(u));
    if (wantsVideo && !(media.length === 1 && hasVid)) { toast("YouTube takes one video and nothing else. Add the video and remove any pictures, or untick YouTube."); return; }
    if (hasVid && chosenList.some((c) => c.platform !== "youtube")) { toast("Only YouTube takes a video from here. Untick the other accounts, or remove the video."); return; }
    const body: Record<string, any> = { caption, media_urls: media, channel_ids: ids };
    if (whenMode === "later") {
      if (!at) { toast("Pick a date and time, or choose Now."); return; }
      body.scheduled_at = new Date(at).toISOString();
    } else if (whenMode === "many") {
      const ts = times.filter(Boolean).map((t) => new Date(t));
      if (!ts.length) { toast("Add at least one time."); return; }
      if (ts.some((d) => d.getTime() < Date.now() - 60000)) { toast("One of the times has already passed. Change it, or remove it."); return; }
      body.scheduled_times = ts.map((d) => d.toISOString());
    }
    const mode = whenMode;
    setSending(another ? "more" : "send");
    api("compose", body).then((d) => {
      toast(mode === "many" ? "Scheduled " + d.count + " post" + (d.count === 1 ? "" : "s") + "." : mode === "later" ? "Scheduled for " + when(d.at) + "." : "On its way.");
      setCaption(""); setMedia([]); setLink(""); setBrief(""); setSuggs([]);
      if (!another) { setPicked({}); if (mode === "many") setTimes([""]); }
      else { setAt(""); captionRef.current?.focus(); }
      return loadPosts();
    }).catch((e) => toast(e.message)).then(() => setSending(""));
  };
  const sendLabel = whenMode === "now" ? "Post" : whenMode === "many" ? "Schedule all" : "Schedule";

  const cancelPost = (id: string, btn: HTMLButtonElement) => {
    btn.disabled = true;
    api("post_cancel", { id }).then(() => { toast("Stopped."); loadPosts(); }).catch((er) => { toast(er.message); loadPosts(); });
  };
  const stopBatch = (g: string, btn: HTMLButtonElement) => {
    if (!window.confirm("Stop every post in this batch that has not gone out yet?")) return;
    btn.disabled = true;
    api("post_cancel", { group_id: g }).then((r) => { toast("Stopped " + (r.stopped || "them") + "."); loadPosts(); }).catch((er) => { toast(er.message); loadPosts(); });
  };
  const postList = () => {
    if (postsErr && !posts) return <div className="empty">{postsErr}</div>;
    if (!posts) return <div className="empty">Loading…</div>;
    /* Waiting posts first, soonest first, grouped by day; then what has gone out, newest first. */
    const waiting = posts.filter((x) => x.status === "scheduled").sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
    const done = posts.filter((x) => x.status !== "scheduled");
    const batches: Record<string, number> = {}; waiting.forEach((x) => { batches[x.group_id] = (batches[x.group_id] || 0) + 1; });
    const row = (x: any) => {
      const ch = x.channel || {};
      return (
        <div className="item" key={x.id}>
          <div className="item-top"><Badge p={x.platform} size="sm" /><b>{ch.label || ch.handle || PL[x.platform]}</b>
            <StatusPill s={x.status} /><span className="muted small">{when(x.published_at || x.scheduled_at)}</span><span className="spacer"></span>
            {x.status === "scheduled" ? <button className="btn sm" data-cancel={x.id} type="button" onClick={(e) => cancelPost(x.id, e.currentTarget)}>Stop</button> : null}</div>
          <div className="item-text">{String(x.caption || "").slice(0, 220)}</div>
          {x.failure_reason ? <div className="small" style={{ color: "var(--bad)" }}>{x.failure_reason}</div> : null}
        </div>
      );
    };
    const big = Object.keys(batches).filter((g) => batches[g] > 1);
    let lastDay = "";
    const out: ReactNode[] = [];
    if (big.length) out.push(<div className="row" style={{ marginBottom: "6px" }} key="batches">{big.map((g) => <button key={g} className="btn sm danger" type="button" data-stopbatch={g} onClick={(e) => stopBatch(g, e.currentTarget)}>Stop all {batches[g]} in one batch</button>)}</div>);
    waiting.forEach((x) => {
      const dl = dayLabel(x.scheduled_at);
      if (dl !== lastDay) { out.push(<div className="k" style={DAY_HEAD} key={"d" + x.id}>{dl}</div>); lastDay = dl; }
      out.push(row(x));
    });
    if (done.length) { out.push(<div className="k" style={{ ...DAY_HEAD, margin: "22px 0 2px" }} key="recent">Recent</div>); done.forEach((x) => out.push(row(x))); }
    return out.length ? out : <div className="empty">Nothing yet. Your first post will show here.</div>;
  };

  /* ── automation ───────────────────────────────────────────────────── */
  const flipTwins = () => {
    const on = !(overview && overview.twins_enabled);
    if (on && !window.confirm("Switch on sharing? Every post an agency makes will also go out on the channels set to receive it.")) return;
    setOverview((o) => (o ? { ...o, twins_enabled: on } : o));
    api("settings_set", { twins_enabled: on }).then(() => { toast(on ? "Sharing is on." : "Sharing is off."); return loadOverview(); })
      .catch((e) => { toast(e.message); loadOverview(); });
  };

  /* ── team ─────────────────────────────────────────────────────────── */
  const [invite, setInvite] = useState<Invite>(null);
  const [inviting, setInviting] = useState(false);
  const [mEmail, setMEmail] = useState("");
  const [mRole, setMRole] = useState("social_manager");
  const [copied, setCopied] = useState(false);
  const copyLink = (lnk: string, mark: boolean) => {
    const done = () => { toast("Link copied."); if (mark) { setCopied(true); setTimeout(() => setCopied(false), 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lnk).then(done, () => { window.prompt("Copy this link:", lnk); });
    else window.prompt("Copy this link:", lnk);
  };
  const sendInvite = () => {
    const email = mEmail.trim(); setInviting(true); setInvite(null);
    api("staff_invite", { email, role: mRole }).then((d) => {
      if (d.status === "emailed") { toast("Invitation sent to " + email + "."); setInvite({ kind: "emailed", email }); }
      else if (d.status === "existing") { toast("They already have an account."); setInvite({ kind: "existing", email }); }
      else if (d.link) setInvite({ kind: "link", email, link: d.link, why: d.status === "link" ? "The email could not be sent (" + (d.reason || "no reason given") + ")." : "" });
      setMEmail(""); loadStaff();
    }).catch((e) => toast(e.message)).then(() => setInviting(false));
  };
  const staffLink = (id: string, btn: HTMLButtonElement) => {
    btn.disabled = true;
    api("staff_link", { profile_id: id }).then((d) => copyLink(d.link, false)).catch((er) => toast(er.message)).then(() => { btn.disabled = false; });
  };
  const removeStaff = (id: string) => {
    if (!window.confirm("Remove their access to the studio?")) return;
    api("staff_remove", { profile_id: id }).then(() => { toast("Removed."); loadStaff(); }).catch((er) => toast(er.message));
  };

  /* ── home ─────────────────────────────────────────────────────────── */
  const home = (() => {
    if (!overview) return null;
    const o = overview, ch = o.channels || [], legacy = (o.legacy || []).filter((l) => l.is_active);
    const live = ch.filter((c) => c.is_active), auto = live.filter((c) => c.autopilot), mirror = live.filter((c) => c.mirror);
    const today = ch.reduce((a, c) => a + (Number(c.posts_today) || 0), 0);
    const queued = (posts || []).filter((p) => p.status === "scheduled").length;
    const hr = new Date().getHours();
    const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    const steps = [
      { done: ch.length > 0, t: "Connect a social account", s: "Add Instagram, Facebook, TikTok, LinkedIn or X. We walk you through it.", btn: "Add a channel", act: "add" },
      { done: auto.length > 0, t: "Let a channel post homes by itself", s: "Turn on Autopilot and it posts the newest live listings on a schedule.", btn: "Choose channels", act: "channels" },
      { done: !!o.twins_enabled && mirror.length > 0, t: "Share what agencies post", s: "Turn on mirroring, then choose which channels receive agencies’ posts.", btn: "Set up sharing", act: "auto" },
      { done: (posts || []).length > 0, t: "Write your first post", s: "An announcement, a tip or a campaign, with a live preview.", btn: "Create a post", act: "compose" },
    ];
    const left = steps.filter((x) => !x.done), next = left[0];
    const mir = ch.filter((c) => c.is_active && c.mirror).length + legacy.length;
    return { o, ch, legacy, auto, today, queued, greet, steps, left, next, mir };
  })();
  const step = (act: string) => { if (act === "add") openWizard(); else show(act as Tab); };

  /* The wizard's body for the step it is on. */
  const wizard = () => {
    if (W.step === 1) return <>
      <h2 className="h" id="wzTitle" style={{ fontSize: "25px" }}>Which network?</h2><p className="lede">Synapse connects these directly. Other networks will appear here as Synapse connects to them.</p>
      <div className="tiles" style={{ marginTop: "18px" }}>{CONNECTABLE.map((p) => (
        <button key={p} type="button" className="tile" data-plat={p} onClick={() => goStep({ platform: p, step: 2 })}><Badge p={p} size="lg" /><span>{PL[p]}</span><small>{p === "telegram" ? "channel posts" : MAKE[p].what}</small></button>
      ))}</div>
      <div className="row" style={{ marginTop: "20px" }}><span className="spacer"></span><button className="btn" type="button" data-wzclose onClick={closeWizard}>Cancel</button></div>
    </>;
    const back = <button className="btn" type="button" data-wzback onClick={() => goStep({ step: Math.max(1, W.step - 1) })}>Back</button>;
    if (W.platform === "facebook" && W.step === 2) return <>
      <div className="row" style={{ gap: "14px" }}><Badge p="facebook" size="lg" /><div className="grow"><h2 className="h" id="wzTitle" style={{ fontSize: "25px" }}>Connect a Facebook Page</h2><p className="muted small">Facebook asks you to sign in and choose Pages, then brings you back here to pick which ones are Synapse’s.</p></div></div>
      <div className="stack" style={{ marginTop: "18px" }}>
        <div className="gstep"><span className="dot">1</span><div className="grow"><b>Sign in to Facebook as a Page admin</b><p className="muted small" style={{ margin: "4px 0 0" }}>Use the Facebook account that manages Synapse’s Page. When Facebook lists Pages, tick Synapse’s and leave every permission on.</p></div></div>
        <div className="gstep"><span className="dot">2</span><div className="grow"><b>Pick the Page here</b><p className="muted small" style={{ margin: "4px 0 0" }}>Only the Pages you tick become channels. They start quiet: nothing posts until you switch it on.</p></div></div>
        <details className="pace"><summary>No Page yet?</summary><div className="callout" style={{ margin: "8px 0 10px" }}>{MAKE.facebook.tip}</div>
          <a className="btn sm" href={MAKE.facebook.url} target="_blank" rel="noopener">Create a Facebook Page ↗</a></details>
      </div>
      <div className="row" style={{ marginTop: "22px" }}>{back}<span className="spacer"></span><button className="btn orange big" type="button" id="wzFb" disabled={wzBusy} onClick={startFacebook}>{wzBusy ? "Opening Facebook…" : "Continue with Facebook"}</button></div>
    </>;
    if (W.platform === "facebook") {
      const pages = W.pages || [], any = Object.keys(W.chosen).some((k) => W.chosen[k]);
      return <>
        <h2 className="h" id="wzTitle" style={{ fontSize: "25px" }}>Which Pages are Synapse’s?</h2><p className="lede">Tick the Pages Synapse should post to.</p>
        <div style={{ marginTop: "12px" }}>{pages.length ? pages.map((p) => {
          const on = !!W.chosen[p.id];
          return (
            <div className="acct" key={p.id}><Badge p="facebook" /><div className="grow"><b>{p.name || p.id}</b><div className="muted small">{p.connected ? "Already a channel: ticking it refreshes the connection" : "Facebook Page"}</div></div>
              <button className={"btn sm " + (on ? "orange" : "")} type="button" data-page={p.id} onClick={() => setW((w) => ({ ...w, chosen: { ...w.chosen, [p.id]: !w.chosen[p.id] } }))}>{on ? "Chosen ✓" : "Choose"}</button></div>
          );
        }) : <div className="callout">Facebook shared no Page. Connect again and tick Synapse’s Page when Facebook asks.</div>}</div>
        <div className="row" style={{ marginTop: "22px" }}><button className="btn" type="button" data-wzclose onClick={closeWizard}>Cancel</button><span className="spacer"></span>
          <button className="btn orange big" type="button" id="wzPages" disabled={!any || wzBusy} onClick={addPages}>{wzBusy ? "Adding…" : "Add as channels"}</button></div>
      </>;
    }
    if (W.platform === "telegram" && W.step === 2) return <>
      <div className="row" style={{ gap: "14px" }}><Badge p="telegram" size="lg" /><div className="grow"><h2 className="h" id="wzTitle" style={{ fontSize: "25px" }}>Add a Telegram channel</h2><p className="muted small">A public channel Synapse owns. Our bot posts to it.</p></div></div>
      <div className="stack" style={{ marginTop: "18px" }}>
        <div><label className="f" htmlFor="wzTg">The channel’s public name</label><input type="text" id="wzTg" ref={tgRef} maxLength={60} placeholder="@SynapseLagos" /></div>
        <div><label className="f" htmlFor="wzCity">City <span className="muted">(blank = every city)</span></label><input type="text" id="wzCity" ref={tgCityRef} maxLength={60} placeholder="e.g. Lagos" /></div>
      </div>
      <div className="row" style={{ marginTop: "22px" }}>{back}<span className="spacer"></span><button className="btn orange big" type="button" id="wzTgAdd" disabled={wzBusy} onClick={addTelegram}>{wzBusy ? "Adding…" : "Next"}</button></div>
    </>;
    return <>
      <div className="row" style={{ gap: "14px" }}><Badge p="telegram" size="lg" /><div className="grow"><h2 className="h" id="wzTitle" style={{ fontSize: "25px" }}>Make our bot an admin</h2></div></div>
      <ol className="steps-l" style={{ margin: "14px 0 0" }}><li>Open the channel in Telegram, then <b>Administrators</b>, <b>Add Admin</b>.</li>
        <li>Search for <b>{W.bot || "the Synapse bot"}</b> and add it.</li><li>Leave <b>Post messages</b> on and save.</li></ol>
      <div className="callout" style={{ marginTop: "14px" }}>The channel switches itself on as soon as Telegram tells Synapse. You can close this.</div>
      <div className="row" style={{ marginTop: "22px" }}><span className="spacer"></span><button className="btn orange big" type="button" data-wzdone onClick={() => { closeWizard(); loadOverview().then(() => show("channels")); }}>Done</button></div>
    </>;
  };

  /* The preview takes the first ticked account, else the first that can be posted to. */
  const pvFirst = chosenList[0] || postable[0];
  const pvPf = pvFirst ? pvFirst.platform : "instagram";
  const pvCap = caption.trim();
  const navBtn = (t: Tab, label: string, icon: ReactNode, extra?: object) => (
    <button className="nb" type="button" data-tab={t} aria-current={tab === t ? "page" : undefined} onClick={() => show(t)} {...extra}>{icon}<span>{label}</span></button>
  );

  return (
    <>
      <div className="gate" id="gate" hidden={!gate}>
        {gate?.kind === "opening" ? "Opening…" : gate?.kind === "nothing" ? "There is nothing here." : gate?.kind === "outsider" ? <>
          You are signed in as <b>{gate.email}</b>, which is not on the Synapse team. Ask an admin to add this email, or sign in with another one.
          <div style={{ marginTop: "18px" }}><button className="btn" id="gateOut" type="button" onClick={() => auth().signOut().then(() => { location.href = "signin.html?next=synapse.html"; })}>Sign out</button></div>
        </> : null}
      </div>
      <div className="shell" id="app" hidden={!!gate}>
        <aside className="side" aria-label="Studio">
          <div className="brand">
            <a href="synapse.html" className="bm-link" aria-label="Synapse studio" style={{ display: "grid", placeItems: "center", width: "34px", height: "34px", borderRadius: "10px", background: "var(--orange)", flex: "none" }}>
              <img src="../images/brand/mark-black-on-white-tight.jpg" alt="" style={{ width: "15px", height: "21px" }} />
            </a>
            <div>Synapse<small>Studio</small></div>
          </div>
          <nav className="nav" id="nav">
            {navBtn("home", "Home", <svg className="i" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></svg>)}
            {navBtn("channels", "Channels", <svg className="i" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="6" r="2.6" /><circle cx="18" cy="18" r="2.6" /><path d="M8.3 10.8 15.7 7.2M8.3 13.2l7.4 3.6" /></svg>)}
            {navBtn("compose", "Create", <svg className="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>)}
            {navBtn("auto", "Automation", <svg className="i" viewBox="0 0 24 24"><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>)}
            {navBtn("activity", "Activity", <svg className="i" viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>)}
            {navBtn("guide", "Guide", <svg className="i" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5V21.5M9 8h7M9 12h5" /></svg>)}
            {navBtn("team", "Team", <svg className="i" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.8.7 3 2.3 3 5.2" /></svg>, { id: "teamTab", hidden: !canManage })}
          </nav>
          <div className="side-foot">
            <div className="who" id="who">{who}</div>
            <button className="btn sm" id="out" type="button" onClick={signOut}>Sign out</button>
          </div>
        </aside>
        <div>
          <div className="mtop">
            <span>Synapse studio</span>
            <button className="btn sm" id="outM" type="button" onClick={signOut}>Sign out</button>
          </div>
          <main>
            <section className="pane" id="p-home" hidden={tab !== "home"}>
              <div className="hero">
                <h2 id="heroTitle">{home ? home.greet + (name ? ", " + name : "") + "." : "Welcome to the studio"}</h2>
                <p id="heroText">{!home ? "This is where Synapse posts to its own social media, and shares what agencies publish."
                  : home.next ? "Next up: " + home.next.t.charAt(0).toLowerCase() + home.next.t.slice(1) + "." : "Everything is set up. Synapse is posting on its own; you can still write a post any time."}</p>
                <div className="row" id="heroBtns">{home ? <>
                  {home.next ? <button className="btn orange big" type="button" data-step={home.next.act} onClick={() => step(home.next!.act)}>{home.next.btn}</button> : null}
                  <button className="btn big" type="button" data-step="compose" style={{ background: "transparent", color: "#F5F2EE", borderColor: "rgba(255,255,255,.3)" }} onClick={() => step("compose")}>Create a post</button>
                </> : null}</div>
              </div>
              <div className="stats" id="stats">{home ? ([
                [home.ch.length + (home.legacy.length ? home.legacy.length : 0), "channels connected"], [home.auto.length, "on autopilot"], [home.today, "posted today"], [home.queued, "scheduled"], [home.o.live_listings || 0, "live listings"],
              ] as [number, string][]).map((x) => <div className="stat" key={x[1]}><b>{x[0]}</b><span>{x[1]}</span></div>) : null}</div>
              <div className="card">
                <h2 className="h2">Get set up</h2>
                <p className="muted small" style={{ marginTop: "4px" }}>
                  <span id="stepsLede">{!home ? "Four steps. Each one takes a couple of minutes." : home.left.length ? home.left.length + " of 4 to go." : "All done."}</span>
                  {" New here? "}
                  <a href="#" data-go="guide" style={{ fontWeight: "600" }} onClick={() => show("guide")}>Read the visual guide</a>
                  .
                </p>
                <div id="steps" style={{ marginTop: "8px" }}>{home ? home.steps.map((x, i) => (
                  <div className={"step" + (x.done ? " done" : "")} key={x.act}><span className="dot">{x.done ? "✓" : i + 1}</span><div className="grow"><b>{x.t}</b><small>{x.s}</small></div>
                    {x.done ? null : <button className="btn sm" type="button" data-step={x.act} onClick={() => step(x.act)}>{x.btn}</button>}</div>
                )) : null}</div>
              </div>
              <div className="card">
                <div className="row">
                  <h2 className="h2">Latest activity</h2>
                  <span className="spacer"></span>
                  <button className="btn sm" type="button" data-go="activity" onClick={() => show("activity")}>See all</button>
                </div>
                <div id="homeAct">{actErr && !activity ? <div className="empty">{actErr}</div> : !activity ? <div className="empty">Loading…</div>
                  : activity.length ? activity.slice(0, 4).map((x, i) => <ActRow x={x} key={i} />) : <div className="empty">Nothing has posted yet. Once a channel is on, its posts show here.</div>}</div>
              </div>
            </section>
            <section className="pane" id="p-channels" hidden={tab !== "channels"}>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">Channels</h1>
                  <p className="lede">The social accounts Synapse posts from. Each one can post Synapse's own content, post homes by itself, and share agencies' posts.</p>
                </div>
                <button className="btn orange big" type="button" data-addchan="" onClick={openWizard}>{PLUS}Add a channel</button>
              </div>
              <div id="chanList" className="grid" ref={chanBox} onBlur={onChanBlur}>
                {loadFailed ? <div className="card"><b>The studio could not load.</b> <button className="btn sm" type="button" data-retry onClick={() => { setOverview(null); ovRef.current = null; loadOverview(); }}>Try again</button></div> : null}
                {chanView ? <>
                  {(chanView.channels || []).map(channelCard)}
                  <button type="button" className="card addcard" data-addchan onClick={openWizard}><span className="plus">{PLUS}</span>{(chanView.channels || []).length ? "Add another channel" : "Add your first channel"}</button>
                </> : null}
              </div>
              {/* The developer accounts were TryPost's, retired on 2026-10-24: Synapse's Facebook posts through a Page connected with
                  Add a channel. The card is not shown. */}
              <div className="card stack" id="legacyCard" hidden>
                <h2 className="h2">Developer accounts</h2>
                <p className="muted small">These were connected first, with the developer logins. They still receive agencies' posts when mirroring is on. Switch one off once the team's own account replaces it.</p>
                <div id="legacyList"></div>
              </div>
            </section>
            <section className="pane" id="p-compose" hidden={tab !== "compose"}>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">Create a post</h1>
                  <p className="lede">Write it, add pictures, pick where it goes, and send it now or at a time you choose.</p>
                </div>
              </div>
              <div className="create">
                <div className="stack">
                  <div className="card stack">
                    <div>
                      <label className="f">{"1 · Start from a real home "}<span className="muted">(optional)</span></label>
                      <p className="muted small" style={{ margin: "-2px 0 10px" }}>Pick a live listing: its photos are added and the captions are written from its real details.</p>
                      <div className="homes" id="homes">{homesErr ? <div className="empty">Could not load homes.</div> : !homes ? <div className="empty">Loading homes…</div>
                        : homes.length ? homes.map((h, i) => (
                          <button type="button" className="home" data-h={i} key={h.id} onClick={() => pickHome(h)}><div className="ph" style={{ backgroundImage: "url('" + h.pics[0] + "')" }}></div><div className="t"><b>{h.title}</b>
                            <span className="muted">{[h.area, h.city].filter(Boolean).join(", ")}</span><br /><span>{money(h.price, h.type === "rent" ? h.per : "")}</span></div></button>
                        )) : <div className="empty">No live homes with photos right now.</div>}</div>
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f" htmlFor="brief">2 · What is the post about?</label>
                      <div className="row">
                        <input type="text" id="brief" ref={briefRef} className="grow" placeholder="e.g. Tayo now tells you what was checked on every home" maxLength={300} value={brief} onChange={(e) => setBrief(e.target.value)} />
                        <button className="btn sm orange" id="suggest" type="button" disabled={suggesting} onClick={() => suggest()}>{suggesting ? "Writing…" : "✨ Write captions"}</button>
                      </div>
                    </div>
                    <div className="opts3" id="suggs">{suggs.map((o, i) => <button type="button" className="sugg" data-i={i} key={i} onClick={() => takeSugg(i)}>{o}</button>)}</div>
                    <div>
                      <label className="f" htmlFor="caption">Caption</label>
                      <textarea id="caption" ref={captionRef} maxLength={5000} placeholder="Write the post, or pick one of the captions above" value={caption} onChange={(e) => setCaption(e.target.value)} />
                      <div className="small muted" id="count" style={{ marginTop: "6px" }}>{overview || caption ? countMsg : ""}</div>
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f">3 · Pictures, or a video for YouTube</label>
                      <div className="thumbs" id="thumbs">
                        {media.map((u, i) => (
                          <div className="thumb" key={i + u}>{VIDEO_RE.test(u) ? <video src={u + "#t=0.1"} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }}></video> : <img alt="" src={u} />}
                            <button type="button" data-rm={i} aria-label="Remove" onClick={() => setMedia((m) => m.filter((_, j) => j !== i))}>×</button></div>
                        ))}
                        {media.length < 10 ? <button type="button" className="drop" id="addPic" disabled={!!uploading} onClick={() => picRef.current?.click()}>{PLUS}<span>{uploading ? "Uploading…" : "Add"}</span></button> : null}
                      </div>
                      <input type="file" id="pic" ref={picRef} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple hidden onChange={onPics} />
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f">4 · Where should it go?</label>
                      <div className="picks" id="picks">{!overview ? null : postable.length ? <>
                        {postable.map((c) => (
                          <button key={c.id} type="button" className="pick" data-ch={c.id} data-pl={c.platform} aria-pressed={picked[c.id] ? "true" : "false"}
                            onClick={() => setPicked((p) => ({ ...p, [c.id]: !p[c.id] }))}><Badge p={c.platform} size="sm" />{c.label || PL[c.platform]}</button>
                        ))}
                        <button type="button" className="pick plain" data-addchan aria-label="Add a channel" onClick={openWizard}>+ Add channel</button>
                      </> : <button type="button" className="btn orange" data-addchan onClick={openWizard}>Add a channel first</button>}</div>
                      <p className="small muted" id="picksNote" style={{ marginTop: "8px" }}>{overview && postable.length && !anyPicked ? "Tap the accounts that should get this post." : ""}</p>
                    </div>
                    <div>
                      <label className="f">5 · When?</label>
                      <div className="row">
                        <button className="pick plain" id="whenNow" type="button" aria-pressed={whenMode === "now" ? "true" : "false"} onClick={() => setWhenMode("now")}>Now</button>
                        <button className="pick plain" id="whenLater" type="button" aria-pressed={whenMode === "later" ? "true" : "false"} onClick={() => setWhenMode("later")}>Pick a time</button>
                        <button className="pick plain" id="whenMany" type="button" aria-pressed={whenMode === "many" ? "true" : "false"} onClick={() => setWhenMode("many")}>Several times</button>
                        <div id="atWrap" hidden={whenMode !== "later"} style={{ flex: "1 1 220px" }}>
                          <input type="datetime-local" id="at" aria-label="Date and time (your device's clock)" value={at} onChange={(e) => setAt(e.target.value)} />
                        </div>
                      </div>
                      <div id="manyWrap" hidden={whenMode !== "many"} style={{ marginTop: "12px" }}>
                        <p className="muted small" style={{ marginBottom: "8px" }}>The same post goes out at every time you add, on every account you ticked.</p>
                        <div id="manyList" className="stack" style={{ marginBottom: "10px" }}>{timesShown.map((t, i) => (
                          <div className="row" style={{ gap: "8px" }} key={i}><span className="dot" style={{ width: "26px", height: "26px", fontSize: "12px" }}>{i + 1}</span>
                            <input type="datetime-local" className="grow" data-ti={i} value={t} aria-label={"Time " + (i + 1)} onChange={(e) => { const v = e.target.value; setTimes((ts) => { const n = (ts.length ? ts : [""]).slice(); n[i] = v; return n; }); }} />
                            {timesShown.length > 1 ? <button className="btn sm" type="button" data-tdel={i} aria-label={"Remove time " + (i + 1)} onClick={() => setTimes((ts) => ts.filter((_, j) => j !== i))}>×</button> : null}</div>
                        ))}</div>
                        <div className="row">
                          <button className="btn sm" id="addTime" type="button" onClick={addTime}>+ Add a time</button>
                          <button className="btn sm" id="repeatBtn" type="button" onClick={toggleRepeat}>Repeat daily or weekly…</button>
                        </div>
                        <div id="repeatBox" className="callout" hidden={!repeatOpen} style={{ marginTop: "12px" }}>
                          <div className="row">
                            <div><label className="f" htmlFor="rpStart">First time</label><input type="datetime-local" id="rpStart" value={rpStart} onChange={(e) => setRpStart(e.target.value)} /></div>
                            <div><label className="f" htmlFor="rpEvery">Every</label>
                              <select id="rpEvery" value={rpEvery} onChange={(e) => setRpEvery(e.target.value)}><option value="1">day</option><option value="2">2 days</option><option value="7">week</option></select></div>
                            <div><label className="f" htmlFor="rpCount">How many times</label><input type="number" id="rpCount" min="2" max="30" style={{ width: "90px" }} value={rpCount} onChange={(e) => setRpCount(e.target.value)} /></div>
                            <div style={{ alignSelf: "flex-end" }}><button className="btn sm primary" id="rpFill" type="button" onClick={fillRepeat}>Fill the list</button></div>
                          </div>
                        </div>
                        <p className="small" id="manySummary" style={{ marginTop: "10px" }}>{whenMode !== "many" ? null : nTimes
                          ? <><b>{nPosts}</b> <span className="muted">post{nPosts === 1 ? "" : "s"} will be scheduled ({nTimes} time{nTimes === 1 ? "" : "s"}{nAccts ? " × " + nAccts + " account" + (nAccts === 1 ? "" : "s") : ""}).</span></>
                          : <span className="muted">Add at least one time.</span>}</p>
                      </div>
                    </div>
                    <div className="row">
                      <button className="btn primary big" id="send" type="button" disabled={!!uploading || !!sending} onClick={() => submit(false)}>{sending === "send" ? "Sending…" : sendLabel}</button>
                      <button className="btn big" id="sendMore" type="button" hidden={whenMode === "now"} disabled={!!sending} onClick={() => submit(true)}>{sending === "more" ? "Sending…" : "Schedule and write another"}</button>
                    </div>
                  </div>
                </div>
                <div className="preview stack">
                  <div className="phone" aria-label="Preview of the post">
                    <div className="ph-top">
                      <span className={"pf sm pf-" + (PL[pvPf] ? pvPf : "x")} id="pvBadge">{GLYPH[pvPf] || "S"}</span>
                      <div>
                        <b id="pvName">{pvFirst ? pvFirst.label || pvFirst.handle || PL[pvPf] : "Your channel"}</b>
                        <span className="muted small" id="pvSub">{pvFirst ? PL[pvPf] : "Preview"}</span>
                      </div>
                    </div>
                    <div className="ph-img" id="pvImg" style={{ gridTemplateColumns: media.length > 1 ? "repeat(" + Math.min(media.length, 2) + ", 1fr)" : undefined }}>
                      {media.length ? media.slice(0, 4).map((u, i) => (VIDEO_RE.test(u)
                        ? <video key={i} src={u + "#t=0.1"} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }}></video>
                        : <img key={i} alt="" src={u} />)) : "Pictures show here"}
                    </div>
                    <div className={"ph-cap" + (pvCap ? "" : " none")} id="pvCap">{pvCap || "Your caption shows here."}</div>
                  </div>
                  <p className="muted small">A rough preview. Each network crops and wraps a little differently.</p>
                </div>
              </div>
              <div className="card">
                <h2 className="h2">Scheduled and recent</h2>
                <div id="postList">{postList()}</div>
              </div>
            </section>
            <section className="pane" id="p-auto" hidden={tab !== "auto"}>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">Automation</h1>
                  <p className="lede">Two things run without anyone pressing a button. Both stay inside each channel's pacing, so no channel is flooded.</p>
                </div>
              </div>
              <div className="card">
                <div className="opt">
                  <span className="pf" style={{ background: "var(--orange)", color: "#15120F" }}><svg className="i" viewBox="0 0 24 24"><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg></span>
                  <div className="grow">
                    <b>Post the live listings</b>{" "}
                    <small>Each channel with Autopilot on posts one home at a time from the live inventory: newest first, in the hours and the daily limit you set on the channel. A home goes out again only after its repeat period.</small>
                  </div>
                </div>
                <div id="autoSummary" className="small muted">{!home ? "" : home.auto.length
                  ? home.auto.length + " channel" + (home.auto.length === 1 ? "" : "s") + " on autopilot, drawing on " + home.o.live_listings + " live listing" + (home.o.live_listings === 1 ? "" : "s") + "."
                  : "No channel is on autopilot yet."}</div>
                <div style={{ marginTop: "12px" }}><button className="btn sm" type="button" data-go="channels" onClick={() => show("channels")}>Choose channels</button></div>
              </div>
              <div className="card">
                <div className="opt">
                  <span className="pf" style={{ background: "var(--ok)", color: "#fff" }}><svg className="i" viewBox="0 0 24 24"><path d="M17 3l4 4-4 4" /><path d="M3 11V9a2 2 0 0 1 2-2h16" /><path d="M7 21l-4-4 4-4" /><path d="M21 13v2a2 2 0 0 1-2 2H3" /></svg></span>
                  <div className="grow">
                    <b>Share agencies' posts</b>{" "}
                    <small>
                      {"When an agency posts a listing, Synapse's channels that ask for it post it too, with a link that still credits the agency. Agencies are not asked first: this is Synapse sharing what they publish. Which page takes which listing is set here, on each channel, under "}
                      <b>What this page takes</b>
                      : a 2-bedroom flat goes only to the page set up for 2-bedroom flats.
                    </small>
                  </div>
                  <button className="sw" id="twinSw" role="switch" aria-checked={overview && overview.twins_enabled ? "true" : "false"} aria-label="Share agencies' posts" disabled={loadFailed} onClick={flipTwins}></button>
                </div>
                <div id="mirrorSummary" className="small muted">{!home ? "" : home.o.twins_enabled
                  ? home.mir + " channel" + (home.mir === 1 ? "" : "s") + " will receive the next agency post."
                  : (loadFailed ? "The setting could not be loaded. Reload to see it." : "Off. Agencies’ posts stay on their own accounts.")}</div>
              </div>
            </section>
            <section className="pane" id="p-activity" hidden={tab !== "activity"}>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">Activity</h1>
                  <p className="lede">What Synapse's channels have posted lately, and what is waiting.</p>
                </div>
              </div>
              <div className="card">
                <div id="actList">{actErr && !activity ? <div className="empty">{actErr}</div> : !activity ? <div className="empty">Loading…</div>
                  : activity.length ? activity.slice(0, 60).map((x, i) => <ActRow x={x} key={i} />) : <div className="empty">Nothing has posted yet.</div>}</div>
              </div>
            </section>
            <section className="pane" id="p-guide" hidden={tab !== "guide"}>{guide}</section>
            <section className="pane" id="p-team" hidden={tab !== "team"}>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">Team</h1>
                  <p className="lede">Who can open the studio. Enter an email and Synapse sends an invitation: the link in it brings them to a page where they choose a password and create their account as part of the team. Someone who already has a Synapse account just gets access. An admin can invite and remove anyone.</p>
                </div>
              </div>
              <div className="card stack">
                <div className="row">
                  <div className="grow"><label className="f" htmlFor="mEmail">Email</label><input type="email" id="mEmail" placeholder="name@example.com" autoComplete="off" value={mEmail} onChange={(e) => setMEmail(e.target.value)} /></div>
                  <div><label className="f" htmlFor="mRole">Role</label>
                    <select id="mRole" value={mRole} onChange={(e) => setMRole(e.target.value)}><option value="social_manager">Social media manager</option><option value="admin">Admin</option></select></div>
                  <div style={{ alignSelf: "flex-end" }}><button className="btn primary" id="mAdd" type="button" disabled={inviting} onClick={sendInvite}>{inviting ? "Sending…" : "Send invitation"}</button></div>
                </div>
                <div id="inviteRes" hidden={!invite}>{!invite ? null
                  : invite.kind === "emailed" ? <p className="small" style={{ color: "var(--ok)" }}>Invitation sent to <b>{invite.email}</b>. The email has a link that brings them here to create their account.</p>
                  : invite.kind === "existing" ? <p className="small" style={{ color: "var(--ok)" }}><b>{invite.email}</b> already has a Synapse account and now has studio access. They sign in as usual.</p>
                  : <div className="card" style={{ boxShadow: "none" }}><b>Send them this link</b>
                    <p className="muted small" style={{ marginTop: "6px" }}>{(invite.why ? invite.why + " " : "") + "Copy the link and send it to " + invite.email + " yourself, by WhatsApp or email. It works once."}</p>
                    <div className="row" style={{ marginTop: "12px" }}><input type="text" readOnly id="linkBox" className="grow" value={invite.link} aria-label="Invitation link" />
                      <button className="btn sm primary" id="linkCopy" type="button" onClick={() => copyLink(invite.link, true)}>{copied ? "Copied" : "Copy"}</button></div></div>}</div>
                <div id="staffList">{staffErr && !staff ? <div className="empty">{staffErr}</div> : !staff ? null : staff.length ? staff.map((x) => (
                  <div className="opt" key={x.profile_id}><div className="grow"><b>{x.email || "Unknown"}</b><small>{(x.role === "admin" ? "Admin" : "Social media manager") + " · " + (x.joined ? "Joined" : "Invitation not opened yet")}</small></div>
                    {x.joined ? null : <button className="btn sm" data-linkstaff={x.profile_id} type="button" onClick={(e) => staffLink(x.profile_id, e.currentTarget)}>Copy link</button>}
                    <button className="btn sm danger" data-rmstaff={x.profile_id} type="button" onClick={() => removeStaff(x.profile_id)}>Remove</button></div>
                )) : <div className="empty">Only founders so far.</div>}</div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <div className="veil" id="veil" hidden={!wizOpen} onClick={(e) => { if (e.target === e.currentTarget) closeWizard(); }}>
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="wzTitle">
          <div className="prog" id="wzProg">{[0, 1, 2].map((i) => <i key={i} className={wizOpen && i < W.step ? "on" : undefined}></i>)}</div>
          <div id="wz" ref={wzRef}>{wizOpen ? wizard() : null}</div>
        </div>
      </div>
      <div className="toast" id="toast" hidden={toastMsg == null} role="status" aria-live="polite">{toastMsg}</div>
    </>
  );
}
