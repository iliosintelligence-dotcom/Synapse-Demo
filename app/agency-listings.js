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

  /* ── leads ───────────────────────────────────────────────────────────────
     The CRM's data source. Same discipline as list(): scoped by agency_id
     explicitly rather than trusting RLS to be the only filter.

     `lost` leads are excluded because this feeds a live pipeline view whose
     funnel has no column for them — they are not hidden data, they are simply
     not pipeline. Soft-deleted rows are excluded for the same reason as
     listings. The joined property supplies the title and price the agency
     needs to recognise which listing the lead is actually about. */
  function leads() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('leads')
        .select('id, consumer_name, consumer_phone, source, current_stage, lead_score, ' +
                'risk_level, next_action_recommendation, budget_min, budget_max, ' +
                'delivery_status, delivery_error, last_activity_at, created_at, ' +
                'assigned_agent_id, properties(title, price, city)')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .neq('current_stage', 'lost')
        .order('created_at', { ascending: false })
        .limit(500);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  /* Move a lead through the pipeline.

     Scoped by agency_id as well as id: RLS already restricts the row set, but
     an explicit filter means a mistyped id fails as "no rows" rather than
     quietly relying on the policy to be the only thing standing between this
     agency and another one's lead.

     Only pipeline columns are grantable to `authenticated` -- delivery_status,
     source and consumer_phone are deliberately not updatable from the client,
     so the attribution record cannot be rewritten after the fact. */
  var LEAD_STAGES = ['new', 'contacted', 'qualified', 'viewing_scheduled',
                     'viewing_completed', 'negotiating', 'commitment', 'closed', 'lost'];
  function setLeadStage(id, stage) {
    if (LEAD_STAGES.indexOf(stage) < 0) return Promise.reject(new Error('Unknown stage: ' + stage));
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency on this account');
      return c1.from('leads')
        .update({ current_stage: stage, last_activity_at: new Date().toISOString() })
        .eq('id', id)
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .select('id, current_stage')
        .maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      // RLS returning nothing is indistinguishable from a bad id at the wire;
      // either way the write did not happen, so say so rather than reporting
      // success and letting the UI drift from the database.
      if (!r.data) throw new Error('That lead could not be updated');
      return r.data;
    });
  }

  /* ── campaigns ───────────────────────────────────────────────────────────
     Campaigns used to live in localStorage, which meant they belonged to one
     browser rather than to the agency: invisible to colleagues, gone with a
     cleared cache. These read and write the real table.

     Note on permissions: campaigns_manage is admin/owner only, while
     campaigns_select is any member. A plain agent can therefore see campaigns
     but not change them, and an RLS-blocked write returns "no rows" rather
     than an error -- so every writer below treats an empty result as failure
     instead of reporting a success that did not happen. */

  var CAMPAIGN_SELECT =
    'id, name, persona, status, budget_naira, spend_naira, target_platforms, ' +
    'target_audience_description, start_date, end_date, created_at, ' +
    'campaign_creatives(id, headline, image_url, channel, status, ctr, leads_count, display_order)';

  function listCampaigns() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('campaigns')
        .select(CAMPAIGN_SELECT)
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      return (r.data || []).map(function (c) {
        c.creatives = (c.campaign_creatives || []).slice().sort(function (a, b) {
          return a.display_order - b.display_order;
        });
        delete c.campaign_creatives;
        return c;
      });
    });
  }

  /* data: { name, persona, budgetNaira, channels[], audience, creatives[] }
     where each creative is { headline, imageUrl, channel }. The campaign and
     its first creatives are written in two steps; if the creatives fail the
     campaign is removed again, so a campaign with no ads never survives. */
  function createCampaign(data) {
    var c1, aid;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (a) {
      if (!a) throw new Error('No agency on this account');
      aid = a;
      var today = new Date();
      var end = new Date(today.getTime() + 30 * 86400000);
      return c1.from('campaigns').insert({
        agency_id: aid,
        name: data.name,
        // The form is always built from one listing, hence property_showcase.
        campaign_type: 'property_showcase',
        status: 'active',
        start_date: today.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        target_platforms: data.channels || [],
        target_audience_description: data.audience || null,
        budget_naira: data.budgetNaira || 0,
        persona: data.persona || null,
      }).select('id').maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('You do not have permission to create campaigns');
      var id = r.data.id;
      var rows = (data.creatives || []).map(function (cr, i) {
        return {
          campaign_id: id, headline: cr.headline, image_url: cr.imageUrl || null,
          channel: cr.channel, display_order: i,
        };
      });
      if (!rows.length) return id;
      return c1.from('campaign_creatives').insert(rows).select('id').then(function (r2) {
        if (r2.error) {
          // Roll back rather than leave a campaign with no creatives in it.
          return c1.from('campaigns').delete().eq('id', id).then(function () { throw r2.error; });
        }
        return id;
      });
    });
  }

  function setCampaignStatus(id, live) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency on this account');
      return c1.from('campaigns')
        .update({ status: live ? 'active' : 'paused' })
        .eq('id', id).eq('agency_id', aid).is('deleted_at', null)
        .select('id, status').maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('You do not have permission to change this campaign');
      return r.data;
    });
  }

  /* creatives: [{ headline, imageUrl, channel }] appended after the existing
     ones, so display_order continues rather than restarting. */
  function addCreatives(campaignId, creatives, startOrder) {
    var c1;
    return client().then(function (c) {
      c1 = c;
      return c1.from('campaign_creatives').insert(creatives.map(function (cr, i) {
        return {
          campaign_id: campaignId, headline: cr.headline, image_url: cr.imageUrl || null,
          channel: cr.channel, display_order: (startOrder || 0) + i,
        };
      })).select('id, headline, image_url, channel, status, ctr, leads_count, display_order');
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('You do not have permission to add creatives');
      return r.data;
    });
  }

  function setCreativeStatus(id, status) {
    var ok = ['learning', 'scaling', 'pausedai'];
    if (ok.indexOf(status) < 0) return Promise.reject(new Error('Unknown status: ' + status));
    return client().then(function (c) {
      return c.from('campaign_creatives')
        .update({ status: status })
        .eq('id', id).is('deleted_at', null)
        .select('id, status').maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('You do not have permission to change this creative');
      return r.data;
    });
  }

  /* ── the agency's own people ─────────────────────────────────────────────
     Needed by the CRM's Assign action. profiles used to be readable only by
     their owner, so this returned a list of blank names; migration 0045 lets
     members of the same agency see each other. Consumers are not agency
     members and stay invisible. */
  function roster() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('agency_members')
        .select('profile_id, role, profiles(full_name)')
        .eq('agency_id', aid)
        .is('deleted_at', null);
    }).then(function (r) {
      if (r.error) throw r.error;
      return (r.data || []).map(function (m) {
        return {
          id: m.profile_id,
          name: (m.profiles && m.profiles.full_name) || 'Unnamed teammate',
          role: m.role,
        };
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    });
  }

  /* Assign several leads at once. agentId may be null to unassign. */
  function assignLeads(ids, agentId) {
    if (!ids || !ids.length) return Promise.resolve([]);
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency on this account');
      return c1.from('leads')
        .update({ assigned_agent_id: agentId || null, last_activity_at: new Date().toISOString() })
        .in('id', ids)
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .select('id');
    }).then(function (r) {
      if (r.error) throw r.error;
      var done = (r.data || []).length;
      if (!done) throw new Error('Those leads could not be assigned');
      // A partial result is reported rather than smoothed over: the caller
      // tells the user how many actually moved.
      return { updated: done, requested: ids.length };
    });
  }

  /* Soft-delete. This goes through the delete_lead function rather than an
     UPDATE, because Postgres applies the table's SELECT policy to the row a
     statement produces -- and leads_select requires deleted_at to be null, so
     a client-side soft delete can never satisfy it. delete_lead checks that
     the caller is an agency admin or owner, then bypasses RLS.

     Each id is a separate call, so one failure does not silently take the rest
     with it; the caller is told exactly how many were removed. */
  function deleteLeads(ids) {
    if (!ids || !ids.length) return Promise.resolve({ deleted: 0, requested: 0, error: null });
    return client().then(function (c) {
      return Promise.all(ids.map(function (id) {
        return c.rpc('delete_lead', { p_lead_id: id }).then(function (r) {
          return { ok: !r.error, error: r.error };
        });
      }));
    }).then(function (results) {
      var ok = results.filter(function (r) { return r.ok; }).length;
      var firstErr = (results.find(function (r) { return !r.ok; }) || {}).error;
      if (!ok) throw new Error((firstErr && firstErr.message) || 'Those leads could not be deleted');
      return { deleted: ok, requested: ids.length, error: firstErr ? firstErr.message : null };
    });
  }

  /* ── message outbox ──────────────────────────────────────────────────────
     Queue first, deliver later. queue_lead_message() writes the row and always
     succeeds; send-outbox delivers it. That split is the point: with Twilio
     unconfigured the message still exists, visible and retryable, instead of
     evaporating into a toast.

     There is no client INSERT on message_outbox. The recipient is derived
     server-side from the lead, so the platform can only ever message someone
     who actually enquired -- a table taking an arbitrary phone number plus
     arbitrary text is an open SMS gateway on our own Twilio account. */

  function queueMessages(leadIds, body) {
    if (!leadIds || !leadIds.length) return Promise.resolve({ queued: 0, requested: 0, error: null });
    return client().then(function (c) {
      return Promise.all(leadIds.map(function (id) {
        return c.rpc('queue_lead_message', { p_lead_id: id, p_body: body })
          .then(function (r) { return { ok: !r.error, error: r.error }; });
      }));
    }).then(function (results) {
      var ok = results.filter(function (r) { return r.ok; }).length;
      var firstErr = (results.find(function (r) { return !r.ok; }) || {}).error;
      if (!ok) throw new Error((firstErr && firstErr.message) || 'Those messages could not be queued');
      return {
        queued: ok,
        requested: leadIds.length,
        error: firstErr ? firstErr.message : null,
      };
    });
  }

  function listOutbox(limit) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('message_outbox')
        .select('id, to_phone, body, status, attempts, max_attempts, last_error, ' +
                'scheduled_for, sent_at, created_at, leads(consumer_name)')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit || 50);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  /* Cancel something still waiting. The database refuses anything else -- a
     message already sent cannot be un-sent, and pretending otherwise in the UI
     would be a lie about what the buyer received. */
  function cancelMessage(id) {
    return client().then(function (c) {
      return c.from('message_outbox')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'queued')
        .select('id').maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) throw new Error('That message has already left the queue');
      return r.data;
    });
  }

  /* Drain the queue. Deliberately an explicit action rather than something
     that fires on a timer: these are real messages to real buyers. */
  function sendOutbox(limit) {
    // functions.invoke carries the caller's session token, which send-outbox
    // needs: it resolves the caller's agency and drains only that queue.
    return client().then(function (c) {
      return c.functions.invoke('send-outbox', { body: { limit: limit || 20 } });
    }).then(function (r) {
      if (r.error) {
        // The function's own JSON error is more useful than "non-2xx status".
        var ctx = r.error.context;
        if (ctx && typeof ctx.json === 'function') {
          return ctx.json().then(function (d) {
            throw new Error((d && d.error) || r.error.message);
          }, function () { throw new Error(r.error.message); });
        }
        throw new Error(r.error.message);
      }
      return r.data;
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
  /* Renewing a listing is the agency asserting the home is still available,
     so it goes through reconfirm_listing(): one statement that stamps
     availability_confirmed_at and moves expires_at together, with the
     membership check server-side. The old version wrote expires_at directly
     and recorded no confirmation, so the freshness promise had a date but
     nothing behind it. */
  function relist(id, days) {
    return client().then(function (c) {
      return c.rpc('reconfirm_listing', { p_property_id: id, p_days: days || FRESH_DAYS });
    }).then(function (r) {
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!row) throw new Error('That listing could not be confirmed');
      return row;
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
      return c1.from('agencies').select('id,name,verification_tier,subscription_tier').eq('id', aid).limit(1)
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
      /* The label is "<tier> verified" — which reads correctly for gold and
         basic, but the most common tier in the database is literally
         "verified", and that produced "Verified verified" on every page of
         those agencies' portals. When the tier already names the state, say
         it once. */
      var tierWord = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
      var tierLabel = !tier ? ''
        : tier.toLowerCase() === 'verified' ? '✦ Verified'
        : '✦ ' + tierWord + ' verified';
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

  /* ── Brand assets ────────────────────────────────────────────────────
     Logo files live in the public `brand` bucket at
       brand/<agency_id>/<slot>-<timestamp>.<ext>
     The agency-id folder is what the storage policies check, so a member can
     only ever write inside their own agency's folder.

     The timestamp matters: object storage is cached hard at the CDN, and
     re-uploading to a fixed path (logo-light.png) would keep serving the old
     image after a change. A fresh filename each time sidesteps that
     entirely, and the previous file is deleted so the folder cannot grow
     without bound. */
  var BRAND_BUCKET = 'brand';
  var LOGO_MAX_BYTES = 2 * 1024 * 1024;
  var LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

  function extFor(file) {
    var m = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
    return m[file.type] || 'png';
  }

  /* Upload one logo. `slot` is 'light' or 'dark'. Resolves to the public URL,
     which the caller writes into logo_url / logo_dark_url via saveBrand. */
  function uploadBrandAsset(file, slot) {
    if (!file) return Promise.reject(new Error('No file selected'));
    if (LOGO_TYPES.indexOf(file.type) === -1) {
      return Promise.reject(new Error('Use a PNG, JPG, WEBP or SVG'));
    }
    if (file.size > LOGO_MAX_BYTES) {
      return Promise.reject(new Error('That file is ' + Math.ceil(file.size / 1024 / 1024) + 'MB — keep a logo under 2MB'));
    }
    var c1, aid;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (a) {
      if (!a) throw new Error('no-agency: this account is not a member of any agency');
      aid = a;
      var path = aid + '/logo-' + (slot === 'dark' ? 'dark' : 'light') + '-' + Date.now() + '.' + extFor(file);
      return c1.storage.from(BRAND_BUCKET).upload(path, file, {
        cacheControl: '31536000', upsert: false, contentType: file.type,
      }).then(function (r) {
        if (r.error) throw r.error;
        return c1.storage.from(BRAND_BUCKET).getPublicUrl(path).data.publicUrl;
      });
    });
  }

  /* Remove a previously uploaded file. Best-effort: a logo the agency has
     already replaced must never block saving the new one, so a failure here
     is swallowed rather than surfaced. */
  function removeBrandAsset(url) {
    if (!url) return Promise.resolve(false);
    var marker = '/' + BRAND_BUCKET + '/';
    var i = String(url).indexOf(marker);
    if (i === -1) return Promise.resolve(false);        // not ours (a pasted URL)
    var path = decodeURIComponent(String(url).slice(i + marker.length).split('?')[0]);
    return client()
      .then(function (c) { return c.storage.from(BRAND_BUCKET).remove([path]); })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  window.SynListings = {
    agencyId: agencyId,
    agency: agency,
    paintAgency: paintAgency,
    loadBrand: loadBrand,
    saveBrand: saveBrand,
    uploadBrandAsset: uploadBrandAsset,
    removeBrandAsset: removeBrandAsset,
    list: list,
    leads: leads,
    setLeadStage: setLeadStage,
    roster: roster,
    assignLeads: assignLeads,
    deleteLeads: deleteLeads,
    queueMessages: queueMessages,
    listOutbox: listOutbox,
    cancelMessage: cancelMessage,
    sendOutbox: sendOutbox,
    listCampaigns: listCampaigns,
    createCampaign: createCampaign,
    setCampaignStatus: setCampaignStatus,
    addCreatives: addCreatives,
    setCreativeStatus: setCreativeStatus,
    LEAD_STAGES: LEAD_STAGES,
    create: create,
    update: update,
    remove: remove,
    relist: relist,
    available: function () {
      return agencyId().then(function (a) { return !!a; }).catch(function () { return false; });
    },
  };
})();
