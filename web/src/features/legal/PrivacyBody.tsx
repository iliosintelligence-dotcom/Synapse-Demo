/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The privacy page's markup as React (converted from src/legacy/privacy/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
import { SolidBarOnScroll } from "./SolidBarOnScroll";

export function PrivacyBody() {
  return (
    <>
      <div className="m-page">
        <nav className="m-navbar" id="mNavbar">
          <a href="index.html" className="m-logo">
            {" "}
            <img className="syn-mark" src="images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />
            {" "}
            <span className="m-logo-word">
              Synapse Core
            </span>
            {" "}
          </a>
          {" "}
          <a className="m-agencies-link" href="index.html">
            ← Back
          </a>
        </nav>
        <header className="m-legal-hero m-wrap">
          <h1 className="m-legal-title">
            Privacy Policy
          </h1>
          <p className="m-legal-updated">
            Last updated 2 October 2026
          </p>
          <details className="m-legal-toc">
            <summary>
              On this page
            </summary>
            <div className="m-legal-toc-links">
              <a href="#m-what">
                What we collect
              </a>
              {" "}
              <a href="#m-toju">
                Talking to Tayo
              </a>
              {" "}
              <a href="#m-location">
                {"Location & proximity alerts"}
              </a>
              {" "}
              <a href="#m-accounts">
                Accounts
              </a>
              {" "}
              <a href="#m-agencies">
                If you're an agency
              </a>
              {" "}
              <a href="#m-social">
                Connected social accounts
              </a>
              {" "}
              <a href="#m-sharing">
                Who we share it with
              </a>
              {" "}
              <a href="#m-storage">
                Where it's stored
              </a>
              {" "}
              <a href="#m-rights">
                Your rights
              </a>
              {" "}
              <a href="#m-contact">
                Contact
              </a>
            </div>
          </details>
        </header>
        <main className="m-legal-doc m-wrap">
          <h2 id="m-what">
            What we collect
          </h2>
          <p>
            {"Synapse Core is built so that "}
            <strong>
              using it, browsing homes, talking to Tayo, never requires an account.
            </strong>
            {" We only collect what each feature genuinely needs:"}
          </p>
          <ul>
            <li>
              <strong>
                Anonymous visitor ID.
              </strong>
              {" A random identifier stored in your browser (not tied to your name or email) so Tayo can remember your conversation and preferences on this device."}
            </li>
            <li>
              <strong>
                Your conversation with Tayo
              </strong>
              , what you tell Tayo about the home you're looking for, your budget, and household. This is what lets Tayo stop asking questions you've already answered.
            </li>
            <li>
              <strong>
                Account details
              </strong>
              , only if you create one: your email and password (handled by Supabase Auth, which we do not have direct access to in plain text), and optionally your name.
            </li>
            <li>
              <strong>
                Approximate location
              </strong>
              , only if you explicitly turn on proximity alerts, see below.
            </li>
            <li>
              <strong>
                Standard technical data
              </strong>
              {" any website receives: browser type, rough page-load performance, and error reports, used to keep the app working."}
            </li>
            <li>
              <strong>
                How the site is used
              </strong>
              {", measured with Google Analytics: which pages are visited, roughly where from (the country and city Google works out from your connection), your device and browser, and which link or campaign brought you here. Before anything is sent, we remove from the page address whatever you typed or were sent in it, your questions to Tayo, searches, and sign-in or password-reset links, so none of that reaches Google. Google Analytics sets cookies (named "}
              <code>
                _ga
              </code>
              {", to tell one visit from the next) only if you accept them in the banner we show on your first visit. Until you accept, or if you say no, it sets no cookies and keeps no identifier for you; Google still receives a cookieless signal that a page was viewed, the trimmed page address, your device and browser type, and the rough location it works out from your connection, which it uses to estimate overall visits. You can change your choice at any time with "}
              <a href="#" data-cookie-settings="">
                Cookie settings
              </a>
              {", or block the cookies in your browser settings or with "}
              <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">
                Google’s opt-out add-on
              </a>
              , and Synapse Core keeps working.
            </li>
          </ul>
          <p>
            We do not buy data about you from anyone, and we do not sell yours.
          </p>
          <h2 id="m-toju">
            Talking to Tayo
          </h2>
          <p>
            Your messages to Tayo are sent to our AI service provider (currently Anthropic) to generate a reply, and are stored so Tayo can continue the conversation later. We do not use your conversations to train a public AI model.
          </p>
          <p>
            If you build a Dream, Mood or Vision board, the images and tags you pin are stored in your browser (not on our servers) and read by Tayo only to shape which homes it shows you.
          </p>
          <h2 id="m-location">
            {"Location & proximity alerts"}
          </h2>
          <p>
            {"Proximity alerts are "}
            <strong>
              off by default
            </strong>
            {" and require you to explicitly turn them on, on the browse page. When on, your device reports an approximate position (throttled to roughly once a minute) so our server can check it against verified homes matching your brief. We do not track your location when the feature is off, and turning it off stops reporting immediately."}
          </p>
          <p>
            Nothing about your location is shown to an agency, another user, or anyone else, it is only compared against listing coordinates to decide whether to send you a notification.
          </p>
          <h2 id="m-accounts">
            Accounts
          </h2>
          <p>
            We ask you to create an account at one specific moment: when you choose to contact an agent about a home. That's deliberate, browsing and talking to Tayo stay anonymous, and we only ask for your details at the point they'd actually be used. Your password is never visible to us; it's handled entirely by Supabase Auth.
          </p>
          <h2 id="m-agencies">
            If you're an agency
          </h2>
          <p>
            Agency accounts additionally involve listings you upload, leads assigned to you, and, if you use the campaign tools, draft social media copy generated on your behalf. Verification checks we run on your listings (title, structural, flood risk, and so on) are stored so buyers can see what passed and when.
          </p>
          <h2 id="m-social">
            Social accounts an agency connects
          </h2>
          <p>
            An agency can connect its own social accounts so Synapse Core can publish its listings there. We connect an account only when someone at the agency asks us to, through that platform's own sign-in, and only the accounts they choose.
          </p>
          <ul>
            <li>
              <strong>
                Facebook Pages and Instagram professional accounts
              </strong>
              , through Meta's sign-in. We receive the Page's or account's ID and name, an access token, and the setting of the Page's action button (which we read and never change). We use them to publish the listings the agency schedules; to read the like, comment and share counts on those posts; to read the text of comments on those posts so the agency can answer them; and, only if the agency switches it on, to send one private message containing the listing's link to a person who commented the word the post asked for. We do not read followers, insights, inbox messages, or anything about posts we did not publish.
            </li>
            <li>
              <strong>
                TikTok
              </strong>
              , through TikTok's sign-in. We receive the account's ID, display name and an access token, and use them only to send the agency's listing photos to that account's TikTok inbox as drafts, which the agency finishes and posts itself.
            </li>
            <li>
              <strong>
                Telegram channels.
              </strong>
              {" The agency adds our bot to its channel as an administrator. We store the channel's ID, title and @name, and use them only to post the agency's listings there. If an agency member links their Telegram account, we store its Telegram ID, username and first name, so we can send them each post's Story kit. Messages sent to the bot are not stored; it replies with a link to Tayo."}
            </li>
          </ul>
          <p>
            <strong>
              Access tokens
            </strong>
            {" are stored encrypted, are used only by our servers, and are never shown to anyone, including the agency. Disconnecting an account (Social studio → Channels → Disconnect) deletes its tokens immediately. We keep the account's name so that earlier posts still show where they went."}
          </p>
          <p>
            <strong>
              People who comment on an agency's posts.
            </strong>
            {" For comments on posts we published, we keep the commenter's display name or handle and the comment text, nothing else from their profile, and delete both automatically after 90 days. They are visible only to the agency whose post it was. Anyone can ask us to delete theirs sooner at the contact address below."}
          </p>
          <p>
            <strong>
              Removing Synapse Core's access.
            </strong>
            {" An agency can disconnect at any time in Synapse Core, or remove Synapse Core in Facebook's Business integrations settings or TikTok's app permissions settings, or remove our bot from the Telegram channel. To have us delete everything we hold from a connected account, email us at the address below."}
          </p>
          <h2 id="m-sharing">
            Who we share it with
          </h2>
          <ul>
            <li>
              <strong>
                An agency
              </strong>
              , only your name and contact details, and only after you choose to contact them about a specific home. We never hand these over before that.
            </li>
            <li>
              <strong>
                Service providers
              </strong>
              {" we use to run Synapse Core: Supabase (database, authentication, file storage), and our AI provider (Tayo's replies). Each only receives what its function requires."}
            </li>
            <li>
              <strong>
                Meta, TikTok and Telegram
              </strong>
              : the listing posts an agency asks us to publish, sent to that agency's own connected account.
            </li>
            <li>
              <strong>
                Google
              </strong>
              {" (Google Analytics): the usage measurements described above (with cookies only if you accept them), so we can count visits and see which pages and channels are working. We use it for measurement only, not for advertising."}
            </li>
            <li>
              <strong>
                Nobody else.
              </strong>
              {" No advertising networks, no data brokers."}
            </li>
          </ul>
          <h2 id="m-storage">
            Where it's stored
          </h2>
          <p>
            {"Synapse Core's database and authentication run on Supabase infrastructure. "}
            <span className="m-legal-flag">
              [NEEDS LEGAL: confirm the specific data-region and whether a cross-border transfer notice is required under NDPA for Nigerian users.]
            </span>
          </p>
          <h2 id="m-rights">
            Your rights
          </h2>
          <p>
            You can ask to see, correct, or delete the personal data we hold about you at any time. Deleting your account removes your profile and saved data; anonymous conversation data tied only to a device-generated visitor ID (never linked to your identity) is not something we can look up by your name, since we never collect one for anonymous use.
          </p>
          <h2 id="m-contact">
            Contact
          </h2>
          <p>
            {"Questions about this policy, or a request to see or delete your data: "}
            <a href="mailto:ilios.intelligence@gmail.com">
              ilios.intelligence@gmail.com
            </a>
            {". "}
            <span className="m-legal-flag">
              [NEEDS LEGAL: a dedicated privacy/DPO contact, and the registered company name and address, once incorporated.]
            </span>
          </p>
        </main>
      </div>
      <div className="legal">
        <a className="legal-back" href="index.html">
          ← Back to the landing page
        </a>
        <div className="legal-title" role="heading" aria-level="1">
          Privacy Policy
        </div>
        <p className="updated">
          Last updated 2 October 2026
        </p>
        <div className="toc">
          <div>
            On this page
          </div>
          <a href="#what">
            What we collect
          </a>
          {" "}
          <a href="#toju">
            Talking to Tayo
          </a>
          {" "}
          <a href="#location">
            {"Location & proximity alerts"}
          </a>
          {" "}
          <a href="#accounts">
            Accounts
          </a>
          {" "}
          <a href="#agencies">
            If you're an agency
          </a>
          {" "}
          <a href="#social">
            Connected social accounts
          </a>
          {" "}
          <a href="#sharing">
            Who we share it with
          </a>
          {" "}
          <a href="#storage">
            Where it's stored
          </a>
          {" "}
          <a href="#rights">
            Your rights
          </a>
          {" "}
          <a href="#contact">
            Contact
          </a>
        </div>
        <h2 id="what">
          What we collect
        </h2>
        <p>
          {"Synapse Core is built so that "}
          <strong>
            using it, browsing homes, talking to Tayo, never requires an account.
          </strong>
          {" We only collect what each feature genuinely needs:"}
        </p>
        <ul>
          <li>
            <strong>
              Anonymous visitor ID.
            </strong>
            {" A random identifier stored in your browser (not tied to your name or email) so Tayo can remember your conversation and preferences on this device."}
          </li>
          <li>
            <strong>
              Your conversation with Tayo
            </strong>
            , what you tell Tayo about the home you're looking for, your budget, and household. This is what lets Tayo stop asking questions you've already answered.
          </li>
          <li>
            <strong>
              Account details
            </strong>
            , only if you create one: your email and password (handled by Supabase Auth, which we do not have direct access to in plain text), and optionally your name.
          </li>
          <li>
            <strong>
              Approximate location
            </strong>
            , only if you explicitly turn on proximity alerts, see below.
          </li>
          <li>
            <strong>
              Standard technical data
            </strong>
            {" any website receives: browser type, rough page-load performance, and error reports, used to keep the app working."}
          </li>
          <li>
            <strong>
              How the site is used
            </strong>
            {", measured with Google Analytics: which pages are visited, roughly where from (the country and city Google works out from your connection), your device and browser, and which link or campaign brought you here. Before anything is sent, we remove from the page address whatever you typed or were sent in it, your questions to Tayo, searches, and sign-in or password-reset links, so none of that reaches Google. Google Analytics sets cookies (named "}
            <code>
              _ga
            </code>
            {", to tell one visit from the next) only if you accept them in the banner we show on your first visit. Until you accept, or if you say no, it sets no cookies and keeps no identifier for you; Google still receives a cookieless signal that a page was viewed, the trimmed page address, your device and browser type, and the rough location it works out from your connection, which it uses to estimate overall visits. You can change your choice at any time with "}
            <a href="#" data-cookie-settings="">
              Cookie settings
            </a>
            {", or block the cookies in your browser settings or with "}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">
              Google’s opt-out add-on
            </a>
            , and Synapse Core keeps working.
          </li>
        </ul>
        <p>
          We do not buy data about you from anyone, and we do not sell yours.
        </p>
        <h2 id="toju">
          Talking to Tayo
        </h2>
        <p>
          Your messages to Tayo are sent to our AI service provider (currently Anthropic) to generate a reply, and are stored so Tayo can continue the conversation later. We do not use your conversations to train a public AI model.
        </p>
        <p>
          If you build a Dream, Mood or Vision board, the images and tags you pin are stored in your browser (not on our servers) and read by Tayo only to shape which homes it shows you.
        </p>
        <h2 id="location">
          {"Location & proximity alerts"}
        </h2>
        <p>
          {"Proximity alerts are "}
          <strong>
            off by default
          </strong>
          {" and require you to explicitly turn them on, on the browse page. When on, your device reports an approximate position (throttled to roughly once a minute) so our server can check it against verified homes matching your brief. We do not track your location when the feature is off, and turning it off stops reporting immediately."}
        </p>
        <p>
          Nothing about your location is shown to an agency, another user, or anyone else, it is only compared against listing coordinates to decide whether to send you a notification.
        </p>
        <h2 id="accounts">
          Accounts
        </h2>
        <p>
          We ask you to create an account at one specific moment: when you choose to contact an agent about a home. That's deliberate, browsing and talking to Tayo stay anonymous, and we only ask for your details at the point they'd actually be used. Your password is never visible to us; it's handled entirely by Supabase Auth.
        </p>
        <h2 id="agencies">
          If you're an agency
        </h2>
        <p>
          Agency accounts additionally involve listings you upload, leads assigned to you, and, if you use the campaign tools, draft social media copy generated on your behalf. Verification checks we run on your listings (title, structural, flood risk, and so on) are stored so buyers can see what passed and when.
        </p>
        <h2 id="social">
          Social accounts an agency connects
        </h2>
        <p>
          An agency can connect its own social accounts so Synapse Core can publish its listings there. We connect an account only when someone at the agency asks us to, through that platform's own sign-in, and only the accounts they choose.
        </p>
        <ul>
          <li>
            <strong>
              Facebook Pages and Instagram professional accounts
            </strong>
            , through Meta's sign-in. We receive the Page's or account's ID and name, an access token, and the setting of the Page's action button (which we read and never change). We use them to publish the listings the agency schedules; to read the like, comment and share counts on those posts; to read the text of comments on those posts so the agency can answer them; and, only if the agency switches it on, to send one private message containing the listing's link to a person who commented the word the post asked for. We do not read followers, insights, inbox messages, or anything about posts we did not publish.
          </li>
          <li>
            <strong>
              TikTok
            </strong>
            , through TikTok's sign-in. We receive the account's ID, display name and an access token, and use them only to send the agency's listing photos to that account's TikTok inbox as drafts, which the agency finishes and posts itself.
          </li>
          <li>
            <strong>
              Telegram channels.
            </strong>
            {" The agency adds our bot to its channel as an administrator. We store the channel's ID, title and @name, and use them only to post the agency's listings there. If an agency member links their Telegram account, we store its Telegram ID, username and first name, so we can send them each post's Story kit. Messages sent to the bot are not stored; it replies with a link to Tayo."}
          </li>
        </ul>
        <p>
          <strong>
            Access tokens
          </strong>
          {" are stored encrypted, are used only by our servers, and are never shown to anyone, including the agency. Disconnecting an account (Social studio → Channels → Disconnect) deletes its tokens immediately. We keep the account's name so that earlier posts still show where they went."}
        </p>
        <p>
          <strong>
            People who comment on an agency's posts.
          </strong>
          {" For comments on posts we published, we keep the commenter's display name or handle and the comment text, nothing else from their profile, and delete both automatically after 90 days. They are visible only to the agency whose post it was. Anyone can ask us to delete theirs sooner at the contact address below."}
        </p>
        <p>
          <strong>
            Removing Synapse Core's access.
          </strong>
          {" An agency can disconnect at any time in Synapse Core, or remove Synapse Core in Facebook's Business integrations settings or TikTok's app permissions settings, or remove our bot from the Telegram channel. To have us delete everything we hold from a connected account, email us at the address below."}
        </p>
        <h2 id="sharing">
          Who we share it with
        </h2>
        <ul>
          <li>
            <strong>
              An agency
            </strong>
            , only your name and contact details, and only after you choose to contact them about a specific home. We never hand these over before that.
          </li>
          <li>
            <strong>
              Service providers
            </strong>
            {" we use to run Synapse Core: Supabase (database, authentication, file storage), and our AI provider (Tayo's replies). Each only receives what its function requires."}
          </li>
          <li>
            <strong>
              Meta, TikTok and Telegram
            </strong>
            : the listing posts an agency asks us to publish, sent to that agency's own connected account.
          </li>
          <li>
            <strong>
              Google
            </strong>
            {" (Google Analytics): the usage measurements described above (with cookies only if you accept them), so we can count visits and see which pages and channels are working. We use it for measurement only, not for advertising."}
          </li>
          <li>
            <strong>
              Nobody else.
            </strong>
            {" No advertising networks, no data brokers."}
          </li>
        </ul>
        <h2 id="storage">
          Where it's stored
        </h2>
        <p>
          {"Synapse Core's database and authentication run on Supabase infrastructure. "}
          <span style={{ "background": "rgba(var(--tint),0.12)", "padding": "1px 4px", "borderRadius": "4px" }}>
            [NEEDS LEGAL: confirm the specific data-region and whether a cross-border transfer notice is required under NDPA for Nigerian users.]
          </span>
        </p>
        <h2 id="rights">
          Your rights
        </h2>
        <p>
          You can ask to see, correct, or delete the personal data we hold about you at any time. Deleting your account removes your profile and saved data; anonymous conversation data tied only to a device-generated visitor ID (never linked to your identity) is not something we can look up by your name, since we never collect one for anonymous use.
        </p>
        <h2 id="contact">
          Contact
        </h2>
        <p>
          {"Questions about this policy, or a request to see or delete your data: "}
          <a href="mailto:ilios.intelligence@gmail.com">
            ilios.intelligence@gmail.com
          </a>
          {". "}
          <span style={{ "background": "rgba(var(--tint),0.12)", "padding": "1px 4px", "borderRadius": "4px" }}>
            [NEEDS LEGAL: a dedicated privacy/DPO contact, and the registered company name and address, once incorporated.]
          </span>
        </p>
      </div>
      <SolidBarOnScroll />
    </>
  );
}
