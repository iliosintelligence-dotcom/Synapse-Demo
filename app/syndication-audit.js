/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — syndication validation harness.

   Runs every real listing through every platform and reports what would be
   rejected, BEFORE any of it is queued. Meta approval is pending, so this is
   the part of syndication that can be proven today: whether the captions and
   media we generate actually satisfy each platform's limits.

   The failures this catches are the ones that are worst to discover live — a
   caption truncated mid-sentence in the feed, an aspect ratio a provider
   refuses, a video over the length cap. Each is silent until it is public.

   Exposes window.SynSyndicateAudit. Run from any page that has loaded
   syndication.js and auth.js:

       SynSyndicateAudit.run().then(SynSyndicateAudit.print)

   Reads listings; writes nothing, queues nothing, publishes nothing.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
  var ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';

  /* Every platform syndication.js knows about. Deliberately not filtered to
     the ones we can currently post to: the point is to know the whole surface
     is sound before any single provider is connected. */
  function allPlatforms() {
    return Object.keys(window.SynSyndicate.PLATFORMS);
  }

  function fetchListings() {
    var q = SUPABASE_URL + '/rest/v1/properties'
      + '?select=id,title,price,city,bedrooms,listing_type,property_type,'
      + 'verification_status,trust_score,property_media(url,display_order)'
      + '&status=eq.live&is_active=is.true&deleted_at=is.null&limit=100';
    return fetch(q, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
      .then(function (r) {
        if (!r.ok) throw new Error('listings fetch failed: ' + r.status);
        return r.json();
      });
  }

  /**
   * The audit itself. For each listing, generate the full variant set across
   * every platform and collect the issues the validator reports.
   */
  function run(opts) {
    opts = opts || {};
    if (!window.SynSyndicate) {
      return Promise.reject(new Error('syndication.js is not loaded on this page'));
    }
    return fetchListings().then(function (rows) {
      var platforms = opts.platforms || allPlatforms();
      var report = {
        ranAt: new Date().toISOString(),
        listings: rows.length,
        platforms: platforms,
        totalVariants: 0,
        clean: 0,
        withIssues: 0,
        byPlatform: {},
        byIssue: {},
        skippedAngles: [],
        failures: [],
      };

      platforms.forEach(function (p) { report.byPlatform[p] = { variants: 0, issues: 0 }; });

      rows.forEach(function (row) {
        var shaped = window.SynSyndicate.shape(row);
        var out = window.SynSyndicate.generate(shaped, { platforms: platforms });

        (out.skipped || []).forEach(function (s) {
          report.skippedAngles.push({ listing: shaped.title, angle: s.name, reason: s.reason });
        });

        (out.variants || []).forEach(function (v) {
          report.totalVariants++;
          var pl = report.byPlatform[v.platform];
          if (pl) pl.variants++;

          if (v.issues && v.issues.length) {
            report.withIssues++;
            if (pl) pl.issues++;
            v.issues.forEach(function (issue) {
              report.byIssue[issue] = (report.byIssue[issue] || 0) + 1;
            });
            report.failures.push({
              listing: shaped.title,
              platform: v.platform,
              angle: v.angleName || v.angle,
              issues: v.issues,
              captionLength: (v.caption || '').length,
            });
          } else {
            report.clean++;
          }
        });
      });

      return report;
    });
  }

  /** Human-readable summary. Kept separate from run() so the report can also
   *  be asserted against in a test without parsing prose. */
  function print(r) {
    var lines = [];
    lines.push('SYNDICATION AUDIT — ' + r.ranAt);
    lines.push(r.listings + ' listings x ' + r.platforms.length + ' platforms = '
      + r.totalVariants + ' variants');
    lines.push(r.clean + ' clean, ' + r.withIssues + ' with issues');
    lines.push('');

    lines.push('BY PLATFORM');
    Object.keys(r.byPlatform).forEach(function (p) {
      var b = r.byPlatform[p];
      lines.push('  ' + p.padEnd(12) + b.variants + ' variants, ' + b.issues + ' with issues');
    });

    var issues = Object.keys(r.byIssue);
    if (issues.length) {
      lines.push('');
      lines.push('ISSUES, MOST COMMON FIRST');
      issues.sort(function (a, b) { return r.byIssue[b] - r.byIssue[a]; })
        .forEach(function (i) { lines.push('  ' + r.byIssue[i] + ' x  ' + i); });
    }

    if (r.skippedAngles.length) {
      lines.push('');
      lines.push('ANGLES SKIPPED (not failures — the generator declining to overclaim)');
      var seen = {};
      r.skippedAngles.forEach(function (s) {
        var k = s.angle + ' — ' + s.reason;
        if (seen[k]) return;
        seen[k] = 1;
        lines.push('  ' + k);
      });
    }

    if (r.failures.length) {
      lines.push('');
      lines.push('FIRST 12 FAILURES');
      r.failures.slice(0, 12).forEach(function (f) {
        lines.push('  ' + f.platform.padEnd(11) + f.listing.slice(0, 34));
        f.issues.forEach(function (i) { lines.push('      -> ' + i); });
      });
    }

    var out = lines.join('\n');
    if (typeof console !== 'undefined') console.log(out);
    return out;
  }

  window.SynSyndicateAudit = { run: run, print: print, allPlatforms: allPlatforms };
})();
