
(function () {
  var g = null;
  try {
    g = JSON.parse(sessionStorage.getItem('synapse_goodbye_v1') || 'null');
    sessionStorage.removeItem('synapse_goodbye_v1');
  } catch (e) { return; }
  if (!g || g.kind !== 'agency') return;

  var box = document.createElement('div');
  box.className = 'goodbye';
  box.setAttribute('role', 'status');
  var say = document.createElement('span');
  /* Says what was done, not what sounds most final: when the login had to
     stay (another agency, staff), the page does not claim it went. */
  say.textContent = g.login === 'kept'
    ? 'Your agency has been deleted. Your Synapse login was kept, because you still use it elsewhere on Synapse.'
    : 'Your agency and your Synapse account have been deleted.';
  var x = document.createElement('button');
  x.type = 'button';
  x.setAttribute('aria-label', 'Dismiss');
  x.textContent = '×';
  x.addEventListener('click', function () { box.remove(); });
  box.appendChild(say);
  box.appendChild(x);
  document.body.appendChild(box);
  setTimeout(function () { if (box.parentNode) box.remove(); }, 12000);
})();
