/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from app/synapse-join.html by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
      <main className="card">
        <div className="brand">
          Synapse
        </div>
        <section id="working">
          <h1>
            Opening your invitation…
          </h1>
        </section>
        <section id="form" hidden>
          <h1>
            Welcome to the Synapse team
          </h1>
          <p>
            Choose a password to create your account. You will use this email and password to sign in.
          </p>
          <form id="f" noValidate>
            <label htmlFor="name">
              Your name
            </label>
            {" "}
            <input id="name" type="text" autoComplete="name" maxLength="80" />
            {" "}
            <label htmlFor="pw">
              Password
            </label>
            {" "}
            <input id="pw" type="password" autoComplete="new-password" minLength="8" />
            {" "}
            <label htmlFor="pw2">
              Password again
            </label>
            {" "}
            <input id="pw2" type="password" autoComplete="new-password" minLength="8" />
            <div id="msg" className="note bad" role="alert" hidden></div>
            <button className="btn" id="go" type="submit">
              Create my account
            </button>
          </form>
        </section>
        <section id="bad" hidden>
          <h1>
            This invitation can't be opened
          </h1>
          <p id="badWhy">
            The link has expired or was already used. Ask whoever invited you to send a new one.
          </p>
          <p className="note">
            {"Already made your password? "}
            <a href="signin.html?next=synapse.html">
              Sign in
            </a>
            .
          </p>
        </section>
        <section id="done" hidden>
          <h1>
            You're in
          </h1>
          <p id="doneMsg">
            Taking you to the studio…
          </p>
        </section>
      </main>
      <script src="auth.js" />
      <script  dangerouslySetInnerHTML={{ __html: inline("synapse-join", "inline-2.js") }} />
    </>
  );
}
