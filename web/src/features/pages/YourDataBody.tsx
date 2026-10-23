/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The your-data page's markup as React (converted from src/legacy/your-data/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "auth.js" },
  { src: "cust-nav.js" },
  { src: "loader.js" },
  { code: inline("your-data", "inline-3.js") },
];

export function YourDataBody() {
  return (
    <>
      <div className="yd-wrap">
        <h1 className="yd-h">
          Your data
        </h1>
        <p className="yd-p">
          {"\n      What Synapse holds about you, a copy you can take with you, and a way to have it\n      erased. You do not need an account to use any of this.\n      "}
          <a href="/privacy">
            The full privacy policy
          </a>
          {" explains why we hold each of these things.\n    "}
        </p>
        <section className="yd-card">
          <h2>
            How we know you
          </h2>
          <p id="whoP">
            Checking…
          </p>
          <div className="yd-id" id="whoId">
            -
          </div>
          <p className="yd-note">
            {"\n        This is the identifier your data is stored against. Quote it if you write to us about\n        your data, without it we cannot find you, because there is no name attached to it.\n      "}
          </p>
          <div className="yd-row" style={{ "marginTop": "12px" }}>
            <button className="yd-btn" id="copyId" type="button">
              Copy
            </button>
          </div>
        </section>
        <section className="yd-card">
          <h2>
            What is held
          </h2>
          <p>
            On this device, and on our servers where we can reach it from here.
          </p>
          <ul className="yd-list" id="heldList">
            <li>
              Checking…
            </li>
          </ul>
          <p className="yd-note" id="heldNote"></p>
        </section>
        <section className="yd-card">
          <h2>
            Take a copy
          </h2>
          <p>
            {"\n        Downloads everything listed above, from this device, as a JSON file. It is the data itself, not a summary. For a copy of what we hold on our servers, email ilios.intelligence@gmail.com and quote your identifier.\n      "}
          </p>
          <div className="yd-row">
            <button className="yd-btn" id="exportBtn" type="button">
              Download my data
            </button>
            <span className="yd-note" id="exportNote"></span>
          </div>
        </section>
        <section className="yd-card">
          <h2>
            Erase my personal data
          </h2>
          <p>
            {"\n        Removes everything we hold about "}
            <em>
              you
            </em>
            {": your conversations with Tayo, your income,\n        occupation and household details, the places you told us matter to you, your saved homes,\n        your dream board, and the record of which listings you opened. It cannot be undone.\n      "}
          </p>
          <p className="yd-note" id="signinNote" hidden>
            <b>
              Your sign-in stays.
            </b>
            {" We keep your email address and password so the account still\n        works, nothing else. If you want the account itself gone as well, say so when you write\n        to us and we will remove it; you are entitled to that and we will not argue about it.\n      "}
          </p>
          <p className="yd-note">
            {"\n        If an agency has already been introduced to you, they keep the record that an\n        introduction happened, which home, which agency, and when. Your name, number, budget\n        and preferences are removed from it.\n      "}
          </p>
          <div className="yd-confirm">
            <label className="yd-note" htmlFor="confirmBox">
              {"Type "}
              <b>
                DELETE
              </b>
              {" to confirm."}
            </label>
            {" "}
            <input id="confirmBox" type="text" autoComplete="off" placeholder="DELETE" />
          </div>
          <div className="yd-row" style={{ "marginTop": "12px" }}>
            <button className="yd-btn danger" id="deleteBtn" type="button" disabled>
              Erase my personal data
            </button>
            <span className="yd-note" id="deleteNote"></span>
          </div>
        </section>
        <section className="yd-card" id="social">
          <h2>
            If you connected a social account
          </h2>
          <p>
            {"\n        Agencies can connect a Facebook Page, an Instagram professional account, a TikTok\n        account or a Telegram channel so Synapse can publish their listings there.\n      "}
          </p>
          <p>
            <strong>
              To remove Synapse's access:
            </strong>
            {" in the agency portal, open Social studio,\n        then Channels, and press "}
            <strong>
              Disconnect
            </strong>
            {" on the account. Its access tokens\n        are deleted at once. You can also remove Synapse from Facebook's Business integrations\n        settings or TikTok's app permissions settings, or remove our bot from the Telegram channel.\n      "}
          </p>
          <p>
            <strong>
              To have everything deleted
            </strong>
            {" that we hold from a connected account,\n        including the record that it was connected, email\n        "}
            <a href="mailto:ilios.intelligence@gmail.com?subject=Delete%20my%20connected%20account%20data">
              ilios.intelligence@gmail.com
            </a>
            {"\n        with the account's name. We confirm by email when it is done.\n      "}
          </p>
          <p>
            <strong>
              If you commented on an agency's post
            </strong>
            {" that Synapse published, we hold only\n        your display name and the comment's text, and delete them automatically after 90 days.\n        Email the same address with your name and the post to have them deleted sooner.\n      "}
          </p>
        </section>
      </div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
