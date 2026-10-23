/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The syndication-test page's markup as React (converted from src/legacy/syndication-test/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "syndication.js" },
  { code: inline("syndication-test", "inline-2.js") },
];

export function SyndicationTestBody() {
  return (
    <>
      <h1>
        Syndication engine, tests
      </h1>
      <div id="out"></div>
      <div className="sum" id="sum"></div>
      <h1 style={{ "marginTop": "26px" }}>
        Sample payload (Instagram · verified-first)
      </h1>
      <pre id="sample"></pre>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
