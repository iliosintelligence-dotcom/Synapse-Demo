/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/toju.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
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
        <header className="tjm-bar">
          {" "}
          <a className="tjm-back" href="../buyers.html" data-cnav-back="" aria-label="Back">
            ←
          </a>
          <div className="tjm-id">
            <span className="tjm-name" role="heading" aria-level="1">
              Tayo
            </span>
            {" "}
            {" "}
            <span className="tjm-status">
              <i></i>
              {" AI advisor · "}
              <a href="/privacy">
                how your chat is used
              </a>
            </span>
          </div>
          <button className="tjm-act" id="tjmBg" type="button" aria-label="Change background">
            <span data-icon="boards"></span>
          </button>
          <button className="tjm-act" id="tjmHist" type="button" aria-label="Past conversations">
            <span data-icon="history"></span>
          </button>
          <button className="tjm-act" id="tjmNew" type="button" aria-label="New chat">
            ↺
          </button>
        </header>
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
          {" "}
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
            <div className="convo-scroll" aria-live="polite">
              <div className="convo" id="convo"></div>
            </div>
            <div className="composer" data-cnav-clear="">
              <div className="tj-reply" id="tjReply" hidden></div>
              <div id="tjHint" className="tj-hint" hidden></div>
              <div className="chatbox">
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
          <aside className="tj-canvas">
            <div className="cv-head">
              <span className="cv-t">
                Your matches
              </span>
              {" "}
              <span className="cv-c" id="cvCount">
                0
              </span>
              {" "}
              <a className="cv-all" href="browse.html" title="Expand to the full Matches page">
                ⤢ Expand
              </a>
            </div>
            <div className="cv-body" id="cvBody">
              <div id="cvMap"></div>
              <div className="grid" id="cvGrid"></div>
            </div>
          </aside>
        </div>
      </div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
      <script src="map-tiles.js" />
      <script src="map/style-synapse.js" />
      <script src="map/render.js" />
      <script src="map/card.js" />
      <script src="map/query.js" />
      <script src="stamp.js" />
      <script src="share.js" />
      <script src="matches-shared.js" />
      <script src="icons.js" />
      <script type="module" src="icon-morph.js" />
      <script src="cust-nav.js" />
      <script src="auth.js" />
      <script src="notify.js" />
      <script src="motion.js" />
      <script  dangerouslySetInnerHTML={{ __html: inline("toju", "inline-5.js") }} />
    </>
  );
}
