"use client";
/**
 * The "New post" composer, its hashtag chips and the full-size caption editor, as React (was renderComposer/openComposer,
 * generateCaptions, capWarnHtml, the tag groups, scheduleFromComposer and openCaptionEditor in src/legacy/agency/inline-3.js).
 *
 * The listings stay in inline-3 (`window.SynPostListings()`, the active ones; `fullListing(id)` for the whole row) and so does
 * the board. openComposer(which), closeComposer() and openCaptionEditor(o) survive there as names and fire `syn:composer`,
 * `syn:composer-close` and `syn:caption-editor`: the listings grid, the marketing digest, the pipeline cards and the board's own
 * caption edit all call them.
 *
 * WHERE A GENERATED CAPTION GOES, which has been wrong twice. First nowhere (an in-memory array, gone on reload), then straight
 * into the SCHEDULE with no read, no edit and no decision. It files drafts now, one per channel with the angle it took, and they
 * land in APPROVAL; scheduling happens from the card, once a human has looked.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { glide, dynSet, dynReset, DYN_SPIN, DYN_TICK } from "./dyn";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const postListings = (): any[] => (typeof window !== "undefined" && W().SynPostListings && W().SynPostListings()) || [];
const fullListing = (id?: string) => (id && typeof W().fullListing === "function" ? W().fullListing(id) : null);
const CH = (): Record<string, { label: string; color: string }> => (typeof window !== "undefined" && W().SynCH) || {};
const chLabel = (c: string) => (CH()[c] && CH()[c].label) || c;
const naira = (n: number) => (W().SynNaira ? W().SynNaira(n) : String(n));
const html = (s: string) => ({ __html: s });

const CHANNELS = ["instagram", "tiktok", "youtube", "facebook", "whatsapp", "x", "telegram"];
/* Where each platform folds a caption behind "more". */
const CAP_FOLD: Record<string, number> = { instagram: 125, facebook: 250, x: 200, telegram: 400, tiktok: 120, whatsapp: 300, youtube: 150 };
const TICK = <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7" /></svg>;

function ChnBadge({ c }: { c: string }) {
  const ch = CH()[c];
  if (!ch) return null;
  const mark = W().SynChMark ? W().SynChMark(c, 12) : "";
  return <span className="chn" style={{ background: ch.color }} title={"Attributed to " + ch.label} dangerouslySetInnerHTML={html(mark)} />;
}

/* ── what a caption is missing ──
   Checked against the listing in front of it, which a generic linter cannot do. WARNINGS, NEVER A BLOCK: an agent posting
   without a price may know something the check does not. And it only speaks when it knows: the price check runs only where the
   listing has a price, the area check only where it has a neighbourhood. */
export function capWarnings(ch: string, text: string, listing: any): string[] {
  const t = String(text || "");
  if (!t.trim()) return [];
  const full = listing || {};
  const out: string[] = [];
  if (full.price && !/\d/.test(t)) out.push('No price in this one — "how much?" is the comment you will get.');
  const area = full.neighbourhood || full.city || "";
  if (area && t.toLowerCase().indexOf(String(area).toLowerCase()) === -1) out.push("Does not name " + area + '. "3 bed, serviced" describes half of Lagos.');
  const fold = CAP_FOLD[ch] || 200;
  if (t.length > fold * 3) out.push("Long — " + chLabel(ch) + " hides everything after about " + fold + ' characters behind "more".');
  const tags = (t.match(/#[\wÀ-ɏ]+/g) || []).length;
  /* Instagram rejects the whole call over thirty rather than trimming: a real failure, not a matter of taste. */
  if (ch === "instagram" && tags > 30) out.push(tags + " hashtags — Instagram refuses a post over 30.");
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 24 && letters === letters.toUpperCase()) out.push("All capitals reads as an advert in a feed of photographs.");
  return out;
}
const Warn = ({ list, ...p }: { list: string[]; id?: string; "data-warn"?: string }) => (
  <div className="cap-warn" {...p}>{list.map((w, i) => <span key={i}>{"⚠ " + w}</span>)}</div>
);

/* The brand block social-generate honours. Only what the agency actually filled in -- an absent voice must not become an
   invented one. */
function brandPayload() {
  const B = W().BRAND;
  return B ? { name: B.name || null, tagline: B.tagline || null, voice: B.brand_voice || null, handle: (B.social && B.social.instagram) || null } : null;
}
async function socialGenerate(body: any) {
  const tk = typeof W().authToken === "function" ? await W().authToken() : null;
  const SB = W().SynSB || {};
  const res = await fetch(SB.url + "/functions/v1/social-generate", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: SB.key, Authorization: "Bearer " + (tk || SB.key) },
    body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  return { ok: res.ok, d };
}
/* NAMED, not guessed: a TypeError from fetch is the only genuine transport fault; anything else is ours and reaches the console. */
function failText(e: unknown, where: string) {
  const transport = e instanceof TypeError;
  if (!transport) console.error(where, e);
  return transport ? "Network hiccup — please try again." : "Something went wrong on our side — please try again.";
}

/* ── WHICH ANGLES THIS LISTING HAS ALREADY SPENT ──
   social-generate rotates through six subjects and only repeats once all six are gone, but it is stateless: told nothing, every
   Generate starts from the top and rewrites the same captions. Kept per property in this browser (a caption nobody scheduled
   should not leave a row behind), merged with the angles of posts that WERE scheduled, which are shared. */
const ANGLE_KEY = "synapse_angles_v1";
function angleStore(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(ANGLE_KEY) || "null") || {}; } catch { return {}; }
}
function anglesUsedFor(pid?: string) {
  if (!pid) return [];
  const local = angleStore()[pid] || [];
  let scheduled: string[] = [];
  try {
    const P = W().SynPipe && W().SynPipe();
    scheduled = ((P && P.social) || []).filter((r: any) => r.property_id === pid && r.payload && r.payload.angle).map((r: any) => r.payload.angle);
  } catch { /* no pipeline loaded in this view */ }
  return [...new Set(local.concat(scheduled))];
}
function rememberAngles(pid: string | undefined, angles: string[]) {
  if (!pid || !angles || !angles.length) return;
  try {
    const all = angleStore();
    all[pid] = [...new Set((all[pid] || []).concat(angles))];
    localStorage.setItem(ANGLE_KEY, JSON.stringify(all));
  } catch { /* private mode: rotation still works for this page view */ }
}

const tagsIn = (text: string) => (String(text || "").match(/#[\wÀ-ɏ]+/g) || []).map((t) => t.slice(1));

type Cmp = {
  li: number; chans: string[]; captions: Record<string, string> | null; hashtags: string[]; note: string; rec: string;
  angles: Record<string, string>; loading: boolean; err: string; sending: boolean;
};
const fresh = (li: number): Cmp => ({ li, chans: [], captions: null, hashtags: [], note: "", rec: "", angles: {}, loading: false, err: "", sending: false });

export function ComposerHost() {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<Cmp>(() => fresh(0));
  const [groups, setGroups] = useState<any[]>([]);
  const [savingTag, setSavingTag] = useState("");
  const [scr, setScr] = useState(0);
  const cRef = useRef(c), openRef = useRef(open), modal = useRef<HTMLDivElement>(null);
  const before = useRef<Record<string, number>>({});
  useEffect(() => { cRef.current = c; openRef.current = open; });

  /* Generate becomes "Write again" beside a new "Send for approval": the buttons glide from where they were to where they are
     now. Measured before each change, glided after it is drawn. */
  const update = useCallback((f: (s: Cmp) => Cmp) => {
    before.current = ["cmpGen", "cmpSchedule"].reduce((m: Record<string, number>, id) => {
      const e = document.getElementById(id); if (e) m[id] = e.getBoundingClientRect().width; return m;
    }, {});
    setC(f);
  }, []);
  useLayoutEffect(() => {
    const b = before.current; before.current = {};
    Object.keys(b).forEach((id) => glide(document.getElementById(id), b[id]));
  }, [c]);
  /* The drafts have just been written for you: let them arrive decoded. */
  useEffect(() => {
    if (!scr || !W().Scramble || !modal.current) return;
    modal.current.querySelectorAll(".cap-prev").forEach((el) => W().Scramble.text(el, el.textContent));
  }, [scr]);

  /* A failed load costs the chips, not the composer. Re-read on every open: somebody else on the team may have saved a group. */
  const loadGroups = useCallback(() => {
    const L = W().SynListings;
    if (!L || !L.listHashtagGroups) return Promise.resolve();
    return L.listHashtagGroups().then((g: any[]) => setGroups(g || [])).catch((e: unknown) => { setGroups([]); console.error("hashtag groups", e); });
  }, []);

  /* TAKES AN ID, because an index into POST_LISTINGS (filtered to active listings) drifted against LISTINGS_DATA and opened the
     composer on a different property. A number is still accepted so the taskbar's "+" keeps working. */
  useEffect(() => {
    const onOpen = (e: Event) => {
      const which = (e as CustomEvent).detail;
      const L = postListings();
      let idx = 0;
      if (typeof which === "string") {
        const found = L.findIndex((l) => l.id === which);
        if (found < 0) { toast("That listing is not one you can post about"); return; }
        idx = found;
      } else if (Number.isInteger(which) && which >= 0 && which < L.length) idx = which;
      if (!L.length) { toast("Add an active listing first"); return; }
      setC(fresh(idx)); setOpen(true);
      loadGroups();
    };
    const onClose = () => setOpen(false);
    window.addEventListener("syn:composer", onOpen);
    window.addEventListener("syn:composer-close", onClose);
    return () => { window.removeEventListener("syn:composer", onOpen); window.removeEventListener("syn:composer-close", onClose); };
  }, [loadGroups]);

  const listings = postListings();
  const l = listings[c.li];
  const listingRow = () => fullListing(l && l.id) || l;

  const toggle = (id: string) => update((s) => ({ ...s, chans: s.chans.includes(id) ? s.chans.filter((x) => x !== id) : [...s.chans, id] }));
  const setCaption = (ch: string, text: string) => setC((s) => ({ ...s, captions: { ...(s.captions || {}), [ch]: text } }));

  async function generate() {
    const s0 = cRef.current;
    if (!s0.chans.length || s0.loading) return;
    const L = postListings()[s0.li];
    update((s) => ({ ...s, loading: true, err: "" }));
    try {
      const { ok, d } = await socialGenerate({
        /* The row, not POST_LISTINGS' projection of it: the generator is the one consumer that wants every column. */
        property: fullListing(L && L.id) || L,
        channels: [...s0.chans],
        usedAngles: anglesUsedFor(L && L.id),
        brand: brandPayload(),
      });
      if (!ok || d.error || !d.captions || !Object.keys(d.captions).length) {
        /* Say which failure it was: "cut off", "unreadable" and a transport fault are different problems. */
        update((s) => ({ ...s, loading: false, err: (d && d.error) || "Couldn’t generate captions right now, please try again." }));
        return;
      }
      rememberAngles(L && L.id, d.anglesUsed || []);
      update((s) => ({ ...s, loading: false, captions: d.captions, hashtags: d.hashtags || [], note: d.note || "", rec: d.recommendedChannel || "", angles: d.angles || {} }));
      setScr((n) => n + 1);
    } catch (e) {
      update((s) => ({ ...s, loading: false, err: failText(e, "generateCaptions") }));
    }
  }

  function send() {
    const s = cRef.current;
    const L = postListings()[s.li];
    const caps = s.captions || {};
    const chans = s.chans.filter((ch) => caps[ch]);
    if (!chans.length || !L) { toast("Nothing to send yet, generate the captions first"); return; }
    setC((x) => ({ ...x, sending: true }));
    /* angleKey, not angle: saveGeneration files anything it does not recognise as 'custom', and the angles come back keyed by
       channel. */
    const variants = chans.map((ch) => ({ platform: ch, caption: caps[ch], angleKey: (s.angles || {})[ch] }));
    W().SynListings.saveGeneration(L.id, variants).then((r: any) => {
      const n = (r && r.saved) || 0;
      if (!n) throw new Error("Nothing could be filed, none of those channels has a content type yet.");
      toast(n + (n === 1 ? " caption" : " captions") + " sent for approval, review them in Draft");
      setOpen(false); setC((x) => ({ ...x, sending: false }));
      if (typeof W().loadPipeline === "function") W().loadPipeline();
    }).catch((err: any) => {
      setC((x) => ({ ...x, sending: false }));
      toast((err && err.message) || "Could not send those for approval");
      console.error("saveGeneration failed", err);
    });
  }

  /* SKIPS WHAT IS ALREADY THERE: tapping twice, or two groups that overlap, must not produce #lekki #lekki. */
  function addTags(g: any, ch: string) {
    const cur = (cRef.current.captions || {})[ch];
    if (cur == null) return;
    const have = tagsIn(cur).map((t) => t.toLowerCase());
    const add = (g.tags || []).filter((t: string) => have.indexOf(String(t).toLowerCase()) === -1);
    if (!add.length) { toast("Already in this caption"); return; }
    setCaption(ch, cur.replace(/\s+$/, "") + "\n\n" + add.map((t: string) => "#" + t).join(" "));
  }
  /* The group is made FROM the caption already written: nobody opens a settings screen to type hashtags. */
  function saveTags(ch: string) {
    const tags = tagsIn((cRef.current.captions || {})[ch] || "");
    if (!tags.length) { toast("No hashtags in this caption to save"); return; }
    const name = window.prompt("Name this group of " + tags.length + " hashtags", "");
    if (!name || !name.trim()) return;
    setSavingTag(ch);
    W().SynListings.saveHashtagGroup(name, tags).then(loadGroups)
      .then(() => { setSavingTag(""); toast("Saved — tap it on any caption"); })
      .catch((err: any) => { setSavingTag(""); toast((err && err.message) || "Could not save that group"); });
  }

  function editCaption(ch: string) {
    openEditor({ ch, text: (cRef.current.captions || {})[ch] || "", property: listingRow(), onSave: (text: string) => { setCaption(ch, text); } });
  }

  const genBtn = (
    <button className={"btn " + (c.captions ? "cmp-again" : "btn-primary") + " cmp-gen"} id="cmpGen" onClick={generate}
      disabled={c.chans.length === 0} title={c.chans.length === 0 ? "Pick at least one channel" : undefined}>
      {c.loading ? <><span className="spin2"></span>Writing captions…</> : <><span data-icon="spark"></span> {c.captions ? "Write again" : "Generate captions with AI"}</>}
    </button>
  );
  const capList = c.captions ? Object.keys(c.captions) : [];

  return (
    <>
      <div className={"modal-scrim" + (open ? " on" : "")} id="cmpScrim" onClick={() => setOpen(false)}></div>
      <div className={"modal" + (open ? " on" : "")} id="cmpModal" ref={modal}>
        <div className="cmp-top"><div><h2>New post</h2><p>Pick a listing and where it goes. Synapse writes the captions.</p></div>
          <button className="x" id="cmpX" aria-label="Close" onClick={() => setOpen(false)}>×</button></div>
        <div className="cmp-step"><b>1</b>Listing</div>
        <div className="cmp-listings" role="group" aria-label="Verified listings">
          {listings.map((x, i) => {
            const u = typeof x.img === "string" ? x.img.trim() : "";
            return (
              <button key={x.id || i} className={"cmp-lst" + (i === c.li ? " on" : "")} data-li={i} aria-pressed={i === c.li} onClick={() => update((s) => ({ ...s, li: i }))}>
                <Photo url={u} />
                {x.verification_status === "verified" && W().vStamp ? <span style={{ display: "contents" }} dangerouslySetInnerHTML={html(W().vStamp("ok", "sm"))} /> : null}
                <span className="cl-tick" aria-hidden="true">{TICK}</span>
                <span className="cl-txt"><span className="t">{String(x.title || "").split(",")[0]}</span><span className="p">{naira(x.price)}</span></span>
              </button>
            );
          })}
        </div>
        <div className="cmp-step"><b>2</b>Channels<span className="cmp-count">{c.chans.length ? c.chans.length + " selected" : "pick at least one"}</span></div>
        {/* X goes out on SYNAPSE'S X account (agencies cannot connect their own yet). Said on the chip, where the choice is made;
            the post's link is still theirs, so the enquiries are too. */}
        <div className="cmp-chans">
          {CHANNELS.map((id) => {
            const on = c.chans.includes(id);
            const nm = chLabel(id) + (id === "x" ? " (posted on Synapse’s X account; enquiries still come to you)" : "");
            return (
              <button key={id} type="button" className={"cmp-chan" + (on ? " on" : "")} data-chan={id} aria-pressed={on} aria-label={nm} title={nm} onClick={() => toggle(id)}>
                <ChnBadge c={id} /><span className="cc-tick" aria-hidden="true">{TICK}</span>
              </button>
            );
          })}
        </div>
        {!c.captions ? <div className="cmp-foot">{genBtn}</div> : null}
        {c.err ? <div className="cmp-err" role="alert">{c.err}</div> : null}
        {c.captions ? (
          <>
            <div className="cmp-step"><b>3</b>Captions<span className="cmp-count">tap one to edit</span></div>
            {capList.map((ch) => (
              <div className="cap-card" key={ch}>
                <div className="ch"><ChnBadge c={ch} /> {chLabel(ch)} {ch === c.rec ? <span className="rec">✦ recommended</span> : null}</div>
                {/* Editing happens in the full-size editor, not in a box you scroll three lines at a time. */}
                <button type="button" className="cap-open" data-capopen={ch} aria-label={"Open the " + chLabel(ch) + " caption to edit"} onClick={() => editCaption(ch)}>
                  <span className="cap-prev" data-prev={ch}>{c.captions![ch]}</span>
                  <span className="cap-hint">Tap to edit, or ask for it shorter, longer, warmer…</span>
                </button>
                <Warn data-warn={ch} list={capWarnings(ch, c.captions![ch], listingRow())} />
                {/* Under every caption rather than one toolbar: the captions differ per channel, and so do their tags. */}
                <div className="tagrow">
                  {groups.map((g) => (
                    <button key={g.id} type="button" className="tagchip" data-tag-add={g.id} data-tag-ch={ch} title={(g.tags || []).map((t: string) => "#" + t).join(" ")} onClick={() => addTags(g, ch)}>
                      {g.name} <i>{(g.tags || []).length}</i>
                    </button>
                  ))}
                  <button type="button" className="tagchip add" data-tag-save={ch} disabled={savingTag === ch} onClick={() => saveTags(ch)}>＋ Save these</button>
                </div>
              </div>
            ))}
            {c.hashtags.length ? <div className="cmp-tags">{c.hashtags.join("  ")}</div> : null}
            {c.note ? <div className="cmp-note"><b>Tayo&apos;s tip:</b> {c.note}</div> : null}
            <div className="cmp-foot">{genBtn}
              <button className="btn btn-primary dyn-enter" id="cmpSchedule" onClick={send} disabled={c.sending}>{c.sending ? "Sending…" : "Send for approval →"}</button>
            </div>
          </>
        ) : null}
      </div>
      <CaptionEditorHost />
    </>
  );
}

/* A URL that does not load drops the broken <img> and tags the wrapper, as photoHtml() did. */
function Photo({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  if (!url) return <div className="lph cl-ph"></div>;
  return <div className={"lph cl-ph" + (bad ? " no-photo" : "")}>{bad ? null : <img src={url} alt="" loading="lazy" onError={() => setBad(true)} />}</div>;
}

/* ── the caption editor ──
   The whole caption at a readable size, and a place to ask for it to be changed in words ("shorter", "lead with the service
   charge"). The rewrite goes through the same writer as the first draft, with the same rules about facts, prices and addresses;
   the request steers it, it does not unlock anything. Nothing is kept until Save; a rewrite can be undone; Cancel leaves the
   caption as it was. o: { ch, text, property?, listing?, title?, onSave(text) -> maybe a promise }. */
type EdOpts = { ch: string; text: string; property?: any; listing?: any; title?: string; onSave: (t: string) => any };
let edSeq = 0;
function openEditor(o: EdOpts) { window.dispatchEvent(new CustomEvent("syn:caption-editor", { detail: o })); }

function CaptionEditorHost() {
  const [ed, setEd] = useState<{ o: EdOpts; key: number; opener: Element | null } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setEd({ o: (e as CustomEvent).detail, key: ++edSeq, opener: document.activeElement });
    window.addEventListener("syn:caption-editor", on);
    return () => window.removeEventListener("syn:caption-editor", on);
  }, []);
  if (!ed || typeof document === "undefined") return null;
  const done = () => { const op = ed.opener as HTMLElement | null; setEd(null); if (op && op.focus) op.focus(); };
  return createPortal(<CaptionEditor key={ed.key} o={ed.o} onClose={done} />, document.body);
}

const QUICK: [string, string][] = [
  ["Shorter", "Make it shorter."],
  ["Longer", "Make it longer, with more of what the listing actually offers."],
  ["Warmer", "Make it warmer and more personal."],
  ["More formal", "Make it more formal."],
];

function CaptionEditor({ o, onClose }: { o: EdOpts; onClose: () => void }) {
  const orig = String(o.text || "");
  const scrim = useRef<HTMLDivElement>(null), text = useRef<HTMLTextAreaElement>(null), ask = useRef<HTMLInputElement>(null);
  const go = useRef<HTMLButtonElement>(null), save = useRef<HTMLButtonElement>(null);
  const [val, setVal] = useState(orig);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ t: string; err?: boolean }>({ t: "" });
  const [saved, setSaved] = useState(false);
  const alive = useRef(true), busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; });
  useEffect(() => () => { alive.current = false; }, []);

  const read = () => (text.current ? text.current.value : val);
  const close = useCallback((force: boolean) => {
    if (!force && !busyRef.current && read() !== orig && !window.confirm("Close without saving? Your changes to this caption will be lost.")) return;
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, orig]);

  useLayoutEffect(() => {
    dynReset(save.current, "Save caption"); dynReset(go.current, "Rewrite");
    const t = text.current;
    if (t) { t.value = orig; t.focus(); t.setSelectionRange(0, 0); t.scrollTop = 0; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* Escape closes the editor and nothing under it: the composer and the property preview both listen on the document. */
  useEffect(() => {
    const el = scrim.current; if (!el) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(false); } };
    el.addEventListener("keydown", k);
    return () => el.removeEventListener("keydown", k);
  }, [close]);

  const finishScramble = () => { if (W().Scramble && text.current) W().Scramble.finish(text.current); };

  async function rewrite(instruction: string) {
    instruction = String(instruction || "").trim();
    if (!instruction) { ask.current?.focus(); setNote({ t: "Say what to change first, or tap one of the buttons." }); return; }
    if (busyRef.current) return;
    const prev = read();
    if (!prev.trim()) { setNote({ t: "There is no caption to change yet.", err: true }); return; }
    setBusy(true); busyRef.current = true; dynSet(go.current, DYN_SPIN + "Writing…");
    setNote({ t: "Rewriting…" });
    try {
      const { ok, d } = await socialGenerate({
        property: o.property || { title: o.title || "Listing" }, channels: [o.ch], brand: brandPayload(),
        revise: { channel: o.ch, caption: prev, instruction },
      });
      if (!alive.current) return;
      if (!ok || d.error || typeof d.caption !== "string" || !d.caption.trim()) {
        setNote({ t: (d && d.error) || "Could not rewrite it just now — please try again.", err: true });
        return;
      }
      setHistory((h) => [...h, prev]);
      /* Decoded into place, then the counter is read from the real text. */
      if (W().Scramble && text.current) W().Scramble.value(text.current, d.caption, { duration: 900, done: () => { if (alive.current && text.current) setVal(text.current.value); } });
      else if (text.current) text.current.value = d.caption;
      setVal(d.caption);
      if (ask.current) ask.current.value = "";
      setNote({ t: "Rewritten." });
    } catch (err) {
      if (alive.current) setNote({ t: failText(err, "caption rewrite"), err: true });
    } finally {
      if (alive.current) { setBusy(false); busyRef.current = false; dynSet(go.current, "Rewrite"); }
    }
  }

  function undo() {
    finishScramble();
    if (!history.length || !text.current) return;
    const last = history[history.length - 1];
    text.current.value = last; setVal(last);
    setHistory((h) => h.slice(0, -1));
    setNote({ t: "Undone." });
  }

  function doSave() {
    finishScramble();
    if (busyRef.current) return;
    const t = read().replace(/\s+$/, "");
    if (!t.trim()) { setNote({ t: "A caption cannot be empty.", err: true }); return; }
    const r = o.onSave(t);
    if (r && typeof r.then === "function") {
      setBusy(true); busyRef.current = true; setNote({ t: "Saving…" });
      dynSet(save.current, DYN_SPIN + "Saving…");
      r.then(() => {
        if (!alive.current) return;
        busyRef.current = false; setBusy(false); setSaved(true); dynSet(save.current, DYN_TICK + "Saved");
        setTimeout(() => { if (alive.current) close(true); }, 420);
      }).catch((err: any) => {
        if (!alive.current) return;
        busyRef.current = false; setBusy(false); dynSet(save.current, "Save caption");
        setNote({ t: (err && err.message) || "That caption was not saved.", err: true });
      });
    } else close(true);
  }

  const fold = CAP_FOLD[o.ch] || 200;
  const warns = capWarnings(o.ch, val, o.listing || o.property);
  const saveBusy = busy && !saved;
  return (
    <div className="ced-scrim on" ref={scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div className="ced" role="dialog" aria-modal="true" aria-labelledby="cedTitle">
        <div className="ced-head"><span id="cedBadge"><ChnBadge c={o.ch} /></span><h3 id="cedTitle">{chLabel(o.ch) + " caption"}</h3>
          <button type="button" className="ced-x" id="cedX" aria-label="Close" onClick={() => close(false)}>×</button></div>
        <textarea className="ced-text" id="cedText" spellCheck aria-label="Caption" ref={text} defaultValue={orig} aria-busy={busy}
          onInput={(e) => setVal((e.target as HTMLTextAreaElement).value)}
          onKeyDown={finishScramble} onPointerDown={finishScramble} onFocus={finishScramble}></textarea>
        {/* A number and where the platform cuts it off; the sentence is the tooltip. The bar is the same fact drawn. */}
        <div className="ced-meta"><span id="cedCount" className={"ced-count" + (val.length > fold ? " over" : "")}
          title={chLabel(o.ch) + " shows about the first " + fold + " characters before “more”."}
          style={{ ["--fill" as string]: Math.min(100, Math.round(val.length / Math.max(fold, 1) * 100)) + "%" }}>
          {val.length.toLocaleString() + " characters · cut at " + fold}</span></div>
        <Warn id="cedWarn" list={warns} />
        <div className="ced-ask"><label htmlFor="cedAsk" className="sr-only">Ask for a change</label>
          <div className="ced-quick" role="group" aria-label="Quick rewrites">
            {QUICK.map(([label, a]) => <button key={label} type="button" data-ask={a} disabled={busy} onClick={() => rewrite(a)}>{label}</button>)}
          </div>
          <div className="ced-askrow"><input id="cedAsk" type="text" autoComplete="off" maxLength={600} placeholder="Or tell Tayo what to change" ref={ask}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); rewrite(ask.current ? ask.current.value : ""); } }} />
            <button type="button" className="btn btn-ghost" id="cedGo" ref={go} disabled={busy} onClick={() => rewrite(ask.current ? ask.current.value : "")}></button></div>
          <div className={"ced-note" + (note.err ? " err" : "")} id="cedNote" role="status" aria-live="polite">{note.t}</div></div>
        <div className="ced-foot"><button type="button" className="btn btn-ghost" id="cedUndo" hidden={!history.length} disabled={busy} onClick={undo}>Undo</button>
          <span className="sp"></span><button type="button" className="btn btn-ghost" id="cedCancel" onClick={() => close(false)}>Cancel</button>
          <button type="button" className={"btn btn-primary" + (saved ? " is-done" : "")} id="cedSave" ref={save} disabled={saveBusy} onClick={doSave}></button></div>
      </div>
    </div>
  );
}
