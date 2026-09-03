/* ─────────────────────────────────────────────────────────────────────────
   Synapse — agency listings persistence.

   The agency dashboard kept listings in localStorage only: `toPropertyRow()`
   existed in agency.html and was never called, so a listing an agency created
   never reached the database and neither Tayo nor browse could see it. This
   module is the real write path.

   TRUST BOUNDARY (the important part):
   An agency may create and edit its own listings. It may never certify them.
   `verification_status`, `verification_nodes`, `trust_score` and `verified_at`
   are omitted from every write here, and the database refuses them too — the
   RLS insert policy pins verification to 'unverified' on creation and the
   update policy forbids changing it afterwards. A listing an agency creates is
   unverified and stays unverified until the platform says otherwise. Client
   code is not the control; RLS is. This file simply never asks.

   Consequence worth knowing: because Tayo only surfaces verified listings, a
   freshly uploaded listing appears in the agency dashboard and in browse, but
   NOT in Tayo's recommendations, until it is verified. That is correct, not a
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
                'preferences, ' +
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
  /* The agency's people. This used to return only id/name/role, which was all
     the Assign menu needed, so the Agents pane could not be built from it and
     ran off a hard-coded empty array instead.

     It now carries the agent's own profile too. agent_profiles is public-read
     and joins profiles on profile_id, so the whole roster arrives in one
     request. Every profile field stays null when the row does not exist -
     never 0, never a placeholder - because "no rating recorded" and "rated
     zero" are opposite claims about a person and the UI has to be able to
     tell them apart. */
  /* ── inviting a teammate ─────────────────────────────────────────────────
     The invite is a record with a token; the email is matched server-side when
     the invitee accepts, because an address cannot be resolved to a profile
     from the browser. Delivery is not configured, so the caller gets a link to
     share — everything after that link is real. */
  function invites() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('agency_invites')
        .select('id, email, role, token, created_at, expires_at, accepted_at, revoked_at')
        .eq('agency_id', aid)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  function createInvite(email, role) {
    var c1, me;
    return client().then(function (c) { c1 = c; return c.auth.getUser(); })
      .then(function (u) { me = u && u.data && u.data.user && u.data.user.id; return agencyId(); })
      .then(function (aid) {
        if (!aid) throw new Error('No agency on this account');
        return c1.from('agency_invites')
          .insert({ agency_id: aid, email: String(email).trim().toLowerCase(),
                    role: role || 'agent', invited_by: me })
          .select('id, email, role, token, expires_at')
          .single();
      })
      .then(function (r) {
        if (r.error) {
          /* The partial unique index is the real rule about duplicates, so its
             violation is reported as the plain fact rather than as a crash. */
          if (String(r.error.message || '').indexOf('agency_invites_live_idx') >= 0
              || r.error.code === '23505') {
            throw new Error('There is already a live invite for that address.');
          }
          throw r.error;
        }
        return r.data;
      });
  }

  function revokeInvite(id) {
    return client().then(function (c) {
      return c.from('agency_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  function acceptInvite(token) {
    return client().then(function (c) {
      return c.rpc('accept_agency_invite', { p_token: token });
    }).then(function (r) {
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      return row || { ok: false, reason: 'unknown' };
    });
  }

  /* ── inspection availability + tours ─────────────────────────────────────
     Availability is what an agent has pre-cleared; Tayo never proposes a time
     outside it. Tours are the concrete visits buyers have booked into.

     RLS already scopes both to the agency (agent_availability is
     is_agency_member, and viewings_select already allowed the agency), so
     these queries only have to ask the right question. */
  function availability(agentId) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      var q = c1.from('agent_availability')
        .select('id, agent_id, property_id, weekday, specific_date, start_time, end_time, slot_minutes, capacity')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('weekday', { ascending: true });
      return agentId ? q.eq('agent_id', agentId) : q;
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  function addAvailability(o) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency on this account');
      return c1.from('agent_availability').insert({
        agency_id: aid,
        agent_id: o.agentId || null,
        property_id: o.propertyId || null,
        weekday: o.weekday,
        start_time: o.start,
        end_time: o.end,
        slot_minutes: o.slotMinutes || 60,
        capacity: o.capacity || 4,
      }).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  /* Soft delete: an availability rule that produced past tours is history, and
     hard-deleting it would orphan the reason those visits existed. */
  function removeAvailability(id) {
    return client().then(function (c) {
      return c.from('agent_availability').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  /* Upcoming tours with who is coming. Two requests rather than one embed:
     inspection_slots has no foreign key to viewings that PostgREST can follow
     in this direction, and the attendee list needs the consumer name off the
     lead. */
  function tours(days) {
    var c1, aid1, slots;
    var from = new Date().toISOString();
    var to = new Date(Date.now() + (days || 30) * 864e5).toISOString();
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      aid1 = aid;
      return c1.from('inspection_slots')
        .select('id, agent_id, property_id, starts_at, duration_minutes, capacity, status, agency_note, properties(title, city), profiles:agent_id(full_name)')
        .eq('agency_id', aid)
        /* Cancelled tours are kept, not hidden. A tour that was called off is
           part of the record — who had booked, and that it did not happen —
           and an agency that cannot see it cannot answer for it. Buyers are a
           different matter: open_inspection_slots still excludes cancelled, so
           nobody can join one. */
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at', { ascending: true });
    }).then(function (r) {
      if (r.error) throw r.error;
      slots = r.data || [];
      if (!slots.length) return { data: [] };
      return c1.from('viewings')
        .select('id, slot_id, consumer_id, status, lead_id, leads:lead_id(consumer_name, consumer_phone)')
        .in('slot_id', slots.map(function (s) { return s.id; }))
        .is('deleted_at', null);
    }).then(function (vr) {
      if (vr && vr.error) throw vr.error;
      var byslot = {};
      ((vr && vr.data) || []).forEach(function (v) {
        (byslot[v.slot_id] = byslot[v.slot_id] || []).push({
          id: v.id,
          /* Carried so a cancelled tour can message these buyers back through
             the outbox, which addresses leads rather than viewings. */
          leadId: v.lead_id || null,
          status: v.status,
          name: (v.leads && v.leads.consumer_name) || 'A Synapse buyer',
          phone: (v.leads && v.leads.consumer_phone) || null,
        });
      });
      return slots.map(function (s) {
        /* On a live tour the head count is who is still coming. On a cancelled
           one it is who HAD booked, because that is the thing worth seeing
           afterwards. */
        var all = byslot[s.id] || [];
        var people = s.status === 'cancelled'
          ? all
          : all.filter(function (x) { return x.status !== 'cancelled'; });
        return {
          id: s.id,
          at: s.starts_at,
          minutes: s.duration_minutes,
          capacity: s.capacity,
          status: s.status,
          note: s.agency_note,
          agent: (s.profiles && s.profiles.full_name) || 'Unassigned',
          property: (s.properties && s.properties.title) || 'Listing unavailable',
          city: (s.properties && s.properties.city) || '',
          people: people,
          /* Confirmed attendance is what the agent should plan around: someone
             who has not answered the reconfirmation is not a headcount yet. */
          confirmed: people.filter(function (x) { return x.status === 'confirmed'; }).length,
        };
      });
    });
  }

  /* One call, so a cancellation cannot half-happen: the slot, the attendance
     rows and the affected leads all move together, and every buyer whose only
     tour this was goes back to `qualified` so they can be offered a new time.
     Nothing is deleted — cancelled rows stay as the record. */
  function cancelTour(id) {
    return client().then(function (c) {
      return c.rpc('cancel_inspection_slot', { p_slot_id: id });
    }).then(function (r) {
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!row || !row.ok) throw new Error('That tour could not be cancelled');
      return { affected: row.affected, leadsReset: row.leads_reset };
    });
  }

  function setSlotStatus(id, status) {
    return client().then(function (c) {
      return c.from('inspection_slots').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  function setViewingStatus(id, status) {
    return client().then(function (c) {
      return c.from('viewings').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  /* ── team messaging ──────────────────────────────────────────────────────
     The agency's own thread with one of its people, in the app. RLS already
     restricts a row to its two participants inside an agency they share, so
     the query does not re-implement that — it only has to ask for the pair in
     both directions, because a thread is what each said to the other. */
  function thread(agentId) {
    var c1, me;
    return client().then(function (c) { c1 = c; return c.auth.getUser(); })
      .then(function (u) {
        me = u && u.data && u.data.user && u.data.user.id;
        if (!me) throw new Error('Not signed in');
        return agencyId();
      })
      .then(function (aid) {
        if (!aid) return { data: [], error: null };
        return c1.from('team_messages')
          .select('id, sender_id, recipient_id, body, created_at')
          .eq('agency_id', aid)
          .or('and(sender_id.eq.' + me + ',recipient_id.eq.' + agentId + '),' +
              'and(sender_id.eq.' + agentId + ',recipient_id.eq.' + me + ')')
          .order('created_at', { ascending: true })
          .limit(200);
      })
      .then(function (r) {
        if (r.error) throw r.error;
        return { me: me, messages: (r.data || []).map(function (m) {
          return { id: m.id, body: m.body, at: m.created_at, mine: m.sender_id === me };
        }) };
      });
  }

  function sendTeamMessage(agentId, body) {
    var text = String(body || '').trim();
    if (!text) return Promise.reject(new Error('Nothing to send'));
    if (text.length > 4000) text = text.slice(0, 4000);
    var c1, me;
    return client().then(function (c) { c1 = c; return c.auth.getUser(); })
      .then(function (u) {
        me = u && u.data && u.data.user && u.data.user.id;
        if (!me) throw new Error('Not signed in');
        return agencyId();
      })
      .then(function (aid) {
        if (!aid) throw new Error('No agency on this account');
        return c1.from('team_messages')
          .insert({ agency_id: aid, sender_id: me, recipient_id: agentId, body: text })
          .select('id, body, created_at')
          .single();
      })
      .then(function (r) {
        if (r.error) throw r.error;
        return { id: r.data.id, body: r.data.body, at: r.data.created_at, mine: true };
      });
  }

  function roster() {
    var c1, aid1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      aid1 = aid;
      return c1.from('agency_members')
        .select('profile_id, role, joined_at, profiles(full_name, phone, whatsapp, avatar_url, ' +
                'agent_profiles(bio, years_experience, languages, specializations, areas_covered, ' +
                'response_rate_pct, closed_deals, avg_rating, certifications))')
        .eq('agency_id', aid)
        .is('deleted_at', null);
    }).then(function (r) {
      if (r.error) throw r.error;
      var rows = r.data || [];
      /* Follower and like counts come from agent_social_counts, a definer-rights
         view: the numbers are public, the people behind them are not, so nobody
         can enumerate who follows an agent. Second request rather than an embed
         because a view carries no foreign key to join on. Failure here degrades
         to nulls — the card then prints "—" rather than a zero it cannot back. */
      var ids = rows.map(function (m) { return m.profile_id; });
      if (!ids.length) return { rows: rows, social: {} };
      return c1.from('agent_social_counts').select('agent_id, followers, likes')
        .in('agent_id', ids)
        .then(function (sr) {
          var by = {};
          (sr.data || []).forEach(function (x) { by[x.agent_id] = x; });
          return { rows: rows, social: by };
        })
        .catch(function () { return { rows: rows, social: {} }; });
    }).then(function (bundle) {
      var social = bundle.social || {};
      return (bundle.rows || []).map(function (m) {
        var p = m.profiles || {};
        var soc = social[m.profile_id] || {};
        // PostgREST returns an object for a to-one embed and an array for
        // to-many; agent_profiles.profile_id is the key, but accept both.
        var ap = p.agent_profiles || {};
        if (Array.isArray(ap)) ap = ap[0] || {};
        var num = function (v) { return v == null ? null : Number(v); };
        return {
          id: m.profile_id,
          name: p.full_name || 'Unnamed teammate',
          role: m.role,
          joined: m.joined_at || null,
          phone: p.phone || p.whatsapp || null,
          avatar: p.avatar_url || null,
          bio: ap.bio || null,
          years: num(ap.years_experience),
          languages: ap.languages || [],
          specializations: ap.specializations || [],
          areas: ap.areas_covered || [],
          responseRate: num(ap.response_rate_pct),
          closed: num(ap.closed_deals),
          rating: num(ap.avg_rating),
          certifications: ap.certifications || [],
          followers: soc.followers == null ? null : Number(soc.followers),
          likes: soc.likes == null ? null : Number(soc.likes),
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

  /* The named human at Synapse this agency escalates to by phone.

     Comes from a SECURITY DEFINER function rather than a table read: the
     relationship manager is Synapse staff, not a colleague, so both
     profiles_select_own and the agency-colleagues policy correctly refuse to
     show them -- and widening either to expose staff profiles would leak far
     more than a name and a number.

     Three real states, and the caller must handle all three:
       { assigned: false }                    nobody assigned
       { assigned: true, phone: null }        assigned, but no number on file
       { assigned: true, phone: '+234...' }   callable
     Never invent a fallback number for the first two. */
  function relationshipManager() {
    return client().then(function (c) {
      return c.rpc('my_relationship_manager');
    }).then(function (r) {
      if (r.error) throw r.error;
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!row || !row.manager_name) return { assigned: false, name: null, phone: null, hours: null };
      return {
        assigned: true,
        name: row.manager_name,
        phone: row.manager_phone || null,
        hours: row.hours || null,
      };
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

  /* ── listing photographs ────────────────────────────────────────────────
     The new-listing form only ever asked for a URL, so an agency holding a
     photo on their phone had nowhere to put it. That is how a listing came to
     be published with a Google share link as its image: not carelessness, an
     absent feature. Same bucket convention as brand assets -- first folder is
     the agency id, and the storage policy checks membership of that folder. */
  var PHOTO_BUCKET = 'property-photos';
  var PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
  var PHOTO_MAX_BYTES = 10 * 1024 * 1024;

  function photoExtFor(file) {
    var m = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' };
    return m[file.type] || 'jpg';
  }

  /* Upload one listing photograph. Resolves to its public URL, which the
     caller stores in property_media.url. */
  function uploadPropertyPhoto(file) {
    if (!file) return Promise.reject(new Error('No file selected'));
    if (PHOTO_TYPES.indexOf(file.type) === -1) {
      return Promise.reject(new Error('Use a JPG, PNG, WEBP or AVIF photo'));
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return Promise.reject(new Error(
        'That photo is ' + Math.ceil(file.size / 1024 / 1024) + 'MB — keep it under 10MB'));
    }
    var c1, aid;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (a) {
      if (!a) throw new Error('no-agency: this account is not a member of any agency');
      aid = a;
      /* Random suffix, not just a timestamp: two photos chosen in the same
         second would otherwise collide, and upsert:false would reject the
         second with an error the person cannot act on. */
      var rand = (Math.random().toString(36).slice(2, 8));
      var path = aid + '/photo-' + Date.now() + '-' + rand + '.' + photoExtFor(file);
      return c1.storage.from(PHOTO_BUCKET).upload(path, file, {
        cacheControl: '31536000', upsert: false, contentType: file.type,
      }).then(function (r) {
        if (r.error) throw r.error;
        return c1.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
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


  /* ── generated captions, kept ─────────────────────────────────────────
     Pressing Generate used to produce a screen of captions that existed only
     in the tab: close it and ten minutes of work was gone. Nothing wrote to
     `generated_content` at all -- the table shipped with the schema and had
     never held a row.

     The two enums on it described a different product (narrative_angle was
     luxury|investment|rental|..., which are property categories, not the
     approaches syndication.js writes in), so the app's own values could not
     have been stored even if something had tried. Migration
     0071 added them. */

  /* syndication.js platform -> the content_type enum. A platform with no
     mapping is skipped rather than guessed at: writing the wrong enum value
     would file a TikTok script under Instagram forever. */
  var CONTENT_TYPE = {
    instagram: 'instagram_post',
    tiktok: 'tiktok_script',
    youtube: 'youtube_short',
    facebook: 'facebook_post',
    whatsapp: 'whatsapp_message',
  };
  /* narrative_angle values a generation may be filed under. 'custom' is what
     an agency's own template files as -- it has no enum value it could
     honestly claim, and inventing one per template would mean a migration
     every time somebody writes a caption. */
  var ANGLE_KEYS = { trust: 1, value: 1, life: 1, scarcity: 1, question: 1, custom: 1 };

  /**
   * Files every variant of one generation. Called right after Generate, so
   * what is on screen is already saved before the agency decides anything.
   *
   * One insert for the batch, not one per variant: twenty-five round trips
   * would make a fast action feel broken, and a partial save is worse than
   * none -- you could not tell which half you were looking at.
   */
  function saveGeneration(propertyId, variants, promptVersion) {
    if (!propertyId || !variants || !variants.length) return Promise.resolve({ saved: 0 });
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { saved: 0 };

      var rows = [];
      variants.forEach(function (v) {
        var ct = CONTENT_TYPE[v.platform];
        /* angleKey, not angle: since templates became rows, `angle` is a uuid.
           Reading it here skipped every variant and wrote nothing, quietly. */
        var key = ANGLE_KEYS[v.angleKey] ? v.angleKey : 'custom';
        if (!ct) return;                       // unknown platform: skip, never guess
        rows.push({
          property_id: propertyId,
          agency_id: aid,
          content_type: ct,
          narrative_angle: key,
          template_id: v.templateId || null,
          /* The caption as generated, hashtags and all -- this is the artefact
             worth keeping, not a summary of it. */
          generated_text: String(v.caption || ''),
          status: 'draft',
          generated_by: 'syndication.js',
          generation_prompt_version: String(promptVersion || 'angles-v1'),
        });
      });
      if (!rows.length) return { saved: 0 };

      return c1.from('generated_content').insert(rows).then(function (r) {
        if (r.error) throw r.error;
        return { saved: rows.length };
      });
    });
  }

  /** Everything generated for one listing, newest first. */
  function listGenerations(propertyId) {
    if (!propertyId) return Promise.resolve([]);
    return client().then(function (c) {
      return c.from('generated_content')
        .select('id, content_type, narrative_angle, generated_text, status, created_at')
        .eq('property_id', propertyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }


  /* ── the social pipeline ──────────────────────────────────────────────
     social_posts has existed since the first schema and nothing ever wrote a
     row to it. The portal's pipeline read from a `posts` array that was
     initialised to [] and never assigned, so every column was permanently
     empty and Approve, Schedule and Publish had nothing to act on -- which is
     exactly what an agency reported: captions generate, then the buttons do
     nothing.

     These are the reads and writes that stage needs. Everything is scoped by
     agency_id and RLS (social_posts_rw = is_agency_member) enforces the same
     rule server-side, so a caller cannot reach another agency's schedule. */

  /** Platforms we can honestly schedule to: the syndication engine validates
   *  against these five, and social_platform now carries all five. linkedin
   *  and x exist in the enum but nothing generates or checks content for them,
   *  so they are deliberately not offered. */
  var SCHEDULABLE = { instagram: 1, tiktok: 1, youtube: 1, facebook: 1, whatsapp: 1 };

  /** Everything this agency has queued, publishing or published. */
  function listSocialPosts() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('social_posts')
        .select('id, property_id, content_id, platform, status, scheduled_at, published_at, '
              + 'caption, media_urls, failure_reason, created_at')
        .eq('agency_id', aid)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(500);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  /** Captions generated but not yet approved -- the review queue.
   *  Joins the property so a card can show what it is advertising. */
  function listPendingContent() {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) return { data: [], error: null };
      return c1.from('generated_content')
        .select('id, property_id, content_type, narrative_angle, generated_text, status, created_at')
        .eq('agency_id', aid)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }

  /** Approve or discard a caption. 'approved' moves it out of the review
   *  queue; 'archived' is the discard, and is a soft state rather than a
   *  delete because an agency asking "what did we reject and why" is a fair
   *  question and a deleted row cannot answer it. */
  function setContentStatus(id, status) {
    if (!id || (status !== 'approved' && status !== 'archived' && status !== 'scheduled')) {
      return Promise.reject(new Error('bad status'));
    }
    var c1, me;
    return client().then(function (c) { c1 = c; return c.auth.getUser(); }).then(function (u) {
      me = u && u.data && u.data.user && u.data.user.id;
      var patch = { status: status, updated_at: new Date().toISOString() };
      if (status === 'approved') { patch.approved_by = me || null; patch.approved_at = new Date().toISOString(); }
      return c1.from('generated_content').update(patch).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  /**
   * Queue one caption across platforms and times.
   *
   * `slots` is a list of { platform, at } -- so "post this to Instagram at 9am
   * and to Facebook at 6pm" is one call producing two rows, which is how the
   * same post gets copies at different times on different channels rather than
   * an agency retyping it. One row per slot is what the publisher will read.
   *
   * dry_run stays true: nothing is connected to a platform yet, and a row that
   * claimed otherwise would be a lie the publisher would later act on.
   */
  function schedulePost(opts) {
    var o = opts || {};
    var slots = (o.slots || []).filter(function (sl) {
      return sl && SCHEDULABLE[sl.platform] && sl.at;
    });
    if (!o.propertyId) return Promise.reject(new Error('No listing on that post'));
    if (!slots.length) return Promise.reject(new Error('Pick at least one channel and time'));
    var c1, me;
    return client().then(function (c) { c1 = c; return c.auth.getUser(); })
      .then(function (u) { me = u && u.data && u.data.user && u.data.user.id; return agencyId(); })
      .then(function (aid) {
        if (!aid) throw new Error('No agency on this account');
        return c1.from('social_posts').insert(slots.map(function (sl) {
          return {
            property_id: o.propertyId,
            content_id: o.contentId || null,
            agency_id: aid,
            platform: sl.platform,
            status: 'scheduled',
            scheduled_at: new Date(sl.at).toISOString(),
            caption: String(o.caption || ''),
            media_urls: o.mediaUrls || null,
            dry_run: true,
            created_by: me || null,
          };
        })).select('id, platform, scheduled_at');
      })
      .then(function (r) { if (r.error) throw r.error; return r.data || []; });
  }

  /** Move a queued post to another time, another channel, or mark it done.
   *  Used by the calendar when a post is dragged to a different day. */
  function updateSocialPost(id, patch) {
    if (!id || !patch) return Promise.reject(new Error('nothing to update'));
    var row = { updated_at: new Date().toISOString() };
    if (patch.at) row.scheduled_at = new Date(patch.at).toISOString();
    if (patch.platform) {
      if (!SCHEDULABLE[patch.platform]) return Promise.reject(new Error('We do not publish to that yet'));
      row.platform = patch.platform;
    }
    if (patch.caption != null) row.caption = String(patch.caption);
    if (patch.status) {
      row.status = patch.status;
      /* published_at is what the calendar and the metrics read; setting the
         status without it leaves a post that is published on one screen and
         unpublished on the next. */
      if (patch.status === 'published') row.published_at = new Date().toISOString();
    }
    return client().then(function (c) {
      return c.from('social_posts').update(row).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }

  /** Take a post off the schedule. Soft, like everything else here. */
  function deleteSocialPost(id) {
    if (!id) return Promise.reject(new Error('no post'));
    return client().then(function (c) {
      return c.from('social_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }).then(function (r) { if (r.error) throw r.error; return true; });
  }


  /* ── caption templates ────────────────────────────────────────────────
     Ours (agency_id null) plus this agency's own, in one list. RLS decides
     which rows come back; this asks for both and sorts them together, so an
     agency's own angle can sit above a seeded one. */
  function listTemplates() {
    return client().then(function (c) {
      return c.from('content_templates')
        .select('id, agency_id, name, why, hook_pattern, body_pattern, cta, platforms, requires_verified, sort_order, angle_key')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || [];
    });
  }


  /* Writing a template. agency_id is stamped here from membership, never taken
     from the caller -- the RLS policy would refuse a foreign id anyway, but a
     client that can propose one is a client that will eventually send the
     wrong one. */
  function saveTemplate(t) {
    var c1;
    return client().then(function (c) { c1 = c; return agencyId(); }).then(function (aid) {
      if (!aid) throw new Error('No agency for this account.');
      var row = {
        agency_id: aid,
        name: String(t.name || '').trim(),
        why: String(t.why || '').trim(),
        hook_pattern: String(t.hook_pattern || ''),
        body_pattern: String(t.body_pattern || ''),
        cta: String(t.cta || ''),
        platforms: Array.isArray(t.platforms) ? t.platforms : [],
        requires_verified: !!t.requires_verified,
        angle_key: 'custom',
      };
      if (!row.name) throw new Error('Give the template a name.');
      if (!row.hook_pattern.trim()) throw new Error('A template needs an opening line.');
      return t.id
        ? c1.from('content_templates').update(row).eq('id', t.id).select('id').single()
        : c1.from('content_templates').insert(row).select('id').single();
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  /* Soft delete: a template that wrote captions still explains rows in
     generated_content, and template_id points at it. */
  function deleteTemplate(id) {
    return client().then(function (c) {
      return c.from('content_templates')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return true;
    });
  }


  /* Several photos at once. Sequential rather than Promise.all: a phone on a
     Nigerian mobile connection uploading eight files in parallel is how you get
     eight timeouts instead of eight photos, and the progress callback would
     have nothing meaningful to report. One at a time, in the order chosen, so
     the first file picked becomes display_order 0 -- the cover.

     A file that fails does not stop the rest. The caller is handed both lists
     and decides what to say; losing seven good photos because the eighth was a
     screenshot of a PDF would be its own bug. */
  function uploadPropertyPhotos(files, onProgress) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return Promise.resolve({ urls: [], failed: [] });
    var urls = [], failed = [];
    return list.reduce(function (chain, file, i) {
      return chain.then(function () {
        if (typeof onProgress === 'function') onProgress(i, list.length, file.name);
        return uploadPropertyPhoto(file)
          .then(function (url) { urls.push(url); })
          .catch(function (err) {
            failed.push({ name: file.name, reason: (err && err.message) || 'upload failed' });
          });
      });
    }, Promise.resolve()).then(function () {
      if (typeof onProgress === 'function') onProgress(list.length, list.length, null);
      return { urls: urls, failed: failed };
    });
  }

  window.SynListings = {
    uploadPropertyPhoto: uploadPropertyPhoto,
    uploadPropertyPhotos: uploadPropertyPhotos,
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
    invites: invites,
    createInvite: createInvite,
    revokeInvite: revokeInvite,
    acceptInvite: acceptInvite,
    availability: availability,
    addAvailability: addAvailability,
    removeAvailability: removeAvailability,
    tours: tours,
    cancelTour: cancelTour,
    setSlotStatus: setSlotStatus,
    setViewingStatus: setViewingStatus,
    thread: thread,
    sendTeamMessage: sendTeamMessage,
    relationshipManager: relationshipManager,
    assignLeads: assignLeads,
    deleteLeads: deleteLeads,
    queueMessages: queueMessages,
    listOutbox: listOutbox,
    cancelMessage: cancelMessage,
    sendOutbox: sendOutbox,
    listCampaigns: listCampaigns,
    saveGeneration: saveGeneration,
    listGenerations: listGenerations,
    listPendingContent: listPendingContent,
    setContentStatus: setContentStatus,
    listSocialPosts: listSocialPosts,
    schedulePost: schedulePost,
    updateSocialPost: updateSocialPost,
    deleteSocialPost: deleteSocialPost,
    listTemplates: listTemplates,
    saveTemplate: saveTemplate,
    deleteTemplate: deleteTemplate,
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
