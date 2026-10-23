/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The agency-profile page's markup as React (converted from src/legacy/agency-profile/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { BackLink } from "./BackLink";
import { AgencyProfile } from "./AgencyProfile";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "icons.js" },
  { src: "cust-nav.js" },
  { src: "auth.js" },
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
      <AgencyProfile />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
