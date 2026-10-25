"use client";
/**
 * The syndication engine's in-browser tests (React since 2026-10-24, was src/legacy/syndication-test/inline-2.js).
 *
 * Runs the same checks against window.SynSyndicate (public/app/syndication.js, loaded after hydration) and draws the results.
 * The sample payload step used to throw when the engine produced no Instagram "trust" variant; it now says so instead.
 */
import { useEffect, useState } from "react";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { usePageScripts } from "@/legacy/usePageScripts";

const SCRIPTS: PageScript[] = [{ shared: "syndication" }];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Result = { ok: boolean; name: string; err: string };

// Real rows pulled from the live database (verified, live, in-window).
const ROWS = [
  { id: "c0f695ce-cdb8-650d-52cb-e23494288a3a", title: "4-Bed Detached Duplex, Ikeja GRA", city: "Lagos", listing_type: "sale", property_type: "detached", price: "269000000.00", bedrooms: 4, trust_score: 98, neighbourhood: "Ikeja GRA (Lagos)", flood_risk: 26, power_reliability: 75 },
  { id: "f7cb62d8-a496-e20e-c21f-2df883efa731", title: "3-Bed Terrace, Magodo", city: "Lagos", listing_type: "rent", property_type: "terrace", price: "7000000.00", bedrooms: 3, trust_score: 98, neighbourhood: "Magodo (Lagos)", flood_risk: 25, power_reliability: 81 },
  { id: "9a96c90b-0058-aa22-84c6-637fd03ab5cf", title: "5-Bed Penthouse, Oniru", city: "Lagos", listing_type: "sale", property_type: "penthouse", price: "370500000.00", bedrooms: 5, trust_score: 97, neighbourhood: "Oniru (Lagos)", flood_risk: 45, power_reliability: 74 },
];
const clone = (x: unknown) => JSON.parse(JSON.stringify(x));

export function SyndicationTestBody() {
  const scripts = usePageScripts();
  const [results, setResults] = useState<Result[]>([]);
  const [sum, setSum] = useState<{ pass: number; fail: number; ms: number } | null>(null);
  const [sample, setSample] = useState("");

  useEffect(() => {
    if (!scripts) return;
    const S = (window as any).SynSyndicate;
    const list: Result[] = [];
    const t = (name: string, fn: () => boolean) => {
      let ok = false, err = "";
      try { ok = fn() === true; } catch (e) { err = e instanceof Error ? e.message : String(e); }
      list.push({ ok, name, err });
    };
    if (!S) { t("the syndication engine loaded", () => false); setResults(list.slice()); return; }

    /* ── shaping ── */
    t("shape() strips the parenthetical city from the neighbourhood", () => S.shape(ROWS[0]).area === "Ikeja GRA");
    t("rent is priced per year, sale is not", () => S.shape(ROWS[1]).priceShort === "₦7M/yr" && S.shape(ROWS[0]).priceShort === "₦269M");
    /* ── generation ── */
    let camp: any = { variants: [] };
    try { camp = S.generate(ROWS[0]); } catch { /* reported by the checks below */ }
    const V = (p?: string) => camp.variants.filter((v: any) => !p || v.platform === p);
    t("generates 5 angles × 5 platforms = 25 variants", () => camp.variants.length === 25);
    t("every variant carries the real property id", () => camp.variants.every((v: any) => v.propertyId === ROWS[0].id));
    t("every variant has a non-empty caption", () => camp.variants.every((v: any) => v.caption && v.caption.length > 40));
    t("angles produce genuinely different hooks (not reworded)", () => { const h = V("instagram").map((v: any) => v.hook); return new Set(h).size === h.length; });
    /* ── platform constraints are actually enforced ── */
    t("WhatsApp gets no hashtags (platform has none)", () => V("whatsapp").every((v: any) => v.hashtags.length === 0));
    t("YouTube variants get a title, others do not", () => V("youtube").every((v: any) => !!v.title) && V("instagram").every((v: any) => v.title === null));
    t("YouTube title respects the 100-char cap", () => V("youtube").every((v: any) => v.title.length <= 100));
    t("TikTok and YouTube only ever get video", () => camp.variants.filter((v: any) => v.platform === "tiktok" || v.platform === "youtube").every((v: any) => v.media && v.media.kind === "video"));
    t("the 95s clip is never assigned to YouTube Shorts (60s cap)", () => V("youtube").every((v: any) => v.media.seconds <= 60));
    t("every chosen ratio is one the platform supports", () => camp.variants.every((v: any) => !v.ratio || S.PLATFORMS[v.platform].ratios.indexOf(v.ratio) > -1));
    t("a clean campaign has zero validation issues", () => camp.variants.every((v: any) => v.issues.length === 0));
    /* ── validation catches real breakage ── */
    t("validate() flags an over-length caption", () => { const bad = clone(camp.variants[0]); bad.caption = new Array(2400).join("x"); return S.validate(bad).some((m: string) => /Caption is/.test(m)); });
    t("validate() flags hashtags on WhatsApp", () => { const bad = clone(V("whatsapp")[0]); bad.hashtags = ["#nope"]; return S.validate(bad).some((m: string) => /does not use hashtags/.test(m)); });
    t("validate() flags an over-long video for Shorts", () => { const bad = clone(V("youtube")[0]); bad.media.seconds = 95; return S.validate(bad).some((m: string) => /caps at 60s/.test(m)); });
    t("validate() flags missing creative", () => { const bad = clone(camp.variants[0]); bad.media = null; return S.validate(bad).some((m: string) => /No creative/.test(m)); });
    /* ── selective generation ── */
    t("can target a subset of platforms and angles", () => {
      const c = S.generate(ROWS[2], { platforms: ["instagram", "tiktok"], angles: ["trust", "value"] });
      return c.variants.length === 4 && c.variants.every((v: any) => ["instagram", "tiktok"].indexOf(v.platform) > -1);
    });
    /* ── queue: idempotency, skipping, concurrency ── */
    t("queue skips invalid variants instead of sending them", () => { const q = S.createQueue({ mode: "dry" }); const v = clone(camp.variants[0]); v.issues = ["Caption too long."]; q.add([v]); return q.items()[0].status === "skipped"; });
    t("queue assigns a stable idempotency key per variant", () => {
      const q1 = S.createQueue({ mode: "dry" }); q1.add([camp.variants[0]]);
      const q2 = S.createQueue({ mode: "dry" }); q2.add([camp.variants[0]]);
      return q1.items()[0].key === q2.items()[0].key && q1.items()[0].key.length > 8;
    });
    t("dry mode marks results as rehearsals, never live", () => S.createQueue({ mode: "dry" }).mode() === "dry");
    setResults(list.slice());

    /* ── async: the queue actually drains ── */
    const t0 = performance.now();
    let q: any;
    try { q = S.createQueue({ mode: "dry", concurrency: 3 }); q.add(camp.variants); } catch { q = null; }
    (q ? q.run() : Promise.resolve({})).then((s: any) => {
      const ms = Math.round(performance.now() - t0);
      t("queue drains all 25 variants", () => s.published === 25);
      t("nothing left queued or sending after run", () => !s.queued && !s.sending);
      // 25 items @ ~0.22–0.48s each, 3 at a time => must exceed ~1.8s
      t("bounded concurrency (3), not all fired at once", () => ms > 1500);
      const pass = list.filter((r) => r.ok).length, fail = list.length - pass;
      setResults(list.slice());
      setSum({ pass, fail, ms });
      const ig = V("instagram").find((v: any) => v.angle === "trust");
      setSample(ig ? JSON.stringify(S.payloadFor(ig), null, 2) : "The engine produced no Instagram trust variant, so there is no sample to show.");
      (window as any).__TESTS__ = { pass, fail };
    });
  }, [scripts]);

  return (
    <>
      <h1>Syndication engine, tests</h1>
      <div id="out">
        {results.map((r, i) => <div key={i} className={"t " + (r.ok ? "p" : "f")}>{(r.ok ? "✓ " : "✗ ") + r.name + (r.err ? ", " + r.err : "")}</div>)}
      </div>
      <div className="sum" id="sum">
        {sum ? <><b style={{ color: sum.fail ? "#ff6b5a" : "#5fd08a" }}>{sum.pass} passed, {sum.fail} failed</b> · queue drained in {sum.ms}ms</> : null}
      </div>
      <h1 style={{ marginTop: "26px" }}>Sample payload (Instagram · verified-first)</h1>
      <pre id="sample">{sample}</pre>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
