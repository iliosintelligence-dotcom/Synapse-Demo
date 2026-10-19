"use client";

import { useEffect, useState } from "react";
import { fetchReferral, monthsWord, referralLink, toGo, type Referral } from "../data/referral";
import { useToast } from "../ui/Toast";
import s from "./Billing.module.css";

/** Refer agencies, earn free months. Hidden until the programme is on for this agency. */
export function ReferralCard() {
  const toast = useToast();
  const [r, setR] = useState<Referral | null>(null);
  useEffect(() => { let live = true; fetchReferral().then((x) => live && setR(x)).catch(() => {}); return () => { live = false; }; }, []);
  if (!r) return null;
  const link = referralLink(r.code);
  const copy = async () => {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { try { await navigator.share({ title: "Synapse for agencies", text: "Try Synapse for your agency:", url: link }); return; } catch { /* fall through to copying */ } }
    try { await navigator.clipboard.writeText(link); toast("Link copied. Send it to another agent."); } catch { toast("Could not copy. Select the link and copy it.", "error"); }
  };
  return (
    <section className={s.ref} aria-label="Referrals">
      <h3 className={s.refH}>Refer agents, get a free {r.months_per_reward === 1 ? "month" : "stretch"}</h3>
      <p className={s.muted}>Every {r.per_reward} agencies you bring to Synapse earn you {monthsWord(r.months_per_reward)} free. An agency counts once it has uploaded {r.listings_required} listings.</p>
      <div className={s.refSteps} aria-hidden="true">{Array.from({ length: r.per_reward }, (_, i) => <i key={i} className={i < r.into_next ? s.refOn : ""} />)}</div>
      <div className={s.refLine}>
        <span><b>{r.into_next} of {r.per_reward}</b> toward your next free month{toGo(r) > 0 ? ` (${toGo(r)} to go)` : ""}</span>
        <span>{r.counted} counted{r.pending ? ` · ${r.pending} joined, not counted yet` : ""}</span>
        {r.months_earned > 0 && <span className={s.held}>{monthsWord(r.months_earned)} earned</span>}
      </div>
      <div className={s.refLink}><code>{link}</code><button type="button" className={s.primary} onClick={() => void copy()}>Copy link</button></div>
      {r.recent && r.recent.length > 0 && (
        <ul className={s.refList} aria-label="Agencies you referred">
          {r.recent.map((x, i) => <li key={i} className={x.counted ? s.refOk : ""}><span>{x.name || "An agency"}</span><span>{x.counted ? "Counted" : `Joined · needs ${r.listings_required} listings`}</span></li>)}
        </ul>
      )}
    </section>
  );
}
