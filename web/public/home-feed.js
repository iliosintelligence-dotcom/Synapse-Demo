/* PROPERTIES FEED on the customer landing page (Eden, 2026-10-11). The page ends in real
   properties instead of a footer, sorted into rows the way people shop: Invest, Rent, Buy,
   Short let. Each row slides sideways; empty rows are not drawn. Live listings only, verified
   ones first. Text is escaped, prices are formatted here, nothing is invented. */
(function () {
  'use strict';
  var URL_ = 'https://bhrhejpekmhbhwryjhgk.supabase.co', KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  var host = document.getElementById('hfRows'), end = document.getElementById('hfEnd'), sec = document.getElementById('homesFeed');
  if (!host) return;
  var ROWS = [
    { id: 'invest', title: 'Invest', sub: 'Off-plan, joint ventures and development deals', deals: ['off_plan', 'joint_venture', 'development_financing'] },
    { id: 'rent', title: 'Rent', sub: 'Homes to rent now', deals: ['rent', 'lease'] },
    { id: 'buy', title: 'Buy', sub: 'Homes and land for sale', deals: ['outright', 'rent_to_own'] },
    { id: 'shortlet', title: 'Short let', sub: 'By the night', deals: ['shortlet'] }
  ];
  var SAVES = 'synapse_saved';
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function saves() { try { var r = JSON.parse(localStorage.getItem(SAVES) || '[]'); return new Set(Array.isArray(r) ? r : []); } catch (e) { return new Set(); } }
  function money(n, cur) {
    n = Number(n); if (!isFinite(n) || n <= 0) return '';
    var sym = (cur && cur !== 'NGN') ? (cur + ' ') : '\u20a6';
    if (n >= 1e9) return sym + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B';
    if (n >= 1e6) return sym + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return sym + Math.round(n / 1e3) + 'k';
    return sym + n;
  }
  function cover(media) {
    var s = (Array.isArray(media) ? media : []).filter(function (m) { return m && m.url && m.media_type !== 'video' && !/\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(m.url); });
    s.sort(function (a, b) { return (a.display_order || 0) - (b.display_order || 0); });
    return s.length ? s[0].url : '';
  }
  var CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>';
  function card(p, saved) {
    var img = cover(p.property_media), per = ({ per_year: '/yr', per_month: '/mo', per_night: '/night' })[p.price_period] || '';
    var area = (p.area_name && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name)) ? p.area_name.trim() + ', ' + (p.city || '') : (p.city || '');
    var facts = [p.bedrooms != null ? p.bedrooms + ' bed' + (p.bedrooms === 1 ? '' : 's') : '', p.bathrooms != null ? p.bathrooms + ' bath' + (p.bathrooms === 1 ? '' : 's') : ''].filter(Boolean).join(' \u00b7 ');
    var price = money(p.price, p.currency) + per;
    var title = esc(p.title || 'A property on Synapse'), id = esc(p.id), href = 'app/property.html?id=' + encodeURIComponent(p.id);
    var on = saved.has(p.id);
    return '<article class="hf-card"><a class="hf-link" href="' + href + '" aria-label="' + title + '"></a>'
      + '<div class="img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'no-photo\');this.remove()">' : '')
      + (p.verification_status === 'verified' && window.SynStamp ? SynStamp.html() : '')
      + '<button type="button" class="hf-save' + (on ? ' on' : '') + '" data-hf-save="' + id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from saved' : 'Save') + ' ' + title + '">' + (on ? '\u2665' : '\u2661') + '</button>'
      + '<button type="button" class="share" data-share="' + id + '" data-title="' + title + '" data-price="' + esc(price) + '" data-place="' + esc(area) + '" aria-label="Share ' + title + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></button>'
      + '<a class="contact" data-contact href="app/toju.html?reply=' + encodeURIComponent(p.id) + '" aria-label="Contact an agent about ' + title + '" title="Contact an agent">' + CHAT + '</a></div>'
      + '<div class="hf-body"><div class="hf-price">' + esc(price) + '</div><div class="hf-title">' + title + '</div><div class="hf-meta">' + esc(area) + (facts ? ' \u00b7 ' + esc(facts) : '') + '</div></div></article>';
  }
  function fetchRow(r) {
    var q = URL_ + '/rest/v1/properties?select=id,title,price,price_period,currency,city,area_name,verification_status,bedrooms,bathrooms,property_media(url,display_order,media_type)'
      + '&status=eq.live&is_active=is.true&deleted_at=is.null&deal_structure=in.(' + r.deals.join(',') + ')'
      + '&order=verification_status.desc,listed_at.desc&limit=12';
    return fetch(q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); }).then(function (rows) { return Array.isArray(rows) ? rows : []; }).catch(function () { return []; });
  }
  var shown = 0;
  Promise.all(ROWS.map(fetchRow)).then(function (all) {
    var s = saves(), html = '';
    all.forEach(function (rows, i) {
      if (!rows.length) return;
      shown += rows.length;
      var r = ROWS[i];
      html += '<section class="hf-row" aria-labelledby="hfr-' + r.id + '"><div class="hf-rowhead"><div><h3 id="hfr-' + r.id + '">' + esc(r.title) + '</h3><p>' + esc(r.sub) + '</p></div>'
        + '<div class="hf-nav"><button type="button" data-hf-prev aria-label="Scroll ' + esc(r.title) + ' back">\u2039</button><button type="button" data-hf-next aria-label="Scroll ' + esc(r.title) + ' forward">\u203a</button></div></div>'
        + '<div class="hf-track" tabindex="-1">' + rows.map(function (p) { return card(p, s); }).join('') + '</div></section>';
    });
    if (!shown) { if (sec) sec.hidden = true; return; }
    host.innerHTML = html; end.hidden = false;
  });
  host.addEventListener('click', function (e) {
    var h = e.target.closest('[data-hf-save]');
    if (h) {
      e.preventDefault(); e.stopPropagation();
      var id = h.getAttribute('data-hf-save'), s = saves(); if (s.has(id)) s.delete(id); else s.add(id);
      try { localStorage.setItem(SAVES, JSON.stringify(Array.from(s))); } catch (er) {}
      var on = s.has(id); h.classList.toggle('on', on); h.textContent = on ? '\u2665' : '\u2661'; h.setAttribute('aria-pressed', String(on));
      return;
    }
    var n = e.target.closest('[data-hf-next],[data-hf-prev]');
    if (n) { var t = n.closest('.hf-row').querySelector('.hf-track'); t.scrollBy({ left: (n.hasAttribute('data-hf-next') ? 1 : -1) * Math.max(240, t.clientWidth * 0.85), behavior: 'smooth' }); }
  });
})();
