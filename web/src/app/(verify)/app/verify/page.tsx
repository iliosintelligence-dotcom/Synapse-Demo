/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/verify.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
      <div className="appbar">
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
            {"\n        Marking a listing verified records the date it happened and which checks passed.\n        Agencies cannot do this to their own listings, the database refuses it, which is\n        the point: the badge means something because the party who benefits from it cannot grant it.\n        A listing needs all seven checks to be marked verified; anything less is\n        "}
            <em>
              still checking
            </em>
            {", which buyers see plainly on the card.\n      "}
          </p>
        </div>
        <div className="vd-seg" id="vdSeg">
          <button data-f="queue" className="on">
            Queue
          </button>
          <button data-f="verified">
            Verified
          </button>
          <button data-f="all">
            All
          </button>
        </div>
        <div id="vdList"></div>
      </div>
      <div id="synToast"></div>
      <script src="icons.js" />
      <script src="auth.js" />
      <script src="motion.js" />
      <script  dangerouslySetInnerHTML={{ __html: inline("verify", "inline-3.js") }} />
    </>
  );
}
