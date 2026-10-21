/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/go.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
      <div className="wrap">
        <div className="brandbar">
          <img src="/images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />
          {" "}
          <span className="word">
            Synapse
          </span>
          {" "}
          <span className="by">
            Verified Nigerian homes
          </span>
        </div>
        <header className="hd">
          <h1 className="who" id="who">
            Homes we just posted
          </h1>
          <div className="plat" id="plat"></div>
        </header>
        <p className="lede" id="lede">
          The homes we posted recently. Tap one for the full details.
        </p>
        <div className="list" id="list">
          <div className="skel">
            <div className="ph"></div>
            <div className="ln a"></div>
            <div className="ln b"></div>
            <div className="ln c"></div>
          </div>
          <div className="skel">
            <div className="ph"></div>
            <div className="ln a"></div>
            <div className="ln b"></div>
            <div className="ln c"></div>
          </div>
        </div>
        <div className="ft">
          {" "}
          <a className="primary" id="askTayo" href="/app/toju.html?new=1">
            Tell Tayo what you're looking for
          </a>
          {" "}
          <a className="ghost" href="/app/browse.html">
            See every home on Synapse
          </a>
          <p className="note">
            {"Every listing on Synapse expires unless it is re-confirmed,\n        so nothing here has been sitting for months."}
          </p>
          <div className="sig" aria-hidden="true">
            <img src="/images/brand/mark-black-on-white-tight.jpg" alt="" />
            {" "}
            <span>
              Synapse · an AI property advisor for Nigeria
            </span>
          </div>
        </div>
      </div>
      <script  dangerouslySetInnerHTML={{ __html: inline("go", "inline-3.js") }} />
    </>
  );
}
