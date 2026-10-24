/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The index page's markup as React (converted from src/legacy/index/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// What it does is React (HomesFeed, LandingChrome); share.js, shared with other pages, still runs after hydration.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { HomesFeed } from "./HomesFeed";
import { ModeButton, LandingEffects, Goodbye } from "./LandingChrome";

const SCRIPTS: PageScript[] = [
  { src: "app/share.js" },
];

export function IndexBody() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <a href="index.html" className="logo" aria-label="Synapse home">
            {" "}
            <img src="images/brand/mark-black-on-white-tight.jpg" alt="" />
            {" "}
            <span className="logo-word">
              Synapse
            </span>
            {" "}
          </a>
          <nav className="nav-links" aria-label="Page">
            <a href="#product">
              Product
            </a>
            {" "}
            <a href="#pricing">
              Free pilot
            </a>
          </nav>
          <div className="aud" role="group" aria-label="Who Synapse is for">
            <a className="aud-seg on" href="index.html" aria-current="page">
              For agencies
            </a>
            {" "}
            <a className="aud-seg" href="buyers.html">
              For customers
            </a>
          </div>
          <ModeButton />
          <a className="nav-signin" href={"app/signin.html?role=agency&reason=agency&next=agency.html"}>
            Sign in
          </a>
          {" "}
          <a className="btn btn-solid btn-sm nav-cta" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html"}>
            Try free
          </a>
        </div>
      </header>
      <main id="main" tabIndex="-1">
        <section className="hero">
          <div className="wrap">
            <h1 className="h1">
              {"Grow your agency. "}
              <em>
                Not your workload.
              </em>
            </h1>
            <p className="lede">
              Synapse posts your listings, talks to buyers and books viewings, so you only step in to close.
            </p>
            <div className="hero-cta">
              <a className="btn btn-solid" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html"}>
                {"\n          Try free\n          "}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {" "}
              </a>
              {" "}
              <a className="btn btn-ghost" href="#pricing">
                About the free pilot
              </a>
            </div>
          </div>
          <div className="wrap">
            <div className="frame p-hero hero-frame">
              <img className="shot lt" src="images/home/shot-overview-light.webp" width="2000" height="1250" loading="lazy" alt="The Synapse agency portal: an agency's listings with prices and photos, a map of Ibadan, and the chosen listing's details." />
              {" "}
              <img className="shot dk" src="images/home/shot-overview-dark.webp" width="2000" height="1250" loading="lazy" alt="The Synapse agency portal: an agency's listings with prices and photos, a map of Ibadan, and the chosen listing's details." />
            </div>
          </div>
        </section>
        <section className="rail" aria-label="Channels Synapse publishes to">
          <div className="wrap">
            <p>
              One upload, published to
            </p>
            <div className="rail-vp">
              <ul className="rail-list">
                <li data-brand="instagram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                    <circle cx="12" cy="12" r="4.6" />
                    <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
                  </svg>
                  Instagram
                </li>
                <li data-brand="facebook">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.6 21.5V13h2.8l.5-3.3h-3.3V7.6c0-.95.32-1.6 1.7-1.6h1.75V3.05A22 22 0 0 0 15.5 2.9c-2.6 0-4.35 1.6-4.35 4.5V9.7H8.3V13h2.85v8.5z" fill="currentColor" stroke="none" />
                  </svg>
                  Facebook
                </li>
                <li data-brand="tiktok">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.2 3v10.6a3.5 3.5 0 1 1-3-3.46" />
                    <path d="M14.2 3c.35 2.3 1.9 3.9 4.3 4.1" />
                  </svg>
                  TikTok
                </li>
                <li data-brand="telegram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 4.2L2.9 11.3c-.8.3-.8 1 .05 1.3l4.6 1.45 1.75 5.45c.2.6.6.65 1.05.3l2.6-2.1 4.7 3.45c.55.3 1 .1 1.15-.55L21.9 5.2c.2-.85-.3-1.25-.9-1z" />
                    <path d="M7.6 14l10.3-6.6" />
                  </svg>
                  Telegram
                </li>
                <li data-brand="whatsapp">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3.4 20.6l1.25-4.4A8.2 8.2 0 1 1 7.9 19.3z" />
                    <path d="M9 9.1c.25 1.5 1.05 2.8 2.3 3.7 1.05.75 2.2 1 2.9.9.35-.05.6-.35.75-.7l.2-.5-1.85-.95-.6.75c-.85-.4-1.55-1.1-1.95-1.95l.75-.6-.95-1.85-.5.2c-.35.15-.65.4-.7.75z" fill="currentColor" stroke="none" />
                  </svg>
                  WhatsApp
                </li>
                <li data-brand="youtube">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.2" y="5.4" width="19.6" height="13.2" rx="4" />
                    <path d="M10.3 9.4l5 2.6-5 2.6z" fill="currentColor" stroke="none" />
                  </svg>
                  YouTube
                </li>
                <li data-brand="synapse">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="5.4" r="2.1" />
                    <circle cx="5.6" cy="16.4" r="2.1" />
                    <circle cx="18.4" cy="16.4" r="2.1" />
                    <path d="M12 7.5v6.9M10.4 15.2l-3 .6M13.6 15.2l3 .6" />
                  </svg>
                  Synapse
                </li>
              </ul>
              <ul className="rail-list rail-copy" aria-hidden="true">
                <li data-brand="instagram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                    <circle cx="12" cy="12" r="4.6" />
                    <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
                  </svg>
                  Instagram
                </li>
                <li data-brand="facebook">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.6 21.5V13h2.8l.5-3.3h-3.3V7.6c0-.95.32-1.6 1.7-1.6h1.75V3.05A22 22 0 0 0 15.5 2.9c-2.6 0-4.35 1.6-4.35 4.5V9.7H8.3V13h2.85v8.5z" fill="currentColor" stroke="none" />
                  </svg>
                  Facebook
                </li>
                <li data-brand="tiktok">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.2 3v10.6a3.5 3.5 0 1 1-3-3.46" />
                    <path d="M14.2 3c.35 2.3 1.9 3.9 4.3 4.1" />
                  </svg>
                  TikTok
                </li>
                <li data-brand="telegram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 4.2L2.9 11.3c-.8.3-.8 1 .05 1.3l4.6 1.45 1.75 5.45c.2.6.6.65 1.05.3l2.6-2.1 4.7 3.45c.55.3 1 .1 1.15-.55L21.9 5.2c.2-.85-.3-1.25-.9-1z" />
                    <path d="M7.6 14l10.3-6.6" />
                  </svg>
                  Telegram
                </li>
                <li data-brand="whatsapp">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3.4 20.6l1.25-4.4A8.2 8.2 0 1 1 7.9 19.3z" />
                    <path d="M9 9.1c.25 1.5 1.05 2.8 2.3 3.7 1.05.75 2.2 1 2.9.9.35-.05.6-.35.75-.7l.2-.5-1.85-.95-.6.75c-.85-.4-1.55-1.1-1.95-1.95l.75-.6-.95-1.85-.5.2c-.35.15-.65.4-.7.75z" fill="currentColor" stroke="none" />
                  </svg>
                  WhatsApp
                </li>
                <li data-brand="youtube">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.2" y="5.4" width="19.6" height="13.2" rx="4" />
                    <path d="M10.3 9.4l5 2.6-5 2.6z" fill="currentColor" stroke="none" />
                  </svg>
                  YouTube
                </li>
                <li data-brand="synapse">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="5.4" r="2.1" />
                    <circle cx="5.6" cy="16.4" r="2.1" />
                    <circle cx="18.4" cy="16.4" r="2.1" />
                    <path d="M12 7.5v6.9M10.4 15.2l-3 .6M13.6 15.2l3 .6" />
                  </svg>
                  Synapse
                </li>
              </ul>
            </div>
          </div>
        </section>
        <section className="sec reality" id="reality" aria-labelledby="realityTitle">
          <div className="rl-pin" id="rlPin">
            <div className="rl-stage" id="rlStage">
              <div className="rl-rail" id="rlRail">
                <div className="rl-head">
                  <h2 className="h2" id="realityTitle">
                    {"1–3% of enquiries close. "}
                    <em>
                      The other 97% still cost you.
                    </em>
                  </h2>
                  <p className="lede">
                    So you either do all the work yourself or share your fee with other agencies.
                  </p>
                  <p className="rl-hint" aria-hidden="true">
                    Keep scrolling →
                  </p>
                </div>
                <div className="rl-track" id="rlTrack" role="group" aria-roledescription="carousel" aria-label="Four problems">
                  <article className="rl-card" aria-roledescription="slide" aria-label="1 of 4">
                    <div className="rl-art p-crm" aria-hidden="true">
                      <div className="art-dots">
                        <div className="dots">
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i className="live"></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i className="live"></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i className="live"></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                          <i></i>
                        </div>
                        <div className="art-cap">
                          <b>
                            3
                          </b>
                          {" of 100 enquiries"}
                        </div>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Are you working 97 dead ends to reach 3 live ones?
                      </h3>
                      <p>
                        You answer every message by hand, even from people who will never buy.
                      </p>
                    </div>
                  </article>
                  <article className="rl-card" aria-roledescription="slide" aria-label="2 of 4">
                    <div className="rl-art p-tayo" aria-hidden="true">
                      <div className="art-stack">
                        <div className="art-clock">
                          11:48 pm
                        </div>
                        <div className="art-row">
                          <span className="ic">
                            IG
                          </span>
                          <span className="ln">
                            <i></i>
                            <i></i>
                          </span>
                          <span className="tag">
                            Draft
                          </span>
                        </div>
                        <div className="art-row">
                          <span className="ic">
                            FB
                          </span>
                          <span className="ln">
                            <i></i>
                            <i></i>
                          </span>
                          <span className="tag">
                            Draft
                          </span>
                        </div>
                        <div className="art-row">
                          <span className="ic">
                            WA
                          </span>
                          <span className="ln">
                            <i></i>
                            <i></i>
                          </span>
                          <span className="tag">
                            Draft
                          </span>
                        </div>
                        <div className="art-row">
                          <span className="ic">
                            TT
                          </span>
                          <span className="ln">
                            <i></i>
                            <i></i>
                          </span>
                          <span className="tag">
                            Draft
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Are your evenings going on captions?
                      </h3>
                      <p>
                        Posting one listing on every app takes your whole evening.
                      </p>
                    </div>
                  </article>
                  <article className="rl-card" aria-roledescription="slide" aria-label="3 of 4">
                    <div className="rl-art p-reach" aria-hidden="true">
                      <div className="art-fee">
                        <div className="art-fee-t">
                          One property’s fee
                        </div>
                        <div className="art-bar">
                          <span className="you">
                            You
                          </span>
                          <span>
                            Agency 2
                          </span>
                          <span>
                            Agency 3
                          </span>
                          <span>
                            Agency 4
                          </span>
                        </div>
                        <div className="art-fee-s">
                          Reach bought by splitting it four ways
                        </div>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Are you splitting the fee to get reach?
                      </h3>
                      <p>
                        To reach more buyers, you share your fee with other agencies.
                      </p>
                    </div>
                  </article>
                  <article className="rl-card" aria-roledescription="slide" aria-label="4 of 4">
                    <div className="rl-art p-team" aria-hidden="true">
                      <div className="art-queue">
                        <div className="art-who">
                          <span className="av">
                            TA
                          </span>
                          <span>
                            <b>
                              Your best closer
                            </b>
                            <em>
                              On one call
                            </em>
                          </span>
                        </div>
                        <div className="art-q">
                          <span>
                            Counter-offer, 4-bed
                          </span>
                          <span className="w">
                            waiting
                          </span>
                        </div>
                        <div className="art-q">
                          <span>
                            Viewing request
                          </span>
                          <span className="w">
                            waiting
                          </span>
                        </div>
                        <div className="art-q">
                          <span>
                            Price question
                          </span>
                          <span className="w">
                            waiting
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Is your best negotiator one person?
                      </h3>
                      <p>
                        Your best closer can only talk to one buyer at a time.
                      </p>
                    </div>
                  </article>
                </div>
              </div>
              <div className="rl-ctrl">
                <button type="button" className="rl-arrow prev" id="rlPrev" aria-label="Previous problem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <span className="rl-count" id="rlCount" aria-live="polite">
                  1 / 4
                </span>
                <button type="button" className="rl-arrow next" id="rlNext" aria-label="Next problem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="sec intro" aria-labelledby="introTitle">
          <div className="wrap">
            <h2 className="intro-word" id="introTitle">
              Synapse
            </h2>
            <p className="statement">
              {"The posting, chasing and checking you do by hand, "}
              <em>
                done for you.
              </em>
            </p>
          </div>
        </section>
        <section className="sec" id="product">
          <div className="wrap">
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"List it. "}
                  <em>
                    Once, properly.
                  </em>
                </h2>
                <p className="lede">
                  Paste the text you send buyers on WhatsApp and Synapse fills in the listing for you.
                </p>
              </div>
              <div className="frame p-team">
                <img className="shot bleed lt" src="images/home/shot-listings-light.webp" width="1800" height="823" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status and leads." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-listings-dark.webp" width="1800" height="823" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status and leads." />
                <div className="ov ov-fill" aria-hidden="true">
                  <span className="ov-k">Filled from your description</span>
                  <span className="ov-line"><b>Price</b>{"₦4,500,000 a year"}</span>
                  <span className="ov-line"><b>Rooms</b>3 bedrooms, 3 bathrooms</span>
                  <span className="ov-line"><b>Area</b>Old Bodija, Ibadan</span>
                  <span className="ov-tag">Seven verification checks started</span>
                </div>
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Market it. "}
                  <em>
                    One listing, every channel.
                  </em>
                </h2>
                <p className="lede">
                  Upload a listing once and Synapse writes the posts and puts them on every app.
                </p>
              </div>
              <div className="frame p-reach">
                <img className="shot bleed lt" src="images/home/shot-social-light.webp" width="1600" height="907" loading="lazy" alt="The content pipeline in Synapse: listings moving from uploaded to scheduled to published, each post with its channel, its time, and the people who tapped through." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-social-dark.webp" width="1600" height="907" loading="lazy" alt="The content pipeline in Synapse: listings moving from uploaded to scheduled to published, each post with its channel, its time, and the people who tapped through." />
              </div>
            </div>
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"Get found. "}
                  <em>
                    By the buyer standing outside.
                  </em>
                </h2>
                <p className="lede">
                  When a buyer walks past your property, Synapse shows it on their phone.
                </p>
              </div>
              <div className="frame p-nearby">
                <img className="shot bleed lt" src="images/home/shot-nearby-light.webp" width="1600" height="1232" loading="lazy" alt="A listing on Synapse: the house, its price, and a map of what is around it." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-nearby-dark.webp" width="1600" height="1232" loading="lazy" alt="A listing on Synapse: the house, its price, and a map of what is around it." />
                <div className="ping" aria-hidden="true">
                  <span className="ping-icon">
                    <img src="images/brand/mark-black-on-white-tight.jpg" alt="" />
                  </span>
                  {" "}
                  <span className="ping-top">
                    <span>
                      Synapse · Nearby
                    </span>
                    <span>
                      now
                    </span>
                  </span>
                  {" "}
                  <span className="ping-t">
                    {"A 4-bed duplex is 200\u00a0m from you"}
                  </span>
                  {" "}
                  <span className="ping-s">
                    ₦120M · New Bodija. Tap to see it.
                  </span>
                </div>
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Your contacts. "}
                  <em>
                    Every enquiry, already worked.
                  </em>
                </h2>
                <p className="lede">
                  Every buyer reaches you with their budget and what they want already written down.
                </p>
              </div>
              <div className="frame p-crm">
                <img className="shot under lt" src="images/home/shot-crm-light.webp" width="1600" height="1192" loading="lazy" alt="The CRM: leads by stage, each with the channel it came from, the budget, and the next thing to do." />
                {" "}
                <img className="shot under dk" src="images/home/shot-crm-dark.webp" width="1600" height="1192" loading="lazy" alt="The CRM: leads by stage, each with the channel it came from, the budget, and the next thing to do." />
                {" "}
                <img className="phone lt" src="images/home/shot-tayo-light.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone, answering a family looking for a two-bedroom in Ibadan and suggesting two homes." />
                {" "}
                <img className="phone dk" src="images/home/shot-tayo-dark.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone, answering a family looking for a two-bedroom in Ibadan and suggesting two homes." />
              </div>
            </div>
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"Negotiate. "}
                  <em>
                    Then hand it over.
                  </em>
                </h2>
                <p className="lede">
                  Tayo bargains for you, never goes below your lowest price, and hands the buyer to your agent.
                </p>
              </div>
              <div className="frame p-tayo">
                <img className="phone neg lt" src="images/home/shot-tayo-light.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone, talking a buyer through a home and its price." />
                {" "}
                <img className="phone neg dk" src="images/home/shot-tayo-dark.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone, talking a buyer through a home and its price." />
                <div className="ov ov-hand" aria-hidden="true">
                  <span className="ov-top"><span className="ov-icon"><img src="images/brand/mark-black-on-white-tight.jpg" alt="" /></span><span>Synapse · Handover</span><span>now</span></span>
                  <span className="ov-t">{"Ada agreed ₦4,200,000 a year"}</span>
                  <span className="ov-s">{"Tayo opened at ₦4.5M and held above your floor. Her number and a viewing time are yours now."}</span>
                  <span className="ov-btns"><span className="ov-btn solid">Take over</span><span className="ov-btn">Open the chat</span></span>
                </div>
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Inspection. "}
                  <em>
                    Booked, not chased.
                  </em>
                </h2>
                <p className="lede">
                  Buyers book a viewing at a time your agent is free.
                </p>
              </div>
              <div className="frame p-crm">
                <div className="ov ov-cal" aria-hidden="true">
                  <span className="ov-k">Saturday 25 October</span>
                  <span className="ov-slot"><b>10:00</b><span>3-bed flat, Old Bodija<i>Ada O.</i></span><em className="ok">Confirmed</em></span>
                  <span className="ov-slot"><b>11:30</b><span>4-bed duplex, Jericho<i>Tunde A.</i></span><em>Waiting</em></span>
                  <span className="ov-slot"><b>14:00</b><span>Mini flat, Akobo<i>Kemi B.</i></span><em className="ok">Confirmed</em></span>
                  <span className="ov-slot"><b>16:00</b><span>Plot, Ring Road<i>Sola I.</i></span><em className="ok">Confirmed</em></span>
                  <span className="ov-remind">Remind the one who hasn’t confirmed</span>
                </div>
                <div className="ping ov-book" aria-hidden="true">
                  <span className="ping-icon"><img src="images/brand/mark-black-on-white-tight.jpg" alt="" /></span>
                  {" "}
                  <span className="ping-top"><span>Synapse · Inspection</span><span>now</span></span>
                  {" "}
                  <span className="ping-t">New inspection booked</span>
                  {" "}
                  <span className="ping-s">Ada O. · Saturday 10:00 · Old Bodija</span>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"Close, and learn. "}
                  <em>
                    See what sold it.
                  </em>
                </h2>
                <p className="lede">
                  Each sale shows you which post brought the buyer in.
                </p>
              </div>
              <div className="frame p-reach">
                <div className="ov ov-deal" aria-hidden="true">
                  <span className="ov-stamp">Closed</span>
                  <span className="ov-t">3-bed flat, Old Bodija</span>
                  <span className="ov-s">{"₦4,200,000 a year · closed by Bola Ade"}</span>
                  <span className="ov-trail">
                    <span><b>12 Oct</b>Instagram post</span>
                    <span><b>14 Oct</b>Tayo qualified Ada</span>
                    <span><b>18 Oct</b>Inspection</span>
                    <span><b>21 Oct</b>Deal closed</span>
                  </span>
                  <span className="ov-tag">This post has closed 3 deals this month</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="sec vcar" id="vcar" aria-labelledby="vcTitle">
          <div className="vc-pin" id="vcPin">
            <div className="vc-stage" id="vcStage">
              <div className="wrap vc-grid">
                <div className="vc-left">
                  <h2 className="h2" id="vcTitle">
                    {"Built to make small teams "}
                    <em>
                      do big work.
                    </em>
                  </h2>
                  <p className="lede">
                    Every listing and buyer on one screen, with the next step for each.
                  </p>
                  <div className="vc-reel" id="vcReel" role="group" aria-roledescription="carousel" aria-label="Three things Synapse keeps in view">
                    <div className="vc-track" id="vcTrack">
                      <article className="vc-item on" data-i="0" tabIndex="0" role="button" aria-roledescription="slide" aria-label="1 of 3">
                        <h3 className="h3">
                          Nothing gets dropped
                        </h3>
                        <p>
                          Each buyer is ranked, with the next step written down.
                        </p>
                      </article>
                      <article className="vc-item" data-i="1" tabIndex="0" role="button" aria-roledescription="slide" aria-label="2 of 3">
                        <h3 className="h3">
                          Verification, tracked
                        </h3>
                        <p>
                          See which checks each property has passed.
                        </p>
                      </article>
                      <article className="vc-item" data-i="2" tabIndex="0" role="button" aria-roledescription="slide" aria-label="3 of 3">
                        <h3 className="h3">
                          Know what worked
                        </h3>
                        <p>
                          See which posts bring in the money.
                        </p>
                      </article>
                    </div>
                  </div>
                  <div className="vc-ticks" id="vcTicks" aria-hidden="true">
                    <i className="on"></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
                <div className="vc-right">
                  <div className="frame p-team vc-frame">
                    <div className="vc-shot on" data-i="0">
                      <img className="shot lt" src="images/home/shot-crm-light.webp" width="1800" height="823" loading="lazy" alt="The leads board in the portal: every lead ranked, with the next action beside it." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-crm-dark.webp" width="1800" height="823" loading="lazy" alt="The leads board in the portal: every lead ranked, with the next action beside it." />
                    </div>
                    <div className="vc-shot" data-i="1">
                      <img className="shot lt" src="images/home/shot-listings-light.webp" width="1800" height="823" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status, leads, and buttons." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-listings-dark.webp" width="1800" height="823" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status, leads, and buttons." />
                    </div>
                    <div className="vc-shot" data-i="2">
                      <img className="shot lt" src="images/home/shot-social-light.webp" width="1800" height="823" loading="lazy" alt="Posts in the portal, each traced to the deals it produced." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-social-dark.webp" width="1800" height="823" loading="lazy" alt="Posts in the portal, each traced to the deals it produced." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="sec" id="pricing">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="h2">
                {"A free pilot. "}
                <em>
                  Everything open.
                </em>
              </h2>
              <p className="lede">
                Synapse is free while we test it, with no card and no cut of your deals.
              </p>
            </div>
            <div className="pilot irid neon">
              <div className="pilot-k">
                Free pilot
              </div>
              <ul className="pilot-l">
                <li>
                  Unlimited listings during the pilot
                </li>
                <li>
                  Publish once, reach every channel you connect
                </li>
                <li>
                  Tayo answers buyers, negotiates for you and books viewings
                </li>
                <li>
                  Verification, CRM and handoff by WhatsApp and email
                </li>
              </ul>
              <a className="btn btn-solid" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html"}>
                Join the free pilot
              </a>
            </div>
          </div>
        </section>
        <HomesFeed
          end={
            <>
              <a className="btn btn-solid" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html%3Fadd%3D1"}>
                + Add your listing
              </a>
              {" "}
              <a className="btn btn-ghost" href="buyers.html">
                See it as a customer
              </a>
            </>
          }
        >
            <h2 className="h2" id="feedTitle">
              {"Live on Synapse "}
              <em>
                right now.
              </em>
            </h2>
            <p className="lede">
              Real listings from agencies on Synapse, and yours could be here too.
            </p>
        </HomesFeed>
        <section className="end">
          <div className="wrap">
            <div className="frame p-tayo">
              <h2 className="h2">
                {"Put your next listing "}
                <em>
                  to work.
                </em>
              </h2>
              <p className="lede">
                It is free to try today.
              </p>
              <div className="hero-cta">
                <a className="btn btn-solid" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html"}>
                  Try free
                </a>
                {" "}
                <a className="btn btn-ghost" href={"app/signin.html?role=agency&reason=agency&next=agency.html"}>
                  Sign in
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <a href="index.html" className="logo" aria-label="Synapse home">
              {" "}
              <img src="images/brand/mark-black-on-white-tight.jpg" alt="" />
              {" "}
              <span className="logo-word">
                Synapse
              </span>
              {" "}
            </a>
            <p className="foot-tag">
              Synapse by ILIOS Digital helps buyers find homes and agencies find buyers.
            </p>
            <p className="foot-tag">
              The screens on this page show real listings with sample buyers and chats.
            </p>
          </div>
          <div className="foot-links">
            <a href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html%3Fadd%3D1"} className="foot-add">
              + Add a listing
            </a>
            {" "}
            <a href="buyers.html">
              For customers
            </a>
            {" "}
            <a href="#pricing">
              Free pilot
            </a>
            {" "}
            <a href={"app/signin.html?role=agency&reason=agency&next=agency.html"}>
              Sign in
            </a>
            {" "}
            <a href="privacy.html">
              Privacy
            </a>
            {" "}
            <a href="terms.html">
              Terms
            </a>
            {" "}
            <a href="app/signin.html?next=synapse.html">
              Team login
            </a>
            {" "}
            <a href="#" data-cookie-settings="">
              Cookie settings
            </a>
          </div>
        </div>
      </footer>
      <a className="float-cta" href={"app/signin.html?role=agency&mode=up&reason=agency&next=agency.html"}>
        {"\n  Try free\n  "}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {" "}
      </a>
      <style  dangerouslySetInnerHTML={{ __html: inline("index", "inline-4.css") }} />
      <AfterHydration scripts={SCRIPTS} />
      <LandingEffects />
      <Goodbye />
    </>
  );
}
