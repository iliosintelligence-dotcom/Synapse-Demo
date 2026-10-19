"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/auth-actions";
import s from "./SignIn.module.css";

/**
 * The picture side. Each door has a set and moves through it IN ORDER (an index kept on the device), not at random: random repeats
 * roughly one visit in five, which reads as broken. A buyer gets interiors (rooms, from inside, where somebody lives); an agency gets
 * landmarks (the country they sell into). The line travels with the picture: they are one pair so they can never drift apart.
 *
 * To add more: drop the three sizes (name.jpg, name-900.jpg, name-1200.jpg) in public/images/signin and add a pair here.
 * Photos are Pexels (commercial use, no attribution). Not Pinterest: those are other people's copyrighted photographs.
 */
const SETS: Record<Role, Array<{ base: string; line: string }>> = {
  customer: [
    { base: "interior-navy-sofa", line: "The last step before the keys." },
    { base: "interior-brick-window", line: "A window you have not looked out of yet." },
    { base: "interior-contemporary", line: "Somewhere to put your things down." },
    { base: "interior-minimal-living", line: "The quiet after the search." },
    { base: "interior-art-decor", line: "A room that already looks like you." },
  ],
  agency: [
    { base: "landmark-eko-bridge", line: "The leads are already waiting." },
    { base: "landmark-carter-bridge", line: "Every enquiry in one inbox." },
    { base: "landmark-lagos-sunset", line: "Follow-ups that go out on time." },
    { base: "landmark-lagos-skyline", line: "One listing, every channel, at once." },
    { base: "landmark-lagos-aerial", line: "The market you already sell into." },
  ],
};

function nextIndex(role: Role): number {
  const key = `syn_art_${role}`;
  try {
    return (parseInt(localStorage.getItem(key) ?? "", 10) || 0) % SETS[role].length;
  } catch {
    return 0; // private window: always the first, never broken
  }
}

export function ArtPanel({ role }: { role: Role }) {
  const set = SETS[role];
  const [i, setI] = useState(() => (typeof window === "undefined" ? 0 : nextIndex(role)));
  const [tries, setTries] = useState(0);

  // the NEXT visit shows the next picture
  useEffect(() => {
    try { localStorage.setItem(`syn_art_${role}`, String((nextIndex(role) + 1) % set.length)); } catch { /* not remembered */ }
  }, [role, set.length]);

  const cur = set[i];
  const src = `/images/signin/${cur.base}`;
  return (
    <div className={s.art}>
      {/* srcset before src, so the browser fetches only the one it needs; sizes says how wide the panel really is */}
      { }
      <img
        key={cur.base}
        className={s.artPhoto}
        alt=""
        aria-hidden="true"
        srcSet={`${src}-900.jpg 900w, ${src}-1200.jpg 1200w, ${src}.jpg 1800w`}
        sizes="(max-width: 1024px) 100vw, 52vw"
        src={`${src}.jpg`}
        onError={() => { if (tries + 1 < set.length) { setTries(tries + 1); setI((i + 1) % set.length); } }}
      />
      {/* The landing page is a static file, not a Next route, so a plain link is right here. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className={s.brand} href="/index.html">
        { }
        <img src="/images/brand/mark-white-transparent.png" alt="" aria-hidden="true" />
        <span>Synapse</span>
      </a>
      <div className={s.artIn}>
        <p className={s.eyebrow}>{role === "agency" ? "Agency workspace" : "Your account"}</p>
        <p className={s.quote}>{cur.line}</p>
        <p className={s.artSub}>
          {role === "agency"
            ? "Every enquiry, every reply and every post that brought them in, in one place your whole team works from."
            : "Your account keeps your saved homes, your conversations with Tayo, and the agents you have spoken to, on every device."}
        </p>
        <div className={s.marks}>
          <span>Verified listings only</span>
          <span>Free for buyers &amp; renters</span>
        </div>
      </div>
    </div>
  );
}
