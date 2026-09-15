/* ─────────────────────────────────────────────────────────────────────────────
   WHERE THIS READER CAME FROM, REMEMBERED ACROSS PAGES.

   Attribution used to be recorded in exactly one place: property.html, from
   ?ch= in the URL, straight into record_channel_touch. That works for a post
   whose short link points at a listing, and only for that.

   It does not work for the bio link. /tayo lands somebody in Tayo's chat, and
   there is no property yet -- record_channel_touch takes a property_id and
   returns null without one, because channel_interactions hangs off an agency.
   So the single most valuable arrival we have, a buyer who came from Instagram
   and is about to describe what they want, was the one arrival nothing wrote
   down. By the time they opened a listing the channel was long gone from the
   URL and the visit looked organic.

   This remembers the channel when they land, wherever they land, so the touch
   can be recorded later against whatever listing they actually open.

   FIRST TOUCH WINS, which matches how lead_attribution already reasons about
   is_first_touch: the channel that introduced somebody keeps the credit, and a
   later visit through a different route does not rewrite history. An explicit
   ?ch= is the one thing that overwrites, because that is a fresh, deliberate
   click on a tracked link rather than an inference.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var KEY = 'syn_arrival_v1';

  /* Only the values attribution_channel actually accepts. Anything else is
     dropped rather than stored, because a channel the enum rejects fails at
     the INSERT -- long after this page is gone and with nothing left to say
     which page wrote it. */
  var ALLOWED = {
    instagram: 1, facebook: 1, tiktok: 1, x: 1,
    whatsapp_campaign: 1, organic: 1, referral: 1,
  };

  /* Referrer hosts we can read a channel from. Instagram sends people through
     l.instagram.com, Facebook through l.facebook.com and lm.facebook.com, and
     X rewrites everything to t.co -- so matching on the obvious domain alone
     misses most real traffic. */
  function fromReferrer(ref) {
    if (!ref) return '';
    var host = '';
    try { host = new URL(ref).hostname.toLowerCase(); } catch (e) { return ''; }
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
    if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.me') return 'facebook';
    if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
    if (/(^|\.)(twitter|x)\.com$/.test(host) || host === 't.co') return 'x';
    if (/(^|\.)whatsapp\.com$/.test(host)) return 'whatsapp_campaign';
    return '';
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }     // blocked or corrupt: behave as if new
  }

  function write(rec) {
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
  }

  function capture() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }

    var explicit = String(q.get('ch') || '').toLowerCase();
    var post = q.get('post') || null;

    /* THE IN-APP BROWSER PROBLEM. Instagram opens links in its own webview and
       frequently sends no referrer at all, so a bio click can arrive looking
       exactly like somebody typing the address in. via=bio is set by the /tayo
       rewrite and nothing else, and that link exists for one purpose: it is
       the Instagram bio link. Treating it as Instagram when there is nothing
       better to go on is a stated assumption, not a guess -- and a real
       referrer still beats it, so the day the same link goes on another
       platform it attributes correctly on its own. */
    var channel = ALLOWED[explicit] ? explicit : '';
    if (!channel) channel = fromReferrer(document.referrer);
    if (!channel && q.get('via') === 'bio') channel = 'instagram';
    if (!channel) return;            // an ordinary visit; nothing to remember

    var prev = read();
    /* An explicit tracked link always writes. Anything inferred only fills a
       gap, so the first channel to introduce this visitor keeps the credit. */
    if (prev && prev.channel && !ALLOWED[explicit]) return;

    write({
      channel: channel,
      post: post || (prev && prev.post) || null,
      at: new Date().toISOString(),
    });
  }

  capture();

  window.SynArrival = {
    /** The remembered channel, or '' when this visitor arrived plainly. */
    channel: function () { var r = read(); return (r && r.channel) || ''; },
    /** The short-link token that brought them, when there was one. */
    post: function () { var r = read(); return (r && r.post) || null; },
    all: read,
  };
})();
