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
import { PipelineBoard, PipelineCalendar, PipelineSelect } from "./PipelinePane";
import { PropPreview } from "./PropPreview";
import { SchedulerHost } from "./Scheduler";
import { MkDigest, MkBoard, MkCampaigns, MkSort, MarketingHost } from "./MarketingPane";
import { ListSeg, ListSort, RelistAll, ListingGate, ListingsGrid } from "./ListingsPane";
import { ShareKitHost } from "./ShareKit";
import { ComposerHost } from "./PostComposer";
import { ListingFormHost } from "./ListingForm";
import { OverviewGrid } from "./OverviewPane";
import { CrmPane } from "./CrmPane";
import { Dock, HistButtons, Pane, PortalNavHost, Rail, SideToggle } from "./PortalNav";

const SCRIPTS: PageScript[] = [
  { shared: "icons" },
  { shared: "icon-morph", module: true },
  { shared: "zyn" },
  { shared: "auth" },
  { shared: "ng-places" },
  { shared: "agency-listings" },
  { code: inline("agency", "inline-3.js") },
  { shared: "notify" },
  { shared: "motion" },
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
          <Rail profileLink={<>{" "}{" "}<a href="#" id="navMyProfile" title="My profile">
                  <span data-icon="user"></span>
                  <span className="lbl-x">
                    My profile
                  </span>
                </a></>}>
            <div className="me">
              <div className="who">
                <div className="nm2" data-agency-name="">
                  Your agency
                </div>
                <div className="sub2" data-agency-tier=""></div>
              </div>
            </div>
          </Rail>
          <HistButtons />
        </div>
        <SideToggle />
        <div className="content">
          <NeedPhone />
          <main>
            <Pane id="overview">
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
              <OverviewGrid />
            </Pane>
            <Pane id="crm">
              <CrmPane />
            </Pane>
            <Pane id="verification">
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
            </Pane>
            <Pane id="subscription">
              <SubscriptionPane />
            </Pane>
            <Pane id="billing">
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
            </Pane>
            <Pane id="social">
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
                <PipelineSelect />
              </div>
              <PipelineBoard />
              <PipelineCalendar />
            </Pane>
            <Pane id="marketing">
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
                  <MkSort />
                </div>
              </div>
              <MkDigest />
              <MkBoard />
              <MkCampaigns />
              <MarketingHost />
            </Pane>
            <Pane id="negotiator">
              <NegotiatorPane />
            </Pane>
            <Pane id="tours">
              <ToursPane />
            </Pane>
            <Pane id="listings">
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
                  <ListSeg />
                  <ListSort />
                </div>
                <div className="crm-tools-r">
                  <RelistAll />
                  <button className="tbtn primary" id="newListingBtn">
                    + New listing
                  </button>
                </div>
              </div>
              <ListingGate />
              <ListingsGrid />
            </Pane>
            <Pane id="agents">
              <AgentsPane />
            </Pane>
            <Pane id="brand">
              <BrandPage />
            </Pane>
          </main>
        </div>
      </div>
      <Dock />
      <PortalNavHost />
      <div className="toast" id="toast"></div>
      <PropPreview />
      <SchedulerHost /><ShareKitHost />
      <AdvisorFab />
      <AdvisorPanel />
      <div className="scrim" id="scrim"></div>
      <aside className="drawer" id="drawer"></aside>
      <ProfileDrawer />
      <ListingFormHost />
      <SideDrawer />
      <TaskCard />
      <PlanGate />
      <FreeAccess />
      <SetupPop />
      <ComposerHost />
      <style  dangerouslySetInnerHTML={{ __html: inline("agency", "inline-5.css") }} />
      <AfterHydration scripts={SCRIPTS} />
      <AuthGate />
    </>
  );
}
