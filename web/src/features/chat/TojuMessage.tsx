"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Zyn } from "@/components/Zyn";
import { zynForReply } from "@/components/zynState";
import { naira } from "@/lib/format";
import { routes } from "@/lib/routes";
import { recordFeedback } from "./api";
import { quickAnswers } from "./quick";
import { loadFeedback, loadPins, savePins, saveFeedback, type Rating } from "./storage";
import type { ChatMessage, Pin } from "./types";
import s from "./Chat.module.css";

/** The time of an action, from outside the component so rendering stays pure. */
const now = () => Date.now();

/** A pin is identified by what it says and the homes under it, so the same reply is the same pin on every device. */
export function pinId(text: string, matches: Array<{ id?: string }>): string {
  const src = `${text}|${matches.map((m) => m.id).join(",")}`;
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return `p${(h >>> 0).toString(36)}`;
}

/** The words and a link to each home, as one block of text that can be shared or copied. Nothing is uploaded. */
export function shareText(pl: Pin): string {
  const homes = pl.matches.map((m) => `• ${m.title || "Listing"}${Number(m.price) > 0 ? ` · ${naira(m.price)}` : ""}\n  ${new URL(routes.property(m.id), window.location.origin).href}`);
  return `Tayo, Synapse's property advisor:\n\n${pl.text}${pl.more ? `\n\n${pl.more}` : ""}${homes.length ? `\n\n${homes.join("\n")}` : ""}\n\n${window.location.origin}${routes.tayo("?new=site")}`;
}

/** The phone's own share sheet where there is one; where there is not, copy. Resolves to a word for the button to flash. */
export async function shareOut(text: string): Promise<string> {
  if (navigator.share) {
    try { await navigator.share({ title: "Tayo on Synapse", text }); return ""; } catch (e) { return (e as Error)?.name === "AbortError" ? "" : "Could not share"; }
  }
  try { await navigator.clipboard.writeText(text); return "Copied"; } catch { window.prompt("Copy this to share it:", text); return ""; }
}

const ICON: Record<string, string> = {
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  pin: "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
  up: "M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z",
  down: "M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z",
};

function IconButton({ act, label, pressed, tip, onClick }: { act: string; label: string; pressed?: boolean; tip: string | null; onClick: () => void }) {
  return (
    <button type="button" className={`${s.ib} ${tip ? s.tip : ""}`} data-tip={tip ?? undefined} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[act]} /></svg>
    </button>
  );
}

const VERIFY: Record<string, string> = { verified: "✓ Verified", in_progress: "◷ Still checking" };

/** One reply from Tayo, with everything that belongs under it: market history, what was checked, the homes, More, quick answers and the actions. */
export function TojuMessage({ m, live, onQuick, greeting }: { m: ChatMessage; live: boolean; onQuick: (v: string) => void; greeting?: boolean }) {
  const [more, setMore] = useState(false);
  const [quickGone, setQuickGone] = useState(false);
  const matches = (Array.isArray(m.matches) ? m.matches : []).slice(0, 6);
  const id = pinId(m.content, matches.map((x) => ({ id: x.id })));
  const [pinned, setPinned] = useState(() => loadPins().some((p) => p.id === id));
  const [rating, setRating] = useState<Rating | null>(() => loadFeedback()[id] ?? null);
  const [tip, setTip] = useState<{ act: string; word: string } | null>(null);
  const flash = (act: string, word: string) => { setTip({ act, word }); setTimeout(() => setTip(null), 1600); };

  const payloadAt = (at: number): Pin => ({ id, text: m.content, more: m.more ?? null, matches: matches.map((x) => ({ id: x.id ?? "", title: x.title, price: x.price })), at });
  const togglePin = () => {
    const pins = loadPins();
    if (pins.some((p) => p.id === id)) { savePins(pins.filter((p) => p.id !== id)); setPinned(false); flash("pin", "Unpinned"); }
    else { savePins([payloadAt(now()), ...pins]); setPinned(true); flash("pin", "Pinned"); }
  };
  const rate = (want: Rating) => {
    const map = loadFeedback();
    const clearing = map[id] === want;
    if (clearing) delete map[id]; else map[id] = want;
    saveFeedback(map);
    setRating(clearing ? null : want);
    flash(want, clearing ? "Removed" : "Thanks");
    if (!clearing) recordFeedback(id, want, m.content);
  };
  const share = async () => { const w = await shareOut(shareText(payloadAt(now()))); if (w) flash("share", w); };

  const quick = live && !quickGone ? quickAnswers(m.content, null).slice(0, 6) : [];
  const state = zynForReply({ text: m.content, matches, searched: m.searched, priceHistory: m.priceHistory, greeting });

  return (
    <div className={`${s.msg} ${s.toju}`}>
      <div className={s.av}><Zyn state={state} size={58} /></div>
      <div className={s.col}>
        <div className={s.sender}>Tayo</div>
        <div className={s.bubble}><Markdown text={m.content} />{m.more && (
          <>
            <button type="button" className={s.more} aria-expanded={more} onClick={() => setMore(!more)}>{more ? "Less" : "More"}</button>
            {more && <div className={s.moreBody}><Markdown text={m.more} /></div>}
          </>
        )}</div>

        {m.priceHistory?.rows?.length ? (
          <div className={s.ph}>
            <div className={s.phK}>Past prices · {m.priceHistory.area}{m.priceHistory.unit ? ` · ${m.priceHistory.unit}` : ""}</div>
            <div className={s.phScroll}>
              <table><thead><tr><th>When</th><th>Typical price</th><th>Change</th></tr></thead>
                <tbody>{m.priceHistory.rows.map((r, i) => <tr key={i}><td>{r.period}</td><td>{r.typical}</td><td>{r.change ?? ""}</td></tr>)}</tbody></table>
            </div>
            {m.priceHistory.summary && <p className={s.phSum}>{m.priceHistory.summary}</p>}
            {/* only https links are ever linked, so a javascript: URL from a search result can never be clicked */}
            {(m.priceHistory.sources ?? []).filter((x) => x && /^https:\/\/[^\s"'<>]+$/i.test(String(x.url))).length > 0 && (
              <p className={s.phSrc}>Sources: {(m.priceHistory.sources ?? []).filter((x) => x && /^https:\/\/[^\s"'<>]+$/i.test(String(x.url))).map((x, i) => (
                <span key={x.url}>{i ? " · " : ""}<a href={x.url} target="_blank" rel="noopener nofollow noreferrer">{x.title}</a></span>
              ))}</p>
            )}
          </div>
        ) : null}

        {m.searched && (
          <div className={s.checked}>
            Checked our live listings{m.searched.where ? ` in ${m.searched.where}` : ""}: {Number(m.searched.live) === 0 ? "none there" : `${Number(m.searched.live) || 0} live${m.searched.kinds ? ` (${m.searched.kinds})` : ""}`}
            {Number(m.searched.found) ? ` · ${m.searched.found} shown below` : ""}
          </div>
        )}

        {matches.length > 0 && (
          <>
            <div className={s.matchesH}><span>HOMES WORTH A LOOK</span><span className={s.cnt}>{matches.length}</span><a href={routes.browse()}>View all →</a></div>
            {matches.map((x, i) => (
              <a key={x.id ?? i} className={s.pcard} href={routes.property(x.id ?? "")}>
                <div className={s.pthumb}><b>{x.deal?.propertyType === "land" ? Number(x.deal?.plots) || 1 : Number(x.bedrooms) || 0}</b><span>{x.deal?.propertyType === "land" ? "PLOT" : "BED"}</span></div>
                <div>
                  <div className={s.pprice}>{naira(x.price)}{{ per_year: "/yr", per_month: "/mo", per_night: "/night" }[x.pricePeriod ?? ""] ?? ""}</div>
                  <div className={s.pttl}>{x.title}</div>
                  <div className={s.vrow}><span className={s.vchip}>{VERIFY[x.verificationStatus ?? ""] ?? (x.verified ? "✓ Verified" : "◌ Not verified")}</span></div>
                  <div className={s.pmeta}><span title="Property Confidence: how much of our verification this home has passed">Confidence {Number(x.trustScore) || 0}</span> · {x.city}{x.yieldPct != null && x.yieldPct > 0 ? ` · ${x.yieldPct}% yield` : ""}</div>
                  {x.why && <div className={s.watch}><b>Recommended — </b>{x.why}</div>}
                  {x.whatToWatch && x.whatToWatch !== "No major synthetic flags" && <div className={s.watch}><b>Worth checking — </b>{x.whatToWatch}</div>}
                </div>
              </a>
            ))}
          </>
        )}

        {quick.length > 0 && (
          <div className={s.quick} role="group" aria-label="Quick answers">
            {quick.map((o) => <button key={o} type="button" onClick={() => { setQuickGone(true); onQuick(o); }}>{o}</button>)}
          </div>
        )}

        <div className={s.acts} role="group" aria-label="Reply actions">
          <IconButton act="share" label="Share" tip={tip?.act === "share" ? tip.word : null} onClick={share} />
          <IconButton act="pin" label={pinned ? "Unpin" : "Pin"} pressed={pinned} tip={tip?.act === "pin" ? tip.word : null} onClick={togglePin} />
          <IconButton act="up" label="Good reply" pressed={rating === "up"} tip={tip?.act === "up" ? tip.word : null} onClick={() => rate("up")} />
          <IconButton act="down" label="Poor reply" pressed={rating === "down"} tip={tip?.act === "down" ? tip.word : null} onClick={() => rate("down")} />
        </div>
      </div>
    </div>
  );
}
