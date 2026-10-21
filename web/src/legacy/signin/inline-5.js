
    (function () {
      var params = new URLSearchParams(location.search);
      var role   = params.get('role') === 'agency' ? 'agency' : 'customer';
      var reason = params.get('reason') || '';
      var next   = params.get('next') || '';
      /* A SIGN-IN LANDS ON OVERVIEW. Eden, 2026-09-28: "When I sign in, take
         me to the overview page. Don't take me to the social." next can carry
         the pane the session ended on (#social -- requireAuth keeps it on
         purpose). That is right for the bounce further down, where a session
         already exists and the visitor is only being returned to their place;
         it is wrong after somebody has actually signed in. So every redirect
         that follows a real sign-in goes through here, and a portal address
         loses its pane. Customer pages keep theirs. */
      function signedInDest(fallback) {
        var d = SynAuth.safeNext(next, fallback);
        return /(^|\/)agency\.html/.test(d) ? d.replace(/#.*$/, '') : d;
      }

      // 'in' | 'up'. Honours ?mode=up so a "Create account" link elsewhere
      // actually lands on the create-account form — without this every entry
      // point, register or login, dropped the visitor on the same sign-in tab.
      var mode = params.get('mode') === 'up' ? 'up' : 'in';
      var busy = false;  // single-flight guard: blocks double-submit races

      var el = function (id) { return document.getElementById(id); };
      var form = el('auForm'), go = el('auGo'), note = el('auNote');

      /* When a recovery/magic link's one-time token is already spent, Supabase
         redirects back here with the failure in the hash fragment rather than
         establishing a session — so no PASSWORD_RECOVERY event ever fires and
         this would otherwise look like an ordinary, unexplained sign-in page.
         The common real-world cause: mail providers and corporate security
         scanners "pre-visit" links in emails to check for phishing, which
         silently consumes the single-use token before the person ever clicks
         it themselves. Name that, rather than leaving them guessing. */
      // Captured now, shown after setMode() runs at the bottom of this script —
      // setMode() calls clearErrors(), which wipes #auNote, so showing this
      // immediately just gets erased a few lines later.
      var expiredLinkMsg = null;
      (function () {
        var hash = new URLSearchParams(location.hash.replace(/^#/, ''));
        var code = hash.get('error_code');
        if (!code) return;
        expiredLinkMsg = (code === 'otp_expired')
          ? 'That reset link has already been used or opened — some mail apps open links automatically to scan them, which can use it up before you click it yourself. Request a fresh one below.'
          : 'That link did not work — request a fresh one below.';
        history.replaceState(null, '', location.pathname + location.search);
      })();

      /* ── framing: why am I here? ─────────────────────────────────────── */
      var WHY = {
        contact: { t: 'One step before we introduce you.',
                   d: 'We ask for an account before sharing your details with an agent — so you can see every conversation in one place, and so no agency ever gets your number without you choosing.' },
        agency:  { t: 'Set up your agency workspace.',
                   d: 'Your listings, leads and verification all live behind this login.' },
        idle:    { t: 'You were signed out.',
                   d: 'For your security we sign you out after a couple of hours away. Sign in again to carry on.' },
        saved:   { t: 'Keep your saved homes.',
                   d: 'An account keeps them on every device instead of just this browser.' },
      };
      if (reason && WHY[reason]) {
        var w = el('auWhy');
        w.hidden = false;
        w.innerHTML = '<div><b>' + WHY[reason].t + '</b><br>' + WHY[reason].d + '</div>';
        if (reason === 'contact') mode = 'up';
      }
      if (role === 'agency') {
        /* An agency is not moving house. The buyer's panel talks about saved
           homes and conversations with Tayo, which is the right thing to say
           to someone at the end of a search and the wrong thing entirely to
           someone arriving at work. This is about the leads waiting, the
           follow-ups overdue, and the posts that brought them in. */
        el('artSub').textContent = 'Every enquiry, every reply and every post that brought them in — '
          + 'in one place your whole team works from.';
        if (!reason) mode = 'up';
      }

      /* THE LINE THE CYCLER CHOSE, APPLIED LAST.
         It has to come after the agency block above, which used to hard-code
         'The leads are already waiting.' here -- that line is now the first
         entry of the LANDMARKS set, so the agency door still opens on it and
         then moves through the other four. Written last because whoever
         writes last wins, and the cycler is the one that knows which
         photograph is actually on screen.

         Guarded rather than assumed: if the cycler threw, or the element is
         gone, the markup's own line stands and the page is still a page. */
      if (window.SYN_ART_LINE && el('artQuote')) {
        el('artQuote').textContent = window.SYN_ART_LINE;
      }

      /* ── mode switch ─────────────────────────────────────────────────── */
      function setMode(m) {
        mode = m;
        var up = m === 'up';
        el('tabUp').classList.toggle('on', up);
        el('tabIn').classList.toggle('on', !up);
        el('tabUp').setAttribute('aria-selected', String(up));
        el('tabIn').setAttribute('aria-selected', String(!up));
        el('nameField').hidden = !up;
        el('agencyNameField').hidden = !(up && role === 'agency');
        el('agencyWebField').hidden = !(up && role === 'agency');
        /* Only asked of agency staff, and only when signing up. A buyer has
           no use for it and should not be asked; an agency without it cannot
           be handed a lead at all, because a Toju handoff goes to a person's
           WhatsApp and there is nowhere else for it to go. */
        var spf = el('staffPhoneField');
        if (spf) spf.hidden = !(up && role === 'agency' && method !== 'phone');
        el('passHint').hidden = !up;
        /* Here rather than in syncSubmitLabel, because this is where every
           other field's visibility is decided and setMode does not route
           through that function — hooking it left the block hidden while the
           button already read "Create account". */
        syncConsent();
        el('auH').textContent = up
          ? (role === 'agency' ? 'Create your agency account' : 'Create your account')
          : 'Welcome back';
        el('auP').textContent = up
          ? 'It takes about twenty seconds.'
          : 'Sign in to pick up where you left off.';
        go.textContent = up ? 'Create account' : 'Sign in';
        el('auPass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
        el('auAlt').hidden = up;
        clearErrors();
      }
      el('tabUp').addEventListener('click', function () { setMode('up'); });
      el('tabIn').addEventListener('click', function () { setMode('in'); });

      /* ── validation + errors ─────────────────────────────────────────── */
      function clearErrors() {
        ['errEmail', 'errPass'].forEach(function (id) { el(id).hidden = true; el(id).textContent = ''; });
        ['auEmail', 'auPass'].forEach(function (id) {
          el(id).removeAttribute('aria-invalid');
          el(id).removeAttribute('aria-describedby');
        });
        note.innerHTML = '';
      }
      /* aria-invalid says THAT the field is wrong; the red border says it too.
         Neither says WHY, and the sentence that does was being written into a
         div nothing was listening to -- so a screen reader user got a field
         marked invalid and no way to find out what was wrong with it.

         role="alert" on the container (in the markup) announces the sentence
         when it appears. aria-describedby ties it to the field, so tabbing
         back to a field that is already in error reads the reason again
         rather than just "invalid". The pair is WCAG 3.3.1's whole point:
         identify the error AND describe it, to everyone. */
      /* PASSWORD RULES (Eden, 2026-10-11), for creating an account or setting a new
         password: 10+ characters with upper, lower, a number and a symbol, and not
         built from the person's own email or name. Signing IN is untouched: an
         existing 8-character password must still work. This is the browser's check;
         the project's own password policy (Supabase Auth settings) should say the
         same so it also holds for anyone who skips this page. */
      var PW_COMMON = ['password', 'passw0rd', 'qwerty', '12345678', 'letmein', 'welcome', 'iloveyou', 'admin', 'synapse', 'nigeria', 'lagos', 'abc123'];
      function pwProblems(p, email, name) {
        var out = [];
        if (!p || p.length < 10) out.push('len');
        if (!/[A-Z]/.test(p || '')) out.push('up');
        if (!/[a-z]/.test(p || '')) out.push('lo');
        if (!/[0-9]/.test(p || '')) out.push('num');
        if (!/[^A-Za-z0-9]/.test(p || '')) out.push('sym');
        var low = String(p || '').toLowerCase(), local = String(email || '').split('@')[0].toLowerCase();
        var bad = PW_COMMON.some(function (w) { return low.indexOf(w) !== -1; })
          || (local.length >= 4 && low.indexOf(local) !== -1)
          || (name && String(name).trim().length >= 4 && low.indexOf(String(name).trim().toLowerCase().replace(/\s+/g, '')) !== -1);
        if (bad) out.push('weak');
        return out;
      }
      var PW_MSG = { len: 'at least 10 characters', up: 'an uppercase letter', lo: 'a lowercase letter', num: 'a number', sym: 'a symbol', weak: 'nothing common or taken from your name or email' };
      function pwMessage(list) {
        var parts = list.map(function (k) { return PW_MSG[k]; });
        return 'Your password needs ' + parts.join(', ') + '.';
      }
      function paintPwRules(p) {
        var probs = pwProblems(p, el('auEmail').value, el('auName').value), box = el('pwRules');
        if (!box) return;
        [].forEach.call(box.querySelectorAll('li'), function (li) { li.classList.toggle('ok', probs.indexOf(li.getAttribute('data-r')) === -1); });
        var score = 5 - probs.filter(function (k) { return k !== 'weak'; }).length - (probs.indexOf('weak') !== -1 ? 1 : 0);
        var bar = el('pwBar'); if (bar) { bar.style.width = Math.max(0, score) * 20 + '%'; bar.style.background = score >= 5 ? '#25683F' : score >= 3 ? '#B45309' : '#C2410C'; }
      }
      el('auPass').addEventListener('input', function () { if (mode === 'up' || el('passHint') && !el('passHint').hidden) paintPwRules(el('auPass').value); });

      function fieldError(inputId, errId, msg) {
        el(errId).textContent = msg; el(errId).hidden = false;
        el(inputId).setAttribute('aria-invalid', 'true');
        el(inputId).setAttribute('aria-describedby', errId);
      }
      function showNote(kind, msg) {
        note.innerHTML = '<div class="au-note ' + kind + '" role="status">' + msg + '</div>';
      }
      // Never reveal whether an email exists — that is an account-enumeration
      // oracle. Sign-in failures are always the same sentence.
      function friendly(err) {
        var m = String((err && err.message) || '').toLowerCase();
        /* ORDER MATTERS, and it was wrong. The specific mappings were appended
           BELOW a broad `indexOf('rate')` test, which meant the email-send
           limit could never reach its own message: everybody saw "Too many
           attempts just now. Wait a minute" -- about attempts they had not
           made, on a wait that is nearer an hour. Codes first, then narrow
           message tests, then the broad ones. */
        var code = (err && (err.code || err.error_code)) || '';

        /* THE LIVE RESET PAGE'S "SOMETHING WENT WRONG" (2026-09-26). GoTrue
           refuses a new password that matches the current one, with code
           same_password and the sentence "New password should be different
           from the old password." A mapping further down was meant for this,
           but it looks for the word "same" -- which that sentence does not
           contain -- so it fell through to the catch-all. Matched by code
           first, and by the words GoTrue actually uses. */
        if (code === 'same_password' || m.indexOf('different from the old password') > -1)
          return 'That is already your password — choose a different one, or simply sign in with it.';
        /* The server states the actual rule it applied, which is more useful
           than any paraphrase of it. Escaped: it goes into innerHTML. */
        if (code === 'weak_password')
          return escHtml((err && err.message) || 'That password is too weak — choose a stronger one.');
        if (code === 'reauthentication_needed')
          return 'For security, sign in again before changing your password.';

        /* Supabase's built-in email sender allows only a handful of messages
           an hour and is not meant for production. Signing up three or four
           times is enough to hit it single-handed, which is why this reads as
           a mystery: nothing the person did was wrong, and no one else was
           using the app. Name the real cause. */
        if (code === 'over_email_send_rate_limit' || m.indexOf('email rate limit') > -1)
          return 'The project has sent as many emails as it is allowed this hour — this is our sending limit, not anything you did. Wait an hour, or turn off email confirmation while testing.';
        if (code === 'over_request_rate_limit')
          return 'Too many requests from this device just now. Wait a minute and try again.';
        if (code === 'over_sms_send_rate_limit' || (m.indexOf('sms') > -1 && m.indexOf('rate') > -1))
          return 'Too many codes requested. Wait a minute, then ask for another.';
        if (code === 'phone_provider_disabled' || m.indexOf('unsupported phone provider') > -1)
          return 'Signing in by phone is not switched on yet. Use your email address for now.';
        if (code === 'otp_disabled')
          return 'One-time codes are not switched on for this project yet.';
        if (code === 'otp_expired')
          return 'That code has expired. Ask for a new one.';
        if (code === 'user_already_exists'
            || m.indexOf('already registered') > -1 || m.indexOf('already been registered') > -1)
          return 'There is already an account with that email — try signing in instead.';
        if (code === 'email_not_confirmed')
          return 'That account still needs confirming. Check your email for the link we sent.';

        if (m.indexOf('invalid login') > -1 || m.indexOf('invalid credentials') > -1)
          return 'That email and password do not match. Try again, or reset your password.';
        if (m.indexOf('invalid') > -1 && (m.indexOf('otp') > -1 || m.indexOf('token') > -1))
          return 'That code is not right. Check it and try again.';
        if (m.indexOf('password') > -1 && m.indexOf('short') > -1)
          return 'That password is too short — use at least 8 characters.';
        if (m.indexOf('weak') > -1 || m.indexOf('pwned') > -1 || m.indexOf('compromised') > -1)
          return 'That password has appeared in a known breach. Please choose a different one.';
        if (m.indexOf('same') > -1 && m.indexOf('password') > -1)
          return 'That is your current password — choose a different one.';
        if (m.indexOf('provider is not enabled') > -1)
          return 'That sign-in method is not switched on for this project yet.';
        if (m.indexOf('fetch') > -1 || m.indexOf('network') > -1 || m.indexOf('unreachable') > -1)
          return 'We could not reach the sign-in service. Check your connection and try again.';
        if (m.indexOf('session') > -1 || m.indexOf('expired') > -1 || m.indexOf('token') > -1)
          return 'This reset link has expired — request a new one and use it within a few minutes.';

        /* Broad, and last, so it can never shadow a specific one again.
           "For security purposes, you can only request this after N seconds"
           is the throttle GoTrue actually returns most of the time, and it
           contains neither "rate" nor "too many" -- it was falling through to
           "Something went wrong", which tells nobody to simply wait. The
           number is pulled out so the message says how long. */
        var wait = /after (\d+) seconds?/i.exec(m);
        if (wait) return 'Please wait ' + wait[1] + (wait[1] === '1' ? ' second' : ' seconds') + ' before trying that again.';
        if (m.indexOf('for security purposes') > -1)
          return 'Please wait a few seconds before trying that again.';
        if (m.indexOf('rate') > -1 || m.indexOf('too many') > -1)
          return 'Too many attempts just now. Wait a minute and try again.';
        return GENERIC_ERR;
      }
      /* Named so a caller can tell "nothing matched" apart from a real
         sentence, and say something more useful where it is safe to. */
      var GENERIC_ERR = 'Something went wrong. Please try again.';
      function escHtml(s) {
        return String(s).replace(/[&<>"']/g, function (ch) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
      }

      /* ── THE DEMO ACCOUNTS ────────────────────────────────────
         This used to be unconditional. Whatever anybody typed, both tabs
         signed them into one of two shared accounts — which made the whole
         page a facade: nobody could create a real account, Create account
         provisioned nothing, and any two visitors were writing into the same
         agency at once.

         The demo still earns its place: it shows the product without asking
         for a signup first. So it stays, as a deliberate choice rather than
         the only outcome. It runs when the URL asks for it (?demo=1), or when
         the visitor presses the demo button. Everything else is now a real
         credential check against a real account.

         It signs into a genuine fixed account rather than faking the UI, so
         every real dependent — RLS, the agency-portal role gate, notify.js
         reading SynAuth.user().id — behaves exactly as it does for anybody
         else. */
      var DEMO_ACCOUNTS = {
        customer: { email: 'demo-customer@synapse.ng', password: 'SynDemo-Cust-9f42x' },
        agency:   { email: 'demo-agency@synapse.ng',   password: 'SynDemo-Agcy-7k18q' },
      };
      var demoRequested = params.get('demo') === '1';

      /* The note has to describe the page the visitor is actually on. Leaving
         "any email and password gets you in" beside a form that now checks
         credentials would send somebody with a typo'd password round in
         circles — the page would be telling them it cannot fail. */
      if (demoRequested) {
        el('demoNote').textContent = 'Demo mode — this opens a shared example account.';
      } else {
        el('demoNote').innerHTML = 'Just looking? <button type="button" class="au-linkbtn" '
          + 'id="demoBtn">Open a demo ' + (role === 'agency' ? 'agency' : 'account')
          + '</button> instead — no signup.';
        el('demoBtn').addEventListener('click', function () {
          if (busy) return;
          /* Routed through the form's own submit rather than duplicating the
             redirect, the error mapping and the busy handling. Switching to
             the sign-in tab first keeps `mode` truthful, so the button label
             and the destination afterwards are the ones for signing in. */
          demoRequested = true;
          setMode('in');
          if (form.requestSubmit) form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
      }

      /* ── submit ──────────────────────────────────────────────────────── */

      /* -- how they are signing in --------------------------------------
         'email' or 'phone'. The phone path has two steps and `codeSent` says
         which one we are on; it resets whenever the number changes, because a
         code sent to a different number is not a code for this one. */
      var method = 'email';
      var codeSent = false;
      var pendingPhone = '';

      function setMethod(m) {
        method = m === 'phone' ? 'phone' : 'email';
        el('methodEmail').classList.toggle('on', method === 'email');
        el('methodPhone').classList.toggle('on', method === 'phone');
        el('methodEmail').setAttribute('aria-selected', String(method === 'email'));
        el('methodPhone').setAttribute('aria-selected', String(method === 'phone'));

        el('emailField').hidden = method !== 'email';
        el('passField').hidden  = method !== 'email';
        el('phoneField').hidden = method !== 'phone' || codeSent;
        el('codeField').hidden  = method !== 'phone' || !codeSent;

        /* Required-ness follows visibility. A browser refuses to submit a form
           whose invalid field is hidden, and says nothing visible about why --
           which reads as a dead button. */
        el('auEmail').required = method === 'email';
        el('auPass').required  = method === 'email';

        el('forgotBtn').hidden = method === 'phone';
        clearErrors();
        syncSubmitLabel();
      }

      function syncSubmitLabel() {
        if (method === 'phone') go.textContent = codeSent ? 'Confirm code' : 'Send me a code';
        else go.textContent = mode === 'up' ? 'Create account' : 'Sign in';
        syncConsent();
      }

      /* Visibility drives requiredness here too. The block is only asked for
         when an account is being created; a returning visitor agreed to this
         when they signed up and the record of that is what we keep. */
      function syncConsent() {
        var block = el('consentBlock');
        if (!block) return;
        block.hidden = mode !== 'up';
        if (block.hidden) {
          var box = el('auConsent');
          if (box) box.checked = false;      // never carries across a mode switch
          var err = el('errConsent');
          if (err) err.hidden = true;
        }
      }

      el('methodEmail').addEventListener('click', function () { if (!busy) setMethod('email'); });
      el('methodPhone').addEventListener('click', function () { if (!busy) setMethod('phone'); });

      el('codeBack').addEventListener('click', function () {
        if (busy) return;
        codeSent = false; pendingPhone = '';
        el('auCode').value = '';
        setMethod('phone');
      });

      /* -- Google -------------------------------------------------------
         Asked, not assumed. signInWithOAuth navigates the browser itself, so a
         .catch() around it never runs -- by the time it would, the tab is
         gone. Knowing beforehand is the only way to fail gracefully, and it is
         what stops a dead button writing a PKCE verifier into storage that
         nothing ever comes back to consume. */
      /* THE BUTTON IS THERE FROM THE FIRST PAINT (Eden, 2026-10-11: "the page loads and
         then after about five seconds the Google button comes up"). It used to stay
         hidden until the auth-settings request came back, so it popped in late and
         pushed the form down. Now it is drawn with everything else; the question
         "is Google switched on?" is asked in the background and only matters in two
         ways: if the answer is no, the button goes away; and pressing it waits for
         the answer first, so nobody is ever thrown out to a raw error page. The last
         answer is remembered, so a project with Google off never flashes it. */
      try { if (localStorage.getItem('syn_google_on') === '0') el('auOauth').hidden = true; } catch (e) {}
      SynAuth.enabledProviders().then(function (list) {
        var on = list.indexOf('google') !== -1;
        try { localStorage.setItem('syn_google_on', on ? '1' : '0'); } catch (e) {}
        el('auOauth').hidden = !on;
      });
      el('auGoogle').addEventListener('click', function () {
        if (busy) return;
        busy = true;
        el('auGoogle').disabled = true;
        el('auGoogleLabel').textContent = 'Taking you to Google...';
        SynAuth.enabledProviders().then(function (list) {
          if (list.indexOf('google') === -1) throw new Error('Google sign-in is not available right now.');
          /* The role goes WITH them. Without it the return is
             indistinguishable from a buyer's, and a business would be
             provisioned as a consumer with no way back. */
          return SynAuth.signInWithProvider('google', next, role);
        }).catch(function (err) {
          busy = false;
          el('auGoogle').disabled = false;
          el('auGoogleLabel').textContent = 'Continue with Google';
          showNote('bad', friendly(err));
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;                     // concurrency: one in flight only
        clearErrors();

        var email = el('auEmail').value.trim();
        var pass  = el('auPass').value;
        var name  = el('auName').value.trim();
        var agencyName = el('auAgencyName').value.trim();
        var agencyWebsite = el('auAgencyWebsite') ? el('auAgencyWebsite').value.trim() : '';
      var staffPhone = el('auStaffPhone') ? el('auStaffPhone').value.trim() : '';

        var phone = el('auPhone').value.trim();
        var code  = el('auCode').value.trim();

        if (!demoRequested && method === 'email') {
          var ok = true;
          if (!email || email.indexOf('@') < 1 || email.indexOf('.') < 0) {
            fieldError('auEmail', 'errEmail', 'Enter a valid email address.'); ok = false;
          }
          if (!pass || pass.length < 8) {
            fieldError('auPass', 'errPass', mode === 'up' ? pwMessage(pwProblems(pass, email, name)) : 'Use at least 8 characters.'); ok = false;
          } else if (mode === 'up') {
            var pp = pwProblems(pass, email, name);
            if (pp.length) { fieldError('auPass', 'errPass', pwMessage(pp)); ok = false; }
          }
          if (!ok) return;
        }
        if (!demoRequested && method === 'phone') {
          if (!codeSent) {
            if (!phone || SynAuth.normalisePhone(phone).length < 11) {
              fieldError('auPhone', 'errPhone', 'Enter your number, including the network code.');
              return;
            }
          } else if (code.replace(/[^0-9]/g, '').length !== 6) {
            fieldError('auCode', 'errCode', 'The code is six digits.');
            return;
          }
        }

        /* Refused in JavaScript rather than by a native `required`, for the
           reason setMethod() already gives about hidden invalid fields: the
           browser declines to submit and says nothing visible, which reads as
           a dead button. */
        if (mode === 'up') {
          var cBox = el('auConsent');
          if (cBox && !cBox.checked) {
            var cErr = el('errConsent');
            if (cErr) {
              cErr.textContent = 'Please read and accept the Terms and the Privacy Policy to continue.';
              cErr.hidden = false;
            }
            cBox.focus();
            return;
          }
        }

        /* Refused here, not later. An agency account created without a
           number is an agency Tayo cannot hand a lead to, and the only way to
           notice is a handoff that fails weeks afterwards. */
        if (mode === 'up' && role === 'agency' && method !== 'phone' && !staffPhone) {
          var spErr = el('errStaffPhone');
          if (spErr) {
            spErr.textContent = 'Tayo sends you leads on WhatsApp, so we need a number for you.';
            spErr.hidden = false;
          }
          var spInput = el('auStaffPhone');
          if (spInput) spInput.focus();
          return;
        }

        busy = true; go.disabled = true;
        go.textContent = mode === 'up' ? 'Creating your account…' : 'Signing you in…';

        /* The demo short-circuits to the shared account, so a link in a deck
           or an email opens the product with nothing to type. Everything else
           is the real thing: Create account provisions the profile, and for an
           agency the agencies row and the owner membership with it — all three
           atomically inside the handle_new_user trigger, so closing the tab
           can never leave an account half-made. */
        /* Four entrances, one completion path below. The phone flow's first
           step is the odd one out: it finishes without a session, because the
           person still has to read the code we just sent them. */
        var sendingCode = method === 'phone' && !codeSent && !demoRequested;

        var work = demoRequested
          ? SynAuth.signIn(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
          : method === 'phone'
            ? (codeSent
                ? SynAuth.verifyPhoneCode(pendingPhone, code)
                : SynAuth.sendPhoneCode(phone, { role: role, name: name, agencyName: agencyName, agencyWebsite: agencyWebsite }))
            : (mode === 'up'
                ? SynAuth.signUp(email, pass, { role: role, name: name, agencyName: agencyName, agencyWebsite: agencyWebsite, phone: staffPhone, next: next })
                : SynAuth.signIn(email, pass));

        work.then(function (res) {
          if (res && res.error) throw res.error;

          /* Step one of two. No session yet and none expected: move the panel
             on to the code, and name the number it went to, so a mistyped one
             is obvious before they sit waiting for an SMS that cannot arrive. */
          if (sendingCode) {
            pendingPhone = res.phone || SynAuth.normalisePhone(phone);
            codeSent = true;
            setMethod('phone');
            el('codeHint').textContent = 'Sent to ' + pendingPhone + '. It expires in a few minutes.';
            el('auCode').focus();
            showNote('ok', 'Code sent. Enter it above.');
            return;
          }
          // Sign-up with email confirmation returns a user but no session.
          var session = res && res.data && res.data.session;
          if (mode === 'up' && !session) {
            // Supabase intentionally returns 200 with no error when the email
            // is already registered — that's how it avoids leaking which
            // emails have accounts via an error message. But it means "check
            // your email to confirm" is a LIE for someone who already has an
            // account: nothing about their password changed, and re-showing
            // that message is exactly what left a real person stuck for
            // weeks, retrying "sign up" and never getting anywhere. The
            // documented signal for this case: an already-registered email
            // comes back with an empty `identities` array; a genuinely new
            // signup has at least one.
            var u = res && res.data && res.data.user;
            var alreadyExists = u && Array.isArray(u.identities) && u.identities.length === 0;
            if (alreadyExists) {
              // setMode() calls clearErrors(), which wipes #auNote — call it
              // BEFORE showNote(), not after (this exact ordering mistake
              // already bit the expired-link message earlier in this file).
              setMode('in');
              el('auEmail').value = email;
              showNote('bad', 'You already have an account with that email. Sign in below, or reset your password if you have forgotten it.');
              return;
            }
            setMode('in');
            showNote('ok', 'Check your email to confirm your account, then sign in.');
            return;
          }
          // A brand-new agency goes straight into setting up its brand — that
          // is the first thing Tayo needs before it can write anything on their
          // behalf, and an empty brand is the one gap a new account always has.
          // Existing sign-ins are untouched, and an explicit ?next= still wins.
          var fallback = role === 'agency'
            ? (mode === 'up' ? 'agency.html?welcome=agency' : 'agency.html')
            : 'toju.html';

          /* Written here because this is the first point at which a session
             exists -- consent_records' RLS requires profile_id = auth.uid(),
             and a consent record attributed to nobody is not a record.

             Fire-and-forget on purpose: the redirect does not wait for it.
             Trapping somebody at the sign-in screen because an audit row did
             not insert would be protecting the wrong thing, and a missing row
             can be reconciled where an abandoned signup cannot. */
          if (mode === 'up' && !demoRequested) recordConsent();

          window.location.href = signedInDest(fallback);
        }).catch(function (err) {
          /* UNCONFIRMED: OFFER A NEW LINK, don't just point at the old one.
             Every confirmation email sent before 2026-09-25 opened localhost,
             so "check your email for the link we sent" sent people back to a
             link that could never work. This is not an enumeration leak:
             GoTrue returns email_not_confirmed only when the password was
             RIGHT, so only the account's owner ever sees the offer. */
          /* Read the way friendly() reads it -- code OR error_code. The SDK
             has used both, and checking only one would silently skip this
             offer for whichever version sends the other. */
          var errCode = (err && (err.code || err.error_code)) || '';
          if (errCode === 'email_not_confirmed' && email && SynAuth.resendConfirmation) {
            showNote('bad', 'That account still needs confirming. '
              + '<button type="button" class="au-linkbtn" id="auResend">Send a new confirmation link</button>');
            var rb = el('auResend');
            if (rb) rb.addEventListener('click', function () {
              rb.disabled = true; rb.textContent = 'Sending…';
              SynAuth.resendConfirmation(email, { role: role })
                .then(function (r) {
                  if (r && r.error) throw r.error;
                  showNote('ok', 'A new link is on its way. Open it on any device — '
                    + 'it goes to synapsecore.dev now, not to this computer.');
                })
                .catch(function (e2) { showNote('bad', friendly(e2)); });
            });
          } else {
            showNote('bad', friendly(err));
          }
        }).then(function () {
          busy = false; go.disabled = false;
          syncSubmitLabel();
        });
      });

      /* ── what they agreed to, and which version of it ─────────────────
         The version is a date because a date IS the version, and it lives
         next to the documents it names: publishing new terms means changing
         this line in the same commit. "They accepted the terms" stops meaning
         anything the moment the terms change; "they accepted 2026-09-19" does
         not, and that is the question an enquiry actually asks.

         Three rows rather than one. Terms and privacy are separate documents
         accepted as separate things, and AI processing is separate again
         because it is the one somebody is most likely to withdraw later -- a
         withdrawal has to be able to name what it withdraws. */
      var POLICY_VERSION = '2026-09-19';

      function recordConsent() {
        try {
          if (!window.SynAuth || !SynAuth.client) return;
          SynAuth.client().then(function (c) {
            return c.auth.getUser().then(function (u) {
              var id = u && u.data && u.data.user && u.data.user.id;
              if (!id) return null;
              return c.from('consent_records').insert(
                ['terms_of_service', 'privacy_policy', 'ai_processing'].map(function (k) {
                  return {
                    profile_id: id, kind: k, version: POLICY_VERSION,
                    granted: true, context: 'signup',
                  };
                }));
            });
          }).then(function (r) {
            if (r && r.error && window.console) {
              console.warn('[consent] not recorded:', r.error.message);
            }
          }).catch(function (e) {
            if (window.console) console.warn('[consent] not recorded:', e && e.message);
          });
        } catch (e) { /* never block the journey over an audit row */ }
      }

      /* ── forgot password ─────────────────────────────────────────────── */
      el('forgotBtn').addEventListener('click', function () {
        var email = el('auEmail').value.trim();
        if (!email) { fieldError('auEmail', 'errEmail', 'Enter your email first, then tap this again.'); return; }
        if (busy) return;
        busy = true;
        SynAuth.resetPassword(email).then(function () {
          // Deliberately unconditional — confirming whether the address exists
          // would leak account membership.
          showNote('ok', 'If there is an account for that email, a reset link is on its way.');
        }).catch(function (e) {
          /* Logged, and a sending limit is said out loud. The limit is on the
             project's email, not on this address, so naming it leaks nothing
             about who has an account -- and swallowing it told people a link
             was on its way when none was going to be sent. */
          if (window.console) console.warn('reset request failed', e);
          var rc = (e && e.code) || '';
          if ((e && e.status === 429) || /rate_limit/.test(rc)) {
            showNote('bad', 'Too many reset emails have gone out in the last hour. Try again later.');
            return;
          }
          showNote('ok', 'If there is an account for that email, a reset link is on its way.');
        }).then(function () { busy = false; });
      });

      /* ── password recovery ───────────────────────────────────────────────
         THE BUG THIS FIXES: clicking a "reset password" email link makes
         Supabase issue a real session for that visitor (that is how the link
         proves who they are) — but a session is not a new password. The page
         used to treat "there is a session" and "they are done" as the same
         thing and just redirected into the app, so nobody who used the reset
         link ever actually got to change their password. They landed in the
         app still not knowing a password that works, which is exactly what
         "login doesn't work" and "reset doesn't work" both trace back to.

         Supabase's SDK fires a dedicated 'PASSWORD_RECOVERY' auth event when
         the link is a recovery link (as opposed to a normal sign-in). That is
         the only reliable signal — the URL itself does not visibly say so. */
      var recovering = false;

      function enterRecoverMode() {
        recovering = true;
        el('auWhy').hidden = true;
        document.querySelector('.au-tabs').hidden = true;
        form.hidden = true;
        el('auAlt').hidden = true;
        el('auH').textContent = 'Choose a new password';
        el('auP').textContent = 'You are signed in for this one step only — set a password and you are done.';
        el('recoverForm').hidden = false;
      }

      function rpFieldError(inputId, errId, msg) {
        el(errId).textContent = msg; el(errId).hidden = false;
        el(inputId).setAttribute('aria-invalid', 'true');
        el(inputId).setAttribute('aria-describedby', errId);
      }
      function rpClearErrors() {
        ['errRp1', 'errRp2'].forEach(function (id) { el(id).hidden = true; el(id).textContent = ''; });
        ['rpPass1', 'rpPass2'].forEach(function (id) {
          el(id).removeAttribute('aria-invalid');
          el(id).removeAttribute('aria-describedby');
        });
        el('rpNote').innerHTML = '';
      }

      var rpBusy = false;
      el('recoverForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (rpBusy) return;
        rpClearErrors();
        var p1 = el('rpPass1').value, p2 = el('rpPass2').value;
        var ok = true;
        var rpp = pwProblems(p1, '', '');
        if (rpp.length) { rpFieldError('rpPass1', 'errRp1', pwMessage(rpp)); ok = false; }
        else if (p1 !== p2) { rpFieldError('rpPass2', 'errRp2', 'These two do not match.'); ok = false; }
        if (!ok) return;

        rpBusy = true;
        var rpGo = el('rpGo');
        rpGo.disabled = true; rpGo.textContent = 'Saving…';

        SynAuth.client().then(function (c) { return c.auth.updateUser({ password: p1 }); })
          .then(function (res) {
            if (res && res.error) throw res.error;
            el('rpNote').innerHTML = '<div class="au-note ok" role="status">Password updated. Taking you in…</div>';
            /* The reset link carries no role, so the page assumes a customer;
               the account itself knows better. An agency resetting its
               password belongs in the portal, not in Tayo. */
            var who = res && res.data && res.data.user;
            var fallback = (role === 'agency' || SynAuth.roleOf(who) === 'agency') ? 'agency.html' : 'toju.html';
            setTimeout(function () { window.location.href = signedInDest(fallback); }, 900);
          })
          .catch(function (err) {
            rpBusy = false; rpGo.disabled = false; rpGo.textContent = 'Set new password';
            /* Logged whole, because the page used to keep the only clue to
               itself and show "Something went wrong" on the live site. */
            if (window.console) console.error('password update failed', err);

            /* ALREADY THEIR PASSWORD. Nothing needs fixing: they have typed a
               password that works, and the recovery link has already signed
               them in. Refusing them and asking for another one would make
               them solve a problem they no longer have -- so offer the door. */
            var rc = (err && (err.code || err.error_code)) || '';
            if (rc === 'same_password'
                || /different from the old password/i.test(String((err && err.message) || ''))) {
              el('rpNote').innerHTML = '<div class="au-note ok" role="status">That is already your '
                + 'password, so there is nothing to change. '
                + '<button type="button" class="au-linkbtn" id="rpContinue">Continue to Synapse</button></div>';
              el('rpContinue').addEventListener('click', function () {
                var fb = role === 'agency' ? 'agency.html' : 'toju.html';
                window.location.href = signedInDest(fb);
              });
              return;
            }

            /* ANYTHING ELSE UNRECOGNISED: the server's own words. This person
               is already signed in by the recovery link, so there is nothing
               to protect by hiding them, and "Something went wrong" is what
               made this failure impossible to diagnose. */
            var msg = friendly(err);
            if (msg === GENERIC_ERR && err && err.message) {
              msg = 'That did not work: ' + escHtml(err.message);
            }
            el('rpNote').innerHTML = '<div class="au-note bad" role="status">' + msg + '</div>';
          });
      });

      // Event-driven, not timer-based: a setTimeout heuristic here would be
      // guessing at a race between two async operations. Instead, act only on
      // the FIRST relevant signal the SDK itself sends — verified empirically
      // (see commit note) that INITIAL_SESSION fires exactly once on a normal
      // load, and PASSWORD_RECOVERY fires instead of it when the visitor
      // arrived via a recovery link. Whichever one arrives is authoritative;
      // `decided` stops any late/duplicate event from acting twice.
      /* Coming back from Google. This has to be settled BEFORE the ordinary
         INITIAL_SESSION redirect runs, because that one compares the session's
         role against the page's and an agency returning from OAuth fails that
         comparison by definition: the trigger made them a consumer, since
         signInWithOAuth had no way to say otherwise. Left alone it would tell
         a business to "sign in with a customer account", about the account
         they had just made. */
      var oauthReturn = params.get('oauth') === '1';

      function enterAgencyMode(suggestedName) {
        ['.au-tabs', '.au-methods'].forEach(function (sel) {
          var n = document.querySelector(sel);
          if (n) n.hidden = true;
        });
        form.hidden = true;
        if (el('auOauth')) el('auOauth').hidden = true;
        if (el('forgotWrap')) el('forgotWrap').hidden = true;
        el('demoNote').textContent = '';
        el('agencyForm').hidden = false;
        el('auH').textContent = 'One more thing';
        el('auP').textContent = 'Your account is ready. Tell us the agency it belongs to.';
        if (suggestedName) el('agName').value = suggestedName;
        el('agName').focus();
      }

      function finishOauth(session) {
        var dest = signedInDest(role === 'agency' ? 'agency.html' : 'toju.html');
        if (role !== 'agency') { window.location.href = dest; return; }

        /* Ask the database, do not infer. A business that signed in with
           Google twice already HAS an agency the second time, and must not be
           asked to name a new one. */
        SynAuth.hasAgency().then(function (has) {
          if (has) { window.location.href = dest; return; }
          var meta = (session && session.user && session.user.user_metadata) || {};
          enterAgencyMode(meta.name || meta.full_name || '');
        });
      }

      el('agencyForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;
        var name = el('agName').value.trim();
        el('errAgName').hidden = true;
        if (!name) {
          fieldError('agName', 'errAgName', 'Enter the name your agency trades under.');
          return;
        }
        busy = true;
        var b = el('agGo');
        b.disabled = true; b.textContent = 'Setting up\u2026';
        var site = el('agWebsite') ? el('agWebsite').value.trim() : '';
        SynAuth.provisionAgency(name, el('agCity').value.trim()).then(function (res) {
          if (res && res.error) throw res.error;
          /* The website, if one was given, goes on the agency the RPC just
             made (the owner may update their own agency). A failure here is
             not worth stopping for: it can be added on the Brand page. */
          return (site ? SynAuth.saveAgencyWebsite(site).catch(function () {}) : Promise.resolve());
        }).then(function () {
          window.location.href = signedInDest('agency.html?welcome=agency');
        }).catch(function (err) {
          busy = false; b.disabled = false; b.textContent = 'Finish setting up';
          /* "already belongs to an agency" means the server refused a second
             one -- which is the guard working. They simply go in. */
          var m = String((err && err.message) || '').toLowerCase();
          if (m.indexOf('already') > -1) {
            window.location.href = signedInDest('agency.html');
            return;
          }
          el('agNote').innerHTML = '<div class="au-note bad" role="status">'
            + friendly(err) + '</div>';
        });
      });

      /* THE RESET LINK THAT WORKS ON ANY DEVICE (28 September 2026).
         auth.js signs in with PKCE, and a PKCE reset link can only be redeemed
         by the browser that asked for it: that browser holds the one-time
         verifier. Asked for on a laptop and opened on a phone -- or inside the
         Gmail or Outlook app's own browser, which has separate storage -- the
         exchange fails in silence, no PASSWORD_RECOVERY ever fires, and this
         page showed a plain sign-in form. It looked fixed whenever it was
         tested in the browser that asked, and broken whenever it was not.

         The reset email (supabase/templates/recovery.html, applied by
         auth-urls.yml) now links here with ?type=recovery&token_hash=, and the
         token is verified from this page. A token_hash needs no verifier, so
         any browser can redeem it. It also survives mail scanners that open
         links to check them: they fetch the page, but only a browser running
         this script spends the token. */
      var recoveryToken = params.get('type') === 'recovery' ? params.get('token_hash') : null;
      /* Until an email template can be changed (it needs a custom SMTP
         provider), reset links are requested in implicit form and arrive with
         the session in the fragment. auth.js lifts it off the URL before the
         PKCE client can reject it; this page redeems it. */
      var hashRecovery = (!recoveryToken && SynAuth.takeRecovery) ? SynAuth.takeRecovery() : null;
      var decided = !!(recoveryToken || hashRecovery);   // the link decides, not the first auth event

      function redeemRecovery(spend) {
        SynAuth.client().then(spend).then(function (res) {
          if (res && res.error) throw res.error;
          enterRecoverMode();
        }).catch(function (err) {
          if (window.console) console.error('recovery link failed', err);
          var rc = (err && (err.code || err.error_code)) || '';
          showNote('bad', (rc === 'otp_expired' || /expired|invalid/i.test(String((err && err.message) || '')))
            ? 'That reset link has expired or has already been used. Request a fresh one below.'
            : 'That reset link did not work. Request a fresh one below.');
        });
      }
      if (recoveryToken) {
        /* Off the address bar straight away: it is a one-use credential, and a
           reload must not try to spend it twice. */
        history.replaceState(null, '', location.pathname);
        redeemRecovery(function (c) { return c.auth.verifyOtp({ token_hash: recoveryToken, type: 'recovery' }); });
      } else if (hashRecovery) {
        redeemRecovery(function (c) { return c.auth.setSession(hashRecovery); });
      }

      SynAuth.client().then(function (c) {
        c.auth.onAuthStateChange(function (event, session) {
          if (decided) return;
          if (oauthReturn && session && event !== 'PASSWORD_RECOVERY') {
            decided = true;
            finishOauth(session);
            return;
          }
          if (event === 'PASSWORD_RECOVERY') {
            decided = true; recovering = true;
            enterRecoverMode();
          } else if (event === 'INITIAL_SESSION') {
            decided = true;
            if (!session) {
              /* A link that finished with ?code= and still no session: a
                 PKCE link opened in a different browser from the one that
                 asked for it (see THE RESET LINK above). Emails sent before
                 28 September are like this. The email address may well be
                 confirmed; the sign-in could not complete here. */
              if (params.get('code') && !oauthReturn) {
                showNote('bad', 'That link was opened in a different browser from the one it was '
                  + 'requested in, so it could not sign you in here. If it was a confirmation link, '
                  + 'your email is confirmed: sign in below. If it was a password reset, request a new '
                  + 'one: new reset links work on any phone or browser.');
              }
              return;
            }
            // THE LOOP THIS FIXES: this used to redirect on session EXISTENCE
            // alone. Someone signed in on the customer side, then sent to
            // signin.html?role=agency by agency.html's own requireAuth() (it
            // correctly saw the wrong role and sent them here to fix it) —
            // this handler saw "a session exists" and bounced them straight
            // back to agency.html before they ever saw the form, which
            // bounced them right back here. Neither page could ever win,
            // and nobody could ever actually sign in as the other role.
            // Redirect only when the existing session IS the role that was
            // asked for; otherwise stay put and let them use the form.
            if (SynAuth.roleOf(session.user) === role) {
              window.location.href = SynAuth.safeNext(next, role === 'agency' ? 'agency.html' : 'toju.html');
            } else {
              showNote('bad', 'You’re currently signed in on the ' + (role === 'agency' ? 'customer' : 'agency') + ' side. Sign in below with ' + (role === 'agency' ? 'an agency' : 'a customer') + ' account to switch.');
            }
          }
        });
      });

      setMode(mode);
      if (expiredLinkMsg) showNote('bad', expiredLinkMsg);
    })();
  