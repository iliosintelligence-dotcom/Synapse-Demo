/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — the customer taskbar.

   Tayo, Your matches and Dream Home are one product, and until now each page
   carried its own copy of the links between them as a row of pills under the
   top bar. Two problems with that. It was permanent chrome for something people
   touch a handful of times a session, costing a row of vertical space on every
   screen. And three copies of the same list is three things to keep in step --
   the mobile CSS in browse.html says as much, in a comment worrying about
   exactly that drift.

   So: one file, injected on every consumer page, rendering the same floating
   pill the agency portal uses. The list of destinations lives HERE and nowhere
   else, which is the whole point.

   Include after icons.js:
       <script src="cust-nav.js"></script>

   A page with furniture along the bottom edge marks it data-cnav-clear and the
   taskbar keeps itself above it, re-measuring when it resizes. toju.html's
   composer is the case that needs it: it grows and shrinks with the hint text,
   so a hard-coded offset would be wrong half the time. Pages with nothing down
   there need no markup at all.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* The three consumer surfaces, in the order someone meets them: talk first,
     then what that produced, then what they are saving toward. */
  var PAGES = [
    { file: 'toju.html',   label: 'Tayo',         sub: 'Ask about anything',  icon: 'chat'   },
    { file: 'browse.html', label: 'Your matches', sub: 'Homes that fit',      icon: 'home'   },
    { file: 'dream.html',  label: 'Dream boards', sub: 'What you are saving', icon: 'boards' },
  ];

  function currentFile() {
    var p = window.location.pathname;
    return p.slice(p.lastIndexOf('/') + 1).toLowerCase() || 'toju.html';
  }

  /* icons.js paints [data-icon] elements after load. If it is missing the
     markup still reads -- an empty span, not a broken glyph -- so the nav
     degrades to text rather than to nothing. */
  function iconSpan(name) {
    return '<span data-icon="' + name + '" aria-hidden="true"></span>';
  }

  /* A page can hand the taskbar its own controls by putting them in a
     [data-cnav-actions] container. They are MOVED, not copied, so the page
     keeps ownership of the markup and its behaviour: event listeners survive
     a move, so whatever wired them up still works from in here.

     This is how the matches page gets its map toggle and its "tell me when I
     walk past one" opt-in out of the top of the screen -- controls people use
     occasionally were taking space above the homes, which is the one thing
     that page is actually for. */
  var PHONE = window.matchMedia('(max-width: 1024px)');

  function onPhoneChange(fn) {
    if (PHONE.addEventListener) PHONE.addEventListener('change', fn);
    else if (PHONE.addListener) PHONE.addListener(fn);
  }

  /* Borrow a page's own controls into the taskbar, and give them back when the
     taskbar is not the thing on screen.

     Only borrow below 1024px. The taskbar is hidden above that, so adopting on
     desktop would not tidy those controls away -- it would delete them, and
     the location opt-in has no other home. The source container stays in the
     page either way, so there is always somewhere to give them back to.

     `keep` marks nodes the destination owns (a group heading), so they are not
     handed to the page along with the borrowed controls. */
  function adopt(src, dest, keep, after) {
    if (!src) return;

    var sync = function () {
      var toPhone = PHONE.matches;
      var from = toPhone ? src : dest;
      var to   = toPhone ? dest : src;
      /* Move, never clone: these controls already have listeners bound by the
         page and by notify.js, and listeners survive a move but not a copy. */
      [].slice.call(from.children).forEach(function (el) {
        if (!keep || !el.matches(keep)) to.appendChild(el);
      });
      /* A lent-out container would otherwise sit in the page as an empty box
         still holding its own margins. Driven by a class rather than by CSS
         alone so that if this script never runs, the controls stay visible
         where they were instead of vanishing. */
      src.classList.toggle('cnav-lent', toPhone);
      if (after) after(toPhone);
    };

    sync();
    onPhoneChange(sync);
  }

  /* The desktop home for page actions: a small button in the app bar with a
     popover under it. Desktop has no taskbar, and the location opt-in was
     sitting in the page as a full-width card with a paragraph of explanation
     between the search box and the first home. The explanation is kept -- it
     is a request for someone's location and shortening it to fit would trade
     an honest ask for a tidy one -- it just lives behind a button now. */
  function buildDeskActions() {
    var bar = document.querySelector('.appbar');
    if (!bar) return null;

    var wrap = document.createElement('div');
    wrap.className = 'cnav-desk';
    wrap.innerHTML =
      '<button class="cnav-dbtn" type="button" aria-expanded="false" aria-haspopup="dialog">'
      + iconSpan('pin') + '<span>Nearby</span></button>'
      + '<div class="cnav-dpop" role="dialog" aria-label="Homes near you"></div>';

    var btn = wrap.querySelector('.cnav-dbtn');
    var pop = wrap.querySelector('.cnav-dpop');

    var open = function (yes) {
      wrap.classList.toggle('open', yes);
      btn.setAttribute('aria-expanded', String(yes));
    };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open(!wrap.classList.contains('open'));
    });
    document.addEventListener('click', function (e) {
      if (wrap.classList.contains('open') && !wrap.contains(e.target)) open(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('open')) { open(false); btn.focus(); }
    });

    /* Same reasoning as the filter pill: a control hidden behind a button has
       to say when it is doing something. notify.js repaints the card wholesale
       rather than toggling a class, so watch for the replacement too. */
    var reflect = function () { btn.classList.toggle('on', !!pop.querySelector('.prox-card.on')); };
    if (window.MutationObserver) {
      new MutationObserver(reflect).observe(pop, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    reflect();

    var anchor = bar.querySelector('[data-auth-slot]');
    if (anchor) bar.insertBefore(wrap, anchor); else bar.appendChild(wrap);
    if (window.SynIcons && typeof window.SynIcons.hydrate === 'function') window.SynIcons.hydrate(wrap);
    return { btn: btn, pop: pop, wrap: wrap };
  }

  function adoptPageActions(sheet) {
    var src = document.querySelector('[data-cnav-actions]');
    if (!src) return;

    var group = document.createElement('div');
    group.className = 'cnav-group';
    group.innerHTML = '<div class="cnav-grouph">On this page</div>';
    sheet.appendChild(group);

    var desk = buildDeskActions();

    /* Three possible homes now -- the taskbar sheet on a phone, the app bar
       popover on desktop, and the page itself if there is no app bar to hang
       the popover on. Collect from wherever they are and move them to the one
       that applies, so a resize never strands a control somewhere invisible. */
    var sync = function () {
      var dest = PHONE.matches ? group : (desk ? desk.pop : src);
      [src, group, desk && desk.pop].forEach(function (from) {
        if (!from || from === dest) return;
        [].slice.call(from.children).forEach(function (el) {
          if (el.classList && el.classList.contains('cnav-grouph')) return;
          dest.appendChild(el);
        });
      });
      src.classList.toggle('cnav-lent', dest !== src);
      group.hidden = !group.querySelector('.cnav-act, [data-proximity-slot]');
      if (desk) desk.wrap.hidden = PHONE.matches || !desk.pop.children.length;
    };

    sync();
    onPhoneChange(sync);
  }

  /* The filter and sort controls, moved into their own sheet beside the nav
     button. Same reasoning as the rest: on a phone they were two wrapped rows
     between the search box and the first home, and they are set once and then
     left alone for the rest of a session.

     Hiding controls hides state, so the trigger has to carry it: the pill
     reads out the deal you are filtering to, and marks itself active whenever
     anything is narrowing the list. Otherwise "no homes match" and "you left
     Rent switched on" look identical. */
  /* Borrow the page's search field into the bar.

     A sticky search bar at the top of a phone screen costs about sixty pixels
     of the first screenful, permanently, for something used occasionally. Down
     here it costs a 46px circle until it is wanted, and the homes start at the
     top of the page where they belong.

     The field is MOVED, not copied. The page binds `input` and `click` on its
     own search elements and holds `searchQ` off them; a duplicate would need
     value, clear-button state and listeners mirrored, and the two would
     disagree the first time either side changed. adopt() hands the same nodes
     back above 1024px, where the sticky bar is the right answer again.

     The trigger only appears if the page actually has a search to lend. */
  function adoptSearch(field, sbtn) {
    var src = document.querySelector('[data-cnav-search]');
    if (!src || !field || !sbtn) return;

    adopt(src, field, null, function (onPhone) {
      sbtn.hidden = !onPhone;
      /* Handing the field back to the page while the bar is open would leave
         the bar open around an empty pill. */
      if (!onPhone) field.closest('.cnav').classList.remove('sopen');

      /* The page's placeholder is a full sentence of examples -- right for a
         full-width sticky bar, impossible in a pill with two buttons in it,
         where it would clip to "Search by area, city, ty...". Swapped for the
         short form down here and handed back on the way out, so neither
         version has to be maintained in two places. */
      var el = field.querySelector('input') || src.querySelector('input');
      if (!el) return;
      if (onPhone) {
        if (!el.dataset.fullPlaceholder) el.dataset.fullPlaceholder = el.placeholder || '';
        el.placeholder = 'Search homes';
      } else if (el.dataset.fullPlaceholder) {
        el.placeholder = el.dataset.fullPlaceholder;
      }
    });

    /* The closed button has to report that a search is narrowing the list --
       otherwise closing the field hides the reason the list is short. Read off
       the input itself rather than tracking a second copy of the state. */
    var input = function () { return field.querySelector('input'); };
    var reflect = function () {
      var el = input();
      sbtn.classList.toggle('on', !!(el && el.value.trim()));
    };
    field.addEventListener('input', reflect);
    field.addEventListener('click', function () { setTimeout(reflect, 0); });
    reflect();
  }

  function adoptFilters(fsheet, fbtn) {
    var src = document.querySelector('[data-cnav-filters]');
    if (!src) return;

    adopt(src, fsheet, null, function (onPhone) {
      fbtn.hidden = !onPhone;
    });

    var label = fbtn.querySelector('.cnav-flabel');

    var refresh = function () {
      var deal = document.querySelector('.dealfilter button.on');
      var verified = document.querySelector('.vtoggle.on');
      label.textContent = deal ? deal.textContent.trim() : 'Filters';
      fbtn.classList.toggle('on', !!(deal || verified));
      /* Say it once, properly, for anyone not looking at the pill. */
      fbtn.setAttribute('aria-label',
        (deal || verified)
          ? 'Filter and sort — ' + (deal ? deal.textContent.trim() : 'all homes')
            + (verified ? ', verified only' : '')
          : 'Filter and sort');
    };

    refresh();
    /* The page toggles these classes itself, including when it restores saved
       preferences after load. Watching the classes rather than listening for
       clicks means the pill stays honest however the state got there. */
    if (window.MutationObserver) {
      var mo = new MutationObserver(refresh);
      [].slice.call(document.querySelectorAll('.dealfilter, .vtoggle')).forEach(function (el) {
        mo.observe(el, { attributes: true, attributeFilter: ['class'], subtree: true });
      });
    }
    fsheet.addEventListener('click', refresh);
    fsheet.addEventListener('change', refresh);
  }

  /* ── going back ────────────────────────────────────────────────────────
     A real back control, not a fixed link dressed as one. The arrow that used
     to sit in each page's header always went to the same place regardless of
     where you had come from, which is a link, not "back".

     Only step back when the previous page was ours. With no same-origin
     referrer -- opened cold, shared link, reloaded -- history.back() would
     either do nothing or throw someone out to whatever site they were on
     before, so those cases go to the site's front door instead.

     A page can take the control over for a view of its own: inside a dream
     board, back means back to the boards, not off the page. */
  var backOverride = null;

  function goBack() {
    if (typeof backOverride === 'function') { backOverride(); return; }
    var sameOrigin = false;
    try {
      sameOrigin = !!document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
    } catch (e) { /* malformed referrer: treat as external */ }

    if (sameOrigin) window.history.back();
    /* The buyer page, not the homepage. This nav only ever mounts on the
       consumer app, and the homepage is the agency pitch now -- somebody who
       walked in on a listing should not be handed a CRM on the way out. */
    else window.location.href = '../buyers.html';
  }

  function installBack() {
    /* A page can already carry its own back control, and keeps it: toju's
       mobile header has one, and its top-right corner is taken by History and
       New chat. It gets the behaviour above rather than its old fixed href. */
    var own = document.querySelector('[data-cnav-back]');
    if (own) own.addEventListener('click', function (e) { e.preventDefault(); goBack(); });

    /* An own control that only exists at one width leaves the other width with
       no way back -- toju's header is hidden on desktop, so its arrow goes with
       it. So a slot is still honoured alongside one: each is shown by its own
       page's CSS at the width it belongs to, and they never both appear. */
    var slot = document.querySelector('[data-cnav-back-slot]');
    if (own && !slot) return;

    var btn = document.createElement('button');
    btn.className = 'cnav-back';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back');
    btn.innerHTML = iconSpan('arrow-right');
    btn.addEventListener('click', goBack);

    /* Top-left, and in the page's flow rather than floating over it. A fixed
       button cannot avoid the content: park it anywhere and everything that
       scrolls past eventually slides underneath -- the search box on the
       matches page did exactly that. In the flow it occupies real space, so
       nothing is ever behind it. It scrolls away with the rest of the header,
       which is the trade, and the taskbar is still there for getting around. */
    if (slot) slot.insertBefore(btn, slot.firstChild);
    else { btn.classList.add('cnav-back-float'); document.body.appendChild(btn); }

    if (window.SynIcons && typeof window.SynIcons.hydrate === 'function') {
      window.SynIcons.hydrate(btn);
    }
  }

  /* Sit above whatever the page has pinned along its bottom edge. Measured
     rather than assumed: toju's composer is taller once the hint wraps, and a
     nav resting on the send button is worse than no nav. */
  function clearBottomFurniture(wrap) {
    var furniture = [].slice.call(document.querySelectorAll('[data-cnav-clear]'));
    if (!furniture.length) return;

    var apply = function () {
      /* Measure from the viewport bottom to the top of the furniture, not the
         furniture's height. The compare bar floats 12px off the bottom edge,
         so clearing its height alone still lands the nav 2px inside it.
         Tallest wins: the bar only appears once something is selected, so the
         clearance has to track whichever is showing right now. */
      var h = furniture.reduce(function (max, el) {
        var r = el.getBoundingClientRect();
        return r.height ? Math.max(max, window.innerHeight - r.top) : max;
      }, 0);
      /* Hidden furniture measures 0, which correctly collapses back to the
         default resting position rather than leaving a floating gap. */
      wrap.style.setProperty('--cnav-bottom', h ? (h + 10) + 'px' : '');
    };
    apply();

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(apply);
      furniture.forEach(function (el) { ro.observe(el); });
    } else {
      window.addEventListener('resize', apply);
    }
  }

  function build() {
    if (document.querySelector('.cnav')) return;      // already injected

    var here = currentFile();
    var wrap = document.createElement('div');
    wrap.className = 'cnav';
    wrap.innerHTML =
      '<div class="cnav-sheet" id="cnavSheet" role="menu" aria-label="Go to"></div>'
      + '<div class="cnav-sheet cnav-fsheet" id="cnavFSheet" role="group" aria-label="Filter and sort"></div>'
      + '<div class="cnav-triggers">'
      + '<button class="cnav-btn" id="cnavBtn" type="button" aria-expanded="false"'
      + ' aria-haspopup="menu" aria-label="Open navigation">' + iconSpan('grid') + '</button>'
      /* The filter trigger is a stadium, not a circle, because it carries a
         word: it has to say which filter is currently on, or hiding the
         controls would also hide the fact that a filter is narrowing what you
         are looking at. */
      + '<button class="cnav-fbtn" id="cnavFBtn" type="button" aria-expanded="false" hidden>'
      + iconSpan('sliders') + '<span class="cnav-flabel">Filters</span></button>'
      /* Opposite end of the bar. Hidden until a page turns out to have a
         search to lend -- most do not, and an empty search on the dream board
         would be a button that opens onto nothing. */
      + '<button class="cnav-sbtn cnav-btn" id="cnavSBtn" type="button"'
      + ' aria-expanded="false" aria-label="Search" hidden>' + iconSpan('search') + '</button>'
      + '</div>'
      + '<div class="cnav-search" id="cnavSearch">'
      + '<div class="cnav-sfield" id="cnavSField"></div>'
      + '<button class="cnav-sclose" id="cnavSClose" type="button" aria-label="Close search">&#215;</button>'
      + '</div>';

    var sheet = wrap.querySelector('#cnavSheet');
    sheet.innerHTML = PAGES.map(function (p) {
      var isHere = p.file === here;
      return '<a class="cnav-item" role="menuitem" href="' + p.file + '"'
        + (isHere ? ' aria-current="page"' : '')
        + '>' + iconSpan(p.icon)
        + '<span class="cn-txt"><span class="cn-label">' + p.label + '</span>'
        + '<span class="cn-sub">' + p.sub + '</span></span>'
        /* Hidden until a page reports a number. An empty badge is noise, and a
           badge reading 0 is worse -- it says "nothing here" using the visual
           language of "something here". */
        + '<b class="cn-count" data-cnav-count="' + p.file + '" hidden></b></a>';
    }).join('');

    adoptPageActions(sheet);
    document.body.appendChild(wrap);
    installBack();

    var btn  = wrap.querySelector('#cnavBtn');
    var fbtn = wrap.querySelector('#cnavFBtn');
    var sbtn = wrap.querySelector('#cnavSBtn');
    adoptFilters(wrap.querySelector('#cnavFSheet'), fbtn);
    adoptSearch(wrap.querySelector('#cnavSField'), sbtn);
    clearBottomFurniture(wrap);

    /* One at a time. Two sheets open at once would overlap, and the second one
       would be reporting state you cannot see behind the first. */
    var open = function (which) {
      wrap.classList.toggle('open', which === 'nav');
      wrap.classList.toggle('fopen', which === 'filters');
      /* Search replaces the trigger row rather than sitting above a sheet, so
         it belongs in the same mutual exclusion: opening it has to put the
         other two away, and opening either of those has to close it. */
      wrap.classList.toggle('sopen', which === 'search');
      btn.setAttribute('aria-expanded', String(which === 'nav'));
      fbtn.setAttribute('aria-expanded', String(which === 'filters'));
      if (sbtn) sbtn.setAttribute('aria-expanded', String(which === 'search'));
      if (which === 'search') {
        var el = wrap.querySelector('#cnavSField input');
        /* Focus after the class lands, or the field is still display:none and
           the caret goes nowhere. */
        if (el) setTimeout(function () { el.focus(); }, 0);
      }
      syncIcons(which);
    };

    /* Each trigger's icon states whether its own sheet is open, travelling to
       a cross and back rather than being swapped out underneath you. Driven
       off `which` so one call keeps both honest — opening the filters has to
       return the nav icon to a grid, not leave two crosses on the bar.

       Guarded: SynMorph is a module and this file is a classic script, so on a
       page where it has not loaded (or failed to) the icons simply sit still,
       which is what they did before. */
    var syncIcons = function (which) {
      if (!window.SynMorph) return;
      var pairs = [[btn, 'grid', which === 'nav'], [fbtn, 'sliders', which === 'filters']];
      pairs.forEach(function (pair) {
        var host = pair[0] && pair[0].querySelector('[data-icon]');
        if (host) SynMorph.morphTo(host, pair[2] ? 'close' : pair[1]);
      });
    };
    var openState = function () {
      return wrap.classList.contains('open') ? 'nav'
           : wrap.classList.contains('fopen') ? 'filters'
           : wrap.classList.contains('sopen') ? 'search' : null;
    };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open(openState() === 'nav' ? null : 'nav');
    });
    fbtn.addEventListener('click', function (e) {
      e.stopPropagation();
      open(openState() === 'filters' ? null : 'filters');
    });
    if (sbtn) {
      sbtn.addEventListener('click', function (e) {
        e.stopPropagation();
        open(openState() === 'search' ? null : 'search');
      });
    }
    var sclose = wrap.querySelector('#cnavSClose');
    if (sclose) {
      sclose.addEventListener('click', function (e) {
        e.stopPropagation();
        open(null);
        /* Closing is not clearing: the list stays filtered and the trigger
           stays marked, so reopening shows the query that produced what is on
           screen. Clearing is the other button, inside the pill. */
        sbtn.focus();
      });
    }

    /* Tapping anywhere else closes it. Without this the sheet stays over the
       page and the next tap goes to the sheet's backdrop instead of what the
       person aimed at. */
    document.addEventListener('click', function (e) {
      if (openState() && !wrap.contains(e.target)) open(null);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openState()) {
        var was = openState();
        open(null);
        (was === 'filters' ? fbtn : was === 'search' ? sbtn : btn).focus();
      }
    });

    /* icons.js hydrates [data-icon] on load, which has usually already
       happened by the time this injects. hydrate() takes a root, so re-run it
       over just what we added rather than the whole document. */
    if (window.SynIcons && typeof window.SynIcons.hydrate === 'function') {
      window.SynIcons.hydrate(wrap);
    }
  }

  /* The saved-homes count used to sit in the mobile header. That header is
     gone from the matches page, and this is where it belongs anyway: the badge
     is on the row that goes to the boards those homes are saved on. Pages that
     already own a count write it here rather than a second copy tracking its
     own state. */
  window.CustNav = {
    /* Hand back control to the page for a view of its own; pass null to
       restore the default. */
    setBack: function (fn) { backOverride = typeof fn === 'function' ? fn : null; },

    setCount: function (file, n) {
      var el = document.querySelector('[data-cnav-count="' + file + '"]');
      if (!el) return;
      el.hidden = !n;
      el.textContent = n || '';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
