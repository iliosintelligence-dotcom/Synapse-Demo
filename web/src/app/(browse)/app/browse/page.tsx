/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/browse.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="bg-scene"></div>
      <div className="bg-wash"></div>
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
          <a href="browse.html" className="active">
            Your matches
          </a>
          {" "}
          <a href="dream.html">
            Dream Home
          </a>
        </nav>
        <span className="spacer"></span>
        {" "}
        {" "}
        <span className="nav-saved" id="navSaved" hidden title="Your saved homes">
          <span className="nsh" aria-hidden="true">
            ♥
          </span>
          <b id="navSavedN">
            0
          </b>
          <span className="sr-only" id="navSavedSr">
            saved homes
          </span>
        </span>
        {" "}
        <span data-auth-slot="" style={{ "marginRight": "16px" }}></span>
        {" "}
        <a className="home" href="../buyers.html">
          ← Back to the landing page
        </a>
      </div>
      <div className="wrap" data-cnav-back-slot="" role="main">
        <div className="h1" id="pageTitle" role="heading" aria-level="1">
          Your matches
        </div>
        <div className="searchbar" data-cnav-search="">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          {" "}
          <input id="searchInput" type="text" placeholder={"Search by area, city, type or price, e.g. Lekki, 3-bed, duplex, under 150M…"} autoComplete="off" />
          <button id="searchClear" hidden aria-label="Clear">
            ✕
          </button>
        </div>
        <div className="bm-meta">
          <span className="bm-count" id="bmCount">
            Loading homes…
          </span>
        </div>
        <div id="map"></div>
        <div data-cnav-actions="">
          <button className="cnav-act" id="bmMap" type="button" aria-pressed="false">
            <span data-icon="pin"></span>
            {" Map view\n      "}
          </button>
          <div data-proximity-slot=""></div>
        </div>
        <div className="viewseg" role="group" aria-label="View">
          <button type="button" className="vseg on" data-view="list" aria-pressed="true">
            List
          </button>
          <button type="button" className="vseg" data-view="map" aria-pressed="false">
            Map
          </button>
        </div>
        <div className="toolbar" data-cnav-filters="">
          <div className="dealfilter" id="dealFilter">
            <button data-deal="sale">
              Buy
            </button>
            <button data-deal="rent">
              Rent
            </button>
            <button data-deal="shared">
              Shared living
            </button>
            <button data-deal="land">
              Land
            </button>
            <button data-deal="offplan">
              Off-plan
            </button>
            <button data-deal="invest">
              Investment
            </button>
            <button data-deal="shortlet">
              Short-let
            </button>
          </div>
          <select id="sortSel">
            <option value="match">
              Sort: Best match
            </option>
            <option value="price">
              Sort: Price (low → high)
            </option>
            <option value="trust">
              Sort: Property confidence
            </option>
          </select>
          <button className="vtoggle" id="verifyToggle" title="Show only homes Synapse has checked">
            <span className="box"></span>
            {" Verified only"}
          </button>
        </div>
        <div className="recent" id="recentRail" hidden>
          <div className="recent-h">
            Recently viewed
          </div>
          <div className="recent-track" id="recentTrack"></div>
        </div>
        <section className="fresh-since" id="freshSince" hidden aria-labelledby="freshSinceH">
          <div className="fresh-h">
            <span id="freshSinceH">
              New since your last visit
            </span>
            <span className="fresh-n" id="freshSinceN"></span>
          </div>
          <div className="grid" id="freshGrid"></div>
        </section>
        <span className="sr-only" id="gridStatus" role="status" aria-live="polite"></span>
        <div className="grid" id="grid"></div>
        <div className="empty" role="status" aria-live="polite" hidden></div>
      </div>
      <div className="cmpbar" id="cmpbar" data-cnav-clear="">
        <span>
          <b id="cmpCount">
            0
          </b>
          {" selected"}
        </span>
        <button id="cmpGo">
          Compare side by side
        </button>
      </div>
      <div className="cmpwrap" id="cmpwrap">
        <div className="veil" id="cmpVeil"></div>
        <div className="card cmpsheet">
          <button className="cmpclose" id="cmpClose">
            ✕
          </button>
          <h3>
            Side by side
          </h3>
          <p className="sub">
            Tayo's read: green = strongest of the set, terracotta = watch it.
          </p>
          <div id="cmpTable"></div>
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
      <script  dangerouslySetInnerHTML={{ __html: inline("browse", "inline-3.js") }} />
      <script src="icons.js" />
      <script type="module" src="icon-morph.js" />
      <script src="cust-nav.js" />
      <script src="auth.js" />
      <script src="notify.js" />
      <script src="motion.js" />
    </>
  );
}
