/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The buyers page's markup as React (converted from src/legacy/buyers/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
  { src: "home.js" },
  { src: "app/stamp.js" },
  { src: "app/share.js" },
  { src: "home-feed.js" },
];

export function BuyersBody() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <a href="buyers.html" className="logo" aria-label="Synapse home">
            {" "}
            <img src="images/brand/mark-black-on-white-tight.jpg" alt="" />
            {" "}
            <span className="logo-word">
              Synapse
            </span>
            {" "}
          </a>
          <nav className="nav-links" aria-label="Page">
            <a href="#how">
              How it works
            </a>
            {" "}
            <a href="app/browse.html">
              Your matches
            </a>
          </nav>
          <div className="aud" role="group" aria-label="Who Synapse is for">
            <a className="aud-seg" href="index.html">
              For agencies
            </a>
            {" "}
            <a className="aud-seg on" href="buyers.html" aria-current="page">
              For customers
            </a>
          </div>
          <button type="button" className="mode" id="modeBtn" aria-label="Switch to dark mode">
            <svg className="moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" />
            </svg>
            {" "}
            <svg className="sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
            </svg>
          </button>
          <a className="nav-signin" href={"app/signin.html?role=customer&next=toju.html"}>
            Sign in
          </a>
          {" "}
          <a className="btn btn-solid btn-sm nav-cta" href="app/toju.html?new=site">
            Talk to Tayo
          </a>
        </div>
      </header>
      <main id="main" tabIndex="-1">
        <section className="hero">
          <div className="wrap">
            <h1 className="h1 flow">
              {"Find your perfect "}
              <em>
                home.
              </em>
            </h1>
            <p className="lede">
              Tayo learns how you actually live, finds the homes that fit, and tells you why each one made the list.
            </p>
            <form className="ask irid neon" action="app/toju.html" method="get">
              <input type="hidden" name="new" defaultValue="site" />
              {" "}
              <input autoComplete="off" maxLength="300" placeholder={"Tell Tayo what you're looking for…"} aria-label="Tell Tayo what you're looking for" name="ask" />
              <button type="submit" aria-label="Ask Tayo">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ "display": "block", "margin": "auto" }}>
                  <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
            <div className="ask-foot">
              <span className="pip">
                Free. No sign-up to start.
              </span>
              {" "}
              <a href="app/toju.html?new=site">
                Or just talk to Tayo →
              </a>
            </div>
          </div>
          <div className="wrap">
            <div className="frame p-hero hero-frame">
              <img className="shot lt" src="images/home/shot-tayo-desk-light.webp" width="2000" height="1250" loading="lazy" alt="Tayo in Synapse: a family asks for a two-bedroom in Ibadan around two million naira a year, Tayo answers with two homes and why, and the homes appear on a map beside the chat." />
              {" "}
              <img className="shot dk" src="images/home/shot-tayo-desk-dark.webp" width="2000" height="1250" loading="lazy" alt="Tayo in Synapse: a family asks for a two-bedroom in Ibadan around two million naira a year, Tayo answers with two homes and why, and the homes appear on a map beside the chat." />
            </div>
          </div>
        </section>
        <section className="sec reality" id="reality" aria-labelledby="realityTitle">
          <div className="rl-pin" id="rlPin">
            <div className="rl-stage" id="rlStage">
              <div className="rl-rail" id="rlRail">
                <div className="rl-head">
                  <h2 className="h2" id="realityTitle">
                    {"Always awake. Always current. "}
                    <em>
                      Always free.
                    </em>
                  </h2>
                  <p className="rl-hint" aria-hidden="true">
                    Keep scrolling →
                  </p>
                </div>
                <div className="rl-track" id="rlTrack" role="group" aria-roledescription="carousel" aria-label="What you get">
                  <article className="rl-card" aria-roledescription="slide" aria-label="1 of 3">
                    <div className="rl-art p-tayo" aria-hidden="true">
                      <div className="art-fig">
                        <b>
                          24/7
                        </b>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Tayo is awake when you are
                      </h3>
                      <p>
                        Ask at two in the morning and get an answer at two in the morning. No form to fill in, no callback to wait for, no office hours to work around.
                      </p>
                    </div>
                  </article>
                  <article className="rl-card" aria-roledescription="slide" aria-label="2 of 3">
                    <div className="rl-art p-nearby" aria-hidden="true">
                      <div className="art-fig">
                        <b>
                          21 days
                        </b>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        Or the listing disappears
                      </h3>
                      <p>
                        Every home is re-confirmed by its agency every three weeks, or it comes off the site. So you never make the call that starts “actually, that one has gone.”
                      </p>
                    </div>
                  </article>
                  <article className="rl-card" aria-roledescription="slide" aria-label="3 of 3">
                    <div className="rl-art p-reach" aria-hidden="true">
                      <div className="art-fig">
                        <b>
                          Free
                        </b>
                      </div>
                    </div>
                    <div className="rl-body">
                      <h3 className="h3">
                        For buyers and renters
                      </h3>
                      <p>
                        No fee, no commission, no subscription, and no card to enter. Agencies pay for Synapse because it brings them buyers. You are the reason it works, not the one being charged.
                      </p>
                    </div>
                  </article>
                </div>
              </div>
              <div className="rl-ctrl">
                <button type="button" className="rl-arrow prev" id="rlPrev" aria-label="Previous">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <span className="rl-count" id="rlCount" aria-live="polite">
                  1 / 3
                </span>
                <button type="button" className="rl-arrow next" id="rlNext" aria-label="Next">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="sec" id="how">
          <div className="wrap">
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"Tell Tayo how you "}
                  <em>
                    actually live.
                  </em>
                </h2>
                <p className="lede">
                  Where you work, how you get there, what you will not compromise on. It finds the homes that fit, and says why.
                </p>
                <p className="lede">
                  Every home it suggests carries its verification status, so you can see which have been through Synapse’s checks and which have not.
                </p>
              </div>
              <div className="frame p-crm">
                <img className="phone solo lt" src="images/home/shot-tayo-light.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone: the question, Tayo's answer, and the homes worth a look." />
                {" "}
                <img className="phone solo dk" src="images/home/shot-tayo-dark.webp" width="780" height="1688" loading="lazy" alt="Tayo on a phone: the question, Tayo's answer, and the homes worth a look." />
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Every home that fits, "}
                  <em>
                    in one place.
                  </em>
                </h2>
                <p className="lede">
                  What Tayo finds is kept for you, on a list or a map: each home with its price, where it is, and whether it has been verified yet.
                </p>
              </div>
              <div className="frame p-reach">
                <img className="shot bleed lt" src="images/home/shot-matches-light.webp" width="1600" height="895" loading="lazy" alt="Your matches: homes in Ibadan with their prices, whether each is verified, and its photograph." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-matches-dark.webp" width="1600" height="895" loading="lazy" alt="Your matches: homes in Ibadan with their prices, whether each is verified, and its photograph." />
              </div>
            </div>
            <div className="row">
              <div className="row-text">
                <h2 className="h2">
                  {"Or let your taste "}
                  <em>
                    do the searching.
                  </em>
                </h2>
                <p className="lede">
                  Make a board for every idea: a whole home, a kitchen, a corridor you love. Pin what you like. Tayo reads each board and finds real verified homes that feel like it.
                </p>
              </div>
              <div className="frame p-team">
                <img className="shot bleed lt" src="images/home/shot-board-light.webp" width="1600" height="933" loading="lazy" alt="A dream board of kitchens: warm wood, deep green cabinetry, soft morning light." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-board-dark.webp" width="1600" height="933" loading="lazy" alt="A dream board of kitchens: warm wood, deep green cabinetry, soft morning light." />
              </div>
            </div>
            <div className="row flip">
              <div className="row-text">
                <h2 className="h2">
                  {"Know the street "}
                  <em>
                    before you visit.
                  </em>
                </h2>
                <p className="lede">
                  Each home shows what is around it, hospitals, schools, markets, transport, on a map beside its photographs.
                </p>
              </div>
              <div className="frame p-nearby">
                <img className="shot bleed lt" src="images/home/shot-nearby-light.webp" width="1600" height="1232" loading="lazy" alt="A home on Synapse: the house, its price, and a map of what is around it." />
                {" "}
                <img className="shot bleed dk" src="images/home/shot-nearby-dark.webp" width="1600" height="1232" loading="lazy" alt="A home on Synapse: the house, its price, and a map of what is around it." />
              </div>
            </div>
          </div>
        </section>
        <section className="end">
          <div className="wrap">
            <div className="frame p-tayo">
              <h2 className="h2">
                {"The property advisor who works "}
                <em>
                  for you.
                </em>
              </h2>
              <p className="lede">
                Free for buyers and renters. No fee, no commission, and no sign-up to start.
              </p>
              <div className="hero-cta">
                <a className="btn btn-solid" href="app/toju.html?new=site">
                  Talk to Tayo, it’s free
                </a>
                {" "}
                <a className="btn btn-ghost" href="app/browse.html">
                  See your matches
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="feed" id="homesFeed" aria-labelledby="feedTitle">
          <div className="wrap">
            <h2 className="h2" id="feedTitle">
              {"Properties to look at "}
              <em>
                right now.
              </em>
            </h2>
            <p className="lede">
              Live listings, verified ones first. Save one, share it, or tap the chat icon and Tayo introduces you.
            </p>
            <div id="hfRows"></div>
            <div className="hf-end" id="hfEnd" hidden>
              <a className="btn btn-solid" href="app/browse.html">
                See every property
              </a>
              {" "}
              <a className="btn btn-ghost" href="app/toju.html?new=site">
                Or tell Tayo what you want
              </a>
            </div>
          </div>
        </section>
      </main>
      <div className="mini-foot">
        <div className="wrap">
          <span>
            Synapse by ILIOS Digital
          </span>
          {" "}
          <a href="index.html">
            For agencies
          </a>
          {" "}
          <a href={"app/signin.html?role=customer&next=toju.html"}>
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
          <a href="#" data-cookie-settings="">
            Cookie settings
          </a>
        </div>
      </div>
      <a className="float-cta" href="app/toju.html?new=site">
        Talk to Tayo, free
      </a>
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
