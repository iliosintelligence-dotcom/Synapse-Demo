
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var type = params.get('type') === 'magiclink' ? 'magiclink' : (params.get('type') === 'invite' ? 'invite' : '');
  var token = params.get('token_hash') || '';

  function only(id) { ['working', 'form', 'bad', 'done'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function bad(why) { if (why) $('badWhy').textContent = why; only('bad'); }
  function say(t) { var m = $('msg'); m.textContent = t; m.hidden = !t; }
  /* The address no longer carries the token once it has been read. */
  try { history.replaceState(null, '', location.pathname); } catch (e) {}

  /* Into the studio if the account is on the team; otherwise say so plainly. */
  function enter(c) {
    return c.rpc('synapse_staff_role').then(function (r) {
      only('done');
      if (r && r.data) { setTimeout(function () { location.replace('synapse.html'); }, 700); }
      else { $('doneMsg').textContent = 'Your account is ready, but this email is not on the Synapse team yet. Ask your admin to add it.'; }
    });
  }

  SynAuth.client().then(function (c) {
    if (!token || !type) {
      /* No invitation in the link: if they are already signed in, send them on. */
      return SynAuth.ready().then(function (u) { if (u) return enter(c); bad('This page needs the link from your invitation email.'); });
    }
    return c.auth.verifyOtp({ token_hash: token, type: type }).then(function (r) {
      if (r.error || !r.data || !r.data.session) { bad(); return; }
      only('form');
      var nm = r.data.user && r.data.user.user_metadata && r.data.user.user_metadata.full_name;
      if (nm) $('name').value = nm;
      $('pw').focus();
    });
  }).catch(function () { bad('Something went wrong opening the invitation. Try the link again, or ask for a new one.'); });

  $('f').addEventListener('submit', function (e) {
    e.preventDefault(); say('');
    var pw = $('pw').value;
    if (pw.length < 8) { say('Use at least 8 characters.'); return; }
    if (pw !== $('pw2').value) { say('The two passwords are not the same.'); return; }
    var b = $('go'); b.disabled = true; b.textContent = 'Creating your account…';
    var name = $('name').value.trim().slice(0, 80);
    SynAuth.client().then(function (c) {
      return c.auth.updateUser(Object.assign({ password: pw }, name ? { data: { full_name: name } } : {})).then(function (r) {
        if (r.error) { throw new Error(r.error.message || 'That password was not accepted.'); }
        if (name && r.data && r.data.user) { c.from('profiles').update({ full_name: name }).eq('id', r.data.user.id).then(function () {}, function () {}); }
        return enter(c);
      });
    }).catch(function (err) {
      b.disabled = false; b.textContent = 'Create my account'; say(err && err.message ? err.message : 'That did not work. Try again.');
    });
  });
})();
