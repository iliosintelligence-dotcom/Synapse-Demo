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
              {"Your whole sales funnel. "}
              <em>
                One app.
              </em>
            </h1>
            <p className="lede">
              Marketing, buyers, contacts, negotiation and inspection: every step of selling a property, run in one place. You step in to close.
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
        <section className="sec vcar funnel" id="vcar" aria-labelledby="vcTitle">
          <div className="vc-pin" id="vcPin">
            <div className="vc-stage" id="vcStage">
              <div className="wrap vc-grid">
                <div className="vc-left">
                  <h2 className="h2" id="vcTitle">
                    {"How a property sells "}
                    <em>
                      on Synapse.
                    </em>
                  </h2>
                  <p className="lede">
                    One funnel, from the first post to the signed offer. Synapse runs each stage, and you step in where it counts.
                  </p>
                  <div className="vc-reel" id="vcReel" role="group" aria-roledescription="carousel" aria-label="The 8 stages of a sale">
                    <div className="vc-track" id="vcTrack">
                      <article className="vc-item on" data-i="0" tabIndex="0" role="button" aria-roledescription="slide" aria-label="1 of 8">
                        <span className="vc-n">01</span>
                        <h3 className="h3">
                          List it
                        </h3>
                        <p>
                          Upload once. Paste the text you already send buyers and Synapse fills in the listing; the seven verification checks start on their own.
                        </p>
                      </article>
                      <article className="vc-item" data-i="1" tabIndex="0" role="button" aria-roledescription="slide" aria-label="2 of 8">
                        <span className="vc-n">02</span>
                        <h3 className="h3">
                          Market it
                        </h3>
                        <p>
                          Synapse writes the posts in your agency’s voice and schedules them across the channels you connect. Every post carries its own link, so you know which one brought the buyer.
                        </p>
                      </article>
                      <article className="vc-item" data-i="2" tabIndex="0" role="button" aria-roledescription="slide" aria-label="3 of 8">
                        <span className="vc-n">03</span>
                        <h3 className="h3">
                          Get found
                        </h3>
                        <p>
                          Buyers find it on the Synapse marketplace, and Tayo puts it in front of the ones whose brief it fits.
                        </p>
                      </article>
                      <article className="vc-item" data-i="3" tabIndex="0" role="button" aria-roledescription="slide" aria-label="4 of 8">
                        <span className="vc-n">04</span>
                        <h3 className="h3">
                          Qualify
                        </h3>
                        <p>
                          Tayo answers every enquiry, day or night, and learns the budget, the area and the move-in date. Only buyers who are serious move on.
                        </p>
                      </article>
                      <article className="vc-item" data-i="4" tabIndex="0" role="button" aria-roledescription="slide" aria-label="5 of 8">
                        <span className="vc-n">05</span>
                        <h3 className="h3">
                          Your contacts
                        </h3>
                        <p>
                          Every lead lands in your CRM with where it came from, the budget and the brief. Hand it to an agent; nothing is sent until somebody presses send.
                        </p>
                      </article>
                      <article className="vc-item" data-i="5" tabIndex="0" role="button" aria-roledescription="slide" aria-label="6 of 8">
                        <span className="vc-n">06</span>
                        <h3 className="h3">
                          Negotiate
                        </h3>
                        <p>
                          Tayo opens at your asking price and never goes below the floor you set. Take over the conversation the moment you want to.
                        </p>
                      </article>
                      <article className="vc-item" data-i="6" tabIndex="0" role="button" aria-roledescription="slide" aria-label="7 of 8">
                        <span className="vc-n">07</span>
                        <h3 className="h3">
                          Inspection
                        </h3>
                        <p>
                          Buyers book a viewing straight from the listing. You see who is coming, and remind anyone who has not confirmed.
                        </p>
                      </article>
                      <article className="vc-item" data-i="7" tabIndex="0" role="button" aria-roledescription="slide" aria-label="8 of 8">
                        <span className="vc-n">08</span>
                        <h3 className="h3">
                          Close, and learn
                        </h3>
                        <p>
                          Every closed deal is traced back to the post that started it, so next month you spend on what actually sells.
                        </p>
                      </article>
                    </div>
                  </div>
                  <div className="vc-ticks" id="vcTicks" aria-hidden="true">
                    <i className="on"></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
                <div className="vc-right">
                  <div className="frame p-team vc-frame">
                    <div className="vc-shot on" data-i="0">
                      <img className="shot lt" src="images/home/shot-listings-light.webp" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status and leads." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-listings-dark.webp" loading="lazy" alt="Listings in the portal: each home with its price, days left, review status and leads." />
                    </div>
                    <div className="vc-shot" data-i="1">
                      <img className="shot lt" src="images/home/shot-social-light.webp" loading="lazy" alt="The content pipeline in Synapse: posts moving from drafted to scheduled to published, each with its channel and the people who tapped through." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-social-dark.webp" loading="lazy" alt="The content pipeline in Synapse: posts moving from drafted to scheduled to published, each with its channel and the people who tapped through." />
                    </div>
                    <div className="vc-shot" data-i="2">
                      <img className="shot lt" src="images/home/shot-matches-light.webp" loading="lazy" alt="Tayo's matches for a buyer: homes that fit the brief, each with its price and area." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-matches-dark.webp" loading="lazy" alt="Tayo's matches for a buyer: homes that fit the brief, each with its price and area." />
                    </div>
                    <div className="vc-shot" data-i="3">
                      <img className="shot lt" src="images/home/shot-tayo-desk-light.webp" loading="lazy" alt="Tayo in conversation with a buyer, asking about budget and area." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-tayo-desk-dark.webp" loading="lazy" alt="Tayo in conversation with a buyer, asking about budget and area." />
                    </div>
                    <div className="vc-shot" data-i="4">
                      <img className="shot lt" src="images/home/shot-crm-light.webp" loading="lazy" alt="The CRM: leads by stage, each with the channel it came from, the budget and the next thing to do." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-crm-dark.webp" loading="lazy" alt="The CRM: leads by stage, each with the channel it came from, the budget and the next thing to do." />
                    </div>
                    <div className="vc-shot" data-i="5">
                      <img className="shot lt" src="images/home/shot-tayo-light.webp" loading="lazy" alt="Tayo on a phone, talking a buyer through a home's price." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-tayo-dark.webp" loading="lazy" alt="Tayo on a phone, talking a buyer through a home's price." />
                    </div>
                    <div className="vc-shot" data-i="6">
                      <img className="shot lt" src="images/home/shot-nearby-light.webp" loading="lazy" alt="A listing on Synapse: the house, its price, and a map of what is around it." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-nearby-dark.webp" loading="lazy" alt="A listing on Synapse: the house, its price, and a map of what is around it." />
                    </div>
                    <div className="vc-shot" data-i="7">
                      <img className="shot lt" src="images/home/shot-overview-light.webp" loading="lazy" alt="The agency overview: every listing, its leads and how it is doing." />
                      {" "}
                      <img className="shot dk" src="images/home/shot-overview-dark.webp" loading="lazy" alt="The agency overview: every listing, its leads and how it is doing." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="sec" id="product">
          <div className="wrap">
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"One listing. "}
                  <em>
                    Every channel.
                  </em>
                </h2>
                <p className="lede">
                  Upload once. Synapse writes the copy in your agency’s voice, sizes the creative for each platform, and publishes to Instagram, Facebook, WhatsApp, TikTok, YouTube and the Synapse marketplace.
                </p>
                <p className="lede">
                  Each version is checked against that platform’s real limits, caption length, aspect ratio, video duration, and it never claims “verified” on a listing that is not.
                </p>
                <p className="lede">
                  No agency retainer. No social media manager. No waiting on a designer.
                </p>
              </div>
              <div className="frame p-reach">
                <img className="shot bleed lt" src="images/home/shot-social-light.webp" width="1600" height="907" loading="lazy" alt="The content pipeline in Synapse: listings moving from uploaded to scheduled to published, each post with its channel, its time, and the people who tapped through." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-social-dark.webp" width="1600" height="907" loading="lazy" alt="The content pipeline in Synapse: listings moving from uploaded to scheduled to published, each post with its channel, its time, and the people who tapped through." />
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Every enquiry arrives "}
                  <em>
                    already worked.
                  </em>
                </h2>
                <p className="lede">
                  Every lead arrives with the city, the budget and the brief already attached, and Tayo’s opening position with it.
                </p>
                <p className="lede">
                  Five stages, assignment across your agents, and an outbox that sends only when somebody presses send.
                </p>
                <p className="lede">
                  The other 97% stay with Tayo. You meet a buyer when they are ready to pay, and not before.
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
                  {"Reach the buyer "}
                  <em>
                    standing outside.
                  </em>
                </h2>
                <p className="lede">
                  Someone walking your street is already interested in it. Synapse puts your verified listing on their phone while they are still there.
                </p>
                <p className="lede">
                  Local intent, caught live, and delivered straight into your pipeline as a qualified lead.
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
                    That leaves two expensive ways to grow: do the marketing, chasing and negotiating yourself, or hand the property to other agencies and pay for the reach out of your fee.
                  </p>
                  <p className="either">
                    <b>
                      Either way:
                    </b>
                    {" the customer pays more, or you earn less on the same work. Often both."}
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
                        Every “is it still available?” answered by hand. Every viewing arranged for someone who was never going to show. Every evening spent working out which is which.
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
                        Instagram, Facebook groups, WhatsApp broadcasts, TikTok, the estate group chats nobody admits to being in. Marketing one listing properly is a second full-time job.
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
                        Reaching more buyers usually means handing the property to three other agencies. Either the customer pays everyone’s cut, or you take a fraction of what the work was worth.
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
                        Your strongest closer cannot hold two conversations at once, and when they take leave the pipeline slows behind them. Everyone else is learning on a live deal.
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
              {"The work you have been doing by hand, the posting, the chasing, the checking, "}
              <em>
                done once, properly, and on its own.
              </em>
            </p>
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
                Synapse is in a free pilot for Nigerian estate agencies. Every feature is open to you: listings, the social studio, Tayo, the CRM and the verification desk. There is nothing to pay, no card to enter, and no commission on your deals. We will tell you well before anything changes.
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
              Real listings from agencies on Synapse, verified ones first. This is where yours would sit, in front of buyers who are already looking.
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
                Free during the pilot. No card, no lock-in, no commission on your deals.
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
              Synapse, by ILIOS Digital. AI that finds buyers homes, and finds agencies buyers.
            </p>
            <p className="foot-tag">
              Screens on this page are the Synapse portal and Tayo with real listings; the leads, posts and chat in them are samples.
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
