/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings)
// The studio's visual guide: static markup, drawn from the real screens (was part of src/legacy/synapse/body.html).
export function StudioGuide() {
  return (
    <>
    <div className="page-head">
      <div className="grow">
        <h1 className="h">
          How to use the studio
        </h1>
        <p className="lede">
          A five-minute tour with pictures. Everything here is drawn from the real screens, so what you see is what you will click.
        </p>
      </div>
    </div>
    <div className="chips" id="gChips">
      <a href="#g1">
        Sign in
      </a>
      <a href="#g2">
        Home
      </a>
      <a href="#g3">
        Add a channel
      </a>
      <a href="#g4">
        Channel switches
      </a>
      <a href="#g5">
        Create a post
      </a>
      <a href="#g6">
        Automation
      </a>
      <a href="#g7">
        Activity
      </a>
      <a href="#g8">
        Team
      </a>
      <a href="#g9">
        If something goes wrong
      </a>
    </div>
    <article className="g" id="g1">
      <div className="g-vis">
        <div className="flow">
          <div className="mock">
            <div className="mk-foot">
              <span>
                Privacy
              </span>
              <span>
                Terms
              </span>
              <b className="hl">
                Team login
              </b>
            </div>
            <small>
              Footer of synapsecore.dev
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-field">
              name@synapse…
            </div>
            <div className="mk-field">
              ••••••••
            </div>
            <div className="mk-btn">
              Sign in
            </div>
            <small>
              Sign-in page
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-side">
              <i></i>
              <i className="on"></i>
              <i></i>
              <i></i>
            </div>
            <small>
              The studio
            </small>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          1
        </span>
        <h2 className="h2">
          Sign in
        </h2>
        <p>
          {"Open "}
          <b>
            synapsecore.dev
          </b>
          {", scroll to the bottom and press "}
          <b>
            Team login
          </b>
          . Sign in with the email you were invited with. After signing in you land in the studio.
        </p>
        <p className="muted small">
          If it says your email is not on the team, sign out and use the invited one, or ask an admin to add you.
        </p>
      </div>
    </article>
    <article className="g" id="g2">
      <div className="g-vis">
        <div className="mock wide">
          <div className="mk-hero">
            <b>
              Good morning, Joshua.
            </b>
            <span>
              Next up: connect a social account.
            </span>
            <div className="mk-btn o">
              Add a channel
            </div>
          </div>
          <div className="mk-stats">
            <span>
              <b>
                3
              </b>
              channels
            </span>
            <span>
              <b>
                1
              </b>
              autopilot
            </span>
            <span>
              <b>
                2
              </b>
              today
            </span>
          </div>
          <div className="mk-steps">
            <div>
              <i className="ok">
                ✓
              </i>
              Connect a social account
            </div>
            <div>
              <i>
                2
              </i>
              Let a channel post homes by itself
            </div>
            <div>
              <i>
                3
              </i>
              Share what agencies post
            </div>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          2
        </span>
        <h2 className="h2">
          Home tells you what to do next
        </h2>
        <p>
          The dark box at the top names the next step and gives you the button for it. Below it, the four set-up steps tick off by themselves as you finish them. The tiles count your channels and today's posts.
        </p>
        <p className="muted small">
          The left side (the bottom bar on a phone) moves you between pages. Orange means "you are here".
        </p>
      </div>
    </article>
    <article className="g" id="g3">
      <div className="g-vis">
        <div className="flow three">
          <div className="mock">
            <div className="tiles-m">
              <span className="pf sm pf-facebook">
                f
              </span>
              <span className="pf sm pf-telegram">
                ➤
              </span>
            </div>
            <small>
              1 · Pick the network
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-step">
              <i>
                1
              </i>
              Continue with Facebook
            </div>
            <div className="mk-step">
              <i>
                2
              </i>
              Tick Synapse's Page
            </div>
            <div className="mk-step">
              <i>
                3
              </i>
              Come back
            </div>
            <small>
              2 · Connect it
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-acct">
              <span className="pf sm pf-facebook">
                f
              </span>
              Synapse Nigeria
              <b className="mk-chosen">
                Chosen ✓
              </b>
            </div>
            <div className="mk-sw">
              <span>
                Our own posts
              </span>
              <em className="on"></em>
            </div>
            <div className="mk-sw">
              <span>
                Autopilot
              </span>
              <em></em>
            </div>
            <small>
              3 · Choose it and say what it is for
            </small>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          3
        </span>
        <h2 className="h2">
          Add a channel
        </h2>
        <p>
          {"Go to "}
          <b>
            Channels
          </b>
          {" and press the orange "}
          <b>
            Add a channel
          </b>
          . A guide walks you through three steps:
        </p>
        <ol className="steps-l">
          <li>
            <b>
              Pick the network.
            </b>
            {" Facebook or Telegram: the networks Synapse connects to directly. Others will appear as Synapse connects to them."}
          </li>
          <li>
            <b>
              Facebook:
            </b>
            {" press "}
            <b>
              Continue with Facebook
            </b>
            , sign in as an admin of Synapse's Page, tick the Page and leave every permission on. Facebook brings you back here: tick which Pages are Synapse's and add them.
          </li>
          <li>
            <b>
              Telegram:
            </b>
            {" write the channel's public name (like @SynapseLagos), then make the Synapse bot an admin of the channel with "}
            <b>
              Post messages
            </b>
            {" on. The channel switches itself on as soon as Telegram tells Synapse."}
          </li>
          <li>
            <b>
              Say what it is for.
            </b>
            {" A new channel starts quiet. In Channels, switch on our own posts, autopilot or agency posts."}
          </li>
        </ol>
        <p className="muted small">
          You can add as many accounts as you like, including several on the same network, one per city for example.
        </p>
      </div>
    </article>
    <article className="g" id="g4">
      <div className="g-vis">
        <div className="mock wide">
          <div className="mk-chan">
            <span className="pf pf-instagram">
              ◎
            </span>
            <div>
              <b>
                Synapse Ibadan
              </b>
              <small>
                Instagram · @synapse_ibadan
              </small>
              <div className="pl">
                <span className="pill ok">
                  On
                </span>
                <span className="pill hot">
                  Autopilot
                </span>
                <span className="pill">
                  Ibadan
                </span>
              </div>
            </div>
          </div>
          <div className="mk-sw">
            <span>
              <b>
                Switched on
              </b>
              Posts nothing when off
            </span>
            <em className="on"></em>
          </div>
          <div className="mk-sw">
            <span>
              <b>
                Post homes by itself
              </b>
              Autopilot
            </span>
            <em className="on"></em>
          </div>
          <div className="mk-sw">
            <span>
              <b>
                Share agencies' posts
              </b>
              Needs sharing on in Automation
            </span>
            <em></em>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          4
        </span>
        <h2 className="h2">
          What each switch does
        </h2>
        <ul className="steps-l">
          <li>
            <b>
              Switched on
            </b>
            : off keeps the account on the page but sends it nothing.
          </li>
          <li>
            <b>
              Post homes by itself
            </b>
            : the channel posts one live listing at a time, newest first, inside the hours and daily limit you set.
          </li>
          <li>
            <b>
              Share agencies' posts
            </b>
            : when an agency publishes a listing, this channel posts it too, crediting the agency.
          </li>
          <li>
            <b>
              What this page takes
            </b>
            : you decide which listings go where. Tick the kinds (for sale, for rent, land...), set bedrooms, a price range or areas, and the card shows how many live listings match. A listing goes to every page whose rules it matches, and a rule left empty takes anything.
          </li>
        </ul>
        <p className="muted small">
          {"Open "}
          <b>
            Name, city and pacing
          </b>
          {" on a card to rename it, give it a city, and set posts a day, hours between posts and the hours it may post (Lagos time)."}
        </p>
      </div>
    </article>
    <article className="g" id="g5">
      <div className="g-vis">
        <div className="mock wide create-m">
          <div className="mk-row">
            <i>
              1
            </i>
            <div className="mk-homes">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="mk-row">
            <i>
              2
            </i>
            <div className="mk-field grow">
              What is the post about?
            </div>
            <div className="mk-btn o">
              ✨ Write captions
            </div>
          </div>
          <div className="mk-row">
            <i>
              3
            </i>
            <div className="mk-pics">
              <span></span>
              <span></span>
              <b>
                +
              </b>
            </div>
          </div>
          <div className="mk-row">
            <i>
              4
            </i>
            <div className="mk-chips">
              <span className="pf sm pf-instagram">
                ◎
              </span>
              <span className="pf sm pf-x">
                X
              </span>
            </div>
            <i>
              5
            </i>
            <div className="mk-btn">
              Now
            </div>
          </div>
          <div className="mk-btn big">
            Post
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          5
        </span>
        <h2 className="h2">
          Create a post
        </h2>
        <ol className="steps-l">
          <li>
            <b>
              Start from a real home
            </b>
            {" (optional). Tap a listing: its photos are added and the caption is written from its real details."}
          </li>
          <li>
            <b>
              Say what it is about
            </b>
            {" and press "}
            <b>
              Write captions
            </b>
            . Three captions appear in Synapse's voice. Tap one, then edit it freely.
          </li>
          <li>
            <b>
              Add pictures
            </b>
            {" of your own with the "}
            <b>
              +
            </b>
            {" box (JPG, PNG or WEBP, up to 8 MB each). For "}
            <b>
              YouTube
            </b>
            , add one vertical video instead (MP4 or MOV, up to 3 minutes and 50 MB) and tick only YouTube.
          </li>
          <li>
            <b>
              Tap the accounts
            </b>
            {" that should get it, then choose "}
            <b>
              Now
            </b>
            {" or "}
            <b>
              Pick a time
            </b>
            .
          </li>
          <li>
            {"Choose "}
            <b>
              Now
            </b>
            {", "}
            <b>
              Pick a time
            </b>
            {", or "}
            <b>
              Several times
            </b>
            {". With several times you add as many dates as you like (or press "}
            <b>
              Repeat daily or weekly
            </b>
            {" to fill them in), and the same post goes out at each, on every account you ticked."}
          </li>
          <li>
            {"Press "}
            <b>
              Post
            </b>
            {" (or "}
            <b>
              Schedule
            </b>
            {"). To line up a week of different posts, press "}
            <b>
              Schedule and write another
            </b>
            {": it keeps your accounts and times and clears only the post. Scheduled posts show below by day, and "}
            <b>
              Stop all in one batch
            </b>
            {" cancels a whole batch."}
          </li>
          <li>
            The preview on the right shows roughly how it will look.
          </li>
        </ol>
      </div>
    </article>
    <article className="g" id="g6">
      <div className="g-vis">
        <div className="flow v">
          <div className="mock">
            <div className="mk-line">
              <span className="pf sm" style={{ "background": "var(--orange)", "color": "#15120F" }}>
                ⚡
              </span>
              {" Live listing "}
              <span className="arr">
                →
              </span>
              {" "}
              <span className="pf sm pf-instagram">
                ◎
              </span>
              <span className="pf sm pf-x">
                X
              </span>
            </div>
            <small>
              Autopilot: Synapse posts homes, on a schedule
            </small>
          </div>
          <div className="mock">
            <div className="mk-line">
              <span className="pill">
                Agency posts
              </span>
              {" "}
              <span className="arr">
                →
              </span>
              {" "}
              <span className="pf sm pf-instagram">
                ◎
              </span>
              <span className="pf sm pf-facebook">
                f
              </span>
            </div>
            <small>
              Sharing: agencies' posts also go out here, credited to them
            </small>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          6
        </span>
        <h2 className="h2">
          Automation: two things run on their own
        </h2>
        <p>
          <b>
            Post the live listings
          </b>
          {" uses the channels with Autopilot on. "}
          <b>
            Share agencies' posts
          </b>
          {" is one master switch on the Automation page: when it is on, every channel set to \"Share agencies' posts\" also posts what agencies publish."}
        </p>
        <p className="muted small">
          So there are two switches to think about: the master one in Automation, and the per-channel one in Channels. Both must be on for a channel to share agency posts.
        </p>
      </div>
    </article>
    <article className="g" id="g7">
      <div className="g-vis">
        <div className="mock wide legend">
          <div>
            <span className="pill hot">
              Scheduled
            </span>
            {" Waiting for its time. You can still press "}
            <b>
              Stop
            </b>
            .
          </div>
          <div>
            <span className="pill warn">
              Sending
            </span>
            {" On its way to the network."}
          </div>
          <div>
            <span className="pill warn">
              Sent, not live yet
            </span>
            {" Accepted; the network has not confirmed it yet."}
          </div>
          <div>
            <span className="pill ok">
              Live
            </span>
            {" Confirmed on the network."}
          </div>
          <div>
            <span className="pill bad">
              Failed
            </span>
            {" It did not go out. The reason is shown under it."}
          </div>
          <div>
            <span className="pill">
              Stopped
            </span>
            {" You cancelled it before it went."}
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          7
        </span>
        <h2 className="h2">
          Activity and what the labels mean
        </h2>
        <p>
          <b>
            Activity
          </b>
          {" lists what the channels posted lately: by autopilot, shared from an agency, or written in the studio. "}
          <b>
            Create
          </b>
          {" shows your scheduled and recent posts at the bottom."}
        </p>
      </div>
    </article>
    <article className="g" id="g8">
      <div className="g-vis">
        <div className="flow three">
          <div className="mock">
            <div className="mk-field">
              name@example.com
            </div>
            <div className="mk-btn">
              Send invitation
            </div>
            <small>
              Admin: Team page
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-mail">
              ✉ Invitation
            </div>
            <small>
              They get an email, or you copy a link
            </small>
          </div>
          <span className="arr">
            →
          </span>
          <div className="mock">
            <div className="mk-field">
              Your name
            </div>
            <div className="mk-field">
              Password
            </div>
            <small>
              They join the team
            </small>
          </div>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          8
        </span>
        <h2 className="h2">
          Team (admins only)
        </h2>
        <p>
          Enter their email, pick a role (
          <b>
            Social media manager
          </b>
          {" or "}
          <b>
            Admin
          </b>
          {") and press "}
          <b>
            Send invitation
          </b>
          . The link brings them to a page where they enter their name and a password. If the email cannot be sent, the page gives you a link to copy and send yourself. You can remove anyone's access here at any time.
        </p>
      </div>
    </article>
    <article className="g" id="g9">
      <div className="g-vis">
        <div className="mock wide faq">
          <details>
            <summary>
              Facebook shared no Page
            </summary>
            <p>
              Add a channel again and, when Facebook lists Pages, tick Synapse's. If Facebook does not ask, remove Synapse under Facebook Settings, Business integrations, then try again.
            </p>
          </details>
          <details>
            <summary>
              My Telegram channel stays off
            </summary>
            <p>
              The Synapse bot must be an admin of the channel with Post messages on, and the name you wrote must be the channel's public @name.
            </p>
          </details>
          <details>
            <summary>
              A post says the Page needs connecting again
            </summary>
            <p>
              Facebook's permission ended. Add a channel, Facebook, and tick the same Page: its settings are kept.
            </p>
          </details>
          <details>
            <summary>
              A post says Failed
            </summary>
            <p>
              Read the reason under it. Often it is a missing picture on Instagram, or the account needs reconnecting. Fix that and create the post again.
            </p>
          </details>
          <details>
            <summary>
              Agencies' posts are not appearing on my channel
            </summary>
            <p>
              {"Check both switches: "}
              <b>
                Share agencies' posts
              </b>
              {" in Automation, and on the channel itself. And that the channel is switched on."}
            </p>
          </details>
          <details>
            <summary>
              I cannot see the Team page
            </summary>
            <p>
              Only admins see it. Ask an admin to change your role.
            </p>
          </details>
        </div>
      </div>
      <div className="g-txt">
        <span className="g-n">
          9
        </span>
        <h2 className="h2">
          If something goes wrong
        </h2>
        <p>
          Most problems are a connection that needs refreshing. Open the question that looks like yours.
        </p>
        <p className="muted small">
          Still stuck? Write down the message shown and send it to ilios.intelligence@gmail.com.
        </p>
      </div>
    </article>
    </>
  );
}
