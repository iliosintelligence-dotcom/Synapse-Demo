/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/syndication-test.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
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
      <script src="syndication.js" />
      <script  dangerouslySetInnerHTML={{ __html: inline("syndication-test", "inline-2.js") }} />
    </>
  );
}
