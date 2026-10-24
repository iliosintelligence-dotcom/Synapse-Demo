"use client";
/**
 * The share kit and the "and your WhatsApp Status?" offer, as React (was openShareKit, shkPaint, shareCaption, sharePhoto and
 * maybeOfferStatus in src/legacy/agency/inline-3.js).
 *
 * Posting to channels nobody follows yet is publishing, not reach. The reach in Nigerian property is borrowed: an agent's WhatsApp
 * Status and contacts, the Facebook and Telegram housing groups they already sit in, and the sites buyers already search. Synapse
 * cannot post to any of those, so the kit makes an agent doing it take one tap: the photo, a caption written for where it is
 * going, and a link that is THEIRS (create_short_link: per agent, per listing, per destination, so a visit or a lead through it is
 * credited to the person who shared it and the place they shared it).
 *
 * WHATSAPP IS STILL NEVER SYNAPSE MESSAGING A BUYER. This is an agent sharing from their own phone, to their own contacts.
 *
 * openShareKit(id) and rememberStatusOffer(id) keep their names on window (the listings grid and the scheduler call them).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;
const toast = (m: string) => W().toast?.(m);
const svg = (n: string) => (typeof window !== "undefined" && W().SynIcons && W().SynIcons.svg ? W().SynIcons.svg(n) : "");

type Dest = { id: string; label: string; channel: string; form: "short" | "full"; how: string };
const SHARE_DEST: Dest[] = [
  { id: "whatsapp", label: "WhatsApp", channel: "whatsapp_campaign", form: "short",
    how: "For your Status or your broadcast list. Save the photo, post it to your Status, and paste the caption with it." },
  { id: "facebook", label: "Facebook groups", channel: "facebook", form: "full",
    how: "Paste it into the property groups for this area that you belong to. Groups set their own rules, some only allow listings on certain days." },
  { id: "telegram", label: "Telegram groups", channel: "telegram", form: "full",
    how: "Paste it into the Telegram groups you are in. Housing groups for students and corps members move fast." },
  { id: "other", label: "Anywhere else", channel: "referral", form: "full",
    how: "Nairaland, X, an email to a client, wherever it goes, the link still says it was yours." },
];
const FURN_LABEL: Record<string, string> = { unfurnished: "Unfurnished", semi: "Semi-furnished", fully: "Fully furnished" };
const TITLE_LABEL: Record<string, string> = { c_of_o: "Certificate of Occupancy (C of O)", governors_consent: "Governor’s Consent", registered_deed: "Registered Deed", excision: "Excision", gazette: "Gazette", allocation: "Allocation" };

/* The caption, from the listing's own fields: instant, free, and every figure in it is the row's figure. The address is never
   used -- the area and the city only; a caption travels to strangers and somebody lives there. */
function shareCaption(l: any, form: "short" | "full", link: string) {
  const n = (v: any) => Number(v) || 0;
  const money = (v: any) => "₦" + n(v).toLocaleString("en-NG");
  const deal = l.listing_type === "rent" ? "FOR RENT" : l.listing_type === "shortlet" ? "SHORT-LET" : "FOR SALE";
  const beds = parseInt(l.bedrooms, 10);
  const roomy = beds > 0 && l.property_type !== "land" && l.property_type !== "commercial";
  const head = (roomy ? beds + "-BEDROOM " : "") + String((W().SynTypeLabel || {})[l.property_type] || "Property").toUpperCase() + " " + deal;
  const where = [l.neighbourhood, l.city].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  const per = ({ per_year: "/year", per_month: "/month", per_night: "/night" } as Record<string, string>)[l.price_period] || "";
  const price = n(l.price) ? money(l.price) + per : "";
  const charges = [
    n(l.service_charge) ? "Service charge " + money(l.service_charge) : "",
    n(l.agency_fee) ? "Agency fee " + money(l.agency_fee) : "",
    n(l.legal_fee) ? "Legal fee " + money(l.legal_fee) : "",
  ].filter(Boolean);
  const amen: string[] = (Array.isArray(l.amenities) ? l.amenities : []).slice(0, form === "short" ? 3 : 6);
  const out: string[] = [];
  if (form === "short") {
    /* A Status is read in two seconds and screenshotted: what, where, how much, what else it costs, and the link. */
    out.push("🏡 " + head);
    if (where) out.push("📍 " + where);
    if (price) out.push("💰 " + price);
    if (charges.length) out.push(charges.join(" · "));
    if (amen.length) out.push(amen.join(" · "));
    out.push("", "Photos, every cost and inspection booking 👇", link);
    return out.join("\n");
  }
  /* A group post is read by somebody deciding whether to enquire, so it carries the whole spec sheet. */
  out.push(head);
  if (where) out.push("📍 " + where);
  out.push("");
  const baths = n(l.bathrooms), toilets = n(l.toilets);
  const spec = [
    roomy ? beds + " bedroom" + (beds === 1 ? "" : "s") : "",
    baths ? baths + " bathroom" + (baths === 1 ? "" : "s") : "",
    toilets ? toilets + " toilet" + (toilets === 1 ? "" : "s") : "",
  ].filter(Boolean);
  if (spec.length) out.push("• " + spec.join(" · "));
  if (FURN_LABEL[l.furnished]) out.push("• " + FURN_LABEL[l.furnished]);
  amen.forEach((a) => out.push("• " + a));
  if (l.listing_type === "sale" && TITLE_LABEL[l.title_type]) out.push("• Title: " + TITLE_LABEL[l.title_type]);
  out.push("");
  if (price) out.push("💰 " + (l.listing_type === "rent" ? "Rent" : "Price") + ": " + price);
  if (charges.length) out.push("Other charges: " + charges.join(" · "));
  if (l.listing_type === "rent" && n(l.move_in_cost)) out.push("Total to move in: " + money(l.move_in_cost));
  out.push("", "Full details, photos and inspection booking:", link);
  const agency = W().BRAND && W().BRAND.name;
  if (agency) out.push("", "- " + agency);
  return out.join("\n");
}
/* The photo that travels: the branded copy where one was made, otherwise the cover. Never a video: a Status caption rides on an image. */
function sharePhoto(l: any) {
  const L = W().SynListings;
  const vid = (u: string) => (L && L.isVideoUrl ? L.isVideoUrl(u) : /\.(mp4|mov|m4v|qt)(\?|#|$)/i.test(String(u || "")));
  const m = (Array.isArray(l.media) ? l.media : []).find((x: any) => x && x.url && !vid(x.url));
  return (m && (m.branded_url || m.url)) || (l.img && !vid(l.img) ? l.img : "");
}
const plainLink = (l: any, d: Dest) => "https://www.synapsecore.dev/app/property.html?id=" + encodeURIComponent(l.id) + "&ch=" + encodeURIComponent(d.channel);

/* WhatsApp takes a .webp as a STICKER, not a photo, and uploads are stored as WebP: anything not already JPEG or PNG is redrawn as
   a JPEG before it leaves. Fetched as a blob so the canvas is not tainted; if the redraw fails, the original still goes. */
function asJpeg(blob: Blob): Promise<Blob> {
  if (/jpe?g|png/i.test(blob.type || "") || !window.createImageBitmap) return Promise.resolve(blob);
  return createImageBitmap(blob).then((bmp) => new Promise<Blob>((resolve) => {
    const c = document.createElement("canvas");
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);   // no transparent corners turning black
    ctx.drawImage(bmp, 0, 0);
    c.toBlob((jpg) => resolve(jpg || blob), "image/jpeg", 0.9);
  })).catch(() => blob);
}
const photoBlob = (src: string) => fetch(src, { mode: "cors" }).then((r) => { if (!r.ok) throw new Error("photo " + r.status); return r.blob(); }).then(asJpeg);
const fileName = (l: any, blob: Blob) => {
  const base = String(l.title || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "listing";
  return base + "." + (/png/.test(blob.type) ? "png" : /webp/.test(blob.type) ? "webp" : "jpg");
};

type Link = { url: string; token: string | null; plain?: boolean; why?: string };

function Kit({ l, start, onClose }: { l: any; start: Dest; onClose: () => void }) {
  const [dest, setDest] = useState<Dest>(start);
  const [links, setLinks] = useState<Record<string, Link>>({});
  const [text, setText] = useState(() => shareCaption(l, start.form, "…"));
  const [edited, setEdited] = useState(false);
  const [opens, setOpens] = useState<Record<string, number | null>>({});
  const [copied, setCopied] = useState<"" | "cap" | "link">("");
  const [noPhoto, setNoPhoto] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const photo = sharePhoto(l);
  const link = links[dest.id];
  /* The phone's own share sheet, with the photo attached, is the fastest route to a Status: offered only where it can attach a file. */
  const [canFiles] = useState(() => { try { return !!(photo && navigator.canShare && navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] })); } catch { return false; } });

  const editedRef = useRef(false);   /* the same as edited, for the link callback; set where edited is */
  /* One link per destination, made once. A failed one is still shareable, just not credited, and says so. When it arrives it is
     written into the caption, or, if they edited while it was being made, put where the placeholder was. */
  useEffect(() => {
    if (links[dest.id]) return;
    let gone = false;
    const done = (k: Link) => {
      if (gone) return;
      setLinks((m) => ({ ...m, [dest.id]: k }));
      setText((t) => {
        if (!editedRef.current) return shareCaption(l, dest.form, k.url);
        if (t.indexOf(k.url) >= 0) return t;
        return t.indexOf("…") >= 0 ? t.replace("…", k.url) : t.replace(/\s*$/, "") + "\n" + k.url;
      });
    };
    const L = W().SynListings;
    if (!L || !L.shareLink) { Promise.resolve().then(() => done({ url: plainLink(l, dest), token: null, plain: true })); return () => { gone = true; }; }
    L.shareLink(l.id, dest.channel).then(done).catch((err: any) => done({ url: plainLink(l, dest), token: null, plain: true, why: (err && err.message) || "" }));
    return () => { gone = true; };
  }, [dest, l, links]);
  /* How often the link has been opened, asked each time its destination is shown. */
  useEffect(() => {
    const L = W().SynListings, tok = link && link.token;
    if (!tok || !L || !L.shareLinkOpens) return;
    let gone = false;
    L.shareLinkOpens(tok).then((n: number) => { if (!gone) setOpens((m) => ({ ...m, [tok]: Number(n) || 0 })); }).catch(() => {});
    return () => { gone = true; };
  }, [link]);

  const pick = (d: Dest) => {
    if (d === dest) return;
    if (edited && !window.confirm("Switch destination? The caption is rewritten for it, and your edits to this one are lost.")) return;
    setDest(d); setEdited(false); editedRef.current = false;
    setText(shareCaption(l, d.form, links[d.id] ? links[d.id].url : "…"));
  };
  const copy = (value: string, which: "cap" | "link", said: string) => {
    const ok = () => { setCopied(which); toast(said); setTimeout(() => setCopied(""), 1800); };
    /* The clipboard is refused on some in-app browsers: select the text so a long-press still copies it. */
    const fallback = () => { try { area.current?.focus(); area.current?.select(); toast("Selected, copy it with a long-press"); } catch { /* nothing to select */ } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(ok, fallback); else fallback();
  };
  const save = () => {
    photoBlob(photo).then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = fileName(l, b);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("Photo saved");
    }).catch(() => { window.open(photo, "_blank", "noopener"); });   // a photo that will not download still opens: long-press saves it
  };
  const share = () => {
    photoBlob(photo).then((b) => navigator.share({ files: [new File([b], fileName(l, b), { type: b.type || "image/jpeg" })], text }))
      .catch((err: any) => {
        if (err && err.name === "AbortError") return;   // they closed the sheet
        const fallback = "Sharing didn’t open. Use Save photo, then Copy caption, and post them yourself.";
        if (!navigator.share) { toast(fallback); return; }
        return navigator.share({ text })
          .then(() => toast("Your phone shared the caption without the photo. Save the photo and add it in WhatsApp."))
          .catch((e2: any) => { if (!(e2 && e2.name === "AbortError")) toast(fallback); });
      });
  };

  const opened = link && link.token ? opens[link.token] : undefined;
  const note = !link ? ""
    : link.plain ? "Your personal link could not be made" + (link.why ? " (" + link.why + ")" : "") + ", so this is the plain listing link, visits through it are not credited to you."
    : "This link is yours: visits and leads that come through it are credited to you." + (opened === undefined || opened === null ? "" : " " + (opened ? "Opened " + opened + (opened === 1 ? " time" : " times") + " so far." : "Nobody has opened it yet."));
  return (
    <div className="shk-scrim on" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="shk" role="dialog" aria-modal="true" aria-labelledby="shkTitle">
        <div className="shk-head"><div><h3 id="shkTitle">Share this listing</h3><div className="shk-sub" id="shkSub">{l.title || l.t || "Listing"}</div></div>
          <button type="button" className="shk-x" id="shkX" aria-label="Close" onClick={onClose}>×</button></div>
        <div className="shk-dest" id="shkDest" role="group" aria-label="Where it is going">
          {SHARE_DEST.map((x) => <button key={x.id} type="button" className={"shk-chip" + (x === dest ? " on" : "")} data-dest={x.id} aria-pressed={x === dest} onClick={() => pick(x)}>{x.label}</button>)}
        </div>
        <p className="shk-how" id="shkHow">{dest.how}</p>
        <div className="shk-media">
          <div className={"shk-photo" + (!photo || noPhoto ? " none" : "")} id="shkPhoto">{photo && !noPhoto ? <img src={photo} alt="" onError={() => setNoPhoto(true)} /> : null}</div>
          <div className="shk-mbtns">
            <button type="button" className="btn btn-primary" id="shkNative" hidden={!canFiles} onClick={share}>Share photo + caption</button>
            <button type="button" className="btn btn-ghost" id="shkSave" hidden={!photo} onClick={save}>Save photo</button>
          </div>
        </div>
        <label className="shk-lbl" htmlFor="shkText">Caption</label>
        <textarea ref={area} className="shk-text" id="shkText" spellCheck value={text} onChange={(e) => { setText(e.target.value); setEdited(true); editedRef.current = true; }}></textarea>
        <div className="shk-row">
          <button type="button" className="btn btn-ghost" id="shkCopyCap" disabled={!link} onClick={() => copy(text, "cap", "Caption copied")}>{copied === "cap" ? "Copied" : "Copy caption"}</button>
          <span className="shk-link" id="shkLink">{link ? link.url.replace(/^https?:\/\//, "") : "Making your link…"}</span>
          <button type="button" className="btn btn-ghost" id="shkCopyLink" disabled={!link} onClick={() => link && copy(link.url, "link", "Link copied")}>{copied === "link" ? "Copied" : "Copy link"}</button>
        </div>
        <p className="shk-note" id="shkNote" role="status" aria-live="polite">{note}</p>
      </div>
    </div>
  );
}

/* ── "AND YOUR WHATSAPP STATUS?" (Eden, 2026-10-02) ──────────────────────────────────────────────────────────────────────────
   Remembered when a post goes out now; offered the next time they come back to the portal (not in the same moment); forgotten
   after 3 days or once answered. */
const STATUS_OFFER_KEY = "syn_status_offer_v1";
function rememberStatusOffer(id: string) {
  if (!id) return;
  try { localStorage.setItem(STATUS_OFFER_KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* storage blocked: no offer */ }
}
function dueOffer(): { id: string; l: any } | null {
  let o: any = null;
  try { o = JSON.parse(localStorage.getItem(STATUS_OFFER_KEY) || "null"); } catch { o = null; }
  if (!o || !o.id) return null;
  const age = Date.now() - Number(o.at || 0);
  if (age > 3 * 864e5) { try { localStorage.removeItem(STATUS_OFFER_KEY); } catch { /* blocked */ } return null; }
  if (age < 20000) return null;                       // coming back, not the same moment
  const l = typeof W().fullListing === "function" ? W().fullListing(o.id) : null;
  if (!l || !l.id) return null;                       // listings not loaded yet; asked again later
  try { localStorage.removeItem(STATUS_OFFER_KEY); } catch { /* blocked */ }
  return { id: o.id, l };
}

export function ShareKitHost() {
  const [kit, setKit] = useState<{ l: any; start: Dest; n: number } | null>(null);
  const [offer, setOffer] = useState<{ id: string; l: any } | null>(null);
  useEffect(() => {
    const open = (id: string, start: Dest = SHARE_DEST[0]) => {
      const l = W().fullListing?.(id);
      if (!l || !l.id) { toast("Save the listing first, a share link needs the saved listing"); return; }
      setKit((k) => ({ l, start, n: (k ? k.n : 0) + 1 }));
    };
    W().openShareKit = (id: string) => open(id);
    W().SynShareKitOpen = open;
    W().rememberStatusOffer = rememberStatusOffer;
    const check = () => setOffer((cur) => cur || (document.getElementById("stsOffer") ? null : dueOffer()));
    const onVis = () => { if (document.visibilityState === "visible") setTimeout(check, 800); };
    const onFocus = () => setTimeout(check, 800);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    const t1 = setTimeout(check, 5000), t2 = setTimeout(check, 12000);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onFocus); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {kit ? <Kit key={kit.n} l={kit.l} start={kit.start} onClose={() => setKit(null)} /> : null}
      {offer ? (
        <div className="sts-offer" id="stsOffer" role="dialog" aria-label="Share to WhatsApp Status">
          <div className="sts-ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg("whatsapp") }}></div>
          <div className="sts-t"><b>Your post is out.</b>{" Share " + (offer.l.title || "it") + " to your WhatsApp Status too?"}</div>
          <div className="sts-b">
            <button type="button" className="btn btn-ghost" data-sts="no" onClick={() => setOffer(null)}>Not now</button>
            <button type="button" className="btn btn-primary" data-sts="yes" onClick={() => { const id = offer.id; setOffer(null); W().SynShareKitOpen(id, SHARE_DEST[0]); }}>Share to Status</button>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
