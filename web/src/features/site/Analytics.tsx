/**
 * Google Analytics in the <head> of every public page (was each page's own copy of the same script, src/legacy/<page>/inline-1.js,
 * fourteen identical files). The tag runs in Consent Mode: this sets the default -- no analytics cookie until the visitor accepts,
 * advertising never -- before gtag.js loads, which is why it stays an inline script in the head rather than React. Query strings are
 * cut down to the campaign keys before anything is sent. The banner that asks is React (ConsentBanner.tsx, in SiteReact).
 */
const GA_ID = "G-R7VX06N3ZY";

const CONSENT_DEFAULT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function () {
  var ok = false;
  try { ok = localStorage.getItem('syn_consent_v1') === 'granted'; } catch (e) {}
  gtag('consent', 'default', {
    analytics_storage: ok ? 'granted' : 'denied',
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  });
  gtag('set', 'ads_data_redaction', true);
  gtag('js', new Date());
  var KEEP = /^(utm_[a-z]+|gclid|fbclid|ch|via|id)$/;
  function clean(href) {
    try {
      var u = new URL(href), q = new URLSearchParams();
      u.searchParams.forEach(function (v, k) { if (KEEP.test(k)) q.set(k, v); });
      var s = q.toString();
      return u.origin + u.pathname + (s ? '?' + s : '');
    } catch (e) { return ''; }
  }
  gtag('config', '${GA_ID}', {
    page_location: clean(location.href),
    page_referrer: document.referrer ? clean(document.referrer) : ''
  });
})();
`;

export function AnalyticsHead() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
    </>
  );
}
