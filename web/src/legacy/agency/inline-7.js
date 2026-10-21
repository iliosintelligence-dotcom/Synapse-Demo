
  /* The account menu: a person icon in the top bar. */
  (function () {
    var btn = document.getElementById('acctBtn'), menu = document.getElementById('acctMenu');
    if (!btn || !menu) return;
    function fill() {
      var u = window.SynAuth && SynAuth.user && SynAuth.user();
      if (!u) return;
      var name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '';
      document.getElementById('acctName').textContent = name || (u.email || 'Your account');
      document.getElementById('acctMail').textContent = name ? (u.email || '') : '';
    }
    function setOpen(on) {
      menu.hidden = !on; btn.setAttribute('aria-expanded', String(on));
      if (on) {
        fill();
        /* One floating panel at a time. */
        if (typeof toggleNoti === 'function') { try { toggleNoti(false); } catch (e) {} }
        if (typeof toggleRm === 'function') { try { toggleRm(false); } catch (e) {} }
        var first = menu.querySelector('.acct-item'); if (first) first.focus();
      }
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var items = [].slice.call(menu.querySelectorAll('.acct-item')), i = items.indexOf(document.activeElement);
      e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acct]'); if (!b) { setOpen(false); return; }
      setOpen(false);
      if (b.dataset.acct === 'billing') { var a = document.querySelector('#tabs a[data-pane="billing"]'); if (a) a.click(); }
      if (b.dataset.acct === 'out') {
        /* auth.js owns sign-out (it answers at once and cannot be pressed twice); this only routes to it. */
        var real = document.querySelector('[data-auth-slot] .auth-out');
        if (real) real.click(); else if (window.SynAuth) SynAuth.signOut().then(function () { location.reload(); });
      }
    });
    if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(menu);
    if (window.SynAuth && SynAuth.ready) SynAuth.ready().then(fill);
  })();
