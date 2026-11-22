"use client";

import { useRef, useState } from "react";
import s from "./Zyn.module.css";
import { sproutOrigin } from "@/shared/zynSprout";

/**
 * The robot, Synapse's mascot (still called Zyn in code), for every page that shows the advisor. Each state is two pictures with true
 * transparency: the body (public/images/zyn/zyn-<state>-body.webp) and the sprout on its head (zyn-<state>-sprout.webp), so the sprout can
 * sway on its own, bending from its stem. Each state moves its own way when idle; all motion stops for anyone who has asked their
 * device for less motion. Tap him and he shows one of his moods.
 */
const ZYN_STATES = ("happy curious thinking excited helpful winking surprised sleepy confused sorry proud delighted searching listening typing " +
  "calculating comparing navigating waving loading scheduling calling celebrating saving home price verified nearby documents offer keys headsup nothing alert intro shared").split(" ");

const MOTION: Record<string, string> = {};
/* same map as src/shared/zyn.ts; anything not listed hovers */
"excited celebrating delighted keys shared".split(" ").forEach((x) => (MOTION[x] = s.bounce));
"curious confused thinking listening searching comparing navigating winking calling".split(" ").forEach((x) => (MOTION[x] = s.sway));
"typing calculating scheduling documents".split(" ").forEach((x) => (MOTION[x] = s.busy));
"alert headsup surprised".split(" ").forEach((x) => (MOTION[x] = s.jolt));
"sleepy sorry nothing".split(" ").forEach((x) => (MOTION[x] = s.slow));
MOTION.waving = s.wave;
MOTION.loading = s.pulse;

const known = (state: string) => (ZYN_STATES.includes(state) ? state : "happy");
// same version as src/shared/zyn.ts
const layerUrl = (state: string, part: "body" | "sprout") => `/images/zyn/zyn-${known(state)}-${part}.webp?v=robot1`;
const EMOTES = ["celebrating", "excited", "waving", "delighted", "winking"];

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
  // key={shown}: a new state mounts a new figure, so the power-on pop plays again
  return (
    <span
      key={shown}
      className={`${s.zyn} ${emote ? s.bounce : MOTION[shown] ?? s.bob}`}
      style={{ width: size, height: size, pointerEvents: "auto", cursor: "pointer" }}
      aria-hidden="true"
      onClick={tap}
    >
      <img className={s.body} src={layerUrl(shown, "body")} alt="" draggable={false} />
      <img className={s.sprout} src={layerUrl(shown, "sprout")} alt="" draggable={false} style={{ transformOrigin: sproutOrigin(shown) }} />
    </span>
  );
}
