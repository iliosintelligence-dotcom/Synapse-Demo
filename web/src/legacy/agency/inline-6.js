
    /* ══ DELETE AGENCY ═════════════════════════════════════════════════════
       The owner deletes the agency and their own account. The work is done
       by the delete-agency edge function (synapse-platform), one request per
       step, so the list on screen is the truth rather than an animation:

         preview  what would go and what would not        nothing changes
         begin    typed name checked, listings off the site
         files    photos, videos, logo and papers out of Storage
         data     every row, in one transaction
         finish   the owner's login, then the record is closed

       Every step is safe to repeat, and the server decides every rule again
       -- owner, typed name, paid plan, order -- so this block only has to be
       honest about what is happening and carry on from where it stopped.

       WHY A DIALOG ON <body>. After the data step the agency no longer
       exists: the role comes back empty, applyRole() strips this pane, and
       the portal behind the owner is an empty shell. The last step still has
       to be shown and pressed, so it cannot live in a pane.

       COMING BACK TO IT. An interrupted deletion that cannot be finished
       leaves somebody with a half-deleted agency, or a login they asked to
       be rid of, so there are two ways back in:
         · this browser notes the agency id just before begin, and on the
           next load asks the server where that deletion stands;
         · a portal with no agency at all asks the server, which finds the
           deletion its owner left unfinished -- the way back from another
           device, or after the browser forgot.
       The note holds an agency id and nothing about a person, and goes when
       the deletion completes. */
    (function () {
      'use strict';
      if (!window.SynAuth || !SynAuth.client) return;

      var FN = 'delete-agency';
      var MARK = 'synapse_agency_deletion_v1';
      /* Read once by the homepage to say what happened, then removed.
         sessionStorage rather than the URL: "your agency was deleted" should
         not be something a person can bookmark, share or land on by accident. */
      var GOODBYE = 'synapse_goodbye_v1';
      /* The agency's own data this browser keeps for the portal: the listings
         cache, an unsaved listing, campaigns, caption angles. Deleting the
         agency "completely" includes the copy on this device. Interface
         choices (theme, sidebar, consent) belong to the person and stay. */
      var AGENCY_CACHES = [
        'synapse_agency_listings_v5', 'synapse_listing_draft_v1',
        'synapse_agency_campaigns_v1', 'synapse_angles_v1', 'synapse_brand_onboard_skipped',
      ];
      /* The session supabase-js keeps (auth.js, storageKey). Removed by hand
         as a backstop: once the login is deleted, a sign-out that cannot reach
         the server must still not leave a dead session in this browser. */
      var SESSION_KEY = 'synapse_auth_v1';
      var TIER = { free: 'Free', accelerator: 'Accelerate', market_leader: 'Leader' };
      var KEPT_BECAUSE = {
        owns_another_agency: 'you also own another agency on Synapse',
        member_of_another_agency: 'you also work in another agency on Synapse',
        platform_staff: 'it is a Synapse staff account',
        records_elsewhere: 'other records on Synapse still point to it',
      };
      var STEPS = ['begin', 'files', 'data', 'finish'];
      var ICON_BIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
        + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/>'
        + '<path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
      var ICON_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" '
        + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

      var pv = null;          // the last answer from preview
      var job = null;         // the run in progress: { confirm, ack, kept, keptBecause }
      var running = false;
      var leaving = false;    // done: signing out, nothing left to close
      var opener = null;      // where focus returns when the dialog closes
      var scrim, dialog, titleEl, bodyEl, closeBtn;

      function esc(t) {
        return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? Math.floor(n) : 0; }
      function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
      /* The same comparison the database makes (agency_confirm_key): curly
         quotes straightened, runs of spaces collapsed, the ends trimmed;
         letters and case exact. A phone types ’ where the name was saved
         with ', and that is not a different name. */
      function confirmKey(s) {
        return String(s == null ? '' : s)
          .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
          .replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      }
      function longDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return 'the end of this period';
        return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      function why(code) { return KEPT_BECAUSE[code] || 'something else on Synapse still needs it'; }

      function readMark() {
        try {
          var m = JSON.parse(localStorage.getItem(MARK) || 'null');
          return (m && typeof m.a === 'string') ? m.a : null;
        } catch (e) { return null; }
      }
      function writeMark(aid) { try { localStorage.setItem(MARK, JSON.stringify({ a: aid })); } catch (e) {} }
      function clearMark() { try { localStorage.removeItem(MARK); } catch (e) {} }

      /* One request, always answered: { ok, status, data }, where status 0
         means the function was never reached. functions.invoke carries the
         session's token, which the function checks with Auth again. Its own
         refusals come with a sentence written for the person pressing the
         button (data.error, beside a data.code); anything else is described
         here instead, because a gateway's error text is written for nobody. */
      function call(body) {
        return SynAuth.client().then(function (c) {
          return c.functions.invoke(FN, { body: body });
        }).then(function (r) {
          if (!r.error) return { ok: true, status: 200, data: r.data || {} };
          var ctx = r.error.context;
          if (ctx && typeof ctx.json === 'function') {
            var status = ctx.status || 0;
            return ctx.json().then(
              function (d) { return { ok: false, status: status, data: d || {} }; },
              function () { return { ok: false, status: status, data: {} }; });
          }
          return { ok: false, status: 0, data: {} };
        }, function () { return { ok: false, status: 0, data: {} }; });
      }
      function said(res) {
        var d = res.data || {};
        if (typeof d.error === 'string' && d.error && typeof d.code === 'string') return d.error;
        if (res.status === 401) return 'Your session has ended. Sign in again, and this carries on from where it stopped.';
        if (!res.status) return 'Synapse could not be reached. Check your connection; it is safe to try again.';
        return 'Something went wrong part-way. It is safe to try again: it carries on from where it stopped.';
      }
      function errBox(text) {
        return '<div class="da-err" role="alert"><span class="da-ic" aria-hidden="true">!</span>'
          + '<span>' + esc(text) + '</span></div>';
      }

      /* ── the dialog ─────────────────────────────────────────────────── */
      function build() {
        if (scrim) return;
        scrim = document.createElement('div');
        scrim.className = 'da-scrim';
        scrim.hidden = true;
        scrim.innerHTML =
          '<div class="da-dialog" role="dialog" aria-modal="true" aria-labelledby="daTitle">'
          + '<div class="da-hd"><h2 class="da-title" id="daTitle" tabindex="-1"></h2>'
          + '<button type="button" class="da-x" aria-label="Close">×</button></div>'
          + '<div class="da-body"></div></div>';
        document.body.appendChild(scrim);
        dialog = scrim.firstChild;
        titleEl = scrim.querySelector('.da-title');
        bodyEl = scrim.querySelector('.da-body');
        closeBtn = scrim.querySelector('.da-x');
        closeBtn.addEventListener('click', close);
        /* A tap on the veil does nothing. Somebody halfway through typing
           their agency's name should not lose it to a stray touch. */
        scrim.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { e.preventDefault(); close(); return; }
          if (e.key !== 'Tab') return;
          /* The keyboard stays in here: behind the dialog is a portal that
             may no longer have an agency to show. */
          var f = [].slice.call(dialog.querySelectorAll(
            'button:not([disabled]):not([hidden]), input:not([disabled]), a[href]'));
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
      }
      function open() {
        build();
        if (!scrim.hidden) return;
        scrim.hidden = false;
        document.documentElement.style.overflow = 'hidden';
      }
      function close() {
        if (running || leaving || !scrim || scrim.hidden) return;
        scrim.hidden = true;
        document.documentElement.style.overflow = '';
        if (opener && opener.focus && document.contains(opener)) opener.focus();
        opener = null;
      }
      function show(title, html, focusSel) {
        titleEl.textContent = title;
        bodyEl.innerHTML = html;
        closeBtn.hidden = running || leaving;
        var f = focusSel && bodyEl.querySelector(focusSel);
        (f || titleEl).focus();
      }
      function problem(title, text, retry) {
        show(title, errBox(text) + '<div class="da-acts">'
          + '<button type="button" class="da-btn" data-da="close">Close</button>'
          + (retry ? '<button type="button" class="da-btn" data-da="retry">Try again</button>' : '')
          + '</div>', retry ? '[data-da="retry"]' : '[data-da="close"]');
        bodyEl.querySelector('[data-da="close"]').addEventListener('click', close);
        if (retry) bodyEl.querySelector('[data-da="retry"]').addEventListener('click', retry);
      }

      /* ── 1. what would go ───────────────────────────────────────────── */
      function start() {
        open();
        show('Delete agency', '<p class="da-p" role="status">Checking what would be deleted…</p>');
        var aid = (window.SynListings && SynListings.agencyId)
          ? SynListings.agencyId().catch(function () { return null; })
          : Promise.resolve(null);
        aid.then(function (a) {
          var body = { action: 'preview' };
          if (a) body.agency_id = a;       // without it, the server takes the one agency they own
          return call(body);
        }).then(function (res) {
          if (!res.ok) {
            /* "Try again" only where trying again could change the answer:
               not for somebody who is not the owner, or an agency already gone. */
            var code = (res.data && res.data.code) || '';
            problem('Delete agency', said(res), (code === 'not_owner' || code === 'agency_not_found') ? null : start);
            return;
          }
          route(res.data);
        });
      }
      function route(d) {
        pv = d || {};
        if (pv.state === 'data_deleted') renderFinishOnly(null);
        else renderConfirm(null);
      }

      function renderConfirm(errText) {
        var c = pv.counts || {};
        var login = pv.owner_login || {};
        var removable = login.removable === true;
        var name = String(pv.name || '').trim() || 'this agency';
        var team = num(c.team_members);
        var plan = pv.paid_plan || null;
        var phrase = String(pv.confirm_phrase || '');
        var begun = pv.state === 'begun';

        /* Counted by the same SQL that will do the deleting, so these are the
           numbers that go -- not an estimate drawn from what this page has
           loaded. Every line here is fixed text and numbers; the agency's own
           name only ever reaches the page escaped. */
        var gone = [];
        gone.push(plural(num(c.listings), 'listing')
          + (num(c.listing_media) ? ', with ' + plural(num(c.listing_media), 'photo or video', 'photos and videos') : ''));
        gone.push(plural(num(c.leads), 'lead') + ' in your CRM, with their notes, stages and history');
        if (num(c.social_posts)) gone.push(plural(num(c.social_posts), 'post') + ' in the Social studio. Anything scheduled will not go out');
        if (num(c.short_links)) gone.push(plural(num(c.short_links), 'share link') + '. Links you have sent out stop working');
        if (num(c.social_accounts)) {
          gone.push(plural(num(c.social_accounts), 'connected social account')
            + '. Synapse’s access to them is removed; the accounts themselves stay yours');
        }
        if (num(c.campaigns)) gone.push(plural(num(c.campaigns), 'campaign'));
        if (num(c.tours)) gone.push(plural(num(c.tours), 'tour or viewing slot', 'tours and viewing slots'));
        if (num(c.documents)) gone.push(plural(num(c.documents), 'verification document'));
        gone.push('Your brand and logo, team chat, invites, and the record of your plan payments in Synapse');
        if (removable) gone.push('<b>Your own profile, photo and login.</b> You will be signed out');

        /* What stays is said as plainly as what goes. Somebody told their
           posts were "deleted" who then finds them on Instagram has been
           misled, and so has somebody who thinks their team lost their
           accounts with the agency. */
        var kept = [];
        kept.push('<b>Posts already published</b> on Facebook, Instagram, Telegram, TikTok or X stay up. '
          + 'Synapse cannot recall them; delete them in those apps if you want them gone.');
        kept.push('<b>Your team' + (team ? ' (' + plural(team, 'person', 'people') + ')' : '') + '</b> keep their own '
          + 'Synapse logins and profiles. They lose access to this agency, and nothing else.');
        if (!removable) kept.push('<b>Your login</b> stays, because ' + esc(why(login.kept_because)) + '.');
        kept.push('Paystack keeps its own receipts for anything you paid.');
        kept.push('Reports made to Synapse about this agency are kept, so deleting it cannot erase them.');
        kept.push('A note that this agency was deleted: the date and how many items went, with no names in it.');

        /* Paid up: allowed, and said in so many words first. There is no
           recurring charge to stop and no refund to give, so the only thing
           to agree to is that the days left are lost. */
        var planHtml = plan
          ? '<label class="da-plan"><input type="checkbox" id="daAck"><span>Your <b>'
            + esc(TIER[plan.tier] || plan.tier) + '</b> plan is paid until <b>' + esc(longDate(plan.until))
            + '</b>. Deleting does not refund the days left, and nothing more will be charged. I understand.</span></label>'
          : '';

        show('Delete ' + name, ''
          + (begun
              ? '<p class="da-p"><b>You started deleting this agency and it did not finish.</b> '
                + 'Its listings are already off the site. Confirm below to finish the job.</p>'
              : '<p class="da-p">This deletes ' + (removable
                  ? 'the agency, everything in it, and your own Synapse account'
                  : 'the agency and everything in it')
                + '. It cannot be undone, and nobody at Synapse can bring it back.</p>')
          + '<div class="da-group"><div class="da-k">What is deleted</div><ul class="da-list"><li>'
          + gone.join('</li><li>') + '</li></ul></div>'
          + '<div class="da-group"><div class="da-k">What is not</div><ul class="da-list"><li>'
          + kept.join('</li><li>') + '</li></ul></div>'
          + planHtml
          + '<p class="da-note">Your listings come off the site the moment you press Delete; the rest takes '
          + 'a few seconds. Keep this page open until it says it is done. If anything interrupts it, come '
          + 'back here and it carries on from where it stopped.</p>'
          /* A refusal (wrong name, box unticked) is shown here, beside the
             field that puts it right -- focus lands in that field, and an
             error at the top of a long dialog would be scrolled out of view. */
          + (errText ? errBox(errText) : '')
          + '<div class="da-confirm"><label for="daName">To confirm, type <b>' + esc(phrase) + '</b></label>'
          + '<input id="daName" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></div>'
          + '<div class="da-acts">'
          + '<button type="button" class="da-btn" data-da="keep">' + (begun ? 'Not now' : 'Keep my agency') + '</button>'
          + '<button type="button" class="da-btn da-kill" data-da="kill" disabled>' + ICON_BIN
          + '<span>' + (removable ? 'Delete agency and account' : 'Delete agency') + '</span></button>'
          + '</div>', '#daName');

        var input = bodyEl.querySelector('#daName');
        var ack = bodyEl.querySelector('#daAck');
        var kill = bodyEl.querySelector('[data-da="kill"]');
        var want = confirmKey(phrase);
        /* Live only when the name matches and, on a paid plan, the box is
           ticked. The server checks both again; this only saves a refusal.
           Deliberately no Enter-to-delete: it takes a press of the button. */
        function arm() {
          kill.disabled = !(want && confirmKey(input.value) === want && (!plan || (ack && ack.checked)));
        }
        input.addEventListener('input', arm);
        if (ack) ack.addEventListener('change', arm);
        bodyEl.querySelector('[data-da="keep"]').addEventListener('click', close);
        kill.addEventListener('click', function () {
          if (kill.disabled) return;
          /* Sent in the form both sides compare, so an unusual space a
             keyboard slipped in cannot make the server disagree with the
             button it just let through. */
          job = { confirm: confirmKey(input.value), ack: !!(ack && ack.checked), kept: !removable, keptBecause: login.kept_because || null };
          run(0);
        });
      }

      /* Past the data step there is nothing left to confirm: the agency is
         gone, and what remains is the login the owner asked to be rid of. */
      function renderFinishOnly(errText) {
        var pending = pv.owner_login === 'pending';
        job = { confirm: '', ack: false, kept: !pending, keptBecause: pv.kept_because || null };
        show('Finish deleting', ''
          + (errText ? errBox(errText) : '')
          + '<p class="da-p">Your agency and everything in it have already been deleted. '
          + (pending
              ? 'One step is left: deleting your own login.'
              : 'One step is left: closing up. Your login stays, because ' + esc(why(pv.kept_because)) + '.')
          + '</p>'
          + stepsHtml(3)
          + '<div class="da-acts">'
          + '<button type="button" class="da-btn" data-da="later">Not now</button>'
          + '<button type="button" class="da-btn da-kill" data-da="finish">' + ICON_BIN
          + '<span>' + (pending ? 'Delete my login' : 'Finish') + '</span></button>'
          + '</div>', '[data-da="finish"]');
        bodyEl.querySelector('[data-da="later"]').addEventListener('click', close);
        bodyEl.querySelector('[data-da="finish"]').addEventListener('click', function () { run(3); });
      }

      /* ── 2. the run ─────────────────────────────────────────────────── */
      function stepLabel(k) {
        return [
          'Taking your listings off the site and stopping anything scheduled',
          'Deleting your photos, videos, logo and documents',
          'Deleting listings, leads, posts and your team’s access',
          job && job.kept ? 'Closing up' : 'Deleting your login',
        ][k];
      }
      function stepsHtml(doneBefore) {
        return '<ol class="da-steps">' + STEPS.map(function (s, k) {
          var done = k < doneBefore;
          return '<li class="' + (done ? 'is-done' : 'is-wait') + '" data-step="' + k + '">'
            + '<span class="da-ic" aria-hidden="true">' + (done ? ICON_TICK : '') + '</span>'
            + '<span class="da-sl">' + esc(stepLabel(k)) + '</span></li>';
        }).join('') + '</ol>';
      }
      function setStep(k, state) {
        var li = bodyEl.querySelector('[data-step="' + k + '"]');
        if (!li) return;
        li.className = 'is-' + state;
        li.querySelector('.da-ic').innerHTML = state === 'done' ? ICON_TICK : (state === 'failed' ? '!' : '');
        li.querySelector('.da-sl').textContent = stepLabel(k);
      }
      function status(text) {
        var s = bodyEl.querySelector('#daStatus');
        if (s) s.textContent = text;
      }
      function hold(e) { e.preventDefault(); e.returnValue = ''; return ''; }
      function stop() {
        running = false;
        window.removeEventListener('beforeunload', hold);
        if (closeBtn) closeBtn.hidden = leaving;
      }

      function run(from) {
        if (running || leaving) return;
        running = true;
        /* Leaving mid-step is safe -- every step can be repeated -- but it
           should be a choice, so the browser asks first. */
        window.addEventListener('beforeunload', hold);
        show(pv.name ? 'Deleting ' + pv.name : 'Deleting', ''
          + '<p class="da-p" id="daStatus" role="status">Deleting. Keep this page open; it takes a few seconds.</p>'
          + stepsHtml(from)
          + '<div id="daAfter"></div>');
        step(from);
      }

      function step(k) {
        setStep(k, 'doing');
        status(stepLabel(k) + '…');
        var body = { action: STEPS[k], agency_id: pv.agency_id };
        if (STEPS[k] === 'begin') {
          body.confirm_name = job.confirm;
          body.acknowledge_plan = job.ack;
          /* Noted BEFORE the request, so an answer lost on the way back still
             leaves this browser knowing to ask. A refused begin leaves a note
             that the next load finds pointing at nothing, and clears. */
          writeMark(pv.agency_id);
        }
        call(body).then(function (res) {
          var d = res.data || {};
          if (STEPS[k] === 'finish' && !res.ok && res.status === 401) {
            /* The session's login is gone, which is what finish does: a first
               attempt that removed it and then lost its answer looks exactly
               like this from here. */
            done({ owner_login: job.kept ? 'kept' : 'removed', kept_because: job.keptBecause });
            return;
          }
          if (!res.ok) { failed(k, res); return; }

          if (STEPS[k] === 'begin' && d.state === 'data_deleted') {
            // Somebody (another tab) got further already: straight to the end.
            setStep(0, 'done'); setStep(1, 'done'); setStep(2, 'done');
            step(3);
            return;
          }
          if (STEPS[k] === 'data') {
            /* The database decides at this point whether the login can go
               (erase_personal_data may find it is still needed elsewhere),
               and the last row says which it decided. */
            job.kept = d.owner_login === 'kept';
            job.keptBecause = d.kept_because || null;
          }
          if (STEPS[k] === 'finish') {
            if (d.state === 'complete') { done(d); return; }
            failed(k, { ok: false, status: 200, data: { code: 'login', error: d.login_error
              ? 'Your agency’s data is deleted, but your login could not be removed just now. Try again in a moment.'
              : 'The last step did not finish. It is safe to try again.' } });
            return;
          }
          setStep(k, 'done');
          step(k + 1);
        });
      }

      function failed(k, res) {
        stop();
        var code = (res.data && res.data.code) || '';
        /* A wrong name or an unticked box goes back to the form, where it is
           put right. The server changed nothing. */
        if (k === 0 && (code === 'name_mismatch' || code === 'plan_not_acknowledged')) {
          if (pv.state === 'ready') clearMark();   // nothing was started to come back to
          renderConfirm(said(res));
          return;
        }
        setStep(k, 'failed');
        status('It stopped at the step marked below. Nothing after it was attempted.');
        var signIn = res.status === 401;
        var gone = code === 'agency_not_found' || code === 'not_owner';
        var after = bodyEl.querySelector('#daAfter');
        after.innerHTML = errBox(said(res)) + '<div class="da-acts">'
          + '<button type="button" class="da-btn" data-da="close">Close</button>'
          + (signIn
              ? '<a class="da-btn" data-da="signin" href="signin.html?role=agency&amp;reason=agency&amp;next='
                + encodeURIComponent(location.pathname + '#subscription') + '">Sign in again</a>'
              : (gone ? '' : '<button type="button" class="da-btn" data-da="retry">Try again</button>'))
          + '</div>';
        after.querySelector('[data-da="close"]').addEventListener('click', close);
        var again = after.querySelector('[data-da="retry"]');
        if (again) {
          again.addEventListener('click', function () { run(k); });
          again.focus();
        } else {
          after.querySelector('.da-btn:last-child').focus();
        }
      }

      /* ── 3. done: off the device, signed out, home ──────────────────── */
      function done(d) {
        stop();
        leaving = true;
        closeBtn.hidden = true;
        STEPS.forEach(function (s, k) { setStep(k, 'done'); });
        titleEl.textContent = 'Deleted';
        var kept = d.owner_login === 'kept';
        status(kept
          ? 'Done. The agency has been deleted. Your login stays, because ' + why(d.kept_because || job.keptBecause) + '.'
          : 'Done. The agency and your Synapse account have been deleted.');
        clearMark();
        AGENCY_CACHES.forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
        try { sessionStorage.setItem(GOODBYE, JSON.stringify({ kind: 'agency', login: kept ? 'kept' : 'removed' })); } catch (e) {}

        var after = bodyEl.querySelector('#daAfter');
        if (d.files_left) {
          /* Said rather than swallowed: a few files uploaded in the last
             seconds could not be removed by the final sweep. */
          after.innerHTML = '<p class="da-note">A few files added in the last moments could not be removed. '
            + 'Nothing links to them any more; <a href="your-data.html">write to us</a> if you want them removed by hand.</p>'
            + '<div class="da-acts"><button type="button" class="da-btn" data-da="leave">Continue</button></div>';
          var b = after.querySelector('[data-da="leave"]');
          b.addEventListener('click', leave);
          b.focus();
        } else {
          after.innerHTML = '<p class="da-note">Signing you out…</p>';
          setTimeout(leave, 1800);
        }
      }
      function leave() {
        SynAuth.signOut().catch(function () {}).then(function () {
          try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
          location.replace(location.origin + '/');
        });
      }

      /* ── the section, owner only ────────────────────────────────────── */
      function showSection() {
        var sec = document.getElementById('daSection');
        var card = document.getElementById('daCard');
        if (!sec || !card || sec.dataset.on) return;
        sec.dataset.on = '1';
        card.innerHTML = '<p class="da-lede">Deletes this agency and everything in it, together with your own '
          + 'Synapse account. It cannot be undone. You will see exactly what goes before anything does.</p>'
          + '<button type="button" class="da-btn da-open" id="daOpen">' + ICON_BIN + '<span>Delete agency…</span></button>';
        sec.hidden = false;
        document.getElementById('daOpen').addEventListener('click', function () {
          opener = this;
          start();
        });
      }
      /* The role arrives from its own round trip (applyRole), so this both
         listens for it and checks whether it has already landed. An admin or
         an agent never has this pane at all -- applyRole removes it -- and the
         function compares the caller with agencies.owner_id on every step. */
      document.addEventListener('syn:role', function (e) {
        if (e.detail === 'agency_owner') showSection();
      });
      if (document.body.dataset.role === 'agency_owner') showSection();

      /* ── coming back to an unfinished one ───────────────────────────── */
      function resume(aid) {
        var body = { action: 'preview' };
        if (aid) body.agency_id = aid;
        call(body).then(function (res) {
          if (!res.ok) {
            /* Gone (finished, or never begun) or not theirs: the note points
               at nothing any more. Matched on the function's own code, not the
               status -- a 404 from the gateway means the function is missing,
               which says nothing about the deletion. So does a 401, a network
               failure, or a 400 (no agency and nothing unfinished). */
            var code = (res.data && res.data.code) || '';
            if (code === 'agency_not_found' || code === 'not_owner') clearMark();
            return;
          }
          var d = res.data || {};
          if (d.state !== 'begun' && d.state !== 'data_deleted') { clearMark(); return; }
          open();
          route(d);
        });
      }
      SynAuth.ready().then(function (u) {
        if (!u) return;
        var aid = readMark();
        if (aid) { resume(aid); return; }
        if (!window.SynListings || !SynListings.agencyId) return;
        SynListings.agencyId().then(function (mine) {
          if (!mine) resume(null);
        }, function () { /* unknown is not "none": ask nothing */ });
      });
    })();
  