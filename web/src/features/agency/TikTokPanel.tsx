"use client";
/**
 * The TikTok panel in the scheduler: what TikTok requires on the posting screen before an app may post straight to a
 * creator's profile (TikTok Content Sharing Guidelines, read 2026-11-11).
 *
 *   - which account receives the post, fetched fresh as the panel opens (tiktok-creator-info -> creator_info)
 *   - who can see it: a dropdown of exactly the options TikTok returned, with NO default
 *   - Allow comments / Duet / Stitch: all off by default, greyed out where the creator has turned them off
 *   - Content disclosure: off by default; "Your brand" / "Branded content", at least one when on; branded content
 *     cannot be "Only me"; the label TikTok will show is stated
 *   - the consent line, with TikTok's Music Usage Confirmation (and Branded Content Policy) linked
 *   - the caption editable, the video length limit stated, and that processing can take a few minutes
 *
 * Shown only when the backend says TikTok is in `direct` mode (TIKTOK_DIRECT_POST on). Otherwise it renders nothing and
 * reports null, and TikTok posts go to the inbox as before. The database only takes these choices from a post that
 * carries consent (social-publish refuses an invalid one and falls back to the inbox).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export type TikTokChoice =
  | null                                             /* not direct mode: inbox, as before */
  | { valid: false; reason: string }
  | { valid: true; tiktok: Record<string, unknown> };

type Info = {
  ok: true; nickname: string; username: string; avatar: string | null;
  privacy_options: { value: string; label: string }[];
  comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean; max_video_sec: number | null;
} | { ok: false; reason: string };

const MUSIC = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
const BRANDED = "https://www.tiktok.com/legal/page/global/bc-policy/en";

function sb() { const s = W().SynSB || {}; return { url: String(s.url || ""), key: String(s.key || "") }; }

export function TikTokPanel({ accountId, caption, onChange }: { accountId: string | null; caption: string; onChange: (c: TikTokChoice) => void }) {
  const [mode, setMode] = useState<"loading" | "inbox" | "direct">("loading");
  const [info, setInfo] = useState<Info | null>(null);
  const [privacy, setPrivacy] = useState("");
  const [allow, setAllow] = useState({ comment: false, duet: false, stitch: false });
  const [disclose, setDisclose] = useState(false);
  const [own, setOwn] = useState(false);
  const [branded, setBranded] = useState(false);
  const [title, setTitle] = useState(caption);

  /* Direct mode or not: the same public status the Channels pane reads. */
  useEffect(() => {
    let live = true;
    const { url, key } = sb();
    fetch(url + "/functions/v1/social-connect?action=status", { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live) setMode(j && j.platforms && j.platforms.tiktok && j.platforms.tiktok.mode === "direct" ? "direct" : "inbox"); })
      .catch(() => { if (live) setMode("inbox"); });
    return () => { live = false; };
  }, []);

  /* Creator info, fresh whenever the panel opens. The scheduler re-mounts the panel when the TikTok account changes, so
     the previous account's answer and choice never carry over. */
  useEffect(() => {
    if (mode !== "direct") return;
    let live = true;
    const { url, key } = sb();
    Promise.resolve(W().authToken ? W().authToken() : "")
      .then((t: string) => fetch(url + "/functions/v1/tiktok-creator-info", {
        method: "POST", headers: { apikey: key, Authorization: "Bearer " + t, "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId || undefined }),
      }))
      .then((r) => r.json().catch(() => ({})))
      .then((j: any) => { if (live) setInfo(j && j.ok ? j : { ok: false, reason: (j && (j.reason || j.error)) || "Could not reach TikTok. Try again shortly." }); })
      .catch(() => { if (live) setInfo({ ok: false, reason: "Could not reach TikTok. Try again shortly." }); });
    return () => { live = false; };
  }, [mode, accountId]);

  /* Branded content cannot be private: ticking it while "Only me" is selected clears the choice and says why. */
  const [privNote, setPrivNote] = useState("");
  const pickBranded = (on: boolean) => {
    setBranded(on);
    if (on && privacy === "SELF_ONLY") { setPrivacy(""); setPrivNote("Branded content visibility cannot be set to private. Choose who can see it."); }
    else setPrivNote("");
  };

  const choice: TikTokChoice = useMemo(() => {
    if (mode !== "direct") return null;
    if (!info) return { valid: false, reason: "Checking your TikTok account…" };
    if (!info.ok) return { valid: false, reason: info.reason };
    if (!privacy) return { valid: false, reason: "Choose who can see the TikTok post." };
    if (disclose && !own && !branded) return { valid: false, reason: "You need to indicate if your content promotes yourself, a third party, or both." };
    return {
      valid: true,
      tiktok: {
        mode: "direct", creator: info.nickname, privacy_level: privacy,
        disable_comment: info.comment_disabled ? true : !allow.comment,
        disable_duet: info.duet_disabled ? true : !allow.duet,
        disable_stitch: info.stitch_disabled ? true : !allow.stitch,
        brand_organic_toggle: disclose && own, brand_content_toggle: disclose && branded,
        title: title.trim() || null,
      },
    };
  }, [mode, info, privacy, allow, disclose, own, branded, title]);

  useEffect(() => { onChange(choice); }, [choice, onChange]);

  if (mode !== "direct") return null;
  const label = disclose && branded ? "Your post will be labeled as ‘Paid partnership’"
    : disclose && own ? "Your post will be labeled as ‘Promotional content’" : "";
  const box: CSSProperties = { border: "1px solid var(--line, rgba(0,0,0,.12))", borderRadius: 12, padding: 12, margin: "10px 0", fontSize: 13 };
  const row: CSSProperties = { display: "flex", alignItems: "center", gap: 8, margin: "6px 0" };

  return (
    <div className="tt-panel" data-tiktok-panel="" style={box}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>TikTok</div>
      {!info ? <div style={{ color: "var(--ink-dim, #666)" }}>Checking your TikTok account…</div>
        : !info.ok ? <div role="alert" style={{ color: "#b42318" }}>{info.reason}</div>
          : (
            <>
              <div style={row}>
                {info.avatar ? <img src={info.avatar} alt="" width={28} height={28} style={{ borderRadius: "50%" }} /> : null}
                <span>Posting to <b>{info.nickname}</b>{info.username ? " (@" + info.username + ")" : ""}</span>
              </div>

              <label style={{ display: "block", margin: "8px 0 4px" }} htmlFor="ttPrivacy">Who can see this post</label>
              <select id="ttPrivacy" value={privacy} onChange={(e) => setPrivacy(e.target.value)} style={{ width: "100%" }}>
                <option value="" disabled>Choose…</option>
                {info.privacy_options.map((o) => {
                  const block = branded && o.value === "SELF_ONLY";
                  return <option key={o.value} value={o.value} disabled={block} title={block ? "Branded content visibility cannot be set to private." : undefined}>{o.label}</option>;
                })}
              </select>
              {privNote ? <div style={{ color: "#9a5b00", fontSize: 12, marginTop: 4 }}>{privNote}</div> : null}

              <div style={{ margin: "10px 0 4px" }}>Allow people to</div>
              {([["comment", "Comment", info.comment_disabled], ["duet", "Duet", info.duet_disabled], ["stitch", "Stitch", info.stitch_disabled]] as [keyof typeof allow, string, boolean][]).map(([k, txt, off]) => (
                <label key={k} style={{ ...row, opacity: off ? 0.5 : 1 }} title={off ? "Turned off in this account’s TikTok settings." : undefined}>
                  <input type="checkbox" disabled={off} checked={!off && allow[k]} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} /> {txt}
                </label>
              ))}
              <div style={{ color: "var(--ink-dim, #666)", fontSize: 12 }}>Duet and Stitch apply to videos only.</div>

              <label style={{ ...row, marginTop: 10 }}>
                <input type="checkbox" checked={disclose} onChange={(e) => { setDisclose(e.target.checked); if (!e.target.checked) { setOwn(false); pickBranded(false); } }} />
                Content disclosure <span style={{ color: "var(--ink-dim, #666)" }}>— this post promotes a brand, product or service</span>
              </label>
              {disclose ? (
                <div style={{ paddingLeft: 24 }}>
                  <label style={row}><input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> Your brand</label>
                  <label style={row}><input type="checkbox" checked={branded} onChange={(e) => pickBranded(e.target.checked)} /> Branded content</label>
                  {label ? <div style={{ color: "var(--ink-dim, #666)" }}>{label}</div>
                    : <div style={{ color: "#9a5b00" }}>You need to indicate if your content promotes yourself, a third party, or both.</div>}
                </div>
              ) : null}

              <label style={{ display: "block", margin: "10px 0 4px" }} htmlFor="ttTitle">Caption on TikTok</label>
              <textarea id="ttTitle" value={title} onChange={(e) => setTitle(e.target.value)} rows={3} maxLength={2200} style={{ width: "100%" }} />

              {info.max_video_sec ? <div style={{ color: "var(--ink-dim, #666)", fontSize: 12 }}>Videos on this account can be up to {Math.max(1, Math.round(info.max_video_sec / 60))} minutes.</div> : null}
              <div style={{ color: "var(--ink-dim, #666)", fontSize: 12, marginTop: 4 }}>After posting, TikTok can take a few minutes to show it on the profile.</div>

              <div style={{ marginTop: 10, fontSize: 12 }} data-tiktok-consent="">
                {disclose && branded
                  ? <>By posting, you agree to TikTok’s <a href={BRANDED} target="_blank" rel="noopener noreferrer">Branded Content Policy</a> and <a href={MUSIC} target="_blank" rel="noopener noreferrer">Music Usage Confirmation</a>.</>
                  : <>By posting, you agree to TikTok’s <a href={MUSIC} target="_blank" rel="noopener noreferrer">Music Usage Confirmation</a>.</>}
              </div>
            </>
          )}
    </div>
  );
}
