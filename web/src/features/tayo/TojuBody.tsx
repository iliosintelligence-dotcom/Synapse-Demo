/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The toju page's markup as React (converted from src/legacy/toju/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" },
  { src: "map-tiles.js" },
  { src: "map/style-synapse.js" },
  { src: "map/render.js" },
  { src: "map/card.js" },
  { src: "map/query.js" },
  { src: "stamp.js" },
  { src: "share.js" },
  { src: "matches-shared.js" },
  { src: "icons.js" },
  { src: "icon-morph.js", module: true },
  { src: "cust-nav.js" },
  { src: "auth.js" },
  { src: "notify.js" },
  { src: "motion.js" },
  { code: inline("toju", "inline-5.js") },
];

export function TojuBody() {
  return (
    <>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="tj-bg"></div>
      <div className="tj-wash"></div>
      <div className="tj-bgp" id="tjBgPanel" hidden>
        <div className="tj-bgp-card" role="dialog" aria-modal="true" aria-labelledby="tjBgT">
          <div className="tj-bgp-t" id="tjBgT">
            Change background
          </div>
          <div id="tjBgBody"></div>
        </div>
      </div>
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
          <div className="cnav-desk cnav-mwrap" data-bar-menu="">
            <button type="button" className="cnav-dbtn" aria-expanded="false" aria-haspopup="menu" aria-controls="tjChatMenu">
              <span data-icon="chat" aria-hidden="true"></span>
              <span>
                Chats
              </span>
            </button>
            <div className="cnav-dpop cnav-menu" id="tjChatMenu" role="menu" aria-label="Chats">
              <button id="tjNew" type="button" className="cnav-mi" role="menuitem">
                <span data-icon="plus" aria-hidden="true"></span>
                New chat
              </button>
              <button id="tjHist" type="button" className="cnav-mi" role="menuitem">
                <span data-icon="history" aria-hidden="true"></span>
                History
              </button>
              <button id="tjPins" type="button" className="cnav-mi" role="menuitem">
                <span data-icon="heart" aria-hidden="true"></span>
                Pinned
              </button>
              <button id="tjMem" type="button" className="cnav-mi" role="menuitem">
                <span data-icon="user" aria-hidden="true"></span>
                What Tayo remembers
              </button>
              <button id="tjBg" type="button" className="cnav-mi" role="menuitem">
                <span data-icon="boards" aria-hidden="true"></span>
                Change background
              </button>
            </div>
          </div>
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
            <div className="tj-hist" id="tjHistPanel" hidden>
              <div className="tj-hist-head">
                <span>
                  <span data-icon="history"></span>
                  {" Past conversations"}
                </span>
                <button id="tjHistClose" aria-label="Close history">
                  ×
                </button>
              </div>
              <div className="tj-hist-list" id="tjHistList"></div>
            </div>
            <div className="tj-hist" id="tjPinPanel" hidden>
              <div className="tj-hist-head">
                <span>
                  <span data-icon="heart"></span>
                  {" Pinned"}
                </span>
                <button id="tjPinClose" aria-label="Close pinned">
                  ×
                </button>
              </div>
              <div className="tj-hist-list" id="tjPinList"></div>
            </div>
            <div className="tj-handoff" id="tjHandoffStatus" role="status" hidden></div>
            <div className="tj-hist" id="tjMemPanel" hidden>
              <div className="tj-hist-head">
                <span>
                  <span data-icon="user"></span>
                  {" What Tayo remembers"}
                </span>
                <button id="tjMemClose" aria-label="Close what Tayo remembers">
                  ×
                </button>
              </div>
              <div className="tj-hist-list" id="tjMemList"></div>
            </div>
            <div className="convo-scroll" aria-live="polite">
              <div className="convo" id="convo"></div>
            </div>
            <div className="composer" data-cnav-clear="">
              <div className="tj-reply" id="tjReply" hidden></div>
              <div id="tjHint" className="tj-hint" hidden></div>
              <div className="chatbox">
                <div id="react-composer" style={{ "display": "contents" }}></div>
                <div className="pillrow">
                  <input id="tjInput" placeholder={"Tell Tayo what you're looking for…"} autoComplete="off" />
                  <button className="mic" id="tjMic" title="Voice typing" aria-label="Voice typing">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="11" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                  <button className="send" id="tjSend" title="Send" aria-label="Send">
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ "display": "block" }}>
                      <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="suggest" id="tjSuggest">
                  <button data-send="What is available right now?">
                    What is available right now?
                  </button>
                  <button data-send={"What can I afford on ₦250,000 a month?"}>
                    What can I afford monthly?
                  </button>
                  <button data-send="What should I check before paying?">
                    What should I check before paying?
                  </button>
                </div>
              </div>
            </div>
          </section>
          {/* Drawn by the React panel (MatchesPanel.tsx). */}
          <aside className="tj-canvas"></aside>
        </div>
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
