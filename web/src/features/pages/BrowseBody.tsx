/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The browse page's markup as React (converted from src/legacy/browse/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { BrowsePage, NavSaved } from "./BrowsePage";
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

export function BrowseBody() {
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
        <NavSaved />
        {" "}
        <span data-auth-slot="" style={{ "marginRight": "16px" }}></span>
        {" "}
        <a className="home" href="../buyers.html">
          ← Back to the landing page
        </a>
      </div>
      <BrowsePage />
      <ShareHost />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
