/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The toju page's markup as React (converted from src/legacy/toju/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its shared scripts run once React has taken the page over (AfterHydration), in their original order; then the chat engine
// (engine.ts, was inline-5.js) starts.
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { ChatsMenu, EngineStart, HandoffStatus, MemoryNote, VoiceHint } from "./EngineParts";
import { ShareHost } from "@/features/shared/ShareSheet";

const SCRIPTS: PageScript[] = [
  { src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" },
  { shared: "map-tiles" },
  { shared: "map/style-synapse" },
  { shared: "map/render" },
  { shared: "map/card" },
  { shared: "map/query" },
  { shared: "stamp" },
  { shared: "matches-shared" },
  { shared: "icons" },
  { shared: "icon-morph", module: true },
  { shared: "cust-nav" },
  { shared: "auth" },
  { shared: "notify" },
  { shared: "motion" },
];

export function TojuBody() {
  return (
    <>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="tj-bg"></div>
      <div className="tj-wash"></div>
      <div className="tj-app">
        <div className="appbar">
          <a className="brand" href="../buyers.html">
            {" "}
            <img className="syn-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />
            {"\n        Synapse\n      "}
          </a>
          <nav>
            <a href="toju.html" className="active">
              Tayo
            </a>
            {" "}
            <a href="browse.html">
              Your matches
            </a>
            {" "}
            <a href="dream.html">
              Dream Home
            </a>
          </nav>
          <span className="spacer"></span>
          <ChatsMenu />
          <span data-auth-slot=""></span>
          {" "}
          <a className="home" href="../buyers.html">
            ← Back to the landing page
          </a>
        </div>
        <div className="tj-layout" role="main">
          <section className="tj-chat">
            <div className="tj-head" data-cnav-back-slot="">
              <div className="tj-title" role="heading" aria-level="1">
                {"Tayo "}
                <span style={{ "position": "relative" }} aria-hidden="true">
                  <span className="tj-orb" data-lottie="orb-pulse" data-speed="0.8"></span>
                  <span className="tj-dot"></span>
                </span>
              </div>
              <div className="tj-meta">
                {"\n            AI advisor · not neutral on price ·\n            "}
                <a href="/privacy">
                  how your chat is used
                </a>
              </div>
            </div>
            <HandoffStatus />
            <div className="convo-scroll" aria-live="polite">
              <MemoryNote />
              <div className="convo" id="convo"></div>
            </div>
            <div className="composer" data-cnav-clear="">
              <div className="tj-reply" id="tjReply" hidden></div>
              <VoiceHint />
              <div className="chatbox">
                <div id="react-composer" style={{ "display": "contents" }}></div>
              </div>
            </div>
          </section>
          {/* Drawn by the React panel (MatchesPanel.tsx). */}
          <aside className="tj-canvas"></aside>
        </div>
      </div>
      <ShareHost />
      <AfterHydration scripts={SCRIPTS} />
      <EngineStart />
    </>
  );
}
