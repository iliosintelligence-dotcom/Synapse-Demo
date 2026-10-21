/* THE APP'S HOME. Greets the person by name when signed in, groups live homes the way people shop (Rent, Buy, Invest, Short let),
   and draws each one with the shared property card. Live listings only, verified first; nothing is invented. */
(function () {
  'use strict';
  var URL_ = 'https://bhrhejpekmhbhwryjhgk.supabase.co', KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  var GROUPS = {
    rent: ['rent', 'lease'],
    buy: ['outright', 'rent_to_own'],
    invest: ['off_plan', 'joint_venture', 'development_financing'],
    shortlet: ['shortlet']
  };
  var SAVES = 'synapse_saved';
  var list = document.getElementById('hmList'), empty = document.getElementById('hmEmpty');
  var hello = document.getElementById('hmHello');
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var cache = {}, current = 'rent';

  function saves() { try { var r = JSON.parse(localStorage.getItem(SAVES) || '[]'); return new Set(Array.isArray(r) ? r : []); } catch (e) { return new Set(); } }
  function cover(media) {
    var s = (Array.isArray(media) ? media : []).filter(function (m) { return m && m.url && m.media_type !== 'video' && !/\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(m.url); });
    s.sort(function (a, b) { return (a.display_order || 0) - (b.display_order || 0); });
    return s.length ? s[0].url : null;
  }
  /* a properties row in the shape the shared card takes (the same one Tayo's matches arrive in) */
  function asMatch(p) {
    return {
      id: p.id, title: p.title, city: p.city, state: p.state, areaSqm: p.area_sqm,
      neighbourhood: p.area_name && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name) ? { name: p.area_name.trim() } : null,
      bedrooms: p.bedrooms, bathrooms: p.bathrooms, price: p.price, pricePeriod: p.price_period,
      listingType: p.listing_type, verificationStatus: p.verification_status, img: cover(p.property_media)
    };
  }
  function fetchGroup(g) {
    var q = URL_ + '/rest/v1/properties?select=id,title,price,price_period,currency,listing_type,city,state,area_name,area_sqm,verification_status,bedrooms,bathrooms,property_media(url,display_order,media_type)'
      + '&status=eq.live&is_active=is.true&deleted_at=is.null&deal_structure=in.(' + GROUPS[g].join(',') + ')'
      + '&order=verification_status.desc,listed_at.desc&limit=20';
    return fetch(q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) { return Array.isArray(rows) ? rows : []; })
      .catch(function () { return []; });
  }
  function draw(rows) {
    list.innerHTML = '';
    empty.hidden = rows.length > 0;
    if (!rows.length) return;
    var s = saves();
    list.innerHTML = rows.map(function (p, i) { return SynMatches.listingCardHtml(SynMatches.shapeTojuMatch(asMatch(p), i), i, { saves: s }); }).join('');
  }
  function show(g) {
    current = g;
    document.querySelectorAll('.hm-tab').forEach(function (b) { var on = b.dataset.deal === g; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    if (cache[g]) { draw(cache[g]); return; }
    list.innerHTML = '<div class="hm-skel"></div><div class="hm-skel"></div>'; empty.hidden = true;
    fetchGroup(g).then(function (rows) { cache[g] = rows; if (current === g) draw(rows); });
  }

  document.querySelector('.hm-filters').addEventListener('click', function (e) {
    var b = e.target.closest('.hm-tab'); if (b) show(b.dataset.deal);
  });
  list.addEventListener('click', function (e) {
    var sv = e.target.closest('[data-save]');
    if (sv) {
      e.preventDefault(); e.stopPropagation();
      var id = sv.getAttribute('data-save'), s = saves(); if (s.has(id)) s.delete(id); else s.add(id);
      try { localStorage.setItem(SAVES, JSON.stringify(Array.from(s))); } catch (er) { /* the heart still shows */ }
      var on = s.has(id); sv.classList.toggle('on', on); sv.setAttribute('aria-pressed', String(on));
      return;
    }
    var card = e.target.closest('.hc[data-id]');
    if (card && !e.target.closest('a, button')) window.location.href = SynMatches.propertyHref(card.dataset.id);
  });

  /* "Hey Ratul, Welcome here": the first name, only when the person is signed in and has one */
  function firstName(u) {
    var m = (u && u.user_metadata) || {}, n = String(m.full_name || m.name || '').trim().split(/\s+/)[0];
    return n && n.length <= 30 ? n : '';
  }
  if (window.SynAuth) {
    SynAuth.ready().then(function (u) {
      var n = firstName(u);
      if (n) hello.innerHTML = 'Hey <em>' + esc(n) + '</em>,<br>Welcome here';
    }).catch(function () { /* the plain greeting stays */ });
  }
  show('rent');
})();
