/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The agency page's markup as React (converted from src/legacy/agency/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { AccountMenu, AuthGate, NeedPhone } from "./AgencyAccount";
import { BellButton, BellPanel } from "./Bell";
import { RmButton, RmPanel } from "./ContactSynapse";
import { BrandPage } from "./BrandPage";
import { ProfileDrawer } from "./ProfileDrawer";
import { TaskCard } from "./TaskCard";
import { SetupButton, SetupPop } from "./SetupRing";
import { AdvisorFab, AdvisorPanel } from "./AdvisorPanel";
import { VerificationPane } from "./VerificationPane";
import { ToursPane } from "./ToursPane";
import { BillingPane } from "./BillingPane";
import { SubscriptionPane, PlanGate, FreeAccess } from "./SubscriptionPane";
import { NegotiatorPane } from "./NegotiatorPane";
import { SideDrawer } from "./SideDrawer";
import { AgentsPane } from "./AgentsPane";

const SCRIPTS: PageScript[] = [
  { src: "icons.js" },
  { src: "icon-morph.js", module: true },
  { src: "zyn.js" },
  { src: "auth.js" },
  { src: "ng-places.js" },
  { src: "agency-listings.js" },
  { code: inline("agency", "inline-3.js") },
  { src: "notify.js" },
  { src: "motion.js" },
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
        <SetupButton />
        <RmButton />
        <BellButton />
        {" "}
        <span data-auth-slot="" style={{ "display": "none" }}></span>
        {" "}
        <AccountMenu />
      </div>
      <RmPanel />
      <BellPanel />
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
          <NeedPhone />
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
              <VerificationPane />
            </section>
            <section className="pane" id="pane-subscription">
              <SubscriptionPane />
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
              <BillingPane />
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
              <NegotiatorPane />
            </section>
            <section className="pane" id="pane-tours">
              <ToursPane />
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
              <AgentsPane />
            </section>
            <section className="pane" id="pane-brand">
              <BrandPage />
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
      <AdvisorFab />
      <AdvisorPanel />
      <div className="scrim" id="scrim"></div>
      <aside className="drawer" id="drawer"></aside>
      <ProfileDrawer />
      <SideDrawer />
      <TaskCard />
      <PlanGate />
      <FreeAccess />
      <SetupPop />
      <div className="modal-scrim" id="cmpScrim"></div>
      <div className="modal" id="cmpModal"></div>
      <style  dangerouslySetInnerHTML={{ __html: inline("agency", "inline-5.css") }} />
      <AfterHydration scripts={SCRIPTS} />
      <AuthGate />
    </>
  );
}
