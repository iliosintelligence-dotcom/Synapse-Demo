/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The property page's markup as React (converted from src/legacy/property/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// The listing itself is React (PropertyPage, was inline-3.js); the map engine (inline-4.js) and the shared scripts run after hydration.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { PropertyPage } from "./PropertyPage";
import { ShareHost } from "@/features/shared/ShareSheet";

const SCRIPTS: PageScript[] = [
  { shared: "map/style-synapse" },
  { shared: "map/render" },
  { shared: "stamp" },
  { shared: "scramble" },
  { shared: "icons" },
  { shared: "icon-morph", module: true },
  { shared: "cust-nav" },
  { shared: "auth" },
  { shared: "notify" },
  { shared: "motion" },
  { code: inline("property", "engine-globals.js") },
  { code: inline("property", "inline-4.js") },
];

export function PropertyBody() {
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
      <PropertyPage canvas={
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
      } />
      <ShareHost />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
