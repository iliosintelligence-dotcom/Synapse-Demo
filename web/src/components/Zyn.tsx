"use client";

import { useRef, useState } from "react";
import type { MatchLike } from "./zynState";
import s from "./Zyn.module.css";

/**
 * Zyn, Synapse's mascot, for every page that shows the advisor. A 3D model rendered once per state (public/images/zyn/zyn-<state>.webp, with
 * true transparency, so he sits on any background). Each state moves its own way when idle; all motion stops for anyone who has asked their
 * device for less motion. Zyn has no mouth: he says it with his eyes and the way he stands. Tap him and he shows one of his moods.
 */
export const ZYN_STATES = ("happy curious thinking excited helpful winking surprised sleepy confused sorry proud delighted searching listening typing " +
  "calculating comparing navigating waving loading scheduling calling celebrating saving home price verified nearby documents offer keys headsup nothing alert intro shared").split(" ");

const MOTION: Record<string, string> = {};
"excited celebrating delighted surprised keys waving".split(" ").forEach((x) => (MOTION[x] = s.bounce));
"curious confused thinking listening searching comparing navigating winking".split(" ").forEach((x) => (MOTION[x] = s.sway));
"sleepy sorry nothing".split(" ").forEach((x) => (MOTION[x] = s.slow));
MOTION.loading = s.pulse;

const known = (state: string) => (ZYN_STATES.includes(state) ? state : "happy");
export const zynUrl = (state: string) => `/images/zyn/zyn-${known(state)}.webp`;
const EMOTES = ["celebrating", "excited", "waving", "delighted", "winking"];

export type { MatchLike };

export function Zyn({ state, size = 58 }: { state: string; size?: number }) {
  const [emote, setEmote] = useState<string | null>(null);
  const busy = useRef(false);
  const shown = emote ?? known(state);
  const tap = () => {
    if (busy.current) return;
    busy.current = true;
    setEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
    setTimeout(() => { setEmote(null); busy.current = false; }, 1800);
  };
  return (
     
    <img
      className={`${s.zyn} ${emote ? s.bounce : MOTION[shown] ?? s.bob}`}
      src={zynUrl(shown)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      onClick={tap}
      style={{ pointerEvents: "auto", cursor: "pointer" }}
    />
  );
}
