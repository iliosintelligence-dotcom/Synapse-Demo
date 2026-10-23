/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The agency-profile page's markup as React (converted from src/legacy/agency-profile/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { BackLink } from "./BackLink";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "icons.js" },
  { src: "cust-nav.js" },
  { src: "auth.js" },
  { code: inline("agency-profile", "inline-3.js") },
];

export function AgencyProfileBody() {
  return (
    <>
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
        <BackLink className="home">
          ← Back
        </BackLink>
      </div>
      <main className="ap" id="ap">
        <section className="ap-hero" id="apHero">
          <div className="ap-logo" id="apLogo">
            -
          </div>
          <div className="ap-id">
            <h1 className="ap-name" id="apName">
              Loading…
            </h1>
            <p className="ap-tag" id="apTag" hidden></p>
            <div className="ap-chips" id="apChips"></div>
          </div>
        </section>
        <div className="ap-grid">
          <div className="ap-card" id="apAboutCard" hidden>
            <div className="ap-k">
              About
            </div>
            <p className="ap-about" id="apAbout"></p>
          </div>
          <div className="ap-card">
            <div className="ap-k">
              The agency
            </div>
            <dl className="ap-facts" id="apFacts"></dl>
            <a className="ap-ask" id="apAsk" href="toju.html?new=site">
              Ask Tayo about their homes
            </a>
          </div>
        </div>
        <h2 className="ap-h2" id="apListHead">
          Their listings
        </h2>
        <p className="ap-sub" id="apListSub"></p>
        <div className="ap-filters" id="apFilters" role="group" aria-label="Show"></div>
        <div className="ap-list" id="apList"></div>
      </main>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
