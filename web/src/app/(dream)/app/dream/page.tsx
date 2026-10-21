/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/dream.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
      <div className="bg-scene"></div>
      <div className="bg-wash"></div>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="appbar">
        <a className="brand" href="../buyers.html">
          {" "}
          <img className="syn-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />
          {"\n      Synapse\n    "}
        </a>
        <nav>
          <a href="toju.html">
            Tayo
          </a>
          {" "}
          <a href="browse.html">
            Your matches
          </a>
          {" "}
          <a href="dream.html" className="active">
            Dream Home
          </a>
        </nav>
        <span className="spacer"></span>
        {" "}
        <span data-auth-slot="" style={{ "marginRight": "16px" }}></span>
        {" "}
        <a className="home" href="../buyers.html">
          ← Back to the landing page
        </a>
      </div>
      <div className="board-wrap" data-cnav-back-slot="" role="main">
        <section id="homeView">
          <div className="db-top">
            <div className="db-h1" role="heading" aria-level="1">
              Dream boards
            </div>
            <button className="btn btn-primary" id="newBoardBtn" style={{ "padding": "11px 18px", "fontSize": "13.5px" }}>
              + New board
            </button>
          </div>
          <p className="muted" id="dbIntro" style={{ "fontSize": "14px", "marginTop": "6px" }} hidden>
            Make a board for every idea: a whole home, a kitchen, a corridor you love. Pin what you like. Tayo reads each board and finds real verified homes that feel like it.
          </p>
          <div className="boards-grid" id="boardsGrid"></div>
        </section>
        <section id="boardView" className="hidden">
          <a className="db-back" id="backBtn">
            ← All boards
          </a>
          <div className="db-top" style={{ "marginTop": "12px" }}>
            <input className="board-title" id="boardTitle" aria-label="Board name" />
            <div className="db-tools">
              <button id="renameBtn">
                <span data-icon="edit"></span>
                {" Rename"}
              </button>
              <button className="del" id="deleteBtn">
                <span data-icon="trash"></span>
                {" Delete"}
              </button>
            </div>
          </div>
          <div className="mode-switch" id="modeSwitch" role="tablist" aria-label="Board mode"></div>
          <p className="mode-hint muted" id="modeHint"></p>
          <div className="starter-note hidden" id="starterNote"></div>
          <div className="vibe" id="vibe"></div>
          <section className="signals hidden" id="signals" aria-label="What this board says so far">
            <div className="sig-h">
              What this board says so far
            </div>
            <div className="sig-rows" id="sigRows"></div>
            <p className="sig-read" id="sigRead" aria-live="polite"></p>
          </section>
          <div className="cat-tabs" id="catTabs" role="tablist" aria-label="Filter pins by category"></div>
          <div id="board"></div>
          <div className="share-note hidden" id="shareNote"></div>
          <div className="card add-card">
            <div className="add-row">
              <input id="urlInput" type="url" placeholder={"Paste an image URL to pin it to this board…"} />
              <select id="urlCat" aria-label="Category for the pinned image">
              </select>
              <button className="btn btn-primary" id="addUrlBtn" style={{ "padding": "11px 18px", "fontSize": "13.5px" }}>
                Pin it
              </button>
            </div>
            <p className="muted" style={{ "fontSize": "12.5px", "marginBottom": "10px" }}>
              Or pin from a little inspiration:
            </p>
            <div className="palette" id="palette"></div>
          </div>
          <div className="card toju-cta">
            <span data-lottie="orb-pulse" data-speed="0.8" style={{ "width": "44px", "height": "44px", "display": "inline-block" }}></span>
            <div className="t">
              <b>
                Turn this board into homes.
              </b>
              {" Tayo reads the styles, the light and the space you pinned and lines up verified listings that match the feeling."}
            </div>
            <a className="btn btn-primary" id="tojuBtn" href="toju.html" style={{ "whiteSpace": "nowrap" }}>
              Find my matches →
            </a>
          </div>
        </section>
      </div>
      <script  dangerouslySetInnerHTML={{ __html: inline("dream", "inline-3.js") }} />
      <script src="icons.js" />
      <script type="module" src="icon-morph.js" />
      <script src="cust-nav.js" />
      <script src="auth.js" />
      <script src="notify.js" />
      <script src="motion.js" />
    </>
  );
}
