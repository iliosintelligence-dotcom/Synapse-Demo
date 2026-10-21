export default function Page() {
  return (
    <>
      <div className="bg-scene"></div>
      <div className="bg-wash"></div>
      <main className="hm" data-cnav-clear="">
        <header className="hm-top">
          <span className="hm-city" id="hmCity">Nigeria</span>
          <a className="hm-acct" id="hmAcct" href="signin.html" aria-label="Account">
            <span data-icon="user" aria-hidden="true"></span>
          </a>
        </header>
        <h1 className="hm-hello" id="hmHello">
          {"Welcome"}
          <br />
          {"home"}
        </h1>
        <form className="hm-tayo" id="hmTayo" action="toju.html" method="get">
          <label className="hm-tayo-k" htmlFor="hmAsk">
            <span className="hm-orb" aria-hidden="true"></span>
            {" Ask Tayo"}
          </label>
          <div className="hm-tayo-row">
            <input id="hmAsk" name="ask" type="text" maxLength={300} autoComplete="off" placeholder={"Tell Tayo what you are looking for"} />
            <button type="submit" aria-label="Send to Tayo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div className="hm-ideas">
            <a href={"toju.html?ask=" + encodeURIComponent("A 2 bedroom flat to rent in Bodija")}>A 2-bed to rent in Bodija</a>
            <a href={"toju.html?ask=" + encodeURIComponent("Land to buy in Ibadan under 20 million naira")}>Land under ₦20M</a>
            <a href={"toju.html?ask=" + encodeURIComponent("Somewhere calm near good schools")}>Calm, near schools</a>
            <a href={"toju.html?ask=" + encodeURIComponent("I am not sure where to start")}>Not sure where to start</a>
          </div>
        </form>
        <h2 className="hm-sub">Or look around</h2>
        <div className="hm-filters" role="tablist" aria-label="What are you looking for">
          <button type="button" role="tab" className="hm-tab on" data-deal="rent" aria-selected="true">Rent</button>
          <button type="button" role="tab" className="hm-tab" data-deal="buy" aria-selected="false">Buy</button>
          <button type="button" role="tab" className="hm-tab" data-deal="invest" aria-selected="false">Invest</button>
          <button type="button" role="tab" className="hm-tab" data-deal="shortlet" aria-selected="false">Short let</button>
        </div>
        <div className="hm-list" id="hmList" aria-live="polite"></div>
        <p className="hm-empty" id="hmEmpty" hidden>
          {"Nothing live in this group right now. Ask Tayo and it will look for you."}
        </p>
      </main>
      <script src="stamp.js" />
      <script src="share.js" />
      <script src="matches-shared.js" />
      <script src="icons.js" />
      <script type="module" src="icon-morph.js" />
      <script src="cust-nav.js" />
      <script src="auth.js" />
      <script src="notify.js" />
      <script src="motion.js" />
      <script src="home.js" />
      <script src="onboarding.js" />
    </>
  );
}
