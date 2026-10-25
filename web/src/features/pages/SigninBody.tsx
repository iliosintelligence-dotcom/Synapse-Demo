/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The signin page's markup as React (converted from src/legacy/signin/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { SigninForm, SigninArtText } from "./SigninForm";

const SCRIPTS: PageScript[] = [
  { shared: "loader" },
  { shared: "auth" },
];

export function SigninBody() {
  return (
    <>
      <div className="au">
        <div className="au-art">
          <img id="artPhoto" alt="" aria-hidden="true" />
          {/* Runs where it sits, so the photograph starts downloading before the rest of the page is parsed (inline-4.js). */}
          <script dangerouslySetInnerHTML={{ __html: inline("signin", "inline-4.js") }} />
          <a className="au-brand" href="../index.html">
            {" "}
            <img className="au-mark" src="../images/brand/mark-white-transparent.png" alt="" aria-hidden="true" />
            {" "}
            <span>
              Synapse
            </span>
            {" "}
          </a>
          <div className="au-art-in">
            <p className="au-eyebrow" id="artEyebrow">
              Agency workspace
            </p>
            <SigninArtText />
            <div className="au-marks">
              <span>
                <i></i>
                {" Verified listings only"}
              </span>
              {" "}
              <span>
                <i></i>
                {" Free for buyers & renters"}
              </span>
            </div>
            <div className="au-work">
              <div>
                <b>
                  01
                </b>
                {" Every lead in one inbox, with what they asked for"}
              </div>
              <div>
                <b>
                  02
                </b>
                {" Follow-ups that go out before the interest cools"}
              </div>
              <div>
                <b>
                  03
                </b>
                {" One listing, posted to every channel at once"}
              </div>
            </div>
          </div>
        </div>
        <main className="au-form">
          <SigninForm />
        </main>
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
