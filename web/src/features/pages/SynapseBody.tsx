/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The synapse page's markup as React (converted from src/legacy/synapse/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "auth.js" },
  { code: inline("synapse", "inline-2.js") },
];

export function SynapseBody() {
  return (
    <>
      <div className="gate" id="gate">
        Opening…
      </div>
      <div className="shell" id="app" hidden>
        <aside className="side" aria-label="Studio">
          <div className="brand">
            <a href="synapse.html" className="bm-link" aria-label="Synapse studio" style={{ "display": "grid", "placeItems": "center", "width": "34px", "height": "34px", "borderRadius": "10px", "background": "var(--orange)", "flex": "none" }}>
              <img src="../images/brand/mark-black-on-white-tight.jpg" alt="" style={{ "width": "15px", "height": "21px" }} />
            </a>
            <div>
              Synapse
              <small>
                Studio
              </small>
            </div>
          </div>
          <nav className="nav" id="nav">
            <button className="nb" type="button" data-tab="home" aria-current="page">
              <svg className="i" viewBox="0 0 24 24">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v9.5h13V10" />
              </svg>
              <span>
                Home
              </span>
            </button>
            <button className="nb" type="button" data-tab="channels">
              <svg className="i" viewBox="0 0 24 24">
                <circle cx="6" cy="12" r="2.6" />
                <circle cx="18" cy="6" r="2.6" />
                <circle cx="18" cy="18" r="2.6" />
                <path d="M8.3 10.8 15.7 7.2M8.3 13.2l7.4 3.6" />
              </svg>
              <span>
                Channels
              </span>
            </button>
            <button className="nb" type="button" data-tab="compose">
              <svg className="i" viewBox="0 0 24 24">
                <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z" />
                <path d="m13.5 6.5 4 4" />
              </svg>
              <span>
                Create
              </span>
            </button>
            <button className="nb" type="button" data-tab="auto">
              <svg className="i" viewBox="0 0 24 24">
                <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
              </svg>
              <span>
                Automation
              </span>
            </button>
            <button className="nb" type="button" data-tab="activity">
              <svg className="i" viewBox="0 0 24 24">
                <path d="M3 12h4l3-8 4 16 3-8h4" />
              </svg>
              <span>
                Activity
              </span>
            </button>
            <button className="nb" type="button" data-tab="guide">
              <svg className="i" viewBox="0 0 24 24">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                <path d="M4 5.5V21.5M9 8h7M9 12h5" />
              </svg>
              <span>
                Guide
              </span>
            </button>
            <button className="nb" type="button" data-tab="team" id="teamTab" hidden>
              <svg className="i" viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5" />
                <path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.8.7 3 2.3 3 5.2" />
              </svg>
              <span>
                Team
              </span>
            </button>
          </nav>
          <div className="side-foot">
            <div className="who" id="who"></div>
            <button className="btn sm" id="out" type="button">
              Sign out
            </button>
          </div>
        </aside>
        <div>
          <div className="mtop">
            <span>
              Synapse studio
            </span>
            <button className="btn sm" id="outM" type="button">
              Sign out
            </button>
          </div>
          <main>
            <section className="pane" id="p-home">
              <div className="hero">
                <h2 id="heroTitle">
                  Welcome to the studio
                </h2>
                <p id="heroText">
                  This is where Synapse posts to its own social media, and shares what agencies publish.
                </p>
                <div className="row" id="heroBtns"></div>
              </div>
              <div className="stats" id="stats"></div>
              <div className="card">
                <h2 className="h2">
                  Get set up
                </h2>
                <p className="muted small" style={{ "marginTop": "4px" }}>
                  <span id="stepsLede">
                    Four steps. Each one takes a couple of minutes.
                  </span>
                  {" New here? "}
                  <a href="#" data-go="guide" style={{ "fontWeight": "600" }}>
                    Read the visual guide
                  </a>
                  .
                </p>
                <div id="steps" style={{ "marginTop": "8px" }}></div>
              </div>
              <div className="card">
                <div className="row">
                  <h2 className="h2">
                    Latest activity
                  </h2>
                  <span className="spacer"></span>
                  <button className="btn sm" type="button" data-go="activity">
                    See all
                  </button>
                </div>
                <div id="homeAct">
                  <div className="empty">
                    Loading…
                  </div>
                </div>
              </div>
            </section>
            <section className="pane" id="p-channels" hidden>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">
                    Channels
                  </h1>
                  <p className="lede">
                    The social accounts Synapse posts from. Each one can post Synapse's own content, post homes by itself, and share agencies' posts.
                  </p>
                </div>
                <button className="btn orange big" type="button" data-addchan="">
                  <svg className="i" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add a channel
                </button>
              </div>
              <div id="chanList" className="grid"></div>
              <div className="card stack" id="legacyCard" hidden>
                <h2 className="h2">
                  Developer accounts
                </h2>
                <p className="muted small">
                  These were connected first, with the developer logins. They still receive agencies' posts when mirroring is on. Switch one off once the team's own account replaces it.
                </p>
                <div id="legacyList"></div>
              </div>
            </section>
            <section className="pane" id="p-compose" hidden>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">
                    Create a post
                  </h1>
                  <p className="lede">
                    Write it, add pictures, pick where it goes, and send it now or at a time you choose.
                  </p>
                </div>
              </div>
              <div className="create">
                <div className="stack">
                  <div className="card stack">
                    <div>
                      <label className="f">
                        {"1 · Start from a real home "}
                        <span className="muted">
                          (optional)
                        </span>
                      </label>
                      <p className="muted small" style={{ "margin": "-2px 0 10px" }}>
                        Pick a live listing: its photos are added and the captions are written from its real details.
                      </p>
                      <div className="homes" id="homes">
                        <div className="empty">
                          Loading homes…
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f" htmlFor="brief">
                        2 · What is the post about?
                      </label>
                      <div className="row">
                        <input type="text" id="brief" className="grow" placeholder="e.g. Tayo now tells you what was checked on every home" maxLength="300" />
                        <button className="btn sm orange" id="suggest" type="button">
                          ✨ Write captions
                        </button>
                      </div>
                    </div>
                    <div className="opts3" id="suggs"></div>
                    <div>
                      <label className="f" htmlFor="caption">
                        Caption
                      </label>
                      <textarea id="caption" maxLength="5000" placeholder="Write the post, or pick one of the captions above" />
                      <div className="small muted" id="count" style={{ "marginTop": "6px" }}></div>
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f">
                        3 · Pictures, or a video for YouTube
                      </label>
                      <div className="thumbs" id="thumbs"></div>
                      <input type="file" id="pic" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple hidden />
                    </div>
                  </div>
                  <div className="card stack">
                    <div>
                      <label className="f">
                        4 · Where should it go?
                      </label>
                      <div className="picks" id="picks"></div>
                      <p className="small muted" id="picksNote" style={{ "marginTop": "8px" }}></p>
                    </div>
                    <div>
                      <label className="f">
                        5 · When?
                      </label>
                      <div className="row">
                        <button className="pick plain" id="whenNow" type="button" aria-pressed="true">
                          Now
                        </button>
                        <button className="pick plain" id="whenLater" type="button" aria-pressed="false">
                          Pick a time
                        </button>
                        <button className="pick plain" id="whenMany" type="button" aria-pressed="false">
                          Several times
                        </button>
                        <div id="atWrap" hidden style={{ "flex": "1 1 220px" }}>
                          <input type="datetime-local" id="at" aria-label="Date and time (your device's clock)" />
                        </div>
                      </div>
                      <div id="manyWrap" hidden style={{ "marginTop": "12px" }}>
                        <p className="muted small" style={{ "marginBottom": "8px" }}>
                          The same post goes out at every time you add, on every account you ticked.
                        </p>
                        <div id="manyList" className="stack" style={{ "marginBottom": "10px" }}></div>
                        <div className="row">
                          <button className="btn sm" id="addTime" type="button">
                            + Add a time
                          </button>
                          <button className="btn sm" id="repeatBtn" type="button">
                            Repeat daily or weekly…
                          </button>
                        </div>
                        <div id="repeatBox" className="callout" hidden style={{ "marginTop": "12px" }}>
                          <div className="row">
                            <div>
                              <label className="f" htmlFor="rpStart">
                                First time
                              </label>
                              <input type="datetime-local" id="rpStart" />
                            </div>
                            <div>
                              <label className="f" htmlFor="rpEvery">
                                Every
                              </label>
                              <select id="rpEvery">
                                <option value="1">
                                  day
                                </option>
                                <option value="2">
                                  2 days
                                </option>
                                <option value="7">
                                  week
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="f" htmlFor="rpCount">
                                How many times
                              </label>
                              <input type="number" id="rpCount" min="2" max="30" style={{ "width": "90px" }} defaultValue="7" />
                            </div>
                            <div style={{ "alignSelf": "flex-end" }}>
                              <button className="btn sm primary" id="rpFill" type="button">
                                Fill the list
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="small" id="manySummary" style={{ "marginTop": "10px" }}></p>
                      </div>
                    </div>
                    <div className="row">
                      <button className="btn primary big" id="send" type="button">
                        Post
                      </button>
                      <button className="btn big" id="sendMore" type="button" hidden>
                        Schedule and write another
                      </button>
                    </div>
                  </div>
                </div>
                <div className="preview stack">
                  <div className="phone" aria-label="Preview of the post">
                    <div className="ph-top">
                      <span className="pf sm pf-instagram" id="pvBadge">
                        S
                      </span>
                      <div>
                        <b id="pvName">
                          Your channel
                        </b>
                        <span className="muted small" id="pvSub">
                          Preview
                        </span>
                      </div>
                    </div>
                    <div className="ph-img" id="pvImg">
                      Pictures show here
                    </div>
                    <div className="ph-cap none" id="pvCap">
                      Your caption shows here.
                    </div>
                  </div>
                  <p className="muted small">
                    A rough preview. Each network crops and wraps a little differently.
                  </p>
                </div>
              </div>
              <div className="card">
                <h2 className="h2">
                  Scheduled and recent
                </h2>
                <div id="postList">
                  <div className="empty">
                    Loading…
                  </div>
                </div>
              </div>
            </section>
            <section className="pane" id="p-auto" hidden>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">
                    Automation
                  </h1>
                  <p className="lede">
                    Two things run without anyone pressing a button. Both stay inside each channel's pacing, so no channel is flooded.
                  </p>
                </div>
              </div>
              <div className="card">
                <div className="opt">
                  <span className="pf" style={{ "background": "var(--orange)", "color": "#15120F" }}>
                    <svg className="i" viewBox="0 0 24 24">
                      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
                    </svg>
                  </span>
                  <div className="grow">
                    <b>
                      Post the live listings
                    </b>
                    {" "}
                    <small>
                      Each channel with Autopilot on posts one home at a time from the live inventory: newest first, in the hours and the daily limit you set on the channel. A home goes out again only after its repeat period.
                    </small>
                  </div>
                </div>
                <div id="autoSummary" className="small muted"></div>
                <div style={{ "marginTop": "12px" }}>
                  <button className="btn sm" type="button" data-go="channels">
                    Choose channels
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="opt">
                  <span className="pf" style={{ "background": "var(--ok)", "color": "#fff" }}>
                    <svg className="i" viewBox="0 0 24 24">
                      <path d="M17 3l4 4-4 4" />
                      <path d="M3 11V9a2 2 0 0 1 2-2h16" />
                      <path d="M7 21l-4-4 4-4" />
                      <path d="M21 13v2a2 2 0 0 1-2 2H3" />
                    </svg>
                  </span>
                  <div className="grow">
                    <b>
                      Share agencies' posts
                    </b>
                    {" "}
                    <small>
                      {"When an agency posts a listing, Synapse's channels that ask for it post it too, with a link that still credits the agency. Agencies are not asked first: this is Synapse sharing what they publish. Which page takes which listing is set here, on each channel, under "}
                      <b>
                        What this page takes
                      </b>
                      : a 2-bedroom flat goes only to the page set up for 2-bedroom flats.
                    </small>
                  </div>
                  <button className="sw" id="twinSw" role="switch" aria-checked="false" aria-label="Share agencies' posts"></button>
                </div>
                <div id="mirrorSummary" className="small muted"></div>
              </div>
            </section>
            <section className="pane" id="p-activity" hidden>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">
                    Activity
                  </h1>
                  <p className="lede">
                    What Synapse's channels have posted lately, and what is waiting.
                  </p>
                </div>
              </div>
              <div className="card">
                <div id="actList">
                  <div className="empty">
                    Loading…
                  </div>
                </div>
              </div>
            </section>
            <section className="pane" id="p-guide" hidden>
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
            </section>
            <section className="pane" id="p-team" hidden>
              <div className="page-head">
                <div className="grow">
                  <h1 className="h">
                    Team
                  </h1>
                  <p className="lede">
                    Who can open the studio. Enter an email and Synapse sends an invitation: the link in it brings them to a page where they choose a password and create their account as part of the team. Someone who already has a Synapse account just gets access. An admin can invite and remove anyone.
                  </p>
                </div>
              </div>
              <div className="card stack">
                <div className="row">
                  <div className="grow">
                    <label className="f" htmlFor="mEmail">
                      Email
                    </label>
                    <input type="email" id="mEmail" placeholder="name@example.com" autoComplete="off" />
                  </div>
                  <div>
                    <label className="f" htmlFor="mRole">
                      Role
                    </label>
                    <select id="mRole">
                      <option value="social_manager">
                        Social media manager
                      </option>
                      <option value="admin">
                        Admin
                      </option>
                    </select>
                  </div>
                  <div style={{ "alignSelf": "flex-end" }}>
                    <button className="btn primary" id="mAdd" type="button">
                      Send invitation
                    </button>
                  </div>
                </div>
                <div id="inviteRes" hidden></div>
                <div id="staffList"></div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <div className="veil" id="veil" hidden>
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="wzTitle">
          <div className="prog" id="wzProg">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div id="wz"></div>
        </div>
      </div>
      <div className="toast" id="toast" hidden role="status" aria-live="polite"></div>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
