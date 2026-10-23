/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The agency page's markup as React (converted from src/legacy/agency/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "icons.js" },
  { src: "icon-morph.js", module: true },
  { src: "zyn.js" },
  { src: "auth.js" },
  { src: "ng-places.js" },
  { src: "agency-listings.js" },
  { code: inline("agency", "inline-3.js") },
  { src: "notify.js" },
  { code: inline("agency", "inline-4.js") },
  { code: inline("agency", "inline-6.js") },
  { src: "motion.js" },
  { code: inline("agency", "inline-7.js") },
];

export function AgencyBody() {
  return (
    <>
      <div id="syn-load" aria-hidden="true">
        <img className="syn-load-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" />
      </div>
      <div className="appbar">
        <a className="brand" href="../index.html">
          {" "}
          <img className="syn-mark" src="../images/brand/mark-black-on-white-tight.jpg" alt="" aria-hidden="true" />
          {"\n      Synapse\n    "}
        </a>
        {" "}
        {" "}
        <span className="spacer"></span>
        <div className="topsearch">
          <span className="ts-i" aria-hidden="true">
            ⌕
          </span>
          {" "}
          <input id="ovSearch" placeholder={"Search listings…"} aria-label="Search listings" autoComplete="off" />
        </div>
        <button className="bell setup-ring" id="setupBtn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="setupPop" aria-label="Getting set up" hidden>
          <span className="sr-n" id="setupNum">
            0
          </span>
        </button>
        <button className="bell" id="rmBtn" aria-label="Contact Synapse" aria-haspopup="dialog" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
          </svg>
        </button>
        <button className="bell" id="bellBtn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {" "}
          <span className="bell-badge" id="bellBadge">
            4
          </span>
        </button>
        {" "}
        <span data-auth-slot="" style={{ "display": "none" }}></span>
        {" "}
        <span className="acct-wrap" style={{ "marginRight": "16px" }}>
          <button className="bell" id="acctBtn" type="button" aria-label="Account" aria-haspopup="menu" aria-expanded="false" aria-controls="acctMenu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.5 20.5c0-4 3.3-6.4 7.5-6.4s7.5 2.4 7.5 6.4" />
            </svg>
          </button>
          <div className="acct-menu" id="acctMenu" role="menu" aria-label="Account" hidden>
            <div className="acct-who">
              <span className="acct-av">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M4.5 20.5c0-4 3.3-6.4 7.5-6.4s7.5 2.4 7.5 6.4" />
                </svg>
              </span>
              <div>
                <b id="acctName">
                  Your account
                </b>
                <small id="acctMail"></small>
              </div>
            </div>
            <button className="acct-item" type="button" role="menuitem" data-acct="billing">
              <span data-icon="card"></span>
              {"Plan & billing"}
            </button>
            <a className="acct-item" role="menuitem" href="your-data.html">
              <span data-icon="shield"></span>
              {"Data & privacy"}
            </a>
            {" "}
            <a className="acct-item" role="menuitem" href="../index.html">
              <span data-icon="home"></span>
              Back to the landing page
            </a>
            <div className="acct-sep"></div>
            <button className="acct-item acct-out" type="button" role="menuitem" data-acct="out">
              <span data-icon="user"></span>
              Sign out
            </button>
          </div>
        </span>
      </div>
      <div className="rm-scrim" id="rmScrim"></div>
      <div className="rm" id="rmPanel" role="dialog" aria-label="Contact Synapse">
        <div className="rm-card" id="rmCard" aria-live="polite"></div>
      </div>
      <div className="noti-scrim" id="notiScrim"></div>
      <div className="noti" id="noti" role="dialog" aria-label="Notifications">
        <div className="noti-h">
          <span className="t">
            {"Notifications & reminders"}
          </span>
          <button className="clr" id="notiClear">
            Mark all read
          </button>
        </div>
        <div id="notiList"></div>
      </div>
      <div className="shell">
        <div className="side-dock">
          <aside className="side" id="tabs">
            <div className="grp-sec open" data-sec="main">
              <button className="grp" aria-expanded="true" aria-controls="grp-main">
                <span>
                  Main
                </span>
                <span className="grp-chv" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className="grp-items" id="grp-main">
                <a className="on" data-pane="overview" title="Overview">
                  <span data-icon="grid"></span>
                  <span className="lbl-x">
                    Overview
                  </span>
                </a>
                {" "}
                <a data-pane="crm" title={"CRM · Leads"}>
                  <span data-icon="users"></span>
                  <span className="lbl-x">
                    CRM · Leads
                  </span>
                </a>
                {" "}
                <a data-pane="negotiator" title="Tayo Negotiator">
                  <span data-icon="negotiate"></span>
                  <span className="lbl-x">
                    Tayo Negotiator
                  </span>
                </a>
                {" "}
                <a data-pane="listings" title="Listings">
                  <span data-icon="agency"></span>
                  <span className="lbl-x">
                    Listings
                  </span>
                </a>
              </div>
            </div>
            <div className="grp-sec open" data-sec="growth">
              <button className="grp" aria-expanded="true" aria-controls="grp-growth">
                <span>
                  Growth
                </span>
                <span className="grp-chv" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className="grp-items" id="grp-growth">
                <a data-pane="social" title="Social studio">
                  <span data-icon="share"></span>
                  <span className="lbl-x">
                    Social studio
                  </span>
                </a>
                {" "}
                <a data-pane="marketing" title="Marketing">
                  <span data-icon="chart"></span>
                  <span className="lbl-x">
                    Marketing
                  </span>
                </a>
              </div>
            </div>
            <div className="grp-sec open" data-sec="team">
              <button className="grp" aria-expanded="true" aria-controls="grp-team">
                <span>
                  Team
                </span>
                <span className="grp-chv" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className="grp-items" id="grp-team">
                <a data-pane="agents" title="Agents">
                  <span data-icon="user"></span>
                  <span className="lbl-x">
                    Agents
                  </span>
                </a>
                {" "}
                <a data-pane="tours" title="Tours">
                  <span data-icon="calendar"></span>
                  <span className="lbl-x">
                    Tours
                  </span>
                </a>
                {" "}
                <a data-pane="brand" title="Brand">
                  <span data-icon="spark"></span>
                  <span className="lbl-x">
                    Brand
                  </span>
                </a>
                {" "}
                {" "}
                <a href="#" id="navMyProfile" title="My profile">
                  <span data-icon="user"></span>
                  <span className="lbl-x">
                    My profile
                  </span>
                </a>
              </div>
            </div>
            <div className="grp-sec open" data-sec="account">
              <button className="grp" aria-expanded="true" aria-controls="grp-account">
                <span>
                  Account
                </span>
                <span className="grp-chv" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className="grp-items" id="grp-account">
                <a data-pane="verification" title="Verification">
                  <span data-icon="legal"></span>
                  <span className="lbl-x">
                    Verification
                  </span>
                </a>
                {" "}
                <a data-pane="subscription" title="Subscription">
                  <span data-icon="card"></span>
                  <span className="lbl-x">
                    Subscription
                  </span>
                </a>
                {" "}
                <a data-pane="billing" title="Billing">
                  <span data-icon="costs"></span>
                  <span className="lbl-x">
                    Billing
                  </span>
                </a>
              </div>
            </div>
            <div className="me">
              <div className="who">
                <div className="nm2" data-agency-name="">
                  Your agency
                </div>
                <div className="sub2" data-agency-tier=""></div>
              </div>
            </div>
          </aside>
          <div className="side-hist" role="group" aria-label="Pages you visited">
            <button type="button" id="navBack" aria-label="Back to the previous page" title="Back" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
              {" "}
              <span className="lbl-x">
                Back
              </span>
            </button>
            <button type="button" id="navFwd" aria-label="Forward to the next page" title="Forward" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
              </svg>
              {" "}
              <span className="lbl-x">
                Forward
              </span>
            </button>
          </div>
        </div>
        <button type="button" className="side-toggle" id="sideToggle" aria-controls="tabs" aria-expanded="false" title="Expand the menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M9 4v16" />
          </svg>
          {" "}
          <span className="lbl-x">
            Collapse
          </span>
        </button>
        <div className="content">
          <div className="need-phone" id="needPhone" hidden></div>
          <main>
            <section className="pane on" id="pane-overview">
              <div className="fast-card" id="fastCard" hidden>
                <div className="fc-k">
                  Fast start
                </div>
                <h2 className="fc-t">
                  Your first listing in about two minutes
                </h2>
                <p className="fc-w">
                  Paste what you would send a buyer on WhatsApp: the price, the place, the rooms. Synapse reads it and fills the form for you to check.
                </p>
                <textarea id="fastText" rows="4" placeholder="e.g. 4 bedroom duplex in Bodija, Ibadan. 85m naira, C of O, BQ, 24hr power..." aria-label="Paste your listing text" />
                <div className="fc-row">
                  <button type="button" className="btn btn-primary" id="fastGo">
                    Read it and start
                  </button>
                  <button type="button" className="btn btn-ghost" id="fastBlank">
                    Start from a blank form
                  </button>
                </div>
              </div>
              <div className="next-card" id="nextCard" hidden></div>
              <div className="ov-head">
                <div>
                  <div className="eyebrow" data-agency-eyebrow="">
                    Your agency
                  </div>
                  <div className="h1">
                    Overview
                  </div>
                </div>
                <div className="ov-actions" data-pane-filters="">
                  <button className="btn-ghost" id="ovSort">
                    <span data-icon="sort"></span>
                    {" Sort"}
                  </button>
                  <button className="btn-ghost" id="ovFilter">
                    <span data-icon="filter"></span>
                    {" Filter"}
                  </button>
                </div>
              </div>
              <div className="ov-tabs" data-pane-filters="" id="ovTabs">
                <button className="ovtab on" data-f="all">
                  All
                </button>
                <button className="ovtab" data-f="verified">
                  Verified
                </button>
                <button className="ovtab" data-f="pending">
                  Pending
                </button>
                <button className="ovtab" data-f="expiring">
                  Expiring soon
                </button>
              </div>
              <div className="ov-grid">
                <div className="ov-list" id="ovList"></div>
                <div className="ov-detail" aria-label="Listing detail">
                  <div className="ov-sheet-hd">
                    <button className="ov-sheet-back" id="ovBack" type="button" aria-label="Back to listings">
                      ←
                    </button>
                    <div className="ov-sheet-tt" id="ovSheetTitle"></div>
                  </div>
                  <div className="ov-map" id="ovMap"></div>
                  <div className="card ov-card" id="ovCard"></div>
                </div>
              </div>
            </section>
            <section className="pane" id="pane-crm">
              <div className="eyebrow" data-agency-eyebrow="">
                Your agency
              </div>
              <div className="h1">
                CRM
              </div>
              <div className="crm-tools" data-pane-filters="">
                <div className="crm-tools-l">
                  <div className="seg">
                    <button className="seg-b on" id="crmTableBtn">
                      <span data-icon="card"></span>
                      {" Table"}
                    </button>
                    <button className="seg-b" id="crmTodayBtn">
                      <span data-icon="check"></span>
                      {" Today"}
                    </button>
                    <button className="seg-b" id="crmBoardBtn">
                      <span data-icon="boards"></span>
                      {" Board"}
                    </button>
                  </div>
                  <button className="tbtn" id="crmFilterBtn">
                    <span data-icon="filter"></span>
                    {" Filter"}
                  </button>
                  <button className="tbtn" id="crmSortBtn">
                    <span data-icon="sort"></span>
                    {" Sort"}
                  </button>
                </div>
                <div className="crm-tools-r">
                  <button className="tbtn" id="crmExport">
                    <span data-icon="export"></span>
                    {" Export"}
                  </button>
                  <button className="tbtn primary" id="crmAdd">
                    + Add lead
                  </button>
                </div>
              </div>
              <div className="ob-waiting" id="obWaiting" hidden></div>
              <div className="crm-funnel" id="crmFunnel" data-pane-filters=""></div>
              <div className="card crm-tablecard">
                <table className="crm-table" id="crmTable">
                  <caption className="sr-only">
                    Leads pipeline
                  </caption>
                  <thead id="crmHead"></thead>
                  <tbody id="leads"></tbody>
                </table>
                <div className="crm-pg" id="crmPager"></div>
              </div>
              <div className="card" id="crmToday" hidden style={{ "padding": "18px 20px" }}></div>
              <div className="crm-bulk" id="crmBulk" role="toolbar" aria-label="Bulk actions">
                <span className="bk-n" id="crmBulkN">
                  0 selected
                </span>
                <button data-bulk="assign">
                  Assign
                </button>
                <button data-bulk="message">
                  Message
                </button>
                <button data-bulk="delete" className="dgr">
                  Delete
                </button>
                <button className="bk-x" data-bulk="clear" aria-label="Clear selection">
                  ×
                </button>
              </div>
            </section>
            <section className="pane" id="pane-verification">
              <div className="eyebrow">
                Compliance
              </div>
              <div className="h1">
                Get verified
              </div>
              <p className="sub">
                {"Buyers see a verified badge on every listing you publish.\n             Your documents are private, kept in a closed store, opened only by\n             you and the Synapse verification desk, never shown on your public page."}
              </p>
              <div id="vfBody"></div>
            </section>
            <section className="pane" id="pane-subscription">
              <div className="eyebrow">
                Invest in growth
              </div>
              <div className="h1">
                Plans that pay for themselves
              </div>
              <div className="plan-usage" id="planUsage" hidden></div>
              <div className="ref-card" id="referralCard" hidden></div>
              <a className="bl-link" href="#billing" data-open-billing="">
                {"Billing, payments and add-ons "}
                <span aria-hidden="true">
                  →
                </span>
              </a>
              <div className="pr-table-wrap">
                <div className="pr-compare" id="pricingGrid"></div>
              </div>
              <div className="pr-cards" id="pricingCards"></div>
              <div className="h2" style={{ "marginTop": "40px" }}>
                Grow as you need
              </div>
              <p className="sub">
                Top up a plan without upgrading, one-off or monthly.
              </p>
              <div className="addons-grid" id="addonsGrid"></div>
              <div className="card roi" id="roiSection"></div>
              <div className="da" id="daSection" hidden>
                <div className="h2">
                  Delete agency
                </div>
                <div className="da-card" id="daCard"></div>
              </div>
            </section>
            <section className="pane" id="pane-billing">
              <div className="eyebrow">
                Account
              </div>
              <div className="h1">
                Billing
              </div>
              <div className="pilot-banner">
                <b>
                  Free pilot.
                </b>
                {" Everything is open and nothing is charged while the pilot runs. This page stays so you can see how billing will work."}
              </div>
              <p className="sub">
                Your plan, what you have paid, and extras. Payments go through Paystack to ILIOS Digital, the company behind Synapse. Card details never touch Synapse.
              </p>
              <div className="bl-grid">
                <div className="card bl-now" id="blNow">
                  <div className="bl-k">
                    Your plan
                  </div>
                  <div className="bl-state">
                    Loading…
                  </div>
                </div>
                <div className="card bl-buy" id="blBuy"></div>
              </div>
              <div className="h2 bl-h2" id="blAddonsHead">
                Add-ons
              </div>
              <p className="sub">
                Top up without changing plan. A listing pack works the moment you pay. Boosts and the verification fast-track are done by our team, who contact you to set them up.
              </p>
              <div className="addons-grid bl-addons" id="blAddons"></div>
              <div className="h2 bl-h2">
                Payments
              </div>
              <div className="card bl-hist" id="blHist"></div>
              <p className="bl-foot">
                {"Paystack emails a receipt to whoever paid. A question about a payment? "}
                <a href="#" data-bl-talk="">
                  Talk to us
                </a>
                .
              </p>
            </section>
            <section className="pane" id="pane-social">
              <div style={{ "display": "flex", "alignItems": "flex-end", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap" }}>
                <div>
                  <div className="eyebrow">
                    {"Syndication & posting"}
                  </div>
                  <div className="h1">
                    Social studio
                  </div>
                  <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                    Every verified listing becomes content, captioned by AI, posted on schedule, everywhere at once.
                  </p>
                </div>
                <button className="btn btn-primary" id="newPostBtn" style={{ "padding": "11px 18px", "fontSize": "13.5px" }}>
                  <span data-icon="spark"></span>
                  {" New post"}
                </button>
              </div>
              <div id="react-autoreply"></div>
              <div className="card cmp-gen" id="cmpGenPanel">
                <div className="cmp-head">
                  <div>
                    <div className="h2" title="Each version is checked against that platform's limits before it can be queued.">
                      Generate a campaign
                    </div>
                  </div>
                  <button type="button" className="cmp-min" id="cmpMin" aria-controls="cmpGenPanel">
                    <span className="lbl">
                      Minimise
                    </span>
                    {" "}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 15l6-6 6 6" />
                    </svg>
                  </button>
                </div>
                <div className="cmp-controls">
                  <select id="cmpProp" aria-label="Listing">
                  </select>
                  <button className="btn btn-primary" id="cmpGo" style={{ "padding": "11px 18px", "fontSize": "13.5px" }}>
                    <span data-icon="spark"></span>
                    {" Generate"}
                  </button>
                </div>
                <div className="cmp-pick" id="cmpPick" role="group" aria-label="Channels to write for and post to"></div>
                <div className="cmp-channels" id="cmpChannels" aria-live="polite"></div>
                <div className="cmp-out" id="cmpOut" hidden></div>
                <div className="cmp-past" id="cmpPast"></div>
              </div>
              <div className="s-work-hd">
                <div>
                  <div className="h2">
                    Content pipeline
                  </div>
                </div>
                <div className="seg" id="socialView" data-pane-filters="">
                  <button className="seg-b on" data-sv="pipeline">
                    <span data-icon="boards"></span>
                    {" Pipeline"}
                  </button>
                  <button className="seg-b" data-sv="calendar">
                    <span data-icon="calendar"></span>
                    {" Calendar"}
                  </button>
                </div>
              </div>
              <div className="pipeline" id="pipeline"></div>
              <div className="s-cal" id="calendar" style={{ "display": "none" }}></div>
            </section>
            <section className="pane" id="pane-marketing">
              <div style={{ "display": "flex", "alignItems": "flex-end", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap" }}>
                <div>
                  <div className="eyebrow">
                    What your posts did
                  </div>
                  <div className="h1">
                    Marketing
                  </div>
                  <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                    What each listing earned once it went out, taps, listings opened, enquiries. Counted from your own links, not estimated.
                  </p>
                </div>
                <button className="btn btn-primary" id="newCampBtn">
                  + New campaign
                </button>
              </div>
              <div className="crm-tools" data-pane-filters="" style={{ "marginTop": "18px" }}>
                <div className="crm-tools-l">
                  <div className="seg" id="mkView">
                    <button className="seg-b on" data-mv="board">
                      <span data-icon="chart"></span>
                      {" Leaderboard"}
                    </button>
                    <button className="seg-b" data-mv="campaigns">
                      <span data-icon="card"></span>
                      {" Campaigns"}
                    </button>
                  </div>
                  <button className="tbtn" id="mkSort">
                    <span data-icon="sliders"></span>
                    {" Sort: Enquiries"}
                  </button>
                </div>
              </div>
              <div id="mkDigest"></div>
              <div id="mkBoard"></div>
              <div id="campaigns" style={{ "display": "none" }}></div>
            </section>
            <section className="pane" id="pane-negotiator">
              <div className="eyebrow">
                Every lead sells itself first
              </div>
              <div className="h1">
                Tayo Negotiator
              </div>
              <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                Every lead, from any channel, is qualified, pitched and pre-negotiated by Tayo before it reaches a human. You inherit warm, ready buyers.
              </p>
              <div className="h2" style={{ "marginTop": "22px" }}>
                Ready for handoff
              </div>
              <div className="crm-tools" data-pane-filters="">
                <div className="crm-tools-l">
                  <div className="seg" id="handoffFilter">
                    <button className="seg-b on" data-hf="all">
                      All
                    </button>
                    <button className="seg-b" data-hf="High intent">
                      High intent
                    </button>
                    <button className="seg-b" data-hf="Worth a call">
                      Worth a call
                    </button>
                    <button className="seg-b" data-hf="Early">
                      Early
                    </button>
                  </div>
                </div>
              </div>
              <div id="handoffs"></div>
            </section>
            <section className="pane" id="pane-tours">
              <div className="eyebrow" data-agency-eyebrow="">
                Your team
              </div>
              <div className="h1">
                Tours
              </div>
              <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                One trip, several buyers. Tayo only ever offers times your agents have already cleared.
              </p>
              <div className="crm-tools" data-pane-filters="" style={{ "marginTop": "18px" }}>
                <div className="crm-tools-l">
                  <div className="seg" id="tourFilter">
                    <button className="seg-b on" data-tf="all">
                      All
                    </button>
                    <button className="seg-b" data-tf="open">
                      Needs confirming
                    </button>
                    <button className="seg-b" data-tf="confirmed">
                      Confirmed
                    </button>
                    <button className="seg-b" data-tf="cancelled">
                      Cancelled
                    </button>
                  </div>
                </div>
              </div>
              <div id="toursList">
                <p className="muted" style={{ "fontSize": "13px" }}>
                  Loading…
                </p>
              </div>
            </section>
            <section className="pane" id="pane-listings">
              <div className="eyebrow">
                Inventory
              </div>
              <div className="h1">
                Listings
              </div>
              <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                Expired listings are hidden from buyers until you re-list.
              </p>
              <div className="pane-search">
                <span className="ps-i" data-icon="search" aria-hidden="true"></span>
                {" "}
                <input className="lsearch" id="listSearch" type="search" placeholder={"Search listings…"} aria-label="Search listings" autoComplete="off" />
              </div>
              <div className="crm-tools" data-pane-filters="" style={{ "marginTop": "18px" }}>
                <div className="crm-tools-l">
                  <div className="seg" id="listSeg">
                    <button className="seg-b on" data-lf="all">
                      All
                    </button>
                    <button className="seg-b" data-lf="verified">
                      Verified
                    </button>
                    <button className="seg-b" data-lf="pending">
                      Pending
                    </button>
                    <button className="seg-b" data-lf="expiring">
                      Expiring
                    </button>
                    <button className="seg-b" data-lf="expired">
                      Expired
                    </button>
                  </div>
                  <button className="tbtn" id="listSort">
                    <span data-icon="sort"></span>
                    {" Sort: Freshness"}
                  </button>
                </div>
                <div className="crm-tools-r">
                  <button className="tbtn" id="relistAllBtn" hidden></button>
                  <button className="tbtn primary" id="newListingBtn">
                    + New listing
                  </button>
                </div>
              </div>
              <div className="lg-gate" id="lgGate" hidden>
                <div className="lg-gate-t">
                  Add your CAC certificate to start listing
                </div>
                <p>
                  One document is enough to begin. Upload it now and add listings straight away; the verification desk reviews it afterwards.
                </p>
                <input id="lgCac" placeholder="CAC registration number, e.g. RC 1234567" autoComplete="off" aria-label="CAC registration number" style={{ "display": "block", "width": "100%", "maxWidth": "340px", "minHeight": "44px", "margin": "0 0 10px", "padding": "0 14px", "borderRadius": "12px", "border": "1px solid var(--border)", "background": "var(--surface)", "color": "var(--ink)", "font": "500 14px var(--f-sans)" }} />
                <button type="button" className="btn btn-primary" id="lgGateBtn">
                  Upload CAC certificate
                </button>
                <span className="lg-gate-agent" id="lgGateAgent" hidden>
                  Ask your agency owner to upload it.
                </span>
              </div>
              <div className="lgrid" id="lgrid"></div>
            </section>
            <section className="pane" id="pane-agents">
              <div style={{ "display": "flex", "alignItems": "flex-end", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap" }}>
                <div>
                  <div className="eyebrow" data-agency-eyebrow="">
                    Your team
                  </div>
                  <div className="h1">
                    Agents
                  </div>
                  <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                    Who's on the floor, and how they're performing.
                  </p>
                </div>
                <button className="btn btn-primary" id="inviteAgentBtn">
                  + Invite agent
                </button>
              </div>
              <div className="crm-tools" data-pane-filters="">
                <div className="crm-tools-l">
                  <div className="seg" id="agentSort">
                    <button className="seg-b on" data-as="name">
                      Name
                    </button>
                    <button className="seg-b" data-as="leads">
                      Open leads
                    </button>
                  </div>
                </div>
              </div>
              <div className="agrid" id="agrid"></div>
            </section>
            <section className="pane" id="pane-brand">
              <div style={{ "display": "flex", "alignItems": "flex-end", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap" }}>
                <div>
                  <div className="eyebrow">
                    Your identity
                  </div>
                  <div className="h1">
                    Brand
                  </div>
                  <p className="muted" style={{ "fontSize": "14px", "marginTop": "4px" }}>
                    Your logo, colours, voice and links. Tayo uses these when it writes and designs anything on your behalf.
                  </p>
                </div>
                <div className="bk-actions">
                  <button className="btn btn-primary" id="brandEdit" type="button">
                    Edit brand
                  </button>
                  <button className="btn" id="brandCancel" type="button" hidden>
                    Cancel
                  </button>
                  <button className="btn btn-primary" id="brandSave" hidden>
                    Save brand
                  </button>
                </div>
              </div>
              <div className="card brand-onboard" id="brandOnboard" hidden>
                <div className="bo-head">
                  <div>
                    <div className="eyebrow">
                      Getting set up
                    </div>
                    <div className="h2" style={{ "margin": "2px 0 0" }}>
                      Let’s set up your brand
                    </div>
                    <p className="muted" style={{ "fontSize": "13.5px", "marginTop": "4px" }}>
                      Tayo writes captions, replies and ad creative for you. These details are what make that output sound like your agency instead of a generic listing site. It takes about two minutes, and you can change any of it later.
                    </p>
                  </div>
                  <button className="btn btn-ghost" id="brandSkip" type="button">
                    Skip for now
                  </button>
                </div>
                <ol className="bo-steps" id="brandSteps"></ol>
              </div>
              <div id="brandGate" className="noti-empty" style={{ "marginTop": "20px" }} hidden></div>
              <div id="brandView" style={{ "marginTop": "20px" }}></div>
              <div id="brandForm" style={{ "marginTop": "20px" }} hidden>
                <div className="card brand-hero">
                  <div className="bh-label">
                    How Tayo introduces you
                  </div>
                  <div className="brand-preview" id="bkPreview" aria-live="polite"></div>
                </div>
                <div className="two" style={{ "marginTop": "16px", "alignItems": "start" }}>
                  <div className="card" style={{ "padding": "20px 22px" }}>
                    <div className="h2" style={{ "margin": "0 0 4px" }}>
                      Identity
                    </div>
                    <p className="sub" style={{ "marginBottom": "14px" }}>
                      How you are named and described.
                    </p>
                    <div className="field">
                      <label htmlFor="bkName">
                        Agency name
                      </label>
                      <input id="bkName" placeholder="Your registered trading name" />
                    </div>
                    <div className="field">
                      <label htmlFor="bkTagline">
                        Tagline
                      </label>
                      <input id="bkTagline" placeholder="One line, what you want to be known for" />
                    </div>
                    <div className="field">
                      <label htmlFor="bkDesc">
                        About
                      </label>
                      <textarea id="bkDesc" rows="4" placeholder="A short description buyers will read on your listings" />
                    </div>
                    <div className="field amen" id="bkSpecHost">
                      <label htmlFor="bkSpecIn">
                        Specialties
                      </label>
                      <div className="amen-box" id="bkSpecBox">
                        <input id="bkSpecIn" className="amen-in" type="text" role="combobox" aria-expanded="false" aria-controls="bkSpecMenu" aria-autocomplete="list" autoComplete="off" placeholder={"Choose or type a specialty…"} />
                      </div>
                      <div className="amen-menu" id="bkSpecMenu" role="listbox" aria-label="Specialties"></div>
                      <input type="hidden" id="bkSpecialties" />
                    </div>
                  </div>
                  <div className="card" style={{ "padding": "20px 22px" }}>
                    <div className="h2" style={{ "margin": "0 0 4px" }}>
                      Look
                    </div>
                    <p className="sub" style={{ "marginBottom": "14px" }}>
                      Used on your creatives and your public agency page.
                    </p>
                    <div className="look-logos">
                      <div className="logo-tile light">
                        <div className="lt-preview" id="bkLogoPrevLight">
                          <span className="lt-empty">
                            No logo yet
                          </span>
                        </div>
                        <label>
                          Logo
                        </label>
                        {" "}
                        <input id="bkLogo" type="hidden" />
                        {" "}
                        <input id="bkLogoFile" className="lt-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
                        <div className="lt-acts">
                          <button type="button" className="lt-btn" data-upload="light">
                            Upload
                          </button>
                          <button type="button" className="lt-btn lt-rm" data-clear="light" hidden>
                            Remove
                          </button>
                        </div>
                        <div className="lt-note" id="bkLogoNote">
                          PNG, JPG, WEBP or SVG · up to 2MB
                        </div>
                      </div>
                      <div className="logo-tile dark">
                        <div className="lt-preview" id="bkLogoPrevDark">
                          <span className="lt-empty" style={{ "color": "rgba(255,255,255,0.4)" }}>
                            No logo yet
                          </span>
                        </div>
                        <label>
                          Dark background
                        </label>
                        {" "}
                        <input id="bkLogoDark" type="hidden" />
                        {" "}
                        <input id="bkLogoDarkFile" className="lt-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
                        <div className="lt-acts">
                          <button type="button" className="lt-btn" data-upload="dark">
                            Upload
                          </button>
                          <button type="button" className="lt-btn lt-rm" data-clear="dark" hidden>
                            Remove
                          </button>
                        </div>
                        <div className="lt-note" id="bkLogoDarkNote">
                          Optional, for dark creatives
                        </div>
                      </div>
                    </div>
                    <div className="swatch-row">
                      <div className="swatch-card">
                        <input id="bkColor" type="color" aria-label="Primary brand colour" defaultValue="#121212" />
                        <div className="sw-info">
                          <span className="sw-name">
                            Primary
                          </span>
                          <span className="sw-hex" id="bkColorHex">
                            Not set
                          </span>
                        </div>
                        <div className="sw-presets" data-for="bkColor"></div>
                      </div>
                      <div className="swatch-card">
                        <input id="bkColor2" type="color" aria-label="Secondary brand colour" defaultValue="#c76a1a" />
                        <div className="sw-info">
                          <span className="sw-name">
                            Secondary
                          </span>
                          <span className="sw-hex" id="bkColor2Hex">
                            Not set
                          </span>
                        </div>
                        <div className="sw-presets" data-for="bkColor2"></div>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="bkFont">
                        Typeface
                      </label>
                      <input id="bkFont" placeholder="e.g. Josefin Sans" />
                    </div>
                    <div className="type-specimen" id="bkSpecimen">
                      <div className="ts-name" id="bkSpecimenName">
                        Default
                      </div>
                      <div className="ts-glyphs" id="bkSpecimenGlyphs">
                        Aa
                      </div>
                      <div className="ts-sample" id="bkSpecimenSample">
                        Your agency name in this typeface
                      </div>
                    </div>
                  </div>
                </div>
                <div className="two" style={{ "marginTop": "16px", "alignItems": "start" }}>
                  <div className="card" style={{ "padding": "20px 22px" }}>
                    <div className="h2" style={{ "margin": "0 0 4px" }}>
                      Voice
                    </div>
                    <p className="sub" style={{ "marginBottom": "14px" }}>
                      Tayo writes captions and replies in this tone. Be specific, “warm and plain-spoken, never salesy” beats “professional”.
                    </p>
                    <div className="field">
                      <label htmlFor="bkVoice">
                        How you sound
                      </label>
                      <textarea id="bkVoice" rows="3" placeholder="Describe the voice you want in your own words" />
                    </div>
                  </div>
                  <div className="card" style={{ "padding": "20px 22px" }}>
                    <div className="h2" style={{ "margin": "0 0 4px" }}>
                      Reach
                    </div>
                    <p className="sub" style={{ "marginBottom": "14px" }}>
                      Where buyers find you. Handles here label your posts; connecting an account for publishing is done in Social.
                    </p>
                    <div className="field">
                      <label htmlFor="bkCac">
                        CAC registration number
                      </label>
                      <input id="bkCac" placeholder="RC 1234567" autoComplete="off" />
                      <span className="bk-hint" style={{ "fontSize": "12px", "opacity": ".7" }}>
                        Shown to buyers on your property cards so they can check you at the CAC registry.
                      </span>
                    </div>
                    <div className="field">
                      <label htmlFor="bkWhatsapp">
                        WhatsApp number
                      </label>
                      <input id="bkWhatsapp" placeholder={"+234…"} />
                    </div>
                    <div className="field">
                      <label htmlFor="bkInstagram">
                        Instagram handle
                      </label>
                      <input id="bkInstagram" placeholder="@youragency" />
                    </div>
                    <div className="field">
                      <label htmlFor="bkWebsite">
                        Website
                      </label>
                      <input id="bkWebsite" placeholder={"https://…"} />
                    </div>
                    <div className="field">
                      <label htmlFor="bkCity">
                        City
                      </label>
                      <input id="bkCity" placeholder="Lagos" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <div className="agd-scrim" id="agdScrim"></div>
      <div className="agd-bar" id="agdBar">
        <div className="agd agd-nav" id="agdNav">
          <div className="agd-sheet" id="agdNavSheet" role="menu" aria-label="Portal navigation"></div>
          <button className="agd-btn" id="agdNavFab" type="button" aria-expanded="false" aria-label="Open navigation">
            <span data-icon="grid"></span>
          </button>
        </div>
        <span className="agd-div" aria-hidden="true"></span>
        <div className="agd agd-filter" id="agdFilter" hidden>
          <div className="agd-sheet" id="agdFilterSheet" role="menu" aria-label="Filter and sort"></div>
          <button className="agd-btn" id="agdFilterFab" type="button" aria-expanded="false" aria-label="Filter and sort">
            <span data-icon="filter"></span>
          </button>
        </div>
        <span className="agd-div" aria-hidden="true"></span>
        <div className="agd agd-add" id="agdAdd">
          <div className="agd-sheet" id="agdAddSheet" role="menu" aria-label="Create"></div>
          <button className="agd-btn agd-btn-primary" id="agdAddFab" type="button" aria-expanded="false" aria-label="Create">
            <span data-icon="plus"></span>
          </button>
        </div>
      </div>
      <div className="toast" id="toast"></div>
      <div className="pprev-scrim" id="pprevScrim">
        <div className="pprev" id="pprevModal" role="dialog" aria-label="Property preview"></div>
      </div>
      <button className="toju-fab" id="tojuFab" aria-label="Ask Tayo">
        <img className="zyn zm-bob" src="../images/zyn/zyn-happy.webp" width="92" height="92" alt="" aria-hidden="true" draggable="false" />
      </button>
      <div className="tpanel-scrim" id="tpScrim"></div>
      <aside className="tpanel" id="tpanel" aria-label="Ask Tayo">
        <div className="thd">
          <img className="zyn zm-bob o-zyn" id="tpZyn" src="../images/zyn/zyn-waving.webp" width="58" height="58" alt="" aria-hidden="true" />
          <div>
            <div className="tt" id="tpTitle">
              Ask Tayo
            </div>
            <div className="sb" id="tpSub"></div>
          </div>
          <button className="x" id="tpClose" aria-label="Close">
            ×
          </button>
        </div>
        <div className="tp-scroll" id="tpScroll">
          <div className="tbody" id="tpBody"></div>
          <div className="tp-thread" id="tpThread"></div>
          <div className="tp-chips" id="tpChips"></div>
        </div>
        <div className="tp-ask">
          <form className="tp-composer" id="tpForm">
            <input id="tpInput" type="text" autoComplete="off" placeholder={"Ask about your numbers, or how to do something…"} aria-label="Ask the advisor" />
            <button type="submit" id="tpSend" aria-label="Send">
              ↑
            </button>
          </form>
        </div>
      </aside>
      <div className="scrim" id="scrim"></div>
      <aside className="drawer" id="drawer"></aside>
      <div className="setup-pop" id="setupPop" role="dialog" aria-label="Getting set up" hidden></div>
      <div className="modal-scrim" id="cmpScrim"></div>
      <div className="modal" id="cmpModal"></div>
      <style  dangerouslySetInnerHTML={{ __html: inline("agency", "inline-5.css") }} />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
