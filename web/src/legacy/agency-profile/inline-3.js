
  (function () {
    const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
    const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
    const H = { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY };
    const id = new URLSearchParams(location.search).get('id') || '';
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const naira = (n) => { n = Number(n) || 0; return n >= 1e9 ? '₦' + (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? '₦' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : '₦' + n.toLocaleString(); };
    const PERIOD = { total: '', per_year: '/yr', per_month: '/mo', per_night: '/night' };
    const TIER = { gold: 'Gold verified', basic: 'Verified', verified: 'Verified' };
    const safeUrl = (raw) => {
      let v = String(raw || '').trim(); if (!v) return '';
      if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
      try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; } catch (e) { return ''; }
    };
    const isVid = (m) => !!m && (m.media_type === 'video' || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || '')));
    const cover = (media) => {
      const s = (media || []).filter((m) => m && m.url).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const ph = s.find((m) => !isVid(m));
      if (ph) return ph.url;
      const u = s.length ? String(s[0].url) : '';
      return /res\.cloudinary\.com\/.+\/video\/upload\//.test(u) ? u.replace('/video/upload/', '/video/upload/so_0/').replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, '.jpg') : null;
    };
    const kindOf = (p) => p.property_type === 'land' ? 'land'
      : p.listing_type === 'shortlet' ? 'shortlet'
      : p.listing_type === 'rent' ? 'rent' : 'sale';
    const KIND_LABEL = { sale: 'For sale', rent: 'For rent', land: 'Land', shortlet: 'Shortlet' };

    function missing(msg) {
      document.getElementById('ap').innerHTML = '<div class="ap-miss"><h1 class="ap-name" style="color:var(--ink)">' + esc(msg) + '</h1>'
        + '<p class="ap-sub" style="margin-top:10px"><a href="browse.html">Back to your matches</a></p></div>';
    }
    if (!/^[0-9a-f-]{36}$/i.test(id)) { missing('This agency link is incomplete.'); return; }

    const AG = 'id,name,logo_url,logo_dark_url,verification_tier,cac_number,cac_certificate_on_file,city,address,description,brand_color,brand_font,tagline,founded_year,specialties,business_hours,social,avg_response_minutes,closed_deals';
    Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/agencies?select=' + AG + '&id=eq.' + id + '&deleted_at=is.null', { headers: H }).then((r) => r.ok ? r.json() : []),
      fetch(SUPABASE_URL + '/rest/v1/properties?select=id,title,price,price_period,listing_type,property_type,city,area_name,bedrooms,verification_status,property_media(url,display_order,media_type)'
        + '&agency_id=eq.' + id + '&deleted_at=is.null&is_active=eq.true&order=created_at.desc&limit=200', { headers: H }).then((r) => r.ok ? r.json() : []),
    ]).then(([ags, props]) => {
      const a = Array.isArray(ags) && ags[0];
      if (!a) { missing('We couldn’t find this agency.'); return; }
      paintAgency(a);
      paintListings(Array.isArray(props) ? props : [], a);
    }).catch(() => missing('This page couldn’t load. Check your connection and try again.'));

    function paintAgency(a) {
      document.title = a.name + ' · Synapse';
      const hero = document.getElementById('apHero');
      if (/^#[0-9a-f]{3,8}$/i.test(a.brand_color || '')) hero.style.setProperty('--ag', a.brand_color);
      if (a.brand_font && /^[\w\s-]{2,40}$/.test(a.brand_font)) hero.style.setProperty('--ag-font', '"' + a.brand_font + '", var(--f-sans)');
      document.getElementById('apName').textContent = a.name;
      const logo = document.getElementById('apLogo');
      const logoUrl = safeUrl(a.logo_url);
      /* the initial is always drawn; the logo sits over it once it has loaded, so a missing or broken logo is never a blank box */
      logo.innerHTML = '<span class="ini">' + esc((a.name || '?').trim()[0].toUpperCase()) + '</span>'
        + (logoUrl ? '<img src="' + esc(logoUrl) + '" alt="' + esc(a.name) + ' logo" onload="this.classList.add(&quot;on&quot;)" onerror="this.remove()">' : '');
      if (a.tagline) { const t = document.getElementById('apTag'); t.textContent = a.tagline; t.hidden = false; }

      const chips = [];
      if (TIER[a.verification_tier]) chips.push('<span class="ap-chip ok">✓ ' + TIER[a.verification_tier] + '</span>');
      const cacNo = a.cac_number ? (/^[a-z]/i.test(String(a.cac_number).trim()) ? String(a.cac_number).trim() : 'RC ' + String(a.cac_number).trim()) : '';
      chips.push(cacNo ? '<span class="ap-chip cac">CAC ' + esc(cacNo) + '</span>'
        : a.cac_certificate_on_file ? '<span class="ap-chip cac">CAC certificate on file</span>'
        : '<span class="ap-chip cac no">CAC not yet on file</span>');
      if (a.city) chips.push('<span class="ap-chip">' + esc(a.city) + '</span>');
      if (a.founded_year) chips.push('<span class="ap-chip">Since ' + esc(a.founded_year) + '</span>');
      document.getElementById('apChips').innerHTML = chips.join('');

      if (a.description) { document.getElementById('apAbout').textContent = a.description; document.getElementById('apAboutCard').hidden = false; }

      const social = (a.social && typeof a.social === 'object') ? a.social : {};
      const rows = [];
      rows.push(['CAC registration', cacNo ? esc(cacNo) + ' · <a href="https://search.cac.gov.ng/" target="_blank" rel="noopener nofollow">Check the CAC registry</a>'
        : a.cac_certificate_on_file ? 'Certificate uploaded to Synapse' : 'Not yet on file']);
      if (a.address || a.city) {
        const where = [a.address, a.city].filter(Boolean).join(', ');
        rows.push(['Office', esc(where) + ' · <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(where + ', Nigeria') + '" target="_blank" rel="noopener">Map</a>']);
      }
      const site = safeUrl(social.website);
      if (site) rows.push(['Website', '<a href="' + esc(site) + '" target="_blank" rel="noopener nofollow">' + esc(site.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a>']);
      const nets = ['instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube'].map((k) => {
        const u = safeUrl(social[k]); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener nofollow">' + k.charAt(0).toUpperCase() + k.slice(1) + '</a>' : '';
      }).filter(Boolean);
      if (nets.length) rows.push(['Social', nets.join(' · ')]);
      const hours = typeof a.business_hours === 'string' ? a.business_hours
        : (a.business_hours && typeof a.business_hours === 'object' && a.business_hours.text) || '';
      if (hours) rows.push(['Hours', esc(hours)]);
      const spec = Array.isArray(a.specialties) ? a.specialties.filter(Boolean) : [];
      if (spec.length) rows.push(['Focus', '<span class="ap-tags">' + spec.map((s) => '<span>' + esc(s) + '</span>').join('') + '</span>']);
      if (a.avg_response_minutes) rows.push(['Replies in', 'about ' + (a.avg_response_minutes < 90 ? Math.round(a.avg_response_minutes) + ' min' : Math.round(a.avg_response_minutes / 60) + ' h')]);
      document.getElementById('apFacts').innerHTML = rows.length
        ? rows.map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('')
        : '<div><dd style="grid-column:1/-1;color:var(--ink-muted)">This agency hasn’t added its office details yet.</dd></div>';
      document.getElementById('apAsk').href = 'toju.html?new=site&agency=' + encodeURIComponent(id) + '&ask=' + encodeURIComponent('Tell me about ' + a.name + '. Can I trust them?');
    }

    let ALL = [], SHOW = 'all';
    function paintListings(props, a) {
      ALL = props;
      document.getElementById('apListHead').textContent = props.length
        ? props.length + ' listing' + (props.length > 1 ? 's' : '') + ' from ' + a.name
        : 'Listings from ' + a.name;
      const kinds = Array.from(new Set(props.map(kindOf)));
      const f = document.getElementById('apFilters');
      f.innerHTML = kinds.length > 1
        ? ['all'].concat(kinds).map((k) => '<button type="button" data-k="' + k + '" aria-pressed="' + (k === SHOW) + '">' + (k === 'all' ? 'All' : KIND_LABEL[k]) + '</button>').join('')
        : '';
      renderList();
    }
    function renderList() {
      const list = ALL.filter((p) => SHOW === 'all' || kindOf(p) === SHOW);
      const el = document.getElementById('apList');
      if (!list.length) { el.innerHTML = '<div class="ap-empty" style="grid-column:1/-1">No live listings right now.</div>'; return; }
      el.innerHTML = list.map((p) => {
        const img = cover(p.property_media);
        const area = (p.area_name || '').trim();
        const where = [area.length <= 40 && !/\n/.test(area) ? area : '', p.city].filter(Boolean).join(', ');
        const meta = [p.bedrooms ? p.bedrooms + ' bed' : '', p.verification_status === 'verified' ? 'Verified' : 'Not yet verified'].filter(Boolean).join(' · ');
        return '<a class="ap-l" href="property.html?id=' + encodeURIComponent(p.id) + '">'
          + '<div class="ph">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : 'No photo yet') + '</div>'
          + '<div class="b"><div class="kind">' + KIND_LABEL[kindOf(p)] + '</div>'
          + '<div class="pr">' + (Number(p.price) > 0 ? naira(p.price) + (PERIOD[p.price_period] || '') : 'Price on request') + '</div>'
          + '<div class="t">' + esc(p.title || 'Listing') + '</div>'
          + '<div class="m">' + esc(where) + (where && meta ? ' · ' : '') + meta + '</div></div></a>';
      }).join('');
    }
    document.getElementById('apFilters').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      SHOW = b.dataset.k;
      document.querySelectorAll('#apFilters [data-k]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderList();
    });
  })();
  