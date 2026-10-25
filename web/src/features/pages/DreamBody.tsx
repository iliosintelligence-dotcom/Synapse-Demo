/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The dream page's markup as React (converted from src/legacy/dream/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { DreamBoards } from "./DreamBoards";

const SCRIPTS: PageScript[] = [
  { shared: "loader" },
  { shared: "icons" },
  { shared: "icon-morph", module: true },
  { shared: "cust-nav" },
  { shared: "auth" },
  { shared: "notify" },
  { shared: "motion" },
];

export function DreamBody() {
  return (
    <>
      <div className="bg-scene"></div>
      <div className="bg-wash"></div>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="appbar" role="banner">
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
      <DreamBoards />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
