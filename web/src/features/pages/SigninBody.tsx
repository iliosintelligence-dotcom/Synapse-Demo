/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The signin page's markup as React (converted from src/legacy/signin/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { code: inline("signin", "inline-4.js") },
  { src: "auth.js" },
  { code: inline("signin", "inline-5.js") },
  { code: inline("signin", "inline-6.js") },
];

export function SigninBody() {
  return (
    <>
      <div className="au">
        <div className="au-art">
          <img id="artPhoto" alt="" aria-hidden="true" />
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
            <p className="au-quote" id="artQuote">
              The last step before the keys.
            </p>
            <p className="au-sub" id="artSub">
              Your account keeps your saved homes, your conversations with Tayo, and the agents you have spoken to, on every device.
            </p>
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
          <div className="au-box">
            <a className="au-back" href="../index.html">
              ← Back to the landing page
            </a>
            <h1 className="au-h" id="auH">
              Welcome back
            </h1>
            <p className="au-p" id="auP">
              Sign in to pick up where you left off.
            </p>
            <div className="au-why" id="auWhy" hidden></div>
            <div className="au-tabs" role="tablist">
              <button className="au-tab on" id="tabIn" type="button" role="tab" aria-selected="true">
                Sign in
              </button>
              <button className="au-tab" id="tabUp" type="button" role="tab" aria-selected="false">
                Create account
              </button>
            </div>
            <div id="auOauth">
              <button className="au-oauth" id="auGoogle" type="button">
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                  {" "}
                  <path fill="#4285F4" d="M17.6 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.82a4.12 4.12 0 0 1-1.79 2.7v2.26h2.9c1.7-1.56 2.67-3.87 2.67-6.6z" />
                  {" "}
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.93v2.33A9 9 0 0 0 9 18z" />
                  {" "}
                  <path fill="#FBBC05" d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.93a9 9 0 0 0 0 8.08l3.02-2.33z" />
                  {" "}
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .93 4.96l3.02 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
                  {" "}
                </svg>
                {" "}
                <span id="auGoogleLabel">
                  Continue with Google
                </span>
              </button>
              <div className="au-or">
                <span>
                  or
                </span>
              </div>
            </div>
            <div className="au-methods" role="tablist" aria-label="How to sign in">
              <button className="au-method on" id="methodEmail" type="button" role="tab" aria-selected="true">
                Email
              </button>
              <button className="au-method" id="methodPhone" type="button" role="tab" aria-selected="false">
                Phone
              </button>
            </div>
            <form id="auForm" noValidate>
              <div className="au-field" id="nameField" hidden>
                <label className="au-label" htmlFor="auName">
                  Your name
                </label>
                {" "}
                <input className="au-input" id="auName" type="text" autoComplete="name" name="name" />
              </div>
              <div className="au-field" id="agencyNameField" hidden>
                <label className="au-label" htmlFor="auAgencyName">
                  Agency name
                </label>
                {" "}
                <input className="au-input" id="auAgencyName" type="text" autoComplete="organization" name="agencyName" />
                <div className="au-hint">
                  The name buyers will see on your listings. You can change it later.
                </div>
              </div>
              <div className="au-field" id="agencyWebField" hidden>
                <label className="au-label" htmlFor="auAgencyWebsite">
                  Agency website (optional)
                </label>
                {" "}
                <input className="au-input" id="auAgencyWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" name="agencyWebsite" />
              </div>
              <div className="au-field" id="staffPhoneField" hidden>
                <label className="au-label" htmlFor="auStaffPhone">
                  Your WhatsApp number
                </label>
                {" "}
                <input className="au-input" id="auStaffPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" name="staffPhone" />
                <div className="au-hint">
                  Where Tayo sends you a lead the moment it qualifies. Any format, 08…, 234… or +234…
                </div>
                <div className="au-err" id="errStaffPhone" role="alert" hidden></div>
              </div>
              <div className="au-field" id="emailField">
                <label className="au-label" htmlFor="auEmail">
                  Email
                </label>
                {" "}
                <input className="au-input" id="auEmail" type="email" autoComplete="email" required inputMode="email" name="email" />
                <div className="au-err" id="errEmail" role="alert" hidden></div>
              </div>
              <div className="au-field" id="passField">
                <label className="au-label" htmlFor="auPass">
                  Password
                </label>
                {" "}
                <input className="au-input" id="auPass" type="password" autoComplete="current-password" required minLength="8" name="password" />
                <div className="au-hint" id="passHint" hidden>
                  <ul className="pw-rules" id="pwRules" aria-live="polite">
                    <li data-r="len">
                      At least 10 characters
                    </li>
                    <li data-r="up">
                      An uppercase letter
                    </li>
                    <li data-r="lo">
                      A lowercase letter
                    </li>
                    <li data-r="num">
                      A number
                    </li>
                    <li data-r="sym">
                      A symbol, like ! or #
                    </li>
                  </ul>
                  <div className="pw-bar" aria-hidden="true">
                    <i id="pwBar"></i>
                  </div>
                </div>
                <div className="au-err" id="errPass" role="alert" hidden></div>
              </div>
              <div className="au-field" id="phoneField" hidden>
                <label className="au-label" htmlFor="auPhone">
                  Phone number
                </label>
                {" "}
                <input className="au-input" id="auPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" name="phone" />
                <div className="au-hint">
                  Nigerian numbers welcome in any format, 08…, 234… or +234…
                </div>
                <div className="au-err" id="errPhone" role="alert" hidden></div>
              </div>
              <div className="au-field" id="codeField" hidden>
                <label className="au-label" htmlFor="auCode">
                  The 6-digit code
                </label>
                {" "}
                <input className="au-input" id="auCode" type="text" autoComplete="one-time-code" inputMode="numeric" maxLength="6" placeholder="123456" name="code" />
                <div className="au-hint" id="codeHint"></div>
                <div className="au-err" id="errCode" role="alert" hidden></div>
                <button type="button" className="au-linkbtn" id="codeBack" style={{ "marginTop": "10px" }}>
                  Use a different number
                </button>
              </div>
              <div className="au-consent" id="consentBlock" hidden>
                <label className="au-consent-row">
                  {" "}
                  <input type="checkbox" id="auConsent" />
                  {" "}
                  <span>
                    {"I have read and agree to the\n                "}
                    <a href="/terms" target="_blank" rel="noopener">
                      Terms of Service
                    </a>
                    {" and the\n                "}
                    <a href="/privacy" target="_blank" rel="noopener">
                      Privacy Policy
                    </a>
                    .
                  </span>
                  {" "}
                </label>
                <p className="au-consent-note">
                  {"\n              Synapse uses an AI advisor. Your messages and the details you share are processed\n              by providers outside Nigeria, the Privacy Policy lists who, and what for.\n            "}
                </p>
                <div className="au-err" id="errConsent" role="alert" hidden></div>
              </div>
              <button className="au-submit" id="auGo" type="submit">
                Sign in
              </button>
              <div id="auNote"></div>
            </form>
            <form id="agencyForm" noValidate hidden>
              <div className="au-field">
                <label className="au-label" htmlFor="agName">
                  What is your agency called?
                </label>
                {" "}
                <input className="au-input" id="agName" type="text" autoComplete="organization" required />
                <div className="au-hint">
                  The name buyers will see on your listings. You can change it later.
                </div>
                <div className="au-err" id="errAgName" role="alert" hidden></div>
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="agCity">
                  City (optional)
                </label>
                {" "}
                <input className="au-input" id="agCity" type="text" autoComplete="address-level2" placeholder="Lagos" />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="agWebsite">
                  Agency website (optional)
                </label>
                {" "}
                <input className="au-input" id="agWebsite" type="url" inputMode="url" autoComplete="url" placeholder="youragency.com" />
              </div>
              <button className="au-submit" id="agGo" type="submit">
                Finish setting up
              </button>
              <div id="agNote"></div>
            </form>
            <form id="recoverForm" noValidate hidden>
              <div className="au-field">
                <label className="au-label" htmlFor="rpPass1">
                  New password
                </label>
                {" "}
                <input className="au-input" id="rpPass1" type="password" autoComplete="new-password" required minLength="8" />
                <div className="au-hint">
                  At least 8 characters. Longer is better than complicated.
                </div>
                <div className="au-err" id="errRp1" role="alert" hidden></div>
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="rpPass2">
                  Confirm new password
                </label>
                {" "}
                <input className="au-input" id="rpPass2" type="password" autoComplete="new-password" required minLength="8" />
                <div className="au-err" id="errRp2" role="alert" hidden></div>
              </div>
              <button className="au-submit" id="rpGo" type="submit">
                Set new password
              </button>
              <div id="rpNote"></div>
            </form>
            <p className="au-alt" id="auAlt">
              <button type="button" id="forgotBtn">
                Forgot your password?
              </button>
            </p>
            <p className="au-legal">
              Synapse never shares your details with an agency until you choose to contact them.
            </p>
            <p className="au-legal" id="demoNote" style={{ "marginTop": "6px" }}></p>
          </div>
        </main>
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
