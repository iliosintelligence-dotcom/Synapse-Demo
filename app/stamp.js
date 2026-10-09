/* THE VERIFIED STAMP, for buyers. A perforated postage stamp on a listing's
   photo, drawn only when the listing's own verification_status is exactly
   'verified' (callers pass that test; this file draws, it does not decide).
   Idea from dqnamo's "Stamp" in The Kitchen. The words are real text, so a
   screen reader says "Verified" and the picture is only the dressing. */
(function () {
  'use strict';
  function html(opts) {
    opts = opts || {};
    return '<span class="vst' + (opts.land ? ' land' : '') + '" title="Verified by Synapse">'
      + '<span class="vst-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6z"/><path d="m8.6 12 2.4 2.4 4.4-4.8"/></svg>'
      + '<b>VERIFIED</b><i>SYNAPSE</i></span><span class="vst-pm" aria-hidden="true"></span><span class="vst-sr">Verified by Synapse. </span></span>';
  }
  window.SynStamp = { html: html };
})();
