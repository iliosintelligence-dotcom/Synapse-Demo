"use client";
/**
 * "Generate a campaign", as React (was the campaign generator's block in src/legacy/agency/inline-3.js). Pulls the agency's own
 * listings (the Listings pane's LISTINGS_DATA, never the public listing set), asks social-generate for one distinct angle per
 * channel, and shows what passed each platform's limits before anything can be queued. Rehearse validates without touching an
 * account; Publish for real writes each post to the queue (queue_social_post) and only then sends it (social-publish), so a
 * provider outage costs the attempt and never the intent. Every generation is filed (saveGeneration) and listed under Earlier
 * versions.
 *
 * The channels it posts to are SocialChannels.tsx. window.BRAND (the agency's brand, which the composer and the listing form also
 * read) is loaded here, as it was.
 */
import { useEffect, useRef, useState } from "react";
import { usePageScripts } from "@/legacy/usePageScripts";
import { CONNECTABLE, ChannelStrip, ChannelsHost, Mark, connectedTo, expired, liveCount, toastOrAlert, token, useChannels } from "./SocialChannels";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const S = () => W().SynSyndicate;
const sbUrl = (): string => (W().SynSB && W().SynSB.url) || "";
const sbKey = (): string => (W().SynSB && W().SynSB.key) || "";
const CH_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", whatsapp: "WhatsApp", x: "X", telegram: "Telegram" };
/* Six dots, because a token is six base62 characters; defined once, so no render can be tempted to build one out of a real token. */
const LINK_PREVIEW = "synapsecore.dev/s/••••••";
const SHORT_HOST = "https://www.synapsecore.dev";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PICK_KEY = "syn_cmp_chans_v1";
const MIN_KEY = "syn_cmp_collapsed";
const PLAT_OF: Record<string, string> = {
  instagram_post: "Instagram", instagram_reel: "Instagram", tiktok_script: "TikTok", youtube_short: "YouTube",
  facebook_post: "Facebook", whatsapp_message: "WhatsApp", linkedin_post: "LinkedIn", brochure_copy: "Brochure", email_body: "Email",
  x_post: "X", telegram_post: "Telegram",
};

/* /s/:token is rewritten to the edge function on any real deployment, so the short link lives on whatever host serves this page;
   only localhost has no such rewrite and falls back to the canonical host. */
function shortUrl(tok: string) {
  const o = location.origin;
  return (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/i.test(o) ? SHORT_HOST : o) + "/s/" + tok;
}
function whenAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hrs / 24);
  if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(iso).toLocaleDateString();
}
/* The picker's projection of a listing. Verification is not a filter -- an agency may market a listing it has just put up --
   syndication.js decides what may honestly be CLAIMED about an unverified home. */
function pickerRows(): any[] {
  const all: any[] = (W().SynListingsData && W().SynListingsData()) || [];
  return all.filter((l) => l.is_active !== false).map((l) => ({
    id: l.id, title: l.title || l.t, city: l.city, listing_type: l.listing_type, property_type: l.property_type,
    price: l.price, bedrooms: l.bedrooms, trust_score: l.trust_score, verification_status: l.verification_status, expires_at: l.expires_at,
    neighbourhood: l.neighbourhood || l.city, flood_risk: l.flood_risk, power_reliability: l.power_reliability,
  }));
}
/* The channels this campaign is for, kept on this device. With nothing chosen it starts from the accounts the agency has actually
   connected, else Instagram and Facebook, so nobody pays for six captions to post on two. */
function savedPick(plats: string[]): string[] | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PICK_KEY) || "null");
    if (Array.isArray(saved)) { const s = saved.filter((x) => plats.indexOf(x) > -1); if (s.length) return s; }
  } catch { /* none */ }
  return null;
}
function pickedPlats(pick: string[] | null): string[] {
  if (pick && pick.length) return pick.slice();
  const plats = Object.keys(S().PLATFORMS);
  const live = plats.filter((pl) => { const a = connectedTo(pl); return a && !expired(a); });
  if (live.length) return live;
  return ["instagram", "facebook"].filter((pl) => plats.indexOf(pl) > -1);
}

type Past = { rows: any[]; error: boolean };
type Run = { bar: string; stat: string; runLabel: string; liveLabel: string; runBusy: boolean; liveBusy: boolean };
const RUN0: Run = { bar: "0%", stat: "", runLabel: "", liveLabel: "Publish for real", runBusy: false, liveBusy: false };

export function CampaignGenerator() {
  const ready = usePageScripts();
  useChannels();   // the Publish button and the channel chips follow the accounts
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState(0);
  const [pick, setPick] = useState<string[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [writing, setWriting] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [plat, setPlat] = useState("");
  const [run, setRun] = useState<Run>(RUN0);
  const [results, setResults] = useState<any[] | null>(null);
  const [saved, setSaved] = useState<{ n: number; problem?: string } | null>(null);
  const [past, setPast] = useState<Past>({ rows: [], error: false });
  const [openOld, setOpenOld] = useState<Record<number, boolean>>({});
  const running = useRef(false);
  const goRef = useRef<HTMLButtonElement>(null);
  /* The card's classes are not React's alone (the page's motion adds "in" as it comes into view), so collapsed is toggled on it. */
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { panelRef.current?.classList.toggle("collapsed", collapsed); }, [collapsed]);
  const rowsRef = useRef<any[]>([]);
  const selRef = useRef(0);
  const pastFor = useRef<string | undefined>(undefined);

  /* What was generated for this listing before: loaded when the picker changes and again after a generation, so the list is never
     one press behind what the agency just did. */
  const loadPast = (propertyId?: string) => {
    pastFor.current = propertyId;
    const L = W().SynListings;
    if (!propertyId || !L || !L.listGenerations) { setPast({ rows: [], error: false }); return; }
    L.listGenerations(propertyId).then((r: any[]) => {
      if (pastFor.current !== propertyId) return;
      setPast({ rows: r || [], error: false }); setOpenOld({});
    }).catch((err: any) => {
      console.error("could not read earlier versions", err);
      if (pastFor.current === propertyId) setPast({ rows: [], error: true });
    });
  };

  useEffect(() => {
    if (!ready || !S()) return;
    setPick(savedPick(Object.keys(S().PLATFORMS)));   // eslint-disable-line react-hooks/set-state-in-effect
    let min = false;
    try { min = localStorage.getItem(MIN_KEY) === "1"; } catch { /* default open */ }
    setCollapsed(min);
    /* The agency's brand, loaded once and handed to every generation so the copy signs itself and the creatives wear its colours.
       Null until it resolves; generation still works unbranded rather than blocking on it. */
    W().BRAND = null;
    if (W().SynListings && W().SynListings.loadBrand) W().SynListings.loadBrand().then((b: any) => { W().BRAND = b || null; }).catch(() => {});
    /* SINGLE SOURCE: the Listings pane. Any change there (hydrate, create, edit, delete, re-list) republishes this list, and the
       choice goes back to the first listing, as the old select's did. */
    const build = () => {
      const r = pickerRows();
      rowsRef.current = r; selRef.current = 0;
      setRows(r); setSel(0);
      loadPast(r[0] && r[0].id);
    };
    build();
    document.addEventListener("syn:listings", build);
    return () => document.removeEventListener("syn:listings", build);
  }, [ready]);

  /* Closing throws away the VIEW, never the work: every generation is already filed under Earlier versions. */
  const dismiss = () => {
    setCampaign(null); setResults(null); setSaved(null); setRun(RUN0);
    const go = goRef.current;
    if (go && go.scrollIntoView) go.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const shown = !!campaign;
  useEffect(() => {
    if (!shown) return;
    /* Escape is what people already press to get out of something. */
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [shown]);

  /* MINIMISED STAYS MINIMISED, per browser: it is a view preference, not data. */
  const setMin = (on: boolean) => { setCollapsed(on); try { localStorage.setItem(MIN_KEY, on ? "1" : "0"); } catch { /* this visit */ } };

  const togglePick = (pl: string) => {
    let on = pickedPlats(pick);
    on = on.indexOf(pl) > -1 ? on.filter((x) => x !== pl) : on.concat(pl);
    if (!on.length) { toastOrAlert("Pick at least one channel."); return; }
    setPick(on);
    try { localStorage.setItem(PICK_KEY, JSON.stringify(on)); } catch { /* stays for this visit */ }
  };

  /* Filing what was just written. Not awaited: the screen is already correct, and a failure costs the archive, never what is on
     screen. Zero is reported too -- a silent nothing is how the uuid regression hid. */
  const archive = (row: any, variants: any[]) => {
    const L = W().SynListings;
    if (!L || !L.saveGeneration) return;
    L.saveGeneration(row.id, variants).then((res: any) => {
      if (res && res.saved) setSaved({ n: res.saved });
      else setSaved({ n: 0, problem: "nothing could be filed" });
      loadPast(row.id);
      /* Those rows are the review queue, so the pipeline has to hear about them now, not on reload. */
      if (typeof W().loadPipeline === "function") W().loadPipeline();
    }).catch((err: any) => {
      console.error("could not archive this generation", err);
      setSaved({ n: 0, problem: (err && err.message) || "not saved" });
    });
  };

  const generate = () => {
    /* Generating is a reason to be open: pressing Generate from a collapsed card would put the result somewhere invisible. */
    if (collapsed) setMin(false);
    /* Every one of these used to be a silent return; a press with neither output nor an explanation reads as a broken button. */
    if (running.current) { toastOrAlert("Still working on the last one — one moment."); return; }
    const rs = rowsRef.current;
    if (!rs.length) { toastOrAlert("No active listings yet — add one under Listings first."); return; }
    const row = rs[selRef.current || 0];
    if (!row) { toastOrAlert("Pick a listing first."); return; }
    running.current = true; setWriting(true);
    const wanted = pickedPlats(pick);
    /* THIS BUTTON CALLS THE MODEL (social-generate), with the SESSION token so it can tell whose plan is asking. One distinct
       angle per channel, and a standing refusal to invent a fact the listing does not contain. */
    token().then((t) => fetch(sbUrl() + "/functions/v1/social-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: sbKey(), Authorization: "Bearer " + (t || sbKey()) },
      body: JSON.stringify({
        /* The full listing: the picker's projection has no charges, no amenities and no title type. */
        property: (W().fullListing && W().fullListing(row && row.id)) || row,
        channels: wanted,
        usedAngles: [],
        brand: W().BRAND ? {
          name: W().BRAND.name || null, tagline: W().BRAND.tagline || null, voice: W().BRAND.brand_voice || null,
          handle: (W().BRAND.social && W().BRAND.social.instagram) || null,
        } : null,
      }),
    }).then((r) => r.json().catch(() => ({}))).then((d: any) => {
      if (!d || d.error || !d.captions) throw new Error((d && d.error) || "The writer did not return anything usable.");
      const c = S().aiCampaign(row, d, { brand: W().BRAND });
      c.variants = c.variants.filter((v: any) => wanted.indexOf(v.platform) > -1);
      if (!c.variants.length) throw new Error("Nothing came back for those channels.");
      setCampaign(c); setResults(null); setSaved(null); setRun(RUN0);
      setPlat(Object.keys(S().PLATFORMS).find((pl) => c.variants.some((v: any) => v.platform === pl)) || "");
      archive(row, c.variants);
    })).catch((err) => {
      console.error("generate failed", err);
      toastOrAlert((err && err.message) || "Could not write those just now.");
    }).then(() => { running.current = false; setWriting(false); });
  };

  /* A rehearsal runs entirely in the browser, through the same validation, and touches no account. */
  const rehearse = () => {
    if (running.current || !campaign) return;
    running.current = true;
    setRun((r) => ({ ...r, runBusy: true, runLabel: "Rehearsing…" }));
    const q = S().createQueue({ mode: "dry", concurrency: 3 });
    q.add(campaign.variants);
    q.onChange((_items: any, sum: any) => {
      const done = sum.published + sum.failed + sum.skipped;
      setRun((r) => ({ ...r, bar: Math.round((done / Math.max(1, sum.total)) * 100) + "%",
        stat: sum.published + " sent · " + sum.skipped + " skipped" + (sum.failed ? " · " + sum.failed + " failed" : "") }));
    });
    q.run().then((sum: any) => {
      running.current = false;
      setRun((r) => ({ ...r, runBusy: false, runLabel: "Rehearse again",
        stat: sum.published + " would publish · " + sum.skipped + " skipped" + (sum.failed ? " · " + sum.failed + " failed" : "") }));
    });
  };

  /* SYNAPSE'S OWN CHANNELS, so "nothing will go out" can be told apart from "YOUR accounts are not connected, but ours are". Through
     a function that returns the platform and handle and nothing else. Loaded once; not knowing resolves to none, which never
     promises amplification that might not happen. */
  const synChans = useRef<Set<string> | null>(null);
  const synChannels = (): Promise<Set<string>> => {
    if (synChans.current) return Promise.resolve(synChans.current);
    return token().then((t) => {
      if (!t) return [];
      return fetch(sbUrl() + "/rest/v1/rpc/synapse_channel_list", {
        method: "POST", headers: { apikey: sbKey(), Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: "{}",
      }).then((r) => (r.ok ? r.json() : []));
    }).then((rs: any[]) => (synChans.current = new Set((rs || []).map((r) => r.platform))))
      .catch(() => (synChans.current = new Set()));
  };

  /* The tracked links, as a pop-up, once per publish: they are about that moment, not a standing state. */
  const showLinks = (links: { platform: string; url: string }[], problem: string | null) => {
    if (problem) { W().toast?.(problem + " The posts are queued either way."); return; }
    const have = (links || []).filter((l) => l.url);
    const missing = (links || []).length - have.length;
    if (!have.length) {
      if (missing) W().toast?.("These posts came back without a tracked link. They still publish; their clicks cannot be traced.");
      return;
    }
    if (typeof W().showTasks !== "function") return;
    W().showTasks([{
      id: "links:" + Date.now(), once: true,
      title: have.length === 1 ? "Your post’s tracked link" : "Your posts’ tracked links",
      body: "Each link records which channel a visitor came from, which is how a lead gets credited. Instagram and TikTok do not make caption links tappable — paste it into your bio or a Story link sticker."
        + (missing ? " " + missing + " of these posts came back without a link; they still publish, but their clicks cannot be traced." : ""),
      copies: have.map((l) => ({ label: CH_LABEL[l.platform] || l.platform, text: l.url })),
    }]);
  };

  /* Read back from short_links rather than parsed out of the caption: the table is the record and RLS scopes it to this agency. */
  const loadShortLinks = (head: Record<string, string>, posts: { id: string; platform: string }[]) => {
    const ids = posts.map((p) => p.id);
    if (!ids.length) return Promise.resolve([]);
    return fetch(sbUrl() + "/rest/v1/short_links?select=social_post_id,token&social_post_id=in.(" + ids.join(",") + ")", { headers: head })
      .then((r) => (r.ok ? r.json() : r.text().then((tx) => { throw new Error(tx.slice(0, 160)); })))
      .then((rowsIn: any[]) => {
        const tokenFor: Record<string, string> = {};
        (rowsIn || []).forEach((row) => { tokenFor[row.social_post_id] = row.token; });
        return posts.map((p) => ({ platform: p.platform, url: tokenFor[p.id] ? shortUrl(tokenFor[p.id]) : "" }));
      });
  };

  /* THE GATE asks "is one of YOUR accounts connected, or one of OURS" -- Synapse amplifies with nothing of theirs connected. */
  const publishLive = () => {
    if (running.current || !campaign) return;
    synChannels().then((syn) => {
      if (running.current || !campaign) return;
      const wanted = pickedPlats(pick);
      const ready = campaign.variants.filter((v: any) => {
        if (v.issues.length) return false;
        if (wanted.indexOf(v.platform) < 0) return false;   // never a channel that was not picked
        const mine = CONNECTABLE[v.platform] && connectedTo(v.platform) && !expired(connectedTo(v.platform));
        return mine || syn.has(v.platform);
      });
      if (!ready.length) {
        toastOrAlert(syn.size ? "Nothing to publish yet, every channel here still has something to fix." : "Nothing to publish: connect Instagram or Facebook first.");
        return;
      }
      /* The confirm describes where these actually land. */
      if (!confirm("Publish " + ready.length + " post" + (ready.length === 1 ? "" : "s") + " for real?"
          + (syn.size ? " They go to your own connected accounts where you have them, and to Synapse’s channels either way." : " They go to your connected accounts.")
          + " This is public and cannot be undone from here.")) return;
      running.current = true;
      setRun((r) => ({ ...r, liveBusy: true, liveLabel: "Queueing…", bar: "8%" }));
      /* The uuid queue_social_post returns: the only handle on the row a short link hangs off. */
      const queuedPosts: { id: string; platform: string }[] = [];
      token().then((t) => {
        if (!t) throw new Error("Sign in again to publish.");
        const head = { apikey: sbKey(), Authorization: "Bearer " + t, "Content-Type": "application/json" };
        let queued = 0;
        /* Sequential on purpose: a partial failure halfway through a parallel batch leaves an unknown number of rows queued. */
        return ready.reduce((chain: Promise<void>, v: any) => chain.then(() => fetch(sbUrl() + "/rest/v1/rpc/queue_social_post", {
          method: "POST", headers: head,
          body: JSON.stringify({
            p_property_id: campaign.property && campaign.property.id,
            p_platform: v.platform,
            p_caption: v.caption,
            /* Omitted on purpose: the listing's gallery beats this variant's single hero image. */
            p_media_urls: null,
            p_dry_run: false,
          }),
        }).then((r) => {
          if (!r.ok) return r.text().then((tx) => { throw new Error(tx.slice(0, 160)); });
          queued++;
          setRun((x) => ({ ...x, bar: (8 + Math.round((queued / ready.length) * 52)) + "%", stat: queued + " of " + ready.length + " queued" }));
          /* Read tolerantly and never fatally: a body that is not a uuid costs this post its link, never the publish. */
          return r.text().then((tx) => {
            let id: any = tx;
            try { id = JSON.parse(tx); } catch { /* not JSON; use it raw */ }
            if (typeof id === "string" && UUID_RE.test(id.trim())) queuedPosts.push({ id: id.trim(), platform: v.platform });
          }).catch(() => { /* the link is a bonus; the post is the work */ });
        })), Promise.resolve()).then(() =>
          /* Before the send, not after it: a provider outage then costs the attempt without also costing the link. */
          loadShortLinks(head, queuedPosts).then((links) => showLinks(links, null))
            .catch((err) => showLinks([], "Could not load the tracked links (" + ((err && err.message) ? String(err.message).slice(0, 80) : "network") + ")."))
        ).then(() => {
          setRun((x) => ({ ...x, liveLabel: "Publishing…" }));
          return fetch(sbUrl() + "/functions/v1/social-publish", {
            method: "POST", headers: head, body: JSON.stringify({ live: true, limit: Math.min(50, ready.length) }),
          }).then((r) => r.json().then((j) => {
            if (!r.ok) throw new Error(j.error || ("Publish failed (" + r.status + ")."));
            return j;
          }));
        });
      }).then((sum: any) => {
        running.current = false;
        setRun((x) => ({ ...x, liveBusy: false, liveLabel: "Publish for real", bar: "100%", stat: sum.published + " published" + (sum.failed ? " · " + sum.failed + " failed" : "") }));
        /* Per-post outcomes, in the provider's own words: "not a professional account" is actionable, "failed" is not. */
        setResults(sum.results || []);
      }).catch((err) => {
        running.current = false;
        setRun((x) => ({ ...x, liveBusy: false, liveLabel: "Publish for real", bar: "0%", stat: "" }));
        toastOrAlert(err.message || "Could not publish.");
      });
    });
  };

  const plats: string[] = ready && S() ? Object.keys(S().PLATFORMS) : [];
  const on = ready && S() ? pickedPlats(pick) : [];
  const noRows = ready && !rows.length;

  return (
    <div ref={panelRef} className="card cmp-gen" id="cmpGenPanel">
      {ready ? <ChannelsHost /> : null}
      <div className="cmp-head">
        <div>
          <div className="h2" title="Each version is checked against that platform's limits before it can be queued.">Generate a campaign</div>
        </div>
        <button type="button" className="cmp-min" id="cmpMin" aria-controls="cmpGenPanel" aria-expanded={ready ? !collapsed : undefined}
          aria-label={ready ? (collapsed ? "Open the campaign generator" : "Minimise the campaign generator") : undefined} onClick={() => setMin(!collapsed)}>
          <span className="lbl">{collapsed ? "Open" : "Minimise"}</span>
          {" "}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      </div>
      <div className="cmp-controls">
        <select id="cmpProp" aria-label="Listing" value={rows.length ? String(sel) : ""}
          onChange={(e) => { const i = +e.target.value || 0; selRef.current = i; setSel(i); loadPast(rows[i] && rows[i].id); }}>
          {noRows ? <option value="">No active listings yet, add one under Listings first</option>
            : rows.map((r, i) => <option key={r.id || i} value={String(i)}>{r.title + " · " + S().naira(r.price) + (r.listing_type === "rent" ? "/yr" : "") + (r.verification_status === "verified" ? "" : " · not yet verified")}</option>)}
        </select>
        {/* A DEAD BUTTON HAS TO LOOK DEAD, and say why. */}
        <button ref={goRef} className="btn btn-primary" id="cmpGo" style={{ padding: "11px 18px", fontSize: "13.5px", ...(noRows ? { opacity: ".5" } : {}) }}
          disabled={noRows || writing} title={noRows ? "Add a listing under Listings first" : undefined} onClick={generate}>
          <span data-icon="spark" style={writing ? { display: "none" } : undefined}></span>
          {writing ? <><span className="spin2"></span>Writing…</> : " Generate"}
        </button>
      </div>
      <div className="cmp-pick" id="cmpPick" role="group" aria-label="Channels to write for and post to">
        {plats.map((pl) => <button key={pl} type="button" data-pick={pl} aria-pressed={on.indexOf(pl) > -1} onClick={() => togglePick(pl)}>{S().PLATFORMS[pl].label || pl}</button>)}
      </div>
      <div className="cmp-channels" id="cmpChannels" aria-live="polite">
        {ready ? <ChannelStrip /> : null}
      </div>
      <div className="cmp-out" id="cmpOut" hidden={!campaign}>
        {campaign ? <Output c={campaign} plat={plat} setPlat={setPlat} dismiss={dismiss} run={run} results={results} saved={saved}
          live={liveCount()} rehearse={rehearse} publishLive={publishLive} /> : null}
      </div>
      <div className="cmp-past" id="cmpPast">
        {past.error ? (
          <div className="cmp-past-h"><span className="k">Earlier versions</span><span className="n">Could not load them — refresh to try again.</span></div>
        ) : past.rows.length ? (
          <>
            <div className="cmp-past-h"><span className="k">Earlier versions</span><span className="n">{past.rows.length} kept for this listing</span></div>
            <div className="cmp-past-list">
              {past.rows.map((r, i) => {
                const long = String(r.generated_text || "").length > 190;
                return (
                  <div key={r.id || i} className={"cmp-old" + (openOld[i] ? " open" : "")}>
                    <div className="cmp-old-top"><span className="pl">{PLAT_OF[r.content_type] || r.content_type}</span><span className="ang">{r.narrative_angle}</span><span>{whenAgo(r.created_at)}</span></div>
                    <div className="cmp-old-tx">{r.generated_text}</div>
                    {long ? <button type="button" className="cmp-old-more" onClick={() => setOpenOld((o) => ({ ...o, [i]: !o[i] }))}>{openOld[i] ? "Show less" : "Show all"}</button> : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* What was written, one channel at a time (the platforms are tabs in the sticky bar, each with its count and how many need
   attention), with a way out that stays on screen. Two buttons, never one that changes meaning: a rehearsal and a real send are
   different acts. */
function Output({ c, plat, setPlat, dismiss, run, results, saved, live, rehearse, publishLive }: {
  c: any; plat: string; setPlat: (p: string) => void; dismiss: () => void; run: Run; results: any[] | null;
  saved: { n: number; problem?: string } | null; live: number; rehearse: () => void; publishLive: () => void;
}) {
  const ok = c.variants.filter((v: any) => !v.issues.length);
  const bad = c.variants.length - ok.length;
  /* The angles actually used, not the catalogue: an unverified listing legitimately generates fewer. */
  const used: Record<string, 1> = {};
  c.variants.forEach((v: any) => { used[v.angle || (v.angleId || "")] = 1; });
  const angleCount = Object.keys(used).length || c.variants.length;
  const skipped: any[] = c.skipped || [];
  /* Creatives carry the agency's identity, not Synapse's, and never a stand-in colour pretending to be theirs. */
  const B = c.brand || {};
  const P = S().PLATFORMS;
  const plats = Object.keys(P).filter((pl) => c.variants.some((v: any) => v.platform === pl));
  const sendable = c.variants.filter((v: any) => !v.issues.length && CONNECTABLE[v.platform] && connectedTo(v.platform) && !expired(connectedTo(v.platform))).length;
  return (
    <>
      <div className="cmp-out-hd">
        <div className="cmp-out-top">
          <div className="cmp-out-ttl">{(c.property && c.property.title) || "This listing"}<span>{c.variants.length} drafts</span></div>
          <button type="button" className="cmp-out-x" id="cmpDismiss" onClick={dismiss}>Close</button>
        </div>
        {plats.length ? (
          <div className="cmp-tabs" role="tablist">
            {plats.map((pl) => {
              const vs = c.variants.filter((v: any) => v.platform === pl);
              const nBad = vs.filter((v: any) => v.issues.length).length;
              return (
                <button key={pl} type="button" className={"cmp-tab" + (plat === pl ? " on" : "")} data-plat={pl} aria-selected={plat === pl} onClick={() => setPlat(pl)}>
                  <Mark pl={pl} size={14} fallback={P[pl].short} cls="ic" />{P[pl].label}<span className="n">{vs.length}</span>
                  {nBad ? <span className="bad" title={nBad + " need attention"}>{nBad}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {B.isSet ? (
        <div className="cmp-brandbar" style={{ borderLeftColor: B.color || "#121212" }}>
          {B.logo ? <img src={B.logo} alt="" onError={(e) => e.currentTarget.remove()} /> : null}
          <span className="bb-nm" style={B.font ? { fontFamily: B.font } : undefined}>{B.name || "Your agency"}</span>
          {B.tagline ? <span className="bb-tag">{B.tagline}</span> : null}
          {B.colorAlt ? <span className="bb-dot" style={{ background: B.colorAlt }}></span> : null}
          <span className="bb-note">Every caption below signs off as you</span>
        </div>
      ) : (
        <div className="cmp-brandbar plain"><span className="bb-note">No brand set, these post unsigned. Add your name, colours and voice under <b>Team → Brand</b>.</span></div>
      )}
      <div className="cmp-sum">
        <span><b>{c.variants.length}</b> drafts</span>
        <span><b>{angleCount}</b> angles</span>
        <span className="g"><b>{ok.length}</b> ready</span>
        {bad ? <span className="r"><b>{bad}</b> to fix</span> : null}
      </div>
      {skipped.length ? (
        <div className="muted" style={{ fontSize: "12.5px", margin: "-4px 0 12px" }}>
          {skipped.map((s) => s.name).join(", ") + (skipped.length === 1 ? " is" : " are") + " unavailable until this listing is verified, those angles claim the seven checks passed."}
        </div>
      ) : null}
      {plats.map((pl) => (
        <div key={pl} className="cmp-plat" data-plat={pl} hidden={plat !== pl}>
          <div className="cmp-grid">
            {c.variants.filter((v: any) => v.platform === pl).map((v: any, i: number) => (
              <div key={i} className={"cmp-card v2" + (v.issues.length ? " bad" : "")} title={v.angleWhy}>
                <div className="cv2-top"><span className="cv2-angle">{v.angleName}</span>
                  {v.issues.length ? <span className="cv2-st no" title={v.issues.join(" · ")}><i></i>Fix</span> : <span className="cv2-st ok"><i></i>Ready</span>}</div>
                <div className="cmp-hook">{v.hook}</div>
                <div className="cmp-body">{v.caption.split("\n\n").slice(1).join("\n\n")}</div>
                {/* PREVIEW ONLY. NEVER PAYLOAD: queue_social_post adds the tracked short link server-side; this chip is drawn from a
                    constant and never written back onto the variant, so it cannot reach a real account. */}
                <div className="cv2-foot">
                  <span className="cv2-chip" title="A tracked synapsecore.dev short link is added to this caption when it is queued">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></svg>
                    <span className="sr-only">A tracked synapsecore.dev short link is added when it is queued. </span>{LINK_PREVIEW}</span>
                  <span className="cv2-chip">{v.media ? v.media.label + (v.ratio ? " · " + v.ratio : "") : "No picture"}</span>
                </div>
                {v.issues.length ? <div className="cv2-why">{v.issues[0]}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="cmp-run">
        <button className="btn" id="cmpRun" style={{ padding: "11px 18px", fontSize: "13.5px" }} disabled={run.runBusy} onClick={rehearse}>{run.runLabel || "Rehearse (" + ok.length + ")"}</button>
        {live ? (
          <button className="btn btn-primary" id="cmpLive" style={{ padding: "11px 18px", fontSize: "13.5px" }} disabled={!sendable || run.liveBusy} onClick={publishLive}>
            {run.liveLabel === "Publish for real" ? "Publish for real" + (sendable ? " (" + sendable + ")" : "") : run.liveLabel}</button>
        ) : null}
        <div className="cmp-bar"><i id="cmpBar" style={{ width: run.bar }}></i></div>
        <span id="cmpStat" style={{ fontSize: "12.5px", color: "var(--ink-muted)", minWidth: "120px" }}>{run.stat}</span>
      </div>
      <div id="cmpLinks"></div>
      <div id="cmpResults">
        {results && results.length ? (
          <>
            <div className="cmp-res-hd">{results.length} post{results.length === 1 ? "" : "s"} dispatched</div>
            {results.map((r, i) => {
              const good = r.status === "published";
              return (
                <div key={i} className={"cmp-res" + (good ? " ok" : " no")}>
                  <span className="cmp-res-pl">{r.platform}</span>
                  <span className="cmp-res-st">{good ? (r.dryRun ? "rehearsal" : "published") : r.status}</span>
                  <span className="cmp-res-tx">{good ? (r.postId || "") : (r.error || "")}</span>
                </div>
              );
            })}
          </>
        ) : null}
      </div>
      {live ? (
        <p className="cmp-note"><b>{live} channel{live === 1 ? "" : "s"} connected.</b> <b>Publish for real</b> writes each post to the queue and then sends it, it is public and cannot be undone from here. <b>Rehearse</b> runs the same validation and shows what would go, without touching an account.{sendable ? "" : " Nothing in this campaign targets a connected channel yet."}</p>
      ) : (
        <p className="cmp-note"><b>Rehearsal only.</b> No account is connected, so this validates and shows exactly what would be sent without touching a real one. Connect Instagram or Facebook above to publish for real. Tokens live in Supabase Vault, never in this page.</p>
      )}
      {/* Says what happened to the work, once: "did that save?" is exactly the question this feature exists to answer. */}
      <div className={"cmp-saved" + (saved && saved.problem ? " bad" : "")} id="cmpSaved">
        {saved ? (saved.problem ? "Kept on screen only — " + saved.problem : saved.n + " version" + (saved.n === 1 ? "" : "s") + " saved to this listing.") : ""}
      </div>
    </>
  );
}
