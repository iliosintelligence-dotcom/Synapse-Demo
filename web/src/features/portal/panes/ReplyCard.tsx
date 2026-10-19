"use client";

import { useEffect, useState } from "react";
import { myRole } from "../data/agency";
import { DEFAULT_REPLY, fetchReplySettings, replyPreview, saveReplySettings, validKeyword, type ReplySettings } from "../data/replies";
import { useToast } from "../ui/Toast";
import s from "./Channels.module.css";

/** Answer comments with the link. Owner and admin only: it is the one control here that messages strangers, so assuming "on" would be the wrong way to be wrong. */
export function ReplyCard() {
  const toast = useToast();
  const [allowed, setAllowed] = useState(false);
  const [cfg, setCfg] = useState<ReplySettings | null>(null);
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(false);
  const [kw, setKw] = useState("PRICE");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    myRole().then((r) => live && setAllowed(r === "agency_owner" || r === "agency_admin")).catch(() => {});
    fetchReplySettings().then((c) => { if (live) { setCfg(c); setOn(c.enabled); setKw(c.keyword); setMsg(c.message); } }).catch(() => live && setCfg(null));
    return () => { live = false; };
  }, []);
  if (!allowed || !cfg) return null;

  const saved = !!cfg.agency_id;
  // someone who deliberately saved the defaults has made the decision and gets the same one line as anybody else; one who never has sees the open form
  if (saved && !open) {
    return (
      <div className={s.reply}>
        <div className={s.replySum}><span className={`${s.dot} ${cfg.enabled ? s.dotOn : ""}`} aria-hidden="true" /><span>{cfg.enabled ? <>Answering comments that say <b>{cfg.keyword}</b> with the listing link</> : <>Comment replies are <b>off</b></>}</span></div>
        <button type="button" className={s.btn} onClick={() => setOpen(true)}>Edit</button>
      </div>
    );
  }

  const save = async () => {
    if (!validKeyword(kw)) { setNote("Give it a word to listen for."); return; }
    setBusy(true); setNote("Saving…");
    try {
      await saveReplySettings({ enabled: on, keyword: kw, message: msg });
      setCfg(await fetchReplySettings().catch(() => ({ ...DEFAULT_REPLY, agency_id: "saved", enabled: on, keyword: kw, message: msg })));
      setOpen(false); setNote(""); toast("Saved");
    } catch (e) { setNote(e instanceof Error ? e.message : "Could not save that"); } // a failed save leaves it open, so nobody loses what they typed
    setBusy(false);
  };

  return (
    <div className={s.reply}>
      <div className={s.replyBody}>
        <b>Answer comments with the link</b>
        <p className={s.note}>Instagram captions cannot be tapped. When somebody comments <b>{kw || "…"}</b> on one of your posts, Synapse sends them one direct message with the link to that exact home. <b>The comment is the permission</b>, so the caption has to ask for it, and nobody else is messaged.</p>
        <label className={s.check}><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Send the link when somebody comments the word below</label>
        <label className={s.field}>Word<input value={kw} maxLength={24} onChange={(e) => setKw(e.target.value)} /></label>
        <label className={s.field}>Message<textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hi! Here is the home you asked about: {{link}}" /></label>
        <div className={s.preview}><span className={s.k}>What they will receive</span><pre>{replyPreview(msg)}</pre></div>
        <div className={s.row2}>
          <button type="button" className={`${s.btn} ${s.solid}`} disabled={busy} onClick={() => void save()}>Save</button>
          {saved && <button type="button" className={s.btn} disabled={busy} onClick={() => { setOpen(false); setOn(cfg.enabled); setKw(cfg.keyword); setMsg(cfg.message); setNote(""); }}>Cancel</button>}
          <span className={s.muted}>{note}</span>
        </div>
      </div>
    </div>
  );
}
