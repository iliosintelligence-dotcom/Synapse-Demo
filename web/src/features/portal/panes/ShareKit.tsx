"use client";

import { useEffect, useState } from "react";
import { fileNameFor, fetchPhoto, linkOpens, loadShareListing, makeLink, placeLink, SHARE_DEST, shareCaption, type Dest, type ShareLink, type ShareListing } from "../data/share";
import { loadBrand } from "../data/brand";
import { useToast } from "../ui/Toast";
import s from "./Share.module.css";

/** Share this listing from your own phone: the photo, a caption written for where it is going, and a link that is yours. */
export function ShareKit({ listingId, onClose, startOn }: { listingId: string; onClose: () => void; startOn?: string }) {
  const toast = useToast();
  const [l, setL] = useState<ShareListing | null>(null);
  const [agency, setAgency] = useState<string | null>(null);
  const [dest, setDest] = useState<Dest>(() => SHARE_DEST.find((d) => d.id === startOn) ?? SHARE_DEST[0]);
  const [links, setLinks] = useState<Record<string, ShareLink>>({});
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [opens, setOpens] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [canFiles] = useState(() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] })); } catch { return false; } });

  useEffect(() => {
    let live = true;
    loadShareListing(listingId).then((x) => { if (!live) return; if (x) setL(x); else setFailed(true); }).catch(() => live && setFailed(true));
    loadBrand().then((b) => live && setAgency(b?.name ?? null)).catch(() => {});
    return () => { live = false; };
  }, [listingId]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);

  // a link is made once per destination; until it arrives the caption carries a placeholder
  useEffect(() => {
    if (!l || links[dest.id]) return;
    let live = true;
    makeLink(l, dest).then((k) => live && setLinks((x) => ({ ...x, [dest.id]: k })));
    return () => { live = false; };
  }, [l, dest, links]);

  const link = links[dest.id];
  // the caption follows the destination until the person edits it; the link slots in when it arrives
  useEffect(() => {
    if (!l) return;
    const t = setTimeout(() => {
      if (!edited) setText(shareCaption(l, dest.form, link?.url ?? "…", agency));
      else if (link) setText((cur) => placeLink(cur, link.url));
    }, 0);
    return () => clearTimeout(t);
  }, [l, dest, link, edited, agency]);
  useEffect(() => {
    if (!link?.token) return;
    let live = true;
    linkOpens(link.token).then((n) => live && setOpens(n)).catch(() => {});
    return () => { live = false; };
  }, [link]);

  const pickDest = (d: Dest) => {
    if (d.id === dest.id) return;
    if (edited && !window.confirm("Switch destination? The caption is rewritten for it, and your edits to this one are lost.")) return;
    setDest(d); setEdited(false); setOpens(null);
  };
  const copy = async (what: string, said: string) => { try { await navigator.clipboard.writeText(what); toast(said); } catch { toast("Could not copy. Select it and copy it with a long-press.", "error"); } };
  const savePhoto = async () => {
    if (!l?.photo) return;
    try { const b = await fetchPhoto(l.photo); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fileNameFor(l.title, b.type); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Photo saved"); } catch { window.open(l.photo, "_blank", "noopener"); }
  };
  const nativeShare = async () => {
    if (!l?.photo) return;
    try { const b = await fetchPhoto(l.photo); await navigator.share({ files: [new File([b], fileNameFor(l.title, b.type), { type: b.type || "image/jpeg" })], text }); }
    catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // they closed the sheet
      const fallback = "Sharing didn’t open. Use Save photo, then Copy caption, and post them yourself.";
      if (!navigator.share) { toast(fallback, "error"); return; }
      try { await navigator.share({ text }); toast("Your phone shared the caption without the photo. Save the photo and add it in WhatsApp."); } catch (e2) { if (!(e2 instanceof Error && e2.name === "AbortError")) toast(fallback, "error"); }
    }
  };

  return (
    <div className={s.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.kit} role="dialog" aria-modal="true" aria-labelledby="shkTitle">
        <div className={s.head}><div><h3 id="shkTitle">Share this listing</h3><div className={s.sub}>{l?.title ?? ""}</div></div><button type="button" className={s.x} aria-label="Close" onClick={onClose}>×</button></div>
        {failed ? <p className={s.err}>Save the listing first: a share link needs the saved listing.</p> : !l ? <p className={s.muted} aria-busy="true">Loading…</p> : (
          <>
            <div className={s.dest} role="group" aria-label="Where it is going">{SHARE_DEST.map((d) => <button key={d.id} type="button" aria-pressed={d.id === dest.id} onClick={() => pickDest(d)}>{d.label}</button>)}</div>
            <p className={s.muted}>{dest.how}</p>
            <div className={s.media}>
              <div className={s.photo}>{l.photo ? <img src={l.photo} alt="" /> : <span>No photo</span>}</div>
              <div className={s.mbtns}>
                {canFiles && l.photo && <button type="button" className={`${s.btn} ${s.solid}`} onClick={() => void nativeShare()}>Share photo + caption</button>}
                {l.photo && <button type="button" className={s.btn} onClick={() => void savePhoto()}>Save photo</button>}
              </div>
            </div>
            <label className={s.lbl} htmlFor="shkText">Caption</label>
            <textarea id="shkText" className={s.text} value={text} spellCheck onChange={(e) => { setText(e.target.value); setEdited(true); }} rows={10} />
            <div className={s.row}>
              <button type="button" className={s.btn} disabled={!link} onClick={() => void copy(text, "Caption copied")}>Copy caption</button>
              <span className={s.link}>{link ? link.url.replace(/^https?:\/\//, "") : "Making your link…"}</span>
              <button type="button" className={s.btn} disabled={!link} onClick={() => link && void copy(link.url, "Link copied")}>Copy link</button>
            </div>
            {link && <p className={s.note} role="status">{link.plain
              ? `Your personal link could not be made${link.why ? ` (${link.why})` : ""}, so this is the plain listing link: visits through it are not credited to you.`
              : `This link is yours: visits and leads that come through it are credited to you. ${opens ? `Opened ${opens} ${opens === 1 ? "time" : "times"} so far.` : opens === 0 ? "Nobody has opened it yet." : ""}`}</p>}
          </>
        )}
      </div>
    </div>
  );
}
