
    /* Every password field gets a reveal, including the two on the reset
       form -- they are in the DOM from the start, just hidden, so one pass at
       load covers them.

       type is toggled rather than the text being redrawn anywhere: password
       managers, autofill and the browser's own save prompt all key off the
       real input, and reading the value out into a second element would put
       a plaintext copy somewhere nothing expects one.

       Nothing remembers the revealed state. It resets to hidden on every
       load, because a password left visible on a returned-to tab is the
       failure this control is not worth causing. */
    (function revealPasswords() {
      function attach(inp) {
        if (inp.dataset.pwToggle) return;
        inp.dataset.pwToggle = '1';

        var wrap = document.createElement('div');
        wrap.className = 'au-pw';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);

        var b = document.createElement('button');
        b.type = 'button';                 // never submits the form
        b.className = 'au-pw-t';
        if (inp.id) b.setAttribute('aria-controls', inp.id);

        /* An eye, not the word "Show". Drawn to the same rules as the rest
           of the icon set -- 24-unit box, no fill, 1.75 stroke in
           currentColor -- so it inherits the field's own colour and hover
           rather than looking pasted on. The struck-through eye is the
           revealed state: the icon says what pressing it will do next.

           The visible label goes, so the accessible name has to carry it,
           which is what aria-label and aria-pressed below are for. */
        var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"'
          + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<path d="M1.8 12S5.5 5.4 12 5.4 22.2 12 22.2 12 18.5 18.6 12 18.6 1.8 12 1.8 12z"/>'
          + '<circle cx="12" cy="12" r="3.1"/></svg>';
        var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"'
          + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          + '<path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6.5 0 10.2 6 10.2 6a18.5 18.5 0 0 1-3.3 3.8"/>'
          + '<path d="M6.4 7.5A17.9 17.9 0 0 0 1.8 12s3.7 6 10.2 6a10 10 0 0 0 4.1-.8"/>'
          + '<path d="M9.8 9.9a3.1 3.1 0 0 0 4.3 4.3"/>'
          + '<path d="M3 3l18 18"/></svg>';

        function set(shown) {
          inp.type = shown ? 'text' : 'password';
          b.innerHTML = shown ? EYE_OFF : EYE;
          b.setAttribute('aria-pressed', String(shown));
          b.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
          b.setAttribute('title', shown ? 'Hide password' : 'Show password');
        }
        set(false);

        b.addEventListener('click', function () {
          /* Caret first. Changing an input's type sends the cursor to the end
             in several browsers, which is maddening if you pressed Show to
             check a character you were part-way through typing. */
          var pos = null;
          try { pos = inp.selectionStart; } catch (e) { /* not all types allow it */ }
          set(inp.type === 'password');
          try {
            inp.focus();
            if (pos != null) inp.setSelectionRange(pos, pos);
          } catch (e) { /* focus is the nice-to-have, not the point */ }
        });

        wrap.appendChild(b);
      }

      var run = function () {
        [].forEach.call(document.querySelectorAll('input[type="password"]'), attach);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
      else run();
    })();
  