/* Remember the referral code on a link like synapsecore.dev/?ref=K7M2QXP.
   Kept in this browser for 30 days and handed to the portal once the person has
   an agency (agency.html calls referral_claim). A code is letters and digits
   only and is checked again by the database, so nothing here is trusted. */
(function () {
  'use strict';
  try {
    var m = /[?&]ref=([A-Za-z0-9]{6,10})(?:&|#|$)/.exec(location.search);
    if (m) localStorage.setItem('syn_ref', JSON.stringify({ c: m[1].toUpperCase(), t: Date.now() }));
  } catch (e) { /* private mode: the link still works, the credit just cannot be remembered */ }
})();
