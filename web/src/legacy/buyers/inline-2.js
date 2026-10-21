
    (function () {
      var d = document.documentElement, chosen = null;
      /* Nigeria time: Lagos is UTC+1 all year, so 7am and 7pm never drift. */
      function byClock() { var h = (new Date().getUTCHours() + 1) % 24; return (h >= 19 || h < 7) ? 'dark' : 'light'; }
      try {
        var q = new URLSearchParams(location.search).get('theme');
        if (q === 'light' || q === 'dark') chosen = q;
        else {
          /* A choice made with the switch, here or in the app, holds until
             the next 7am/7pm switch (app/theme.js writes the same key). */
          var p = JSON.parse(localStorage.getItem('syn_theme_pick') || 'null');
          if (p && (p.t === 'light' || p.t === 'dark') && p.until > Date.now()) chosen = p.t;
        }
      } catch (e) {}
      d.setAttribute('data-theme', chosen || byClock());
      window.SynHome = { byClock: byClock, chosen: function () { return chosen; }, choose: function (t) { chosen = t; } };
    })();
  