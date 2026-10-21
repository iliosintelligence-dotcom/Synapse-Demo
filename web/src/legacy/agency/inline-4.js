
    /* The portal is an agency workspace, there is no anonymous view of it.
       This is a UX gate: it stops the screen rendering for a signed-out
       visitor. The actual protection for agency data is RLS in Postgres, which
       is what stops a signed-in customer reading another tenant's rows. */
    (function () {
      if (!window.SynAuth) return;
      SynAuth.requireAuth({ role: 'agency', reason: 'agency' });
    })();

    /* ── the number Tayo hands a lead to ─────────────────────────────────
       Registration asks for this now, but it cannot reach an account that
       already exists, and on 2026-09-06 not one of the 41 agency members had
       a number on file -- so every live lead resolved to nobody reachable.

       Not dismissible. The consequence of ignoring it is silent: leads simply
       never arrive, and nothing else in the product would ever say why. It
       goes away by being answered, and only by that. */
    (function () {
      var box = document.getElementById('needPhone');
      if (!box || !window.SynListings || !SynListings.myPhone) return;

      /* Local: escT is a const in an earlier script block and is not in scope
         here. The text is a database error message, so it is escaped rather
         than trusted into innerHTML. */
      function esc1(t) {
        return String(t == null ? '' : t)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      function draw(err) {
        box.innerHTML =
          '<div class="np-txt"><b>Tayo has no way to reach you</b>'
          + '<span>Leads are handed over on WhatsApp. Without a number here, '
          + 'a lead assigned to you cannot be sent anywhere.</span></div>'
          + '<form id="npForm" novalidate>'
          + '<input id="npInput" type="tel" inputmode="tel" autocomplete="tel" '
          + 'placeholder="0803 123 4567" aria-label="Your WhatsApp number">'
          + '<button type="submit" id="npSave">Save</button>'
          + '</form>'
          + (err ? '<div class="np-err" role="alert">' + esc1(err) + '</div>' : '');
        box.hidden = false;

        document.getElementById('npForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var input = document.getElementById('npInput');
          var btn = document.getElementById('npSave');
          var val = input.value.trim();
          if (!val) { input.focus(); return; }
          btn.disabled = true; btn.textContent = 'Saving…';
          SynListings.setMyPhone(val)
            .then(function (stored) {
              box.hidden = true;
              box.innerHTML = '';
              if (typeof toast === 'function') {
                toast('Saved. Tayo will reach you on ' + stored);
              }
            })
            .catch(function (e2) {
              // Redrawn rather than patched, so the message and the field
              // cannot drift apart across retries.
              draw((e2 && e2.message) || 'That number could not be saved');
            });
        });
      }

      SynListings.myPhone().then(function (me) {
        // null means we could not tell -- an unknown is not a missing number,
        // and a banner shown to somebody who already gave us one is noise.
        if (!me) return;
        if (String(me.phone || '').trim()) return;
        draw(null);
      });
    })();
  