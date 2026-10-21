
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
      gtag('config', 'G-R7VX06N3ZY', {
        page_location: clean(location.href),
        page_referrer: document.referrer ? clean(document.referrer) : ''
      });
      /* The tag is already on the page; consent.js still calls this on Accept. */
      window.SynGtagLoad = function () {};
    })();
  