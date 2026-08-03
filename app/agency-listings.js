/* ─────────────────────────────────────────────────────────────────────────
   Synapse — agency listings persistence.

   The agency dashboard kept listings in localStorage only: `toPropertyRow()`
   existed in agency.html and was never called, so a listing an agency created
   never reached the database and neither Toju nor browse could see it. This
   module is the real write path.

   TRUST BOUNDARY (the important part):
   An agency may create and edit its own listings. It may never certify them.
   `verification_status`, `verification_nodes`, `trust_score` and `verified_at`
   are omitted from every write here, and the database refuses them too — the
   RLS insert policy pins verification to 'unverified' on creation and the
   update policy forbids changing it afterwards. A listing an agency creates is
   unverified and stays unverified until the platform says otherwise. Client
   code is not the control; RLS is. This file simply never asks.

   Consequence worth knowing: because Toju only surfaces verified listings, a
   freshly uploaded listing appears in the agency dashboard and in browse, but
   NOT in Toju's recommendations, until it is verified. That is correct, not a
   bug.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Columns an agency is allowed to write. Anything absent from this list is
     system-owned or derived and is dropped before the request rather than sent
     and rejected — a field silently stripped by RLS is far harder to debug
     than one that was never sent. */
  var WRITABLE = [
    'title', 'description', 'property_type', 'listing_type',
    'price', 'price_period', 'move_in_cost', 'service_charge',
    'address', 'city', 'state', 'country', 'latitude', 'longitude',
    'bedrooms', 'bathrooms', 'area_sqm', 'amenities',
    'title_type', 'yield_pct', 'is_active', 'is_negotiable',
    'toilets', 'parking_spaces', 'floor_level', 'total_floors',
    'year_built', 'furnished', 'property_condition',
  ];

  function client() {
    if (!window.SynAuth) return Promise.reject(new Error('auth-unavailable'));
    return window.SynAuth.client();
  }

  /* ── which agency am I? ──────────────────────────────────────────────────
     Membership is the authority, not a role string on the user. RLS on
     agency_members already restricts this select to rows where profile_id is
     the caller, so an unprivileged read cannot enumerate other agencies. */
  var cachedAgencyId = null;
  function agencyId(force) {
    if (cachedAgencyId && !force) return Promise.resolve(cachedAgencyId);
    return client().then(function (c) {
      return c.from('agency_members').select('agency_id').is('deleted_at', null).limit(1);
    }).then(function (r) {
      if (r.error) throw r.error;
      cachedAgencyId = (r.data && r.data[0] && r.data[0].agency_id) || null;
      return cachedAgencyId;
    });
  }

  /* Keep only writable keys, and drop undefined so PostgREST doesn't try to
     null a column the form simply didn't collect. Empty strings become null:
     the form yields '' for untouched optional fields and '' is not a valid
     numeric or enum. */
  function scrub(data) {
    var out = {};
    WRITABLE.forEach(function (k) {
      if (!(k in data)) return;
      var v = data[k];
      if (v === undefined) return;
      if (v === '') v = null;
      out[k] = v;
    });
    return out;
  }

  /* An agency's own switch controls visibility, so mirror it into `status`.
     `properties_select_public` requires is_active AND status='live', so a row
     left at the 'draft' default would be invisible to buyers and to browse —
     which is exactly the "it saved but nothing happened" failure this module
     exists to remove. */
  function withStatus(row) {
    // Only derive status when the caller actually said something about
    // is_active. Defaulting a partial update to 'live' would silently
    // republish a listing the agency had archived.
    if (!('is_active' in row)) return row;
    row.status = row.is_active === false ? 'draft' : 'live';
    return row;
  }

  /* The 14-day freshness rule, written into the row rather than left implied.
     Until now "14 days" existed only as copy and as a `listed_at` filter in the
     matcher; `expires_at` was never set, so nothing actually expired. Listing
     and re-listing both restart the clock, which is what re-confirmation means. */
  var FRESH_DAYS = 14;
  function freshWindow() {
    var now = new Date();
    return {
      listed_at: now.toISOString(),
      expires_at: new Date(now.getTime() + FRESH_DAYS * 864e5).toISOString(),
    };
  }

  /* ── media ───────────────────────────────────────────────────────────────
     property_media has no is_primary column — order is the primary signal, so
     display_order 0 IS the cover image. Rewriting media as delete-then-insert
     keeps ordering honest without diffing. */
  function writeMedia(c, propertyId, media) {
    var rows = (media || [])
      .map(function (m) { return typeof m === 'string' ? { url: m } : m; })
      .filter(function (m) { return m && m.url; })
      .map(function (m, i) {
        return { property_id: propertyId, url: m.url, media_type: m.media_type || 'image', display_order: i };
      });
    return c.from('property_media').delete().eq('property_id', propertyId).then(function () {
      if (!rows.length) return { data: [], error: null };
      return c.from('property_media').insert(rows);
    });
  }

  /* ── read ────────────────────────────────────────────────────────────────
     Deleted rows are excluded here as well as by RLS: a soft-deleted listing
     should not reappear in the agency's own list. */
  function list() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      /* Scoped by agency_id EXPLICITLY, not left to RLS. Postgres permissive
         policies OR together, and `properties_select_public` matches every
         live listing on the platform — so relying on RLS alone would hand this
         agency every other agency's inventory. RLS is the security floor; the
         query still has to ask the right question. */
      return c1.from('properties')
        .select('*, property_media(url, media_type, display_order)')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      return (r.data || []).map(function (p) {
        p.media = (p.property_media || [])
          .slice()
          .sort(function (a, b) { return a.display_order - b.display_order; });
        delete p.property_media;
        return p;
      });
    });
  }

  function create(data) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('no-agency: this account is not a member of any agency');
      var row = withStatus(scrub(data));
      row.agency_id = aid;
      Object.assign(row, freshWindow());   // starts the 14-day clock
      // verification_* and trust_score are deliberately never set here.
      return c1.from('properties').insert(row).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      var id = r.data.id;
      return writeMedia(c1, id, data.media).then(function () { return id; });
    });
  }

  function update(id, data) {
    var c1;
    return client().then(function (c) {
      c1 = c;
      return c.from('properties').update(withStatus(scrub(data))).eq('id', id).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      return writeMedia(c1, id, data.media).then(function () { return id; });
    });
  }

  /* Soft delete. There is no DELETE policy on properties by design, so a hard
     delete would simply be refused; marking deleted_at is the supported path
     and keeps leads and viewings that referenced the listing intact. */
  function remove(id) {
    return client().then(function (c) {
      return c.from('properties').update({ deleted_at: new Date().toISOString(), is_active: false, status: 'archived' }).eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return true;
    });
  }

  /* Re-listing is what the 14-day freshness rule measures against. */
  function relist(id) {
    return client().then(function (c) {
      return c.from('properties').update(freshWindow()).eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return true;
    });
  }

  /* The agency's own record — name and verification tier. The portal used to
     hardcode "Prestige Realty Ltd. · Gold Verified" in its header, so every
     agency saw someone else's name and an unearned trust tier on their own
     dashboard. */
  var cachedAgency = null;
  function agency() {
    if (cachedAgency) return Promise.resolve(cachedAgency);
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return null;
      return c1.from('agencies').select('id,name,verification_tier').eq('id', aid).limit(1)
        .then(function (r) {
          if (r.error) throw r.error;
          cachedAgency = (r.data && r.data[0]) || null;
          return cachedAgency;
        });
    });
  }

  /* Paints [data-agency-name] / [data-agency-initials] / [data-agency-tier] /
     [data-agency-eyebrow] wherever they appear. Silent when signed out — the
     markup ships with neutral placeholders, never a specimen agency. */
  function paintAgency() {
    return agency().then(function (a) {
      if (!a) return null;
      var tier = a.verification_tier ? String(a.verification_tier) : '';
      var tierLabel = tier ? '✦ ' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' verified' : '';
      var initials = String(a.name || '?').split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
      document.querySelectorAll('[data-agency-name]').forEach(function (el) { el.textContent = a.name || 'Your agency'; });
      document.querySelectorAll('[data-agency-tier]').forEach(function (el) { el.textContent = tierLabel; });
      document.querySelectorAll('[data-agency-initials]').forEach(function (el) { el.textContent = initials; el.title = a.name || 'Your agency'; });
      document.querySelectorAll('[data-agency-eyebrow]').forEach(function (el) {
        el.textContent = (a.name || 'Your agency') + (tierLabel ? ' · ' + tierLabel.replace('✦ ', '') : '');
      });
      return a;
    }).catch(function () { return null; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { paintAgency(); });
  else paintAgency();

  /* ── brand kit ───────────────────────────────────────────────────────────
     The agency's own identity fields. `verification_tier`, `rating` and
     `closed_deals` are deliberately absent: they are platform-owned and the
     database refuses them anyway (agencies_guard_tier). An agency describes
     itself here; it does not rate itself. */
  var BRAND_FIELDS = [
    'name', 'tagline', 'description', 'specialties',
    'logo_url', 'logo_dark_url', 'brand_color', 'brand_color_secondary', 'brand_font',
    'brand_voice', 'whatsapp_number', 'city', 'social',
  ];

  function loadBrand() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return null;
      return c1.from('agencies').select(BRAND_FIELDS.join(',')).eq('id', aid).limit(1)
        .then(function (r) { if (r.error) throw r.error; return (r.data && r.data[0]) || null; });
    });
  }

  function saveBrand(patch) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('no-agency: this account is not a member of any agency');
      var row = {};
      BRAND_FIELDS.forEach(function (k) {
        if (!(k in patch)) return;
        var v = patch[k];
        row[k] = v === '' ? null : v;
      });
      return c1.from('agencies').update(row).eq('id', aid).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      cachedAgency = null;            // name or tier may have changed
      paintAgency();
      return true;
    });
  }

  window.SynListings = {
    agencyId: agencyId,
    agency: agency,
    paintAgency: paintAgency,
    loadBrand: loadBrand,
    saveBrand: saveBrand,
    list: list,
    create: create,
    update: update,
    remove: remove,
    relist: relist,
    available: function () {
      return agencyId().then(function (a) { return !!a; }).catch(function () { return false; });
    },
  };
})();
