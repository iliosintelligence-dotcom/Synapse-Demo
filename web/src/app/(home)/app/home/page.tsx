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
        <a className="hm-ask" href="toju.html">Ask Tayo</a>
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
