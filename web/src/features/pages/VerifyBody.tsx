/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The verify page's markup as React (converted from src/legacy/verify/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { VerifyDesk } from "./VerifyDesk";

const SCRIPTS: PageScript[] = [
  { shared: "icons" },
  { shared: "auth" },
  { shared: "motion" },
];

export function VerifyBody() {
  return (
    <>
      <div className="appbar" role="banner">
        <a className="brand" href="../index.html">
          <span data-icon="logo"></span>
          {" SYNAPSE"}
        </a>
        <nav>
          <a href="toju.html">
            Tayo
          </a>
          <a href="browse.html">
            Browse
          </a>
          <a className="active" href="verify.html">
            Verification desk
          </a>
        </nav>
        <span className="spacer"></span>
        {" "}
        <span data-auth-slot=""></span>
      </div>
      <div className="vd-wrap">
        <div className="vd-head">
          <div className="eyebrow">
            Platform only
          </div>
          <h1 className="h1">
            Verification desk
          </h1>
          <p className="vd-note">
            {"\n        Marking a listing verified records the date it happened and which checks passed.\n        Agencies cannot do this to their own listings, the database refuses it, which is\n        the point: the badge means something because the party who benefits from it cannot grant it.\n        A listing needs the three starred checks (its basics, its photos and its ownership papers)\n        to be marked verified; the other four raise its trust score. Anything less is\n        "}
            <em>
              still checking
            </em>
            {", which buyers see plainly on the card.\n      "}
          </p>
        </div>
        <VerifyDesk />
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
