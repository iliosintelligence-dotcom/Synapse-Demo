/* THE HOMES FEED on the customer landing page (Eden, 2026-10-11). The page used to end in a
   footer; now it flows straight into real homes, the way a marketplace does: scroll past the
   ask box and you are already looking at places, with Save, Share and Contact on every one.
   Live homes only, verified first, 12 at a time as you scroll, then a way to see them all.
   Text is escaped, prices are formatted here, nothing is invented. */
(function () {
  'use strict';
  var URL_ = 'https://bhrhejpekmhbhwryjhgk.supabase.co', KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
  var PAGE = 12, CAP = 48;
  var grid = document.getElementById('hfGrid'), more = document.getElementById('hfMore'), endEl = document.getElementById('hfEnd');
  if (!grid) return;
  var offset = 0, loading = false, done = false, SAVES = 'synapse_saved';
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
  function card(p, saved) {
    var img = cover(p.property_media), per = ({ per_year: '/yr', per_month: '/mo', per_night: '/night' })[p.price_period] || '';
    var area = (p.area_name && p.area_name.trim().length <= 40 && !/\n/.test(p.area_name)) ? p.area_name.trim() + ', ' + (p.city || '') : (p.city || '');
    var facts = [p.bedrooms != null ? p.bedrooms + ' bed' + (p.bedrooms === 1 ? '' : 's') : '', p.bathrooms != null ? p.bathrooms + ' bath' + (p.bathrooms === 1 ? '' : 's') : ''].filter(Boolean).join(' \u00b7 ');
    var price = money(p.price, p.currency) + per;
    var title = esc(p.title || 'A home on Synapse'), id = esc(p.id), href = 'app/property.html?id=' + encodeURIComponent(p.id);
    var on = saved.has(p.id);
    return '<article class="hf-card"><a class="hf-link" href="' + href + '" aria-label="' + title + '"></a>'
      + '<div class="img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'no-photo\');this.remove()">' : '')
      + (p.verification_status === 'verified' && window.SynStamp ? SynStamp.html() : '')
      + '<button type="button" class="hf-save' + (on ? ' on' : '') + '" data-hf-save="' + id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from saved' : 'Save') + ' ' + title + '">' + (on ? '\u2665' : '\u2661') + '</button>'
      + '<button type="button" class="share" data-share="' + id + '" data-title="' + title + '" data-price="' + esc(price) + '" data-place="' + esc(area) + '" aria-label="Share ' + title + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></button>'
      + '<a class="contact" data-contact href="app/toju.html?reply=' + encodeURIComponent(p.id) + '" aria-label="Contact an agent about ' + title + '">Contact</a></div>'
      + '<div class="hf-body"><div class="hf-price">' + esc(price) + '</div><div class="hf-title">' + title + '</div><div class="hf-meta">' + esc(area) + (facts ? ' \u00b7 ' + esc(facts) : '') + '</div></div></article>';
  }
  function load() {
    if (loading || done) return;
    loading = true; more.classList.add('busy');
    var q = URL_ + '/rest/v1/properties?select=id,title,price,price_period,currency,listing_type,city,area_name,verification_status,bedrooms,bathrooms,property_media(url,display_order,media_type)'
      + '&status=eq.live&is_active=is.true&deleted_at=is.null&property_type=neq.shared&order=verification_status.desc,listed_at.desc&limit=' + PAGE + '&offset=' + offset;
    fetch(q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('shape');
      var s = saves();
      grid.insertAdjacentHTML('beforeend', rows.map(function (p) { return card(p, s); }).join(''));
      offset += rows.length;
      if (rows.length < PAGE || offset >= CAP) { done = true; more.hidden = true; endEl.hidden = false; }
      if (!offset) { document.getElementById('homesFeed').hidden = true; }
    }).catch(function () { more.classList.remove('busy'); var b = more.querySelector('button'); if (b) b.hidden = false; }).then(function () { loading = false; more.classList.remove('busy'); });
  }
  grid.addEventListener('click', function (e) {
    var h = e.target.closest('[data-hf-save]');
    if (!h) return;
    e.preventDefault(); e.stopPropagation();
    var id = h.getAttribute('data-hf-save'), s = saves(); if (s.has(id)) s.delete(id); else s.add(id);
    try { localStorage.setItem(SAVES, JSON.stringify(Array.from(s))); } catch (er) {}
    var on = s.has(id); h.classList.toggle('on', on); h.textContent = on ? '\u2665' : '\u2661'; h.setAttribute('aria-pressed', String(on));
  });
  var btn = more.querySelector('button'); if (btn) btn.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) load(); }, { rootMargin: '600px 0px' }).observe(more);
  } else { load(); }
  load();
})();
