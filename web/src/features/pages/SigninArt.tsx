"use client";
/**
 * THE PANEL CYCLES (React since 2026-10-25, was src/legacy/signin/inline-4.js).
 *
 * A sign-in page is somewhere people come back to, and the same photograph every time makes it feel like the page never changed.
 * So each door has a set and moves through it. Two sets, because the two doors argue different things: a buyer gets INTERIORS
 * (rooms, from inside, where somebody lives); an agency gets LANDMARKS (the country they sell into, at the scale they sell at).
 *
 * IN ORDER, NOT AT RANDOM. Random repeats -- roughly one visit in five would show the same picture twice running, which reads as
 * broken rather than varied. An index in localStorage means the next visit is always a different photograph, and it degrades to
 * the first one in a private window where storage throws.
 *
 * TO ADD MORE: drop the file in images/ (with its -900 and -1200 sizes) and add it to the array. A file that fails to load is
 * skipped rather than leaving an empty panel, so a typo costs one slot and not the page.
 *
 * WHERE THESE CAME FROM. All ten are Pexels, whose licence allows commercial use with no attribution. NOT Pinterest: those are
 * other people's copyrighted photographs and this is a product agencies pay for.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

/* THE LINE TRAVELS WITH THE PICTURE, not beside it: one pair in one array, so adding a photograph without a line cannot drift. */
const INTERIORS = [
  { src: "../images/interior-navy-sofa.jpg", line: "The last step before the keys." },
  { src: "../images/interior-brick-window.jpg", line: "A window you have not looked out of yet." },
  { src: "../images/interior-contemporary.jpg", line: "Somewhere to put your things down." },
  { src: "../images/interior-minimal-living.jpg", line: "The quiet after the search." },
  { src: "../images/interior-art-decor.jpg", line: "A room that already looks like you." },
];
/* Nigeria at the scale an agency works at. The agency lines carry what the `.au-work` list used to say (hidden on a phone). */
const LANDMARKS = [
  { src: "../images/landmark-eko-bridge.jpg", line: "The leads are already waiting." },       // Lekki-Ikoyi Link Bridge
  { src: "../images/landmark-carter-bridge.jpg", line: "Every enquiry in one inbox." },       // Carter Bridge, Lagos Island
  { src: "../images/landmark-lagos-sunset.jpg", line: "Follow-ups that go out on time." },    // Lagos skyline from the water
  { src: "../images/landmark-lagos-skyline.jpg", line: "One listing, every channel, at once." }, // Lagos skyline
  { src: "../images/landmark-lagos-aerial.jpg", line: "The market you already sell into." },  // Lagos from above at sunset
];

/* The photograph on screen, shared with the line beside it (SigninArtText). */
let line = "";
const subs = new Set<() => void>();
const setLine = (l: string) => { line = l; subs.forEach((f) => f()); };
export const useArtLine = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => line, () => "");

export function SigninPhoto() {
  const [pick, setPick] = useState<{ set: typeof INTERIORS; i: number; tried: number } | null>(null);
  useEffect(() => {
    const agency = document.documentElement.getAttribute("data-role") === "agency";   // stamped by the head script (inline-2.js)
    const set = agency ? LANDMARKS : INTERIORS;
    const KEY = "syn_art_" + (agency ? "agency" : "customer");
    let i = 0;
    try {
      i = (parseInt(localStorage.getItem(KEY) || "", 10) || 0) % set.length;
      localStorage.setItem(KEY, String((i + 1) % set.length));
    } catch { i = 0; }   // private window: always the first, never broken
    setPick({ set, i, tried: 0 });   // eslint-disable-line react-hooks/set-state-in-effect -- localStorage exists only in the browser
  }, []);
  useEffect(() => { if (pick) setLine(pick.set[pick.i].line); }, [pick]);

  if (!pick) return <img id="artPhoto" alt="" aria-hidden="true" />;
  const src = pick.set[pick.i].src, base = src.replace(/\.jpg$/, "");
  /* The phone was downloading a billboard: these are 1800px files and the panel is 375x208 on a phone. srcset (with sizes, which
     says how wide the panel really is) picks the 900 or 1200 copy; React sets srcset before src, so only one is fetched. */
  return (
    <img id="artPhoto" alt="" aria-hidden="true" key={src}
      sizes="(max-width: 1024px) 100vw, 52vw" srcSet={`${base}-900.jpg 900w, ${base}-1200.jpg 1200w, ${src} 1800w`} src={src}
      /* Walk on to the next one if a file is missing, and stop after a full lap so a wholly absent set cannot loop forever. */
      onError={() => setPick((p) => (p && p.tried + 1 < p.set.length ? { set: p.set, i: (p.i + 1) % p.set.length, tried: p.tried + 1 } : p))} />
  );
}
