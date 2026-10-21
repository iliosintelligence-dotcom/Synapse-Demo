
(function () {
  'use strict';

  /* ORDER, because it is not the obvious one. This inline script runs DURING
     parsing; a deferred script runs after parsing finishes. So window.SynMatches
     does not exist while these lines are being read -- only by the time a card
     is drawn, which happens inside a fetch callback, a network round trip
     later. That is why price() is a function called at render rather than a
     reference captured now, and why it carries a fallback: the ordering is
     reliable, but a page whose entire job is showing a price should not be one
     failed script away from showing none. */

  var SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  var ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';

  /* The handle arrives as /go/<handle>, rewritten to this file with ?h=.
     Reading BOTH means the page still works if the rewrite is missing or
     somebody opens /app/go.html?h=... directly, which is what will happen the
     first time anyone tests it. */
  var q = new URLSearchParams(location.search);
  var handle = q.get('h') || '';
  if (!handle) {
    var seg = location.pathname.replace(/\/+$/, '').split('/');
    if (seg.length > 1 && seg[seg.length - 2] === 'go') handle = decodeURIComponent(seg[seg.length - 1]);
  }

  var list = document.getElementById('list');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* THE PRICE COMES FROM THE APP'S OWN FORMATTER, not a copy.
     This page first carried its own naira(), lifted from an older helper that
     rounds to whole millions -- so a 1,450,000 listing read "₦1M", a third
     off, on the single number the reader tapped the link to see. And the
     property page one tap later would have said something else, which reads as
     a bait and switch rather than a rounding bug.

     money() is currency-aware and rounds honestly, and importing it is the
     only way the two pages cannot drift apart. The fallback exists because a
     bio link is the last place that should render a blank where a price goes
     -- if the shared script fails, an exact figure is still correct, just
     longer than the house style. */
  function price(n, cur) {
    if (window.SynMatches && SynMatches.money) return SynMatches.money(n, cur);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency: /^[A-Za-z]{3}$/.test(cur || '') ? cur : 'NGN',
        currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0,
      }).format(Number(n) || 0);
    } catch (e) { return '₦' + (Number(n) || 0).toLocaleString(); }
  }

  function rpc(fn, body) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY,
                 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status);
      return r.json();
    });
  }

  /* WHERE A CARD GOES.
     The post's own short link when it has one, so the click is recorded in
     click_events against that exact post -- which is the first time Instagram
     traffic has been measurable at all, because until now there was nothing
     on Instagram anyone could click.

     Posts made before queue_social_post minted links have no token. They fall
     back to the property page with the channel on it: coarser attribution, but
     the alternative is leaving the reader at a dead end, and those are exactly
     the posts with no link in the caption either. */
  function hrefFor(r) {
    if (r.token) return '/s/' + encodeURIComponent(r.token);
    return '/app/property.html?id=' + encodeURIComponent(r.property_id)
      + '&ch=' + encodeURIComponent(r.platform || 'organic');
  }

  /* The verification words are the last entry in `bits` and get their own
     class so they read as the quietest fact on the line. Everything is escaped
     the same way it was when the whole line went through esc() in one go. */
  function metaLine(bits, verified) {
    return bits.map(function (b, i) {
      var last = i === bits.length - 1;
      return (!verified && last)
        ? '<span class="unv">' + esc(b) + '</span>'
        : esc(b);
    }).join(' · ');
  }

  function card(r) {
    var per = r.listing_type === 'rent' ? '<span class="per">/yr</span>' : '';
    var bits = [];
    if (r.bedrooms) bits.push(r.bedrooms + ' bed' + (r.bedrooms === 1 ? '' : 's'));
    if (r.city) bits.push(r.city);

    /* The badge says what is true, both ways round. An unverified listing is
       not hidden and not quietly unlabelled -- the same rule the property card
       and the proximity notification follow. What changed is WHERE each one is
       said: a verified listing wears it on the photo, an unverified one states
       it in the meta line with the other plain facts. See the .tag comment. */
    var tag = r.verified
      ? '<span class="tag"><span class="mk" aria-hidden="true">✦</span>Verified</span>'
      : '';
    if (!r.verified) bits.push('Not yet verified');

    var photo = r.image_url
      ? '<img src="' + esc(r.image_url) + '" alt="" loading="lazy" '
        + 'onerror="this.remove()">'
      : '<span class="none">No photo yet</span>';

    return '<a class="home" href="' + esc(hrefFor(r)) + '">'
      + '<div class="ph">' + photo + tag + '</div>'
      + '<div class="body">'
      +   '<div class="price">' + esc(price(r.price, r.currency)) + per + '</div>'
      +   '<div class="ttl">' + esc(r.title || 'Listing') + '</div>'
      +   (bits.length ? '<div class="meta">' + metaLine(bits, r.verified) + '</div>' : '')
      + '</div></a>';
  }

  function state(title, body) {
    list.innerHTML = '<div class="state"><b>' + esc(title) + '</b>' + esc(body) + '</div>';
  }

  if (!handle) {
    state('No account in the link',
      'This page needs to be opened from an account’s bio link.');
    return;
  }

  /* Both calls at once. The owner only changes the heading, so a slow or
     failed lookup there must not hold up the listings -- which are the reason
     anybody tapped the link. */
  rpc('bio_owner', { p_handle: handle }).then(function (rows) {
    var o = rows && rows[0];
    if (!o) return;
    var name = o.is_synapse ? 'Synapse' : (o.agency_name || 'Synapse');
    /* THE HEADING IS NOT THE BRAND. The bar above already says Synapse, so on
       Synapse's own bio link repeating it made the page open with the same
       word twice and told the reader nothing. On an agency's link the agency
       IS the answer to "whose homes are these", and it leads. */
    document.getElementById('who').textContent =
      o.is_synapse ? 'Homes we just posted' : name;
    document.getElementById('plat').textContent = o.handle || '';
    document.title = 'Homes we just posted · ' + name;
    if (!o.is_synapse) {
      document.getElementById('lede').textContent =
        'Homes ' + name + ' posted recently, listed on Synapse. Tap one for the full details.';
    }
  }).catch(function () { /* the heading stays generic; not worth a message */ });

  rpc('bio_page', { p_handle: handle, p_limit: 12 }).then(function (rows) {
    var pl = rows && rows[0] && rows[0].platform;
    if (pl && /^[a-z_]{1,24}$/.test(pl)) {
      document.getElementById('askTayo').href = '/app/toju.html?new=1&ch=' + encodeURIComponent(pl);
    }
    if (!rows || !rows.length) {
      /* TWO DIFFERENT NOTHINGS, and the reader deserves to know which.
         An unknown handle is our mistake; an account that has not posted
         anything live yet is simply early. Neither is "something went
         wrong", and both still offer a way onward through the footer. */
      return rpc('bio_owner', { p_handle: handle }).then(function (o) {
        if (o && o.length) {
          state('Nothing posted yet',
            'This account has not put a home out yet. Everything on Synapse is below.');
        } else {
          state('We could not find that account',
            'Check the link, or browse everything on Synapse below.');
        }
      }).catch(function () {
        state('Nothing to show yet', 'Browse everything on Synapse below.');
      });
    }
    list.innerHTML = rows.map(card).join('');
  }).catch(function (err) {
    console.error('bio_page failed', err);
    state('That did not load',
      'Something went wrong on our side, not yours. Try again, or browse everything on Synapse below.');
  });
})();
