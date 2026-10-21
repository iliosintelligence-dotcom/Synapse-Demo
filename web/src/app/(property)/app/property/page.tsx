/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/property.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
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
          <a href="dream.html">
            Dream Home
          </a>
        </nav>
        <span className="spacer"></span>
        {" "}
        <span data-auth-slot="" style={{ "marginRight": "16px" }}></span>
        {" "}
        <a className="home" href="browse.html">
          ← Back to matches
        </a>
      </div>
      {" "}
      <div data-cnav-actions="" hidden>
        <button className="cnav-act pvm-backbtn" id="pvmBack" type="button">
          <span data-icon="arrow-right"></span>
          {" Back\n    "}
        </button>
        <button className="cnav-act pvm-mapbtn" id="pvmMapBtn" type="button">
          <span data-icon="pin"></span>
          {" Map & nearby\n    "}
        </button>
      </div>
      <div className="pv-split">
        <div className="pdp" role="main">
          <div className="pv-backslot" data-cnav-back-slot=""></div>
          <div className="hero">
            <img id="heroImg" src={"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80"} alt="" />
            {" "}
            {" "}
            <video id="heroVid" hidden muted playsInline controls preload="metadata"></video>
            {" "}
            <span id="heroStamp"></span>
            {" "}
            <span className="counter" id="counter">
              1 / 5
            </span>
            {" "}
            <span className="swipe-hint" id="swipeHint" hidden>
              Swipe for more
            </span>
            <div className="actions">
              <div className="act" id="saveBtn" title="Save">
                <svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style={{ "display": "block" }}>
                  <path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="act" id="shareBtn" title="Share">
                <span data-icon="share"></span>
              </div>
            </div>
          </div>
          <div className="thumbs" id="thumbs"></div>
          <div className="pvlb" id="pvlb" role="dialog" aria-modal="true" aria-label="Photos">
            <div className="pvlb-stage">
              <img id="pvlbImg" alt="" />
              {" "}
              {" "}
              <video id="pvlbVid" hidden muted playsInline controls preload="metadata"></video>
              <button type="button" className="pvlb-a prev" id="pvlbPrev" aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className="pvlb-a next" id="pvlbNext" aria-label="Next photo">
                ›
              </button>
            </div>
            <button type="button" className="pvlb-x" id="pvlbX" aria-label="Close photos">
              ✕
            </button>
            <div className="pvlb-n" id="pvlbN"></div>
          </div>
          <div className="deckbar">
            <button className="arrow" id="deckPrev" aria-label="Previous card">
              ‹
            </button>
            <button className="arrow" id="deckNext" aria-label="Next card">
              ›
            </button>
          </div>
          <div className="dots" id="deckDots"></div>
          <div className="deck" id="deck">
            <div className="card summary" data-title="Overview">
              <div className="price" id="pvPrice">
                -
              </div>
              <div className="ctx" id="pvCtx" hidden></div>
              <div className="ttl" id="pvTitle" role="heading" aria-level="1">
                Loading listing…
              </div>
              <div className="loc" id="pvLoc"></div>
              <div className="facts" id="pvFacts"></div>
              <div className="pvtrust-row" id="pvTrust" hidden>
                <div className="ringbig" id="pvRing">
                  -
                </div>
                <div>
                  <div style={{ "fontWeight": "600", "fontSize": "14px", "display": "flex", "alignItems": "center", "gap": "6px" }} id="pvVerifyLine"></div>
                  <div className="dim" style={{ "fontSize": "12.5px" }} id="pvVerifyNote"></div>
                </div>
              </div>
              <div className="glance" id="pvGlance" hidden></div>
              <div className="amen" id="pvAmen" hidden aria-label="Amenities" role="list"></div>
            </div>
            {" "}
            <div className="card section" id="pvTakeCard" hidden>
              <div className="lbl">
                <span data-icon="spark"></span>
                {" Tayo's take"}
              </div>
              <p className="reason" id="pvTake"></p>
            </div>
            <div className="card section" id="costCard">
              <div className="lbl">
                <span data-icon="costs"></span>
                {" "}
                <span id="costLbl">
                  What it really costs
                </span>
              </div>
              <div id="pvDealCard" hidden>
                <dl className="pv-deal" id="pvDeal"></dl>
                <p className="pv-deal-note" id="pvDealNote" hidden></p>
              </div>
              <div className="cost-rows" id="costRows"></div>
              <p className="cost-note" id="costNote"></p>
              <div id="negBlock" className="neg-block">
                <div className="neg-sub">
                  <span data-icon="negotiate"></span>
                  {" What to offer"}
                </div>
                <button className="btn btn-primary" id="negBtn" style={{ "padding": "11px 20px", "fontSize": "13.5px" }}>
                  Get my opening offer
                </button>
                <div id="negOut" hidden>
                  <div className="neg-offer" id="negOffer"></div>
                  <p className="reason" id="negAdvice" style={{ "fontSize": "13.5px" }}></p>
                  <div className="neg-draft" id="negDraft"></div>
                  <button className="copybtn" id="negCopy">
                    Copy message
                  </button>
                </div>
              </div>
              <p className="cost-handoff">
                {"Ready to move on this? Tayo takes your brief first, then\n        introduces the agency with it, so the agent you meet already knows\n        what you can afford and what you asked about."}
              </p>
            </div>
            <div className="card section" id="piCard">
              <div className="lbl">
                <span data-icon="spark"></span>
                {" Property intelligence"}
              </div>
              <div className="pi-rows" id="piRows"></div>
            </div>
            <div className="card section">
              <div className="lbl">
                <span data-icon="commute"></span>
                {" Commute intelligence"}
              </div>
              <div className="tod" id="tod" role="group" aria-label="Time of day">
                <button type="button" data-slot="morning">
                  Morning
                </button>
                <button type="button" data-slot="midday" className="on">
                  Midday
                </button>
                <button type="button" data-slot="evening">
                  Evening
                </button>
              </div>
              <div className="commute" id="commute"></div>
              <p className="cmt-src" id="commuteSrc"></p>
            </div>
            <div className="card section">
              <div className="lbl">
                <span data-icon="legal"></span>
                {" Viewing assistant"}
              </div>
              <div className="vcheck" id="vcheck"></div>
              <textarea className="vnotes" id="vnotes" placeholder={"Notes from the viewing, water pressure, smells, the agent's answers…"} />
              <div className="vphotos" id="vphotos"></div>
              <input type="file" id="vfile" accept="image/*" hidden />
            </div>
            <div className="card section" id="pvSimCard" hidden>
              <div className="lbl" id="pvSimLbl">
                More in this city
              </div>
              <div className="sim" id="pvSim"></div>
            </div>
            <div className="card section">
              <div className="lbl">
                Listed by
              </div>
              {" "}
              <div className="apc" id="pvAgentCard">
                <div className="apc-photo" id="pvAgentPhoto">
                  <span id="pvAgentInitials">
                    -
                  </span>
                </div>
                <div className="apc-body">
                  <div className="apc-nm">
                    <span id="pvAgentName">
                      -
                    </span>
                    <span className="apc-vf" id="pvAgentVf" hidden>
                      ✓
                    </span>
                  </div>
                  <div className="apc-role" id="pvAgentMeta"></div>
                  {" "}
                  <a className="apc-agency apc-ag-open" id="pvAgencyLink" href="#">
                    {" "}
                    <span className="apc-ag-logo" id="pvAgencyInitial">
                      -
                    </span>
                    {" "}
                    <span className="apc-ag-nm" id="pvAgencyName">
                      -
                    </span>
                    {" "}
                    <span className="apc-ag-meta" id="pvAgencyMeta"></span>
                    {" "}
                    <span className="apc-ag-go" aria-hidden="true">
                      ›
                    </span>
                    {" "}
                  </a>
                  {" "}
                  <a className="apc-ag-page" id="pvAgencyPage" href="#" hidden>
                    {"See the agency and all its listings "}
                    <span aria-hidden="true">
                      →
                    </span>
                  </a>
                  <div className="apc-ag-tag" id="pvAgencyTag" hidden></div>
                  {" "}
                  <a className="apc-ag-web" id="pvAgencyWeb" href="#" target="_blank" rel="noopener nofollow" hidden>
                    {"Visit website "}
                    <span aria-hidden="true">
                      ↗
                    </span>
                  </a>
                  {" "}
                  <div className="insp" id="pvInsp" hidden>
                    <button type="button" className="insp-cta" id="pvInspBtn">
                      <span data-icon="calendar" aria-hidden="true"></span>
                      {" Take a tour\n            "}
                    </button>
                    <div className="insp-panel" id="pvInspPanel" hidden></div>
                  </div>
                  <div className="apc-foot" id="pvAgentSocial" hidden>
                    <button type="button" className="apc-stat" id="pvLikeBtn" aria-pressed="false" aria-label="Like this agent">
                      <span data-icon="heart" aria-hidden="true"></span>
                      <b id="pvLikeN">
                        0
                      </b>
                    </button>
                    <span className="apc-stat static">
                      {" "}
                      <span data-icon="users" aria-hidden="true"></span>
                      <b id="pvFollowN">
                        0
                      </b>
                      {" "}
                    </span>
                    <button type="button" className="apc-follow" id="pvFollowBtn" aria-pressed="false">
                      <span id="pvFollowLbl">
                        Follow
                      </span>
                      {" "}
                      <i>
                        +
                      </i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="card section" id="pvChecksCard" hidden>
              <div className="lbl">
                <span data-icon="shield"></span>
                {" What we checked"}
              </div>
              <div className="verify-summary">
                <div className="verify-ring" id="pvChecksRing">
                  <span>
                    -
                  </span>
                </div>
                <div className="verify-summary-txt">
                  <b id="pvChecksHead">
                    Not yet verified
                  </b>
                  <p id="pvChecksNote"></p>
                </div>
              </div>
              <div className="verify-list" id="pvChecksList"></div>
              <div className="avail-row" id="pvAvailRow">
                <span className="avail-lbl">
                  Availability
                </span>
                {" "}
                <span className="avail-val" id="pvAvailVal">
                  -
                </span>
              </div>
            </div>
          </div>
          <div className="cta-dock" data-cnav-clear="">
            <button type="button" className="btn btn-ghost dk-act" id="dkSave" aria-pressed="false">
              <span className="dk-heart" aria-hidden="true" style={{ "display": "inline-flex", "verticalAlign": "middle" }}>
                <svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style={{ "display": "block" }}>
                  <path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              {" "}
              <span>
                Save
              </span>
            </button>
            <button type="button" className="btn btn-ghost dk-act" id="dkShare">
              <span data-icon="share"></span>
              {" "}
              <span>
                Share
              </span>
            </button>
            <a className="btn btn-primary" style={{ "flex": "1" }} id="replyBtn" href="toju.html">
              {" "}
              <span data-icon="chat"></span>
              {" Contact\n      "}
            </a>
          </div>
        </div>
        <div className="pv-canvas">
          <button className="pvm-close" id="pvmClose" type="button" aria-label="Close map">
            ✕
          </button>
          <div className="pvc-map-wrap">
            <div id="pvMap"></div>
            <div className="pvc-unplaced" id="pvcUnplaced" hidden></div>
          </div>
          <div className="pvc-overlay" id="pvcOverlay"></div>
          <button className="pvm-nearbtn" id="pvmNear" type="button">
            <span data-icon="pin"></span>
            {" What's nearby\n      "}
          </button>
          <button className="pvm-backpill" id="pvmBackPill" type="button" aria-label="Back">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {"\n        Back\n      "}
          </button>
        </div>
      </div>
      <script  dangerouslySetInnerHTML={{ __html: inline("property", "inline-3.js") }} />
      <script src="map/style-synapse.js" />
      <script src="map/render.js" />
      <script src="stamp.js" />
      <script src="share.js" />
      <script src="scramble.js" />
      <script src="icons.js" />
      <script type="module" src="icon-morph.js" />
      <script src="cust-nav.js" />
      <script src="auth.js" />
      <script src="notify.js" />
      <script src="motion.js" />
      <script  dangerouslySetInnerHTML={{ __html: inline("property", "inline-4.js") }} />
    </>
  );
}
