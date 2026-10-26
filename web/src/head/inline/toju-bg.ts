/* Before first paint, so a chosen background never flashes the default. Only for the person who chose it: the saved choice
   carries the user id, and it is applied here only when the stored session is that same user. If the session cannot be read,
   the colour shows until the chooser checks. */
(function () {
  try {
    const b = JSON.parse(localStorage.getItem('toju_bg_v1') || 'null');
    const ss = JSON.parse(localStorage.getItem('synapse_auth_v1') || 'null');
    const who = ss && ss.user && ss.user.id;
    if (b && who && b.uid === who && (b.mode === 'tint' || b.mode === 'pattern')) document.documentElement.setAttribute('data-tjbg', b.mode);
  } catch (e) {}
})();
