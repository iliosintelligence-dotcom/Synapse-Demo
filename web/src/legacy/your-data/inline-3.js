
  (function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };

    /* Every local key this app writes about a person. Enumerated rather than
       matched on a prefix, because a prefix match would sweep up whatever a
       future feature happens to name similarly — and a delete button that
       removes more than it says is as bad as one that removes less. */
    var LOCAL_KEYS = [
      ['toju_visitor_v1',        'Your visitor id'],
      ['toju_chat_v1',           'Conversations with Tayo'],
      ['toju_sessions_v1',       'Past conversations'],
      ['synapse_saved',          'Saved homes'],
      ['synapse_recent_views',   'Listings you opened'],
      ['synapse_dream_boards_v1','Dream board'],
      ['synapse_moodboard_v1',   'Mood board'],
      ['synapse_browse_prefs',   'Search preferences'],
      ['synapse_proximity_v1',   'Proximity alerts'],
      ['synapse_last_visit',     'When you last visited'],
      ['syn_arrival_v1',         'How you first arrived'],
      ['syn_seam_scroll',        'Where you were on each page'],
    ];

    function readLocal(k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    }

    function sizeOf(v) {
      if (v == null) return 0;
      try {
        var p = JSON.parse(v);
        if (Array.isArray(p)) return p.length;
        if (p && typeof p === 'object') return Object.keys(p).length;
      } catch (e) { /* a plain string counts as one thing */ }
      return 1;
    }

    var VISITOR = readLocal('toju_visitor_v1');
    var PROFILE = null;

    /* ── who ─────────────────────────────────────────────────────────── */
    function paintWho() {
      /* The sign-in caveat is only true of people who have a sign-in. */
      var sn = $('signinNote');
      if (sn) sn.hidden = !PROFILE;
      if (PROFILE) {
        $('whoP').textContent = 'You are signed in. Your data is stored against your account.';
        $('whoId').textContent = PROFILE;
        return;
      }
      if (VISITOR) {
        $('whoP').textContent = 'You are not signed in. Your data is stored against a random id '
          + 'created by this browser — it is not linked to your name.';
        $('whoId').textContent = VISITOR;
        return;
      }
      $('whoP').textContent = 'Nothing identifies you yet. You have not talked to Tayo or saved '
        + 'anything from this browser.';
      $('whoId').textContent = '—';
      $('whoId').classList.add('yd-none');
    }

    /* ── what ────────────────────────────────────────────────────────── */
    function paintHeld() {
      var ul = $('heldList');
      var rows = [];
      LOCAL_KEYS.forEach(function (pair) {
        var v = readLocal(pair[0]);
        if (v == null) return;
        rows.push('<li><span>' + pair[1] + '</span><b>' + sizeOf(v) + '</b></li>');
      });
      if (!rows.length) {
        ul.innerHTML = '<li><span class="yd-none">Nothing stored on this device.</span></li>';
      } else {
        ul.innerHTML = rows.join('');
      }
      /* Said plainly rather than implied. This page can see what is in this
         browser; it cannot enumerate every server-side table from here, and
         pretending otherwise would be the dishonest version of a data-rights
         page. */
      $('heldNote').innerHTML = 'This lists what is on this device. We also hold records on our '
        + 'servers — conversations, leads, and alerts. The download below is a copy of this device only; '
        + 'to get the server records, email ilios.intelligence@gmail.com. Deleting below removes both. '
        + '<a href="/privacy">The policy</a> lists them all.';
    }

    /* ── export ──────────────────────────────────────────────────────── */
    $('exportBtn').addEventListener('click', function () {
      var out = {
        exported_at: new Date().toISOString(),
        identifier: PROFILE || VISITOR || null,
        identifier_kind: PROFILE ? 'account' : (VISITOR ? 'visitor' : 'none'),
        this_device: {},
      };
      LOCAL_KEYS.forEach(function (pair) {
        var v = readLocal(pair[0]);
        if (v == null) return;
        /* Parsed where it parses, so the file reads as data rather than as a
           wall of escaped JSON strings. */
        try { out.this_device[pair[0]] = JSON.parse(v); }
        catch (e) { out.this_device[pair[0]] = v; }
      });

      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'synapse-my-data-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      $('exportNote').textContent = 'Downloaded.';
      $('exportNote').className = 'yd-note yd-ok';
    });

    /* ── erasure ─────────────────────────────────────────────────────── */
    $('confirmBox').addEventListener('input', function (e) {
      $('deleteBtn').disabled = e.target.value.trim().toUpperCase() !== 'DELETE';
    });

    $('deleteBtn').addEventListener('click', function () {
      var note = $('deleteNote');
      $('deleteBtn').disabled = true;
      note.textContent = 'Deleting…';
      note.className = 'yd-note';
      if (window.SynLoader) SynLoader.show('Deleting your data…');

      /* The server first. Clearing this browser before the server call would
         throw away the visitor id the call needs — and would leave somebody
         believing their data was gone while it sat on a server they could no
         longer name. */
      var server = Promise.resolve({ ok: true, skipped: true });
      if (window.SynAuth && SynAuth.client && (PROFILE || VISITOR)) {
        server = SynAuth.client().then(function (c) {
          return PROFILE
            ? c.rpc('erase_personal_data', { p_profile_id: PROFILE })
            : c.rpc('forget_visitor', { p_visitor_id: VISITOR });
        }).then(function (r) {
          return { ok: !r.error, error: r.error && r.error.message };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || 'could not reach the server' };
        });
      }

      server.then(function (res) {
        /* If the server refused, the identifier is the only handle for finishing this by hand, so
           it stays on screen and on the device until erasure has actually happened. */
        if (!res.ok) {
          if (window.SynLoader) SynLoader.hide();
          note.innerHTML = 'The server refused: ' + String(res.error || 'unknown error').slice(0, 120).replace(/[<>&]/g, '')
            + '. Nothing was cleared, so you can try again. If it keeps failing, email ilios.intelligence@gmail.com and quote the id above.';
          note.className = 'yd-note yd-bad';
          return;
        }
        LOCAL_KEYS.forEach(function (pair) {
          try { localStorage.removeItem(pair[0]); } catch (e) {}
        });
        VISITOR = null; PROFILE = null;
        paintWho(); paintHeld();
        if (window.SynLoader) SynLoader.hide();

        if (res.ok) {
          /* Says what was done, not what sounds most final. */
          note.textContent = 'Done. This device is cleared and your personal details have been '
            + 'removed from our records. Your sign-in still works.';
          note.className = 'yd-note yd-ok';
        } else {
          /* Named, not swallowed. Somebody who asked for erasure is entitled
             to know it did not fully happen, and to be told what to do next
             — a green tick over a failed call is the worst outcome here. */
          note.innerHTML = 'This device is cleared, but the server refused: '
            + String(res.error || 'unknown error').slice(0, 120)
            + '. Please email us and quote the id above so we can complete it by hand.';
          note.className = 'yd-note yd-bad';
        }
      });
    });

    $('copyId').addEventListener('click', function () {
      var t = $('whoId').textContent;
      if (!t || t === '—') return;
      try {
        navigator.clipboard.writeText(t).then(function () {
          $('copyId').textContent = 'Copied';
          setTimeout(function () { $('copyId').textContent = 'Copy'; }, 1600);
        });
      } catch (e) { /* selection is user-select: all, so it can be copied by hand */ }
    });

    /* Signed in or not, the page works — it just has a different handle on
       you. Resolved before the first paint so the id shown is the right one. */
    function start() {
      paintWho(); paintHeld();
    }

    if (window.SynAuth && SynAuth.client) {
      SynAuth.client().then(function (c) { return c.auth.getUser(); })
        .then(function (u) {
          PROFILE = (u && u.data && u.data.user && u.data.user.id) || null;
          start();
        })
        .catch(start);
    } else {
      start();
    }
  }());
  