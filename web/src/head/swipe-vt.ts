/* Swipe navigation: which way the landing hop travels, for the cross-document View Transition (see swipe-landing.css).
 * Loaded synchronously in <head> because pagereveal can fire before a deferred script runs. It only stamps a class on <html>;
 * it never starts a transition (the CSS opt-in does, and only on a phone with motion allowed). Any other navigation that has
 * a transition is skipped, so nothing else on the site changes. Does nothing where the events do not exist. */
(function () {
  const root = document.documentElement;
  function page(u: string | null | undefined): string | null {
    let p: string;
    try { p = new URL(u as string, location.href).pathname.replace(/\/+$/, '').replace(/\.html$/, ''); }
    catch (e) { return null; }
    if (p === '' || p === '/index') return 'agencies';
    if (p === '/buyers') return 'customers';
    return null;
  }
  function stamp(from: string | null | undefined, to: string | null | undefined) {
    if (!from || !to || from === to) return false;
    root.classList.add(to === 'customers' ? 'syn-hop-fwd' : 'syn-hop-back');   // fwd: content travels right, to Customers
    return true;
  }
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    quiet(e.viewTransition);
    const to = e.activation && e.activation.entry && page(e.activation.entry.url);
    if (!stamp(page(location.href), to)) e.viewTransition.skipTransition();
  });
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    const me = page(location.href);
    let from = e.activation && e.activation.from && page(e.activation.from.url);
    if (!from && me && !(e.activation && e.activation.from)) from = me === 'agencies' ? 'customers' : 'agencies'; // from-entry unavailable: only the other landing page opts in
    quiet(e.viewTransition);
    if (!stamp(from, me)) { e.viewTransition.skipTransition(); return; }
    e.viewTransition.finished.then(clear, clear);
  });
  function quiet(t: ViewTransition) { t.ready.catch(function () {}); t.updateCallbackDone.catch(function () {}); t.finished.catch(function () {}); }
  function clear() { root.classList.remove('syn-hop-fwd', 'syn-hop-back'); }
})();
