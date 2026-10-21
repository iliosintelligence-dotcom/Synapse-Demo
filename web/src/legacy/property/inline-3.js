
    /* Gallery. PHOTOS starts EMPTY and is filled from property_media by
       hydrate(), the page used to ship five stock interiors, so every listing
       showed the same apartment regardless of which home you opened. */
    let PHOTOS = [];
    const hero = document.getElementById('heroImg');
    const heroVid = document.getElementById('heroVid');
    const thumbs = document.getElementById('thumbs');

    /* The same rule agency-listings.js applies when it records media_type and
       the publisher applies again when it decides between image_url and
       video_url. Asked of the same string in all three places on purpose: two
       different guesses is how a video gets posted as a photograph. */
/* THE COVER IS A PHOTO (Eden, 2026-10-02): a listing whose first upload
       was a video showed a blank card, because the video's URL went into an
       <img>. The first photo in display order is the cover; a video-only
       listing gets a still from its video; nothing else gets a stock image. */
    const coverIsVideo = (m) => !!m && (m.media_type === 'video'
      || /\.(mp4|mov|m4v|qt|webm|3gp)(\?|#|$)/i.test(String(m.url || '')));
    const coverFrame = (u) => /res\.cloudinary\.com\/.+\/video\/upload\//.test(String(u || ''))
      ? String(u).replace('/video/upload/', '/video/upload/so_0/').replace(/\.(mp4|mov|m4v|qt|webm|3gp)(\?.*)?$/i, '.jpg')
      : null;
    const coverOf = (media) => {
      const s = (Array.isArray(media) ? media : []).filter((m) => m && m.url)
        .slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const photo = s.find((m) => !coverIsVideo(m));
      return photo ? photo.url : (s.length ? coverFrame(s[0].url) : null);
    };
    const isVid = (u) => (window.SynListings && SynListings.isVideoUrl)
      ? SynListings.isVideoUrl(u)
      : /\.(mp4|mov|m4v|qt)(\?|#|$)/i.test(String(u || ''));

    /* A video left running when you move on keeps running -- you would hear a
       kitchen tap while looking at a bedroom. */
    function stopHeroVideo() {
      if (!heroVid) return;
      try { heroVid.pause(); } catch (e) {}
    }

    /* Shows whichever element this item needs and hides the other. */
    function paintHero(url) {
      const video = isVid(url);
      stopHeroVideo();
      if (video) {
        heroVid.src = url; heroVid.hidden = false;
        hero.hidden = true; hero.removeAttribute('src');
      } else {
        heroVid.hidden = true; heroVid.removeAttribute('src');
        hero.hidden = false; hero.src = url;
      }
    }
    function renderGallery() {
      const counter = document.getElementById('counter');
      if (!PHOTOS.length) {
        thumbs.innerHTML = '';
        if (counter) counter.textContent = '';
        hero.removeAttribute('src');
        hero.hidden = false;
        if (heroVid) { stopHeroVideo(); heroVid.hidden = true; heroVid.removeAttribute('src'); }
        hero.alt = 'No photos supplied for this listing';
        return;
      }
      photoIndex = 0;
      paintHero(PHOTOS[0]);
      hero.alt = 'Photo of this property';
      if (counter) counter.textContent = '1 / ' + PHOTOS.length;
      /* Say there is more than one, once, on the photo itself. The counter
         alone is easy to miss and does not tell you what to do about it. */
      const more = document.getElementById('swipeHint');
      if (more) more.hidden = PHOTOS.length < 2;
      /* A <video> tile rather than an <img> pointed at an mp4, which would
         draw a broken-image icon in the strip. preload=metadata so eight
         tiles fetch eight first frames, not eight whole films. */
      thumbs.innerHTML = PHOTOS.map((p, i) => (isVid(p)
        ? `<span class="th-v${i === 0 ? ' on' : ''}" data-i="${i}">`
          + `<video src="${p}" muted playsinline preload="metadata"></video>`
          + '<i aria-hidden="true">▶</i></span>'
        : `<img src="${p}" data-i="${i}" class="${i === 0 ? 'on' : ''}" alt="" />`)).join('');
    }
    /* ONE function moves the gallery, and everything that can move it calls
       this. Thumbnails had their own copy of the logic; adding swipe beside it
       would have made two, and the counter drifting out of step with the photo
       is the kind of bug nobody reports and everybody notices. */
    let photoIndex = 0;
    function goToPhoto(i) {
      if (!PHOTOS.length) return;
      /* Wraps, because a gallery that stops dead at the last photo feels
         broken on a phone -- you swipe again and nothing happens. */
      photoIndex = (i + PHOTOS.length) % PHOTOS.length;
      /* The fade applies to whichever element is showing, so it has to be set
         on both -- the outgoing one is about to be hidden anyway. */
      hero.style.opacity = 0; if (heroVid) heroVid.style.opacity = 0;
      setTimeout(() => {
        paintHero(PHOTOS[photoIndex]);
        hero.style.opacity = 1; if (heroVid) heroVid.style.opacity = 1;
      }, 160);
      const counter = document.getElementById('counter');
      if (counter) counter.textContent = (photoIndex + 1) + ' / ' + PHOTOS.length;
      thumbs.querySelectorAll('[data-i]').forEach((im) =>
        im.classList.toggle('on', Number(im.dataset.i) === photoIndex));
    }

    thumbs.addEventListener('click', (e) => {
      /* [data-i], not img[data-i] -- a video tile is a <span> wrapping a
         <video>, and the old selector matched neither. */
      const t = e.target.closest('[data-i]');
      if (t) goToPhoto(Number(t.dataset.i));
    });

    /* ── the photograph, full size ───────────────────────
       Shares photoIndex with the hero rather than keeping its own, so closing
       this leaves the strip on the picture you were looking at. Two indices
       would drift the moment somebody swiped in one and not the other, and the
       thumbnail highlight is where that shows. */
    (function lightbox() {
      const box = document.getElementById('pvlb');
      const img = document.getElementById('pvlbImg');
      const num = document.getElementById('pvlbN');
      const shut = document.getElementById('pvlbX');
      if (!box || !img || !shut) return;
      let lastFocus = null;

      const vid = document.getElementById('pvlbVid');

      function stopLbVideo() { if (vid) { try { vid.pause(); } catch (e) {} } }

      function paint() {
        if (!PHOTOS.length) return;
        const url = PHOTOS[photoIndex];
        stopLbVideo();
        if (vid && isVid(url)) {
          vid.src = url; vid.hidden = false;
          img.hidden = true; img.removeAttribute('src');
          /* Muted, so a browser will honour it; a rejected play() is not
             worth handling beyond not throwing. */
          vid.play().catch(function () {});
        } else {
          if (vid) { vid.hidden = true; vid.removeAttribute('src'); }
          img.hidden = false; img.src = url;
        }
        num.textContent = PHOTOS.length > 1
          ? (photoIndex + 1) + ' of ' + PHOTOS.length : '';
      }

      function open() {
        if (!PHOTOS.length) return;
        lastFocus = document.activeElement;
        paint();
        /* Cleared on the way in. A viewer closed mid-gesture would otherwise
           reopen holding the offset it was dragged to. */
        img.style.transition = 'none';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
        box.classList.toggle('single', PHOTOS.length < 2);
        box.classList.add('on');
        document.body.classList.add('pvlb-open');
        shut.focus();
      }

      function close() {
        box.classList.remove('on');
        /* Closing a viewer on a playing video must stop it, or the sound
           follows you back to the page you thought you had left. */
        stopLbVideo();
        document.body.classList.remove('pvlb-open');
        /* Back where they were. Dropping focus to the top of the document
           after closing an overlay makes a keyboard or screen-reader user
           find their place again. */
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }

      /* Drives goToPhoto so the hero, the counter and the thumbnail highlight
         all move with it: this is a bigger view of the same gallery, not a
         second one.

         THE SLIDE IS THE POINT. Swapping src left nothing to tell you the
         gesture landed or which direction you went. The outgoing photo leaves
         the way you are going and the next one arrives from the other side --
         --m-micro out, --m-standard back, --m-ease, the same budget a card
         transition gets everywhere else in the app.

         Guarded by `sliding` because a fast double-tap on the arrow would
         otherwise start a second slide mid-flight and strand the transform. */
      let sliding = false;
      function step(d) {
        if (sliding || PHOTOS.length < 2) { if (!sliding) { goToPhoto(photoIndex + d); paint(); } return; }
        sliding = true;
        const away = d > 0 ? -1 : 1;          // going next: this one leaves left
        img.style.transition = 'transform var(--m-micro) var(--m-ease), opacity var(--m-micro) var(--m-ease)';
        img.style.transform = 'translateX(' + (away * 26) + 'px)';
        img.style.opacity = '0';
        setTimeout(function () {
          goToPhoto(photoIndex + d);
          paint();
          /* Placed on the far side with no transition, then released. Without
             the reflow the browser coalesces both writes and the photo simply
             appears, which is the animation this replaces. */
          img.style.transition = 'none';
          img.style.transform = 'translateX(' + (-away * 26) + 'px)';
          void img.offsetWidth;
          img.style.transition = 'transform var(--m-standard) var(--m-ease), opacity var(--m-standard) var(--m-ease)';
          img.style.transform = 'translateX(0)';
          img.style.opacity = '1';
          setTimeout(function () { sliding = false; }, 190);
        }, 110);
      }

      hero.addEventListener('click', open);
      shut.addEventListener('click', close);
      document.getElementById('pvlbPrev').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
      document.getElementById('pvlbNext').addEventListener('click', (e) => { e.stopPropagation(); step(1); });

      /* The backdrop closes; the photograph does not. Tapping the picture you
         just opened and having it vanish is the most irritating thing a viewer
         like this can do. */
      box.addEventListener('click', (e) => {
        if (e.target === box || e.target.classList.contains('pvlb-stage')) close();
      });

      document.addEventListener('keydown', (e) => {
        if (!box.classList.contains('on')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      });

      /* THE PHOTO FOLLOWS THE FINGER. This was a threshold test on touchend:
         nothing moved during the drag, then the picture changed. Nothing said
         the gesture had been noticed and nothing said which way it was going.

         Horizontal intent still has to be established before the drag is
         claimed, or a vertical flick reads as a swipe -- but once claimed, the
         photo tracks, and on release it either completes or springs back. A
         gesture that does not complete should visibly fail rather than do
         nothing. */
      let x0 = null, y0 = null, claimed = false;

      function rest(animate) {
        img.style.transition = animate
          ? 'transform var(--m-standard) var(--m-ease), opacity var(--m-standard) var(--m-ease)'
          : 'none';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
      }

      img.addEventListener('touchstart', (e) => {
        if (sliding) return;
        const t = e.changedTouches[0];
        x0 = t.clientX; y0 = t.clientY; claimed = false;
        img.style.transition = 'none';     // the finger sets the position now
      }, { passive: true });

      img.addEventListener('touchmove', (e) => {
        if (x0 == null || sliding) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - x0;
        if (!claimed && Math.abs(dx) > Math.abs(t.clientY - y0) + 8) claimed = true;
        if (!claimed) return;
        /* Damped, and damped harder at the ends: a photo that slides freely
           when there is nothing to slide to promises a picture that is not
           there. */
        const atEnd = PHOTOS.length < 2;
        img.style.transform = 'translateX(' + (dx * (atEnd ? 0.18 : 0.55)) + 'px)';
        img.style.opacity = String(Math.max(0.45, 1 - Math.abs(dx) / 420));
      }, { passive: true });

      img.addEventListener('touchend', (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        const go = claimed && Math.abs(dx) > 42 && PHOTOS.length > 1;
        x0 = null; y0 = null; claimed = false;
        if (go) { rest(false); step(dx < 0 ? 1 : -1); }
        else rest(true);          // springs back, so a half-swipe reads as declined
      }, { passive: true });
    })();

    /* ── swipe ────────────────────────────────────────────────────────────
       A listing with eight photos showed one, and the only way to the rest was
       a row of thumbnails the size of a fingernail. Swiping the picture is
       what anyone would try first.

       Horizontal intent is required before the gesture is claimed: a mostly
       vertical drag is the page being scrolled, and stealing that makes the
       listing feel stuck. */
    (function swipeHero() {
      const stage = hero.parentElement;
      if (!stage) return;
      let x0 = null, y0 = null, decided = null;

      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; decided = null;
      }, { passive: true });

      stage.addEventListener('touchmove', (e) => {
        if (x0 == null) return;
        const dx = e.touches[0].clientX - x0;
        const dy = e.touches[0].clientY - y0;
        if (decided === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          decided = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        /* Only once it is clearly horizontal, and only then, is the browser
           told not to scroll. */
        if (decided === 'x' && e.cancelable) e.preventDefault();
      }, { passive: false });

      stage.addEventListener('touchend', (e) => {
        if (x0 == null) return;
        const dx = (e.changedTouches[0].clientX - x0);
        const wasX = decided === 'x';
        x0 = y0 = null; decided = null;
        if (!wasX || Math.abs(dx) < 40) return;      // a tap, or a twitch
        goToPhoto(photoIndex + (dx < 0 ? 1 : -1));
      }, { passive: true });

      /* A trackpad and a keyboard deserve the same gallery. */
      stage.setAttribute('tabindex', '0');
      stage.setAttribute('aria-label', 'Property photos, use the arrow keys');
      stage.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); goToPhoto(photoIndex + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); goToPhoto(photoIndex - 1); }
      });
    })();

    renderGallery();

    /* ── swipe deck: cards move left/right, image stays put ── */
    const deck = document.getElementById('deck');
    // deckLabel is gone, see the deckbar markup for why.
    const deckDots = document.getElementById('deckDots');
    const deckPrev = document.getElementById('deckPrev');
    const deckNext = document.getElementById('deckNext');

    /* The deck list has to be recomputed, not captured once.
       "Tayo's take" ships hidden and is revealed only when the listing has
       real enrichment behind it. A hidden card takes no space in the scroll
       flow but was still counted here, so every heading after it named the
       wrong card and the counter read one too many, the offset between the
       heading and the card underneath it.

       The map view each card drives is stamped onto the element up front,
       while the DOM order still matches CARD_VIEWS. After that nothing is
       index-coupled, so hiding or revealing a card cannot desynchronise it. */
    const CARD_VIEW_ORDER = ['poi', 'poi', 'agency', 'cost', 'poi', 'commute', 'poi', 'legal', 'agency', 'poi'];
    [...deck.children].forEach((c, i) => { c.dataset.view = CARD_VIEW_ORDER[i] || 'poi'; });

    const visibleCards = () => [...deck.children].filter((c) => !c.hidden && c.offsetParent !== null);
    let deckCards = visibleCards();

    function rebuildDeck() {
      const current = deckCards[deckIdx];
      deckCards = visibleCards();
      deckDots.innerHTML = deckCards.map((_, i) => `<i data-i="${i}"></i>`).join('');
      const keep = current ? deckCards.indexOf(current) : -1;
      deckIdx = keep > -1 ? keep : Math.min(deckIdx, deckCards.length - 1);
      if (deckIdx < 0) deckIdx = 0;
      syncDeck();
    }
    /* Revealing a card mid-session (hydrate un-hides Tayo's take) must rebuild
       the dots and the count, or they describe the deck as it was on load. */
    window.__pvDeckChanged = rebuildDeck;

    deckDots.innerHTML = deckCards.map((_, i) => `<i data-i="${i}"></i>`).join('');
    let deckIdx = 0;
    function cardTitle(c) {
      if (c.dataset.title) return c.dataset.title;
      const l = c.querySelector('.lbl');
      if (!l) return '';
      // strip a leading emoji/symbol (✦ 🤝 ₦ ◎ ⌖ 📋 🛡) but keep the words
      return l.textContent.replace(/^[^\p{L}]+/u, '').trim() || l.textContent.trim();
    }
    function goCard(i) {
      i = Math.max(0, Math.min(deckCards.length - 1, i));
      deck.scrollTo({ left: i * deck.clientWidth, behavior: 'smooth' });
    }
    function syncDeck() {
      if (!deckCards.length) return;
      // clientWidth is 0 while the deck is unlaid-out (hidden tab, zero-size
      // container). Dividing by it yields NaN, which indexes to `undefined` and
      // threw here, taking the rest of this script block with it, including
      // the code that loads the listing. Fall back to the current card.
      const w = deck.clientWidth || 0;
      const i = w ? Math.round(deck.scrollLeft / w) : deckIdx;
      deckIdx = Math.max(0, Math.min(deckCards.length - 1, Number.isFinite(i) ? i : 0));
      // No label to write any more; the dots below are the only position cue.
      deckDots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === deckIdx));
      deckPrev.disabled = deckIdx === 0;
      deckNext.disabled = deckIdx === deckCards.length - 1;
      // fill any neighbourhood bars on the active card
      deckCards[deckIdx].querySelectorAll('.bar i').forEach((b) => { b.style.width = b.dataset.w + '%'; });
      // sync the right-hand map canvas to whatever this card is about
      if (window.__pvView) window.__pvView(deckCards[deckIdx]);
    }
    let deckRaf;
    deck.addEventListener('scroll', () => { cancelAnimationFrame(deckRaf); deckRaf = requestAnimationFrame(syncDeck); });
    deckPrev.addEventListener('click', () => goCard(deckIdx - 1));
    deckNext.addEventListener('click', () => goCard(deckIdx + 1));
    deckDots.addEventListener('click', (e) => { const d = e.target.closest('[data-i]'); if (d) goCard(+d.dataset.i); });
    document.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') goCard(deckIdx + 1); if (e.key === 'ArrowLeft') goCard(deckIdx - 1); });
    let deckReady = false;
    window.addEventListener('resize', () => { if (deckReady) deck.scrollTo({ left: deckIdx * deck.clientWidth }); });
    // always open on the first card (ignore any browser scroll restoration)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    requestAnimationFrame(() => { deck.scrollLeft = 0; syncDeck(); deckReady = true; });
    syncDeck();

    /* ── the ends are sealed ──────────────────────────────────────────────
       overscroll-behavior (in the CSS above) stops scroll CHAINING, which was
       the right first fix. Safari's back-swipe is not chaining though: it is a
       separate gesture the browser claims for itself, and the only reliable
       way to refuse it is to cancel the touch while it can still be cancelled.

       Narrow on purpose. It refuses only a clearly horizontal drag, and only
       when the strip is ALREADY at the end that drag is pushing towards --
       so scrolling a card vertically is untouched, and so is every ordinary
       swipe between cards. Same shape as swipeHero above: passive touchstart,
       non-passive touchmove that settles the axis before it refuses anything. */
    function sealEnds(el) {
      if (!el) return;
      let x0 = null, y0 = null, decided = null;
      el.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; decided = null;
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (x0 == null || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - x0;
        const dy = e.touches[0].clientY - y0;
        if (decided === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          decided = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        if (decided !== 'x') return;              // vertical is the card's
        const max = el.scrollWidth - el.clientWidth;
        const stuck = (dx > 0 && el.scrollLeft <= 1) || (dx < 0 && el.scrollLeft >= max - 1);
        if (stuck && e.cancelable) e.preventDefault();
      }, { passive: false });
      el.addEventListener('touchend', () => { x0 = y0 = null; decided = null; }, { passive: true });
    }
    [deck, document.querySelector('.thumbs'), document.querySelector('.sim'),
     document.querySelector('.pvc-tabs')].forEach(sealEnds);

    // save + share
    const saveBtn = document.getElementById('saveBtn');
    const SAVED_KEY = 'synapse_saved';
    // Same id the page is keyed on below, saving must follow the listing you
    // actually opened, not the demo default.
    // The listing id from the URL. No demo fallback: if there is no id there is
    // no property, and the page says so rather than substituting a specimen one.
    const PROP_ID = new URLSearchParams(window.location.search).get('id') || '';
    let savedSet = new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    const dkSave = document.getElementById('dkSave');
    function paintSave() {
      const on = savedSet.has(PROP_ID);
      saveBtn.innerHTML = on ? '<svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style="display:block"><path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style="display:block"><path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'; saveBtn.classList.toggle('on', on);
      if (dkSave) { dkSave.classList.toggle('on', on); dkSave.setAttribute('aria-pressed', String(on)); dkSave.querySelector('.dk-heart').innerHTML = on ? '<svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style="display:block"><path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 1 24 24" width="18" height="18" aria-hidden="true" style="display:block"><path d="M12 20.5s-7-4.4-9-8.8C1.8 8.8 3.4 5.5 6.6 5.5c1.9 0 3.5 1 4.3 2.5l1.1 1.8 1.1-1.8c.8-1.5 2.4-2.5 4.3-2.5 3.2 0 4.8 3.3 3.6 6.2-2 4.4-9 8.8-9 8.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'; dkSave.querySelector('span:last-child').textContent = on ? 'Saved' : 'Save'; }
    }
    function toggleSaved() {
      savedSet.has(PROP_ID) ? savedSet.delete(PROP_ID) : savedSet.add(PROP_ID);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...savedSet])); paintSave();
    }
    saveBtn.addEventListener('click', toggleSaved);
    if (dkSave) dkSave.addEventListener('click', toggleSaved);
    paintSave();
    const doShare = async () => {
      /* Was a hardcoded Lekki flat with an invented "Property Confidence 94"
         and a price that belonged to no listing on screen -- so sharing any
         home sent someone else's home. */
      const L = window.__pvListing || PROP || {};
      const where = [L.neighbourhood, L.city].filter(Boolean).join(', ');
      /* One share path for the page and the cards: the phone's own share sheet where there is
         one (WhatsApp, Drive, Files...), a small one of ours where there is not. */
      if (window.SynShare && PROP_ID) {
        SynShare.open({ id: PROP_ID, title: L.title || document.title.replace(/, Synapse$/, ''), price: document.getElementById('pvPrice') && document.getElementById('pvPrice').textContent, place: where });
      } else { await navigator.clipboard.writeText(location.href); toast('Link copied, paste it anywhere to share'); }
    };
    document.getElementById('shareBtn').addEventListener('click', doShare);
    const dkShare = document.getElementById('dkShare'); if (dkShare) dkShare.addEventListener('click', doShare);

    // lightweight feedback toast, speaks to the user, not the system
    function toast(msg, kind) {
      let t = document.getElementById('synToast');
      if (!t) { t = document.createElement('div'); t.id = 'synToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
      t.className = kind === 'error' ? 'err' : '';
      t.textContent = msg;
      requestAnimationFrame(() => t.classList.add('show'));
      clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3600);
    }


    // animate neighbourhood bars on view
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.querySelectorAll('.bar i').forEach((i) => { i.style.width = i.dataset.w + '%'; }); io.unobserve(e.target); }
    }), { threshold: 0.3 });
    document.querySelectorAll('.nb').forEach((el) => io.observe(el));

    const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
    const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
    const VISITOR = localStorage.getItem('toju_visitor_v1');
    // Match cards deep-link here as property.html?id=<listing id>. That id keys
    // everything id-scoped on this page (negotiation payload, saved places,
    // viewing state) AND now selects the listing itself.
    const URL_ID = new URLSearchParams(window.location.search).get('id');
    /* Both used by the data-driven cards below. Titles and agency names are
       agency-authored text going through innerHTML, so they are escaped. */
    const esc = (t) => String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmtDate = (iso) => {
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const naira = (n) => { n = Number(n) || 0; return n >= 1e9 ? '₦' + (n/1e9).toFixed(1) + 'B' : n >= 1e6 ? '₦' + (n/1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : '₦' + n.toLocaleString(); };

    /* ── the listing itself ───────────────────────────────────────────────
       PROP is null until the database answers. It used to be a hardcoded
       3-bed in Lekki Phase 1, which meant every match card, whichever home
       it described, opened this same invented flat. Nothing on this page may
       assert a property fact that did not come from the row below. */
    let PROP = null;

    const PERIOD_SUFFIX = { total: '', per_year: '/yr', per_month: '/mo', per_night: '/night' };
    const TITLE_LABEL = { c_of_o: 'Certificate of Occupancy', governors_consent: 'Governor’s Consent',
      registered_deed: 'Registered Deed', excision: 'Excision', gazette: 'Gazette', allocation: 'Allocation' };

    function fatal(msg, detail) {
      const t = document.getElementById('pvTitle');
      if (t) t.textContent = msg;
      const p = document.getElementById('pvPrice'); if (p) p.textContent = '';
      const l = document.getElementById('pvLoc'); if (l) l.textContent = detail || '';
      ['negBtn', 'saveBtn'].forEach((id) => {
        const b = document.getElementById(id); if (b) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      });
    }

    function replyLink(id) {
      var b = document.getElementById('replyBtn');
      id = id || new URLSearchParams(window.location.search).get('id');
      if (b && id) b.href = 'toju.html?reply=' + encodeURIComponent(id);
      /* And again at the tap, from the address bar, so even a tap before anything loads carries the listing. */
      if (b && !b.__zl) { b.__zl = 1; b.addEventListener('click', function () { var q = new URLSearchParams(window.location.search).get('id'); if (q) b.href = 'toju.html?reply=' + encodeURIComponent(q); }); }
    }
    function paintProperty(p) {
      /* The chat link is set here, first, from the listing that has just loaded. It used
         to be set far below, inside a listener that runs after map and area code; when
         anything above it threw, the button stayed a bare "toju.html" and opened the
         chat about nothing. */
      replyLink(p && p.id);
      const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      const show = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };

      document.title = p.title + ', Synapse';
      set('pvPrice', naira(p.price) + (PERIOD_SUFFIX[p.price_period] || ''));
      set('pvTitle', p.title);
      // De-duplicate: agencies routinely type the city into the address line,
      // which rendered as "Ikolaba GRA, Ibadan, Ibadan, Oyo state".
      const seen = new Set();
      set('pvLoc', [p.address, p.city, p.state].filter(Boolean).filter((part) => {
        const k = String(part).trim().toLowerCase();
        if (seen.has(k)) return false;
        // also drop a city/state already contained in the address text
        for (const prev of seen) if (prev.includes(k)) return false;
        seen.add(k); return true;
      }).join(', '));
      /* Introduced buyers (a lead on this home) get the exact address back; everyone else sees
         the street without its house number. The server decides, never this page. */
      if (p.id && window.SynAuth) {
        SynAuth.client().then((c) => c.rpc('property_exact_for_me', { p_property: p.id })).then((r) => {
          const row = r && r.data && r.data[0];
          if (!row || !row.address) return;
          set('pvLoc', [row.address, p.city, p.state].filter(Boolean).join(', '));
          const el = document.getElementById('pvLoc');
          if (el && !el.querySelector('.exact')) { const t = document.createElement('small'); t.className = 'exact'; t.style.cssText = 'display:block;margin-top:4px;font-size:12px;opacity:.7'; t.textContent = 'Exact address, shared because you have been introduced to the agency'; el.appendChild(t); }
        }).catch(() => {});
      }

      // ₦/m² only when area is actually recorded; no invented median comparison.
      if (p.area_sqm && p.price) {
        set('pvCtx', naira(Math.round(p.price / p.area_sqm)) + '/m²');
        show('pvCtx', true);
      }

      const facts = [];
      if (p.bedrooms != null) facts.push(`<span><b>${p.bedrooms}</b> bed${p.bedrooms === 1 ? '' : 's'}</span>`);
      if (p.bathrooms != null) facts.push(`<span><b>${p.bathrooms}</b> bath${p.bathrooms === 1 ? '' : 's'}</span>`);
      if (p.toilets != null) facts.push(`<span><b>${p.toilets}</b> toilet${p.toilets === 1 ? '' : 's'}</span>`);
      if (p.parking_spaces != null) facts.push(`<span><b>${p.parking_spaces}</b> parking</span>`);
      if (p.area_sqm != null) facts.push(`<span><b>${p.area_sqm}</b> m²</span>`);
      if (p.year_built != null) facts.push(`<span>built <b>${p.year_built}</b></span>`);
      /* Both of these have columns and a caption prompt that asks for them,
         and neither had an input until now -- so every real listing carried
         null and the card dropped the row without anybody noticing. */
      const FURNISHED_LABEL = { fully: 'fully furnished', semi: 'semi-furnished', unfurnished: 'unfurnished' };
      const CONDITION_LABEL = { brand_new: 'brand new', excellent: 'excellent condition', good: 'good condition', fair: 'fair condition', needs_work: 'needs work' };
      /* The hours, not just the letter. "Band D" is meaningless to anyone
         who has not had to learn the NERC bands, and this page is read by
         buyers -- so it carries the letter for the people who know it and the
         commitment for everyone else. */
      const BAND_HOURS = { A: '20+', B: '16+', C: '12+', D: '8+', E: '4+' };
      if (p.electricity_band && BAND_HOURS[p.electricity_band]) {
        facts.push(`<span>Band <b>${p.electricity_band}</b> · ${BAND_HOURS[p.electricity_band]} hrs/day</span>`);
      }
      if (p.furnished) facts.push(`<span>${FURNISHED_LABEL[p.furnished] || p.furnished}</span>`);
      if (p.property_condition) facts.push(`<span>${CONDITION_LABEL[p.property_condition] || p.property_condition}</span>`);
      if (p.title_type) facts.push(`<span>${TITLE_LABEL[p.title_type] || p.title_type}</span>`);
      const fEl = document.getElementById('pvFacts');
      if (fEl) fEl.innerHTML = facts.join('');

      /* Verification, stated plainly either way. Unverified is not an
         accusation and not a warning, it is a fact the buyer is entitled to
         weigh, so it is shown with the same prominence as a pass. */
      const verified = p.verification_status === 'verified';
      const ringVal = verified && p.trust_score != null ? p.trust_score : (verified ? '✓' : '-');
      const lineTxt = verified ? 'Verified by Synapse' : 'Not yet verified';
      /* The stamp goes on the photograph, only for an explicit 'verified'. */
      const hs = document.getElementById('heroStamp');
      if (hs) hs.innerHTML = verified && window.SynStamp ? SynStamp.html({ land: true }) : '';
      /* NO FRACTION. "3 of 3 checks passed" read as complete, and was: it
         counted the checks somebody happened to record, not the seven this
         platform can run. A desk attestation covering three of them showed a
         perfect-looking 3/3 beside a trust score of 43 -- both truthful, and
         flatly contradicting each other on the same screen. The score already
         says how much is known; the list below says what. A ratio in between
         was a third number saying neither. */
      const noteTxt = verified
        ? 'What Synapse checked on this listing'
        : 'Listed by the agency; Synapse has not run its checks on this home yet.';
      // Painted twice, .pvtrust-row (mobile, inline in the card) and
      // .pvc-trust (desktop, in the map canvas header), CSS shows only one
      // per breakpoint, see the min-width:901px rule above .pvtrust-row.
      show('pvTrust', true);
      set('pvRing', ringVal);
      const vLine = document.getElementById('pvVerifyLine'); if (vLine) vLine.textContent = lineTxt;
      set('pvVerifyNote', noteTxt);

      /* ── the three blocks that used to be hardcoded ───────────────────
         Each renders from data or hides. None of them invents a number. */

      // Checks. verification_nodes is the only per-check evidence we store;
      // property_verification_checks is empty platform-wide today. So a
      // verified home with no nodes says exactly that, rather than drawing a
      // ring and picking a fraction.
      (function paintChecks() {
        const card = document.getElementById('pvChecksCard'); if (!card) return;
        /* property_check_type, in words a buyer reads rather than column
           names. The raw enum was reaching the page -- somebody house-hunting
           was shown "listing_authenticity" and "media_validation" and left to
           translate. Kept beside the renderer because this is the only place
           it is used, and a map in a distant file is how these fall out of
           step with the enum. */
        const CHECK_LABEL = {
          listing_authenticity: 'The listing is genuine',
          ownership_validation: 'The agency can sell it',
          media_validation: 'The photos match the property',
          freshness_validation: 'Still available',
          structural_assessment: 'Structural condition',
          flood_risk: 'Flood risk',
          government_acquisition_risk: 'Government acquisition risk',
        };
        const nodes = Array.isArray(p.verification_nodes) ? p.verification_nodes : [];
        const ring = document.getElementById('pvChecksRing');
        const head = document.getElementById('pvChecksHead');
        const note = document.getElementById('pvChecksNote');
        const list = document.getElementById('pvChecksList');
        const isV = p.verification_status === 'verified';

        if (nodes.length) {
          /* THE RING IS THE TRUST SCORE, NOT A RATIO OF WHAT WAS RECORDED.
             pass/nodes.length answered "of the checks someone entered, how
             many passed" -- which is 100% the moment anybody enters three and
             passes three, drawing a full green ring on a listing nothing was
             inspected for. trust_score is out of all seven check types, so a
             desk attestation reads 43 and a fully scouted listing reads 100,
             and the ring means what a buyer already assumes it means. */
          const score = (p.trust_score == null || p.trust_score === '') ? null : Number(p.trust_score);
          const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
          ring.style.background =
            'conic-gradient(var(--success) 0% ' + pct + '%, rgba(0,0,0,0.08) ' + pct + '% 100%)';
          ring.innerHTML = '<span>' + (score == null ? (isV ? '\u2713' : '\u2014') : score) + '</span>';
          head.textContent = isV ? 'Verified by Synapse' : 'What has been checked';
          note.textContent = 'Each line is a check Synapse runs. Anything not listed has not been '
            + 'looked at \u2014 this is what was done, not a guarantee.';
          list.innerHTML = nodes.map((n) => {
            const ok = n.status === 'passed';
            /* 'pass'/'fail' here are CSS class names, not statuses -- the
               status vocabulary is check_status, the stylesheet is its own
               thing, and conflating them is what started this. */
            const cls = ok ? 'pass' : (n.status === 'pending' ? 'pending' : 'fail');
            const ic = ok ? 'check' : 'pending';
            /* Unknown types fall back to the type with its underscores opened
               out, so a check added to the enum later degrades to readable
               rather than to a blank row. */
            const lbl = n.label || n.name || CHECK_LABEL[n.type]
              || String(n.type || 'Check').replace(/_/g, ' ');
            return '<div class="verify-row ' + cls + '"><span class="vi-ic" data-icon="' + ic +
                   '"></span><span class="vi-lbl">' + esc(lbl) +
                   (ok ? '' : ' \u2014 ' + esc(n.status || 'not passed')) + '</span></div>';
          }).join('');
        } else {
          ring.style.background = 'rgba(0,0,0,0.06)';
          ring.innerHTML = '<span>' + (isV ? '\u2713' : '\u2014') + '</span>';
          head.textContent = isV ? 'Verified by Synapse' : 'Not yet verified';
          note.textContent = isV
            ? 'Synapse verified this listing' + (p.verified_at ? ' on ' + fmtDate(p.verified_at) : '') +
              '. The individual check results are not published yet.'
            : 'Listed by the agency. Synapse has not run its checks on this home yet.';
          list.innerHTML = '';
        }
        card.hidden = false;
        if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(card);
        if (window.__pvDeckChanged) window.__pvDeckChanged();
      })();

      // Availability, stated as its own claim with its own date.
      (function paintAvailability() {
        const el = document.getElementById('pvAvailVal'); if (!el) return;
        const conf = p.availability_confirmed_at;
        const exp = p.expires_at ? new Date(p.expires_at) : null;
        const expired = exp && exp.getTime() < Date.now();
        if (expired) {
          el.textContent = 'Not confirmed since ' + (conf ? fmtDate(conf) : 'listing') +
            ', ask the agency before viewing';
          el.classList.add('stale');
          return;
        }
        if (!conf) { el.textContent = 'Not confirmed yet'; el.classList.add('stale'); return; }
        const days = Math.floor((Date.now() - new Date(conf).getTime()) / 864e5);
        el.textContent = (days <= 0 ? 'Confirmed today'
                        : days === 1 ? 'Confirmed yesterday'
                        : 'Confirmed ' + days + ' days ago') + ' · ' + fmtDate(conf);
        if (days > 21) el.classList.add('stale');
      })();

      (function paintDeal() {
        const D = { outright: 'Outright sale', rent: 'Rent', shortlet: 'Short-let', lease: 'Long lease',
          off_plan: 'Off-plan: you buy before it is built', joint_venture: 'Joint venture',
          development_financing: 'Development financing', rent_to_own: 'Rent to own' };
        const S = { completed: 'Completed, ready now', under_construction: 'Under construction', not_started: 'Not started yet' };
        const month = (v) => { const t = new Date(v); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
        const rows = [];
        if (p.deal_structure && p.deal_structure !== 'outright' && p.deal_structure !== 'rent' && D[p.deal_structure]) rows.push(['Deal', D[p.deal_structure]]);
        if (p.property_type !== 'land' && p.build_stage && p.build_stage !== 'completed') {
          rows.push(['Built', S[p.build_stage] + (p.build_progress_pct != null ? ' (' + p.build_progress_pct + '% done)' : '')]);
          if (p.handover_date && month(p.handover_date)) rows.push(['Handover', 'Expected ' + month(p.handover_date)]);
        }
        if (p.payment_plan === 'instalments') {
          rows.push(['Payment', 'Instalments' + (p.deposit_pct != null ? ': ' + Number(p.deposit_pct) + '% deposit' : '')
            + (p.instalment_months ? ', the rest over ' + p.instalment_months + ' months' : '')]);
        } else if (p.payment_plan === 'outright' && p.listing_type === 'sale') {
          rows.push(['Payment', 'Outright']);
        }
        if (Number(p.plot_count) > 0) rows.push(['Plots', Number(p.plot_count) + (p.plot_size_sqm ? ' \u00D7 ' + Number(p.plot_size_sqm) + ' sqm' : '')]);
        if (Number(p.units_available) > 1) rows.push(['Available', Number(p.units_available) + ' identical units']);
        if (Number(p.min_investment) > 0) rows.push(['Minimum stake', naira(p.min_investment)]);
        if (p.investment_term_months) rows.push(['Term', p.investment_term_months + ' months']);
        if (p.stated_return_pct != null) rows.push(['Return', Number(p.stated_return_pct) + '% over the term, as stated by the agency']);
        if (!rows.length) return;
        document.getElementById('pvDeal').innerHTML = rows.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('');
        const note = document.getElementById('pvDealNote');
        if (p.deal_structure === 'off_plan' || ['under_construction', 'not_started'].includes(p.build_stage)) {
          note.textContent = 'Buying before completion: ask Tayo what to check. Who the developer is, what happens if handover is late, and how payments are tied to progress matter most.';
          note.hidden = false;
        } else if (p.stated_return_pct != null || ['joint_venture', 'development_financing'].includes(p.deal_structure)) {
          note.textContent = 'Returns are the agency\u2019s own figures. Synapse does not forecast prices or returns.';
          note.hidden = false;
        }
        show('pvDealCard', true);
        const cl = document.getElementById('costLbl'); if (cl) cl.textContent = 'The deal & what it really costs';
      })();

      // Listed by. Real agency, real tier, and nothing else -- we store no
      // star rating and no transaction count.
      (function paintAgency() {
        const a = p.agencies && (Array.isArray(p.agencies) ? p.agencies[0] : p.agencies);
        const nm = (a && a.name) || 'Agency not published';
        set('pvAgencyName', nm);
        /* the agency's CAC registration under its name (Eden, 2026-10-19); the final line is written with the tier below */
        const cacTxt = (a && a.cac_number) ? 'CAC ' + (function (v) { return /^[a-z]/i.test(v) ? v : 'RC ' + v; })(String(a.cac_number).trim()) : (a && a.cac_certificate_on_file) ? 'CAC certificate on file' : 'CAC not yet on file';
        const agHref = p.agency_id ? 'agency-profile.html?id=' + encodeURIComponent(p.agency_id) : '';
        const agLink = document.getElementById('pvAgencyLink');
        const agPage = document.getElementById('pvAgencyPage');
        if (agHref) {
          if (agLink) agLink.href = agHref;
          if (agPage) { agPage.href = agHref; agPage.hidden = false; }
        } else if (agLink) {
          agLink.removeAttribute('href');
        }
        const ini = document.getElementById('pvAgencyInitial');
        if (ini) ini.textContent = (nm[0] || '\u2014').toUpperCase();
        /* the large block above the agency line shows the agency until a named agent loads */
        const big = document.getElementById('pvAgentPhoto'), bigIni = document.getElementById('pvAgentInitials');
        if (big && bigIni && !big.classList.contains('has-photo')) {
          big.classList.add('agency'); bigIni.textContent = (nm[0] || '?').toUpperCase();
          const bh = a && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(a.brand_color || '').trim()) ? String(a.brand_color).trim() : '';
          if (bh) { big.style.background = bh; big.style.color = '#fff'; }
          const bl = a ? String(a.logo_url || '').trim() : '';
          if (/^https?:\/\//i.test(bl)) {
            const bi = document.createElement('img');
            bi.className = 'ag-logo'; bi.alt = nm + ' logo'; bi.loading = 'lazy';
            bi.onload = () => bi.classList.add('on'); bi.onerror = () => bi.remove();
            bi.src = bl; big.appendChild(bi);
          }
        }

        /* The agency as it designed itself on its Brand page: its colour
           behind the initial, its logo over it, its typeface on its name,
           its tagline underneath. Each is the agency's own input and is
           checked before use; anything that fails keeps the default. */
        if (a) {
          const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(a.brand_color || '').trim())
            ? String(a.brand_color).trim() : '';
          if (ini && hex) {
            let h = hex.slice(1);
            if (h.length === 3) h = h.split('').map((x) => x + x).join('');
            const lin = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255)
              .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
            const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
            ini.style.background = hex;
            ini.style.color = lum > 0.4 ? '#1C1C1E' : '#fff';
          }
          const logo = String(a.logo_url || '').trim();
          if (ini && /^https?:\/\//i.test(logo)) {
            const im = document.createElement('img');
            im.alt = ''; im.loading = 'lazy';
            im.onload = () => im.classList.add('on');   // the initial shows until then
            im.onerror = () => im.remove();
            im.src = logo;
            ini.appendChild(im);
          }
          const fam = String(a.brand_font || '').trim().replace(/\s+/g, ' ');
          const nmEl = document.getElementById('pvAgencyName');
          if (nmEl && /^[A-Za-z0-9][A-Za-z0-9 ]{1,39}$/.test(fam)) {
            if (!/^(arial|helvetica|georgia|times|times new roman|verdana|tahoma|trebuchet ms|courier new|garamond)$/i.test(fam)) {
              const lk = document.createElement('link');
              lk.rel = 'stylesheet';
              lk.href = 'https://fonts.googleapis.com/css2?family=' + fam.replace(/ /g, '+') + '&display=swap';
              document.head.appendChild(lk);
            }
            nmEl.style.fontFamily = "'" + fam + "', var(--f-sans)";
          }
          /* The website the agency gave us. Typed by the agency, so it is
             checked: a bare domain gets https://, and anything that is not a
             plain http(s) address (javascript:, data:) is never linked. */
          const web = document.getElementById('pvAgencyWeb');
          const site = (function (raw) {
            let v = String(raw || '').trim();
            if (!v) return '';
            if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
            try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; }
            catch (e) { return ''; }
          })(a.social && a.social.website);
          if (web && site) {
            web.href = site;
            web.title = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
            web.hidden = false;
          }
          const tag = document.getElementById('pvAgencyTag');
          if (tag && a.tagline && String(a.tagline).trim()) {
            tag.textContent = String(a.tagline).trim();
            tag.hidden = false;
          }
        }
        const tier = a && a.verification_tier;
        AGENCY_VERIFIED = tier === 'verified';
        set('pvAgencyMeta', cacTxt + (tier === 'verified' ? ' · Verified by Synapse' : ''));
      })();

      /* ── booking an inspection ────────────────────────────────────────
         The rules are all server-side (inspection_readiness / book_inspection
         are SECURITY DEFINER), so this is presentation: it asks what is
         missing and says so in words, or lists the times the agent actually
         pre-cleared and books one.

         Every slot row states how many people are already going, because
         consolidating trips is the entire point, a buyer joining three others
         should be able to see that they are. */
      function wireInspection(a) {
        const wrap = document.getElementById('pvInsp');
        const btn  = document.getElementById('pvInspBtn');
        const panel = document.getElementById('pvInspPanel');
        if (!wrap || !btn || !window.SynAuth) return;

        const fmtWhen = (iso) => {
          const d = new Date(iso);
          return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
            + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        };

        /* Each reason names the one thing to do next. "Not qualified" on its
           own tells a buyer nothing they can act on. */
        const BLOCKED = {
          sign_in:  ['Sign in to book a tour.', 'Sign in', () => {
            location.href = 'signin.html?reason=inspection&next=' + encodeURIComponent(location.pathname + location.search);
          }],
          contact:  ['Talk to Tayo about this home first, then you can book a tour.', 'Reply about this home', () => {
            // Straight to the chat with the listing attached. This used to
            // click the Contact agent button, which no longer exists: the
            // agency is introduced by Tayo, not by a button on a listing.
            location.href = 'toju.html' + (URL_ID ? '?reply=' + encodeURIComponent(URL_ID) : '');
          }],
          qualification: ['Tayo needs to understand what you are looking for before booking an agent\u2019s time.', 'Talk to Tayo', () => {
            location.href = 'toju.html';
          }],
          budget: ['Tayo needs to know your budget for this one, so nobody\u2019s time is wasted.', 'Tell Tayo', () => {
            location.href = 'toju.html';
          }],
          budget_fit: ['This home is above the budget you gave Tayo. Talk to Tayo if that has changed.', 'Talk to Tayo', () => {
            location.href = 'toju.html';
          }],
          financial_readiness: ['Tayo has a couple of questions about how you plan to pay before booking a tour.', 'Talk to Tayo', () => {
            location.href = 'toju.html';
          }],
        };

        const blocked = (missing) => {
          const key = (missing || []).find((m) => BLOCKED[m]) || 'qualification';
          const [text, label, act] = BLOCKED[key];
          panel.innerHTML = '<p class="insp-note">' + esc(text) + '</p>';
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'insp-act'; b.textContent = label;
          b.addEventListener('click', act);
          panel.appendChild(b);
          panel.hidden = false;
        };

        const listSlots = (client) => client.rpc('open_inspection_slots', { p_property_id: PROP_ID, p_days: 21 })
          .then(({ data, error }) => {
            if (error) throw error;
            const slots = data || [];
            if (!slots.length) {
              panel.innerHTML = '<p class="insp-note">'
                + esc(a.full_name ? a.full_name.split(' ')[0] : 'This agent')
                + ' has no tour times open in the next three weeks. Ask them directly and they can add one.</p>';
              panel.hidden = false;
              return;
            }
            panel.innerHTML = slots.map((s) => {
              const left = Number(s.capacity) - Number(s.taken);
              const going = Number(s.taken) === 0
                ? 'Be first'
                : Number(s.taken) + ' going';
              return '<button type="button" class="insp-slot" data-at="' + esc(s.starts_at) + '">'
                + '<span><span class="insp-when">' + esc(fmtWhen(s.starts_at)) + '</span>'
                + '<span class="insp-who">' + esc(s.agent_name || 'Your agent') + ' \u00b7 ' + left + ' place' + (left === 1 ? '' : 's') + ' left</span></span>'
                + '<span class="insp-going' + (Number(s.taken) > 0 ? ' joining' : '') + '">' + going + '</span>'
                + '</button>';
            }).join('');
            panel.hidden = false;
          });

        const book = (client, startsAt, row) => {
          row.disabled = true;
          const tag = row.querySelector('.insp-going');
          tag.textContent = 'Booking…';
          return client.rpc('book_inspection', { p_property_id: PROP_ID, p_starts_at: startsAt })
            .then(({ data, error }) => {
              if (error) throw error;
              const res = Array.isArray(data) ? data[0] : data;
              if (!res || !res.ok) {
                if (res && res.reason === 'slot_full') { tag.textContent = 'Full'; return; }
                blocked((res && res.reason ? res.reason.split(',') : []));
                return;
              }
              const n = Number(res.taken) || 1;
              panel.innerHTML = '<div class="insp-ok"><b>You are booked in.</b><br>'
                + esc(fmtWhen(startsAt)) + ' with ' + esc(a.full_name || 'your agent') + '. '
                + (n > 1 ? n + ' people are going, you will get a reminder to confirm the day before.'
                         : 'You will get a reminder to confirm the day before.')
                + '</div>';
              btn.disabled = true;
              btn.innerHTML = 'Tour booked';
            })
            .catch(() => { row.disabled = false; tag.textContent = 'Try again'; });
        };

        /* Opening the panel just lists times now. Readiness is settled BEFORE
           the button is ever shown (see below), so by the time a buyer can tap
           this they are already through priming. book_inspection still
           re-checks server-side, the UI is not the gate, it only decides
           whether to offer the step yet. */
        btn.addEventListener('click', () => {
          if (!panel.hidden) { panel.hidden = true; return; }
          panel.innerHTML = '<p class="insp-note">Finding times…</p>';
          panel.hidden = false;
          SynAuth.client()
            .then((client) => listSlots(client))
            .catch(() => {
              panel.innerHTML = '<p class="insp-note">Could not check tour times just now.</p>';
            });
        });

        panel.addEventListener('click', (ev) => {
          const row = ev.target.closest('[data-at]');
          if (!row || row.disabled) return;
          SynAuth.client().then((client) => book(client, row.dataset.at, row));
        });

        /* Two conditions, both required, and this is the "end of priming" rule:
           the agent must have times to offer, AND Tayo must already have
           qualified this buyer for this home. A visitor who has not been primed
           never sees a tour button at all, their next step is the
           conversation, and offering a booking first would skip the very
           qualification that stops an agent's day being wasted.

           inspection_readiness needs a session, so an anonymous visitor simply
           fails it, which is the correct answer for someone who has not
           started. */
        SynAuth.client()
          .then((client) => Promise.all([
            client.rpc('open_inspection_slots', { p_property_id: PROP_ID, p_days: 21 }),
            client.rpc('inspection_readiness', { p_property_id: PROP_ID }),
          ]))
          .then(([slots, ready]) => {
            const hasTimes = ((slots && slots.data) || []).length > 0;
            const row = ready && Array.isArray(ready.data) ? ready.data[0] : (ready && ready.data);
            const primed = !!(row && row.ready);
            if (hasTimes && primed) wrap.hidden = false;
          })
          .catch(() => { /* no tour offered; the conversation is still the path */ });
      }

      /* Follow and Like. Both are counted rows, one per person per agent, with
         the pair as the primary key, so tapping twice cannot inflate a count
         and the toggle is just an insert or a delete.

         The count renders straight from the view; the pressed state comes from
         the viewer's own row, which is the only row RLS lets them read. Signed
         out, the numbers still show and the buttons route to sign-in, because
         social proof is worth seeing before you have an account. */
      function wireAgentSocial(a) {
        const box = document.getElementById('pvAgentSocial');
        if (!box || !a.agent_id) return;
        const fN = document.getElementById('pvFollowN');
        const lN = document.getElementById('pvLikeN');
        const fB = document.getElementById('pvFollowBtn');
        const lB = document.getElementById('pvLikeBtn');
        fN.textContent = Number(a.followers || 0).toLocaleString();
        lN.textContent = Number(a.likes || 0).toLocaleString();
        box.hidden = false;
        if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(box);

        const paint = (btn, on, lbl) => {
          btn.setAttribute('aria-pressed', String(!!on));
          if (lbl) {
            const el = document.getElementById('pvFollowLbl');
            if (el) el.textContent = on ? 'Following' : 'Follow';
          }
        };

        const toggle = (btn, table, col, nEl, isFollow) => {
          if (btn.dataset.busy) return;
          btn.dataset.busy = '1';
          const on = btn.getAttribute('aria-pressed') === 'true';
          SynAuth.client()
            .then((c) => c.auth.getUser().then((u) => ({ c, uid: u && u.data && u.data.user && u.data.user.id })))
            .then(({ c, uid }) => {
              if (!uid) { location.href = 'signin.html?reason=follow&next=' + encodeURIComponent(location.pathname + location.search); return null; }
              const row = { agent_id: a.agent_id }; row[col] = uid;
              return on
                ? c.from(table).delete().eq('agent_id', a.agent_id).eq(col, uid)
                : c.from(table).insert(row);
            })
            .then((res) => {
              if (!res) return;
              if (res.error) throw res.error;
              /* Move the number by one rather than refetching: the row we just
                 wrote is the only change, and the count must never drift below
                 zero if the two ever disagree. */
              nEl.textContent = Math.max(0, Number(String(nEl.textContent).replace(/[^0-9]/g, '')) + (on ? -1 : 1)).toLocaleString();
              paint(btn, !on, isFollow);
            })
            .catch(() => toast('Could not save that just now, please try again.'))
            .then(() => { delete btn.dataset.busy; });
        };

        fB.addEventListener('click', () => toggle(fB, 'agent_follows', 'follower_id', fN, true));
        lB.addEventListener('click', () => toggle(lB, 'agent_likes', 'liker_id', lN, false));

        /* Reflect what this viewer already did. Their own row is readable;
           everyone else's is not, which is what keeps the follower LIST private
           while the follower COUNT is public. */
        if (window.SynAuth && SynAuth.client) {
          SynAuth.client()
            .then((c) => c.auth.getUser().then((u) => ({ c, uid: u && u.data && u.data.user && u.data.user.id })))
            .then(({ c, uid }) => {
              if (!uid) return;
              c.from('agent_follows').select('agent_id').eq('agent_id', a.agent_id).eq('follower_id', uid).maybeSingle()
                .then((r) => paint(fB, !!(r && r.data), true)).catch(() => {});
              c.from('agent_likes').select('agent_id').eq('agent_id', a.agent_id).eq('liker_id', uid).maybeSingle()
                .then((r) => paint(lB, !!(r && r.data), false)).catch(() => {});
            })
            .catch(() => {});
        }
      }

      /* The named agent. Second request rather than an embed: listing_agent_cards
         is a view, so PostgREST has no foreign key to join it on.

         The view exists because profiles RLS is own-or-colleague, a buyer can
         read no profile row at all, and a row-level policy wide enough to fix
         that would expose phone and whatsapp with it. The view returns identity
         and track record only.

         Nothing here invents a credential: each fact is appended only if the
         column actually has a value, and a listing with no agent leaves the
         block hidden. Areas covered is deliberately not shown, it describes
         where the agent works, not this property, and reading "Central Lekki"
         under an Ibadan listing would look like a claim about the home. */
      (function paintAgent() {
        const card = document.getElementById('pvAgentCard');
        /* No named agent on this listing: the card keeps the agency identity it
           was already painted with, and simply never grows an agent. */
        if (!card || !p.listed_by_agent_id) return;
        fetch(SUPABASE_URL + '/rest/v1/listing_agent_cards?agent_id=eq.'
              + encodeURIComponent(p.listed_by_agent_id) + '&limit=1',
              { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
          .then((r) => (r.ok ? r.json() : []))
          .then((rows) => {
            const a = rows && rows[0];
            if (!a || !a.full_name) return;

            const photo = document.getElementById('pvAgentPhoto');
            card.classList.add('has-agent');
            photo.classList.remove('agency'); photo.style.background = ''; photo.style.color = '';
            const agImg = photo.querySelector('img.ag-logo'); if (agImg) agImg.remove();
            const inits = a.full_name.trim().split(/\s+/).slice(0, 2)
                            .map((w) => w[0]).join('').toUpperCase();
            document.getElementById('pvAgentInitials').textContent = inits;
            if (a.avatar_url) {
              photo.style.backgroundImage = 'url("' + a.avatar_url + '")';
              photo.classList.add('has-photo');
            }

            document.getElementById('pvAgentName').textContent = a.full_name;
            /* The tick is the agency's verification standing, shown against the
               person who answers for the listing. */
            const vf = document.getElementById('pvAgentVf');
            if (vf && AGENCY_VERIFIED) vf.hidden = false;

            const bits = [];
            if (a.years_experience != null) bits.push(a.years_experience + ' yr' + (a.years_experience === 1 ? '' : 's') + ' experience');
            if (a.closed_deals != null) bits.push(a.closed_deals + ' deals closed');
            if (a.response_rate_pct != null) bits.push(a.response_rate_pct + '% reply rate');
            document.getElementById('pvAgentMeta').textContent =
              bits.length ? bits.join(' \u00b7 ') : 'Your agent for this listing';

            AGENT_NAME = a.full_name;
            wireAgentSocial(a);
            wireInspection(a);
          })
          .catch(() => { /* the agency identity on the card still stands */ });
      })();

      // More in this city. A real query, and the card stays hidden unless it
      // finds something.
      (function paintSimilar() {
        if (!p.city) return;
        const q = SUPABASE_URL + '/rest/v1/properties'
          + '?select=id,title,price,city,verification_status,property_media(url,display_order,media_type)'
          + '&city=eq.' + encodeURIComponent(p.city)
          + '&id=neq.' + encodeURIComponent(p.id)
          + '&status=eq.live&is_active=is.true&deleted_at=is.null&limit=3';
        fetch(q, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
          .then((r) => (r.ok ? r.json() : []))
          .then((rows) => {
            if (!rows || !rows.length) return;
            document.getElementById('pvSim').innerHTML = rows.map((r) => {
              const img = coverOf(r.property_media);
              return '<a href="property.html?id=' + encodeURIComponent(r.id) + '">'
                + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="simph"></div>')
                + '<div class="b"><div class="p">' + naira(r.price) + '</div>'
                + '<div class="t">' + esc(r.title || 'Listing') + '</div>'
                + '<div class="m">' + (r.verification_status === 'verified' ? 'Verified' : 'Not yet verified') + '</div>'
                + '</div></a>';
            }).join('');
            document.getElementById('pvSimCard').hidden = false;
            if (window.__pvDeckChanged) window.__pvDeckChanged();
          })
          .catch(() => { /* the card simply stays hidden */ });
      })();

      if (p.description) { set('pvGlance', p.description); show('pvGlance', true); }
      /* Amenities as one horizontally scrollable row. Text only, escaped; nothing is invented
         and a listing with none shows no row at all. */
      (function () {
        const el = document.getElementById('pvAmen');
        const list = Array.isArray(p.amenities) ? p.amenities.map((a) => String(a || '').trim()).filter(Boolean).slice(0, 30) : [];
        if (!el || !list.length) { if (el) el.hidden = true; return; }
        el.innerHTML = list.map((a) => '<span role="listitem">' + esc(a.charAt(0).toUpperCase() + a.slice(1)) + '</span>').join('');
        el.hidden = false;
      })();

      const e = p.property_enrichment && (Array.isArray(p.property_enrichment) ? p.property_enrichment[0] : p.property_enrichment);
      if (e && e.toju_summary) { set('pvTake', e.toju_summary); show('pvTakeCard', true); if (window.__pvDeckChanged) window.__pvDeckChanged(); }

      PHOTOS = (p.property_media || [])
        .slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((m) => m.url).filter(Boolean);
      /* The first photo leads; a video uploaded first comes straight after it
         rather than opening the page on a player (Eden, 2026-10-02). */
      const firstPhoto = PHOTOS.findIndex((u) => !isVid(u));
      if (firstPhoto > 0) PHOTOS.unshift(PHOTOS.splice(firstPhoto, 1)[0]);
      renderGallery();
    }

    /* ── attribution ──────────────────────────────────────────────────────
       A visitor arriving from a syndicated post carries the channel and the
       post id on the URL. Record it once, against the anonymous visitor id the
       browser already holds, so that if this person later becomes a lead the
       agency can see which post produced them.

       Deliberately quiet: it is a page view, not a transaction. A failure here
       must never interrupt someone looking at a house, so every branch either
       records or does nothing. Nothing is sent if the URL carries no channel,
       which is the case for every ordinary visit. */
    (function recordAttribution() {
      const q = new URLSearchParams(window.location.search);
      /* THE URL FIRST, THEN WHAT WE REMEMBERED ON ARRIVAL.
         ?ch= is only present when a short link pointed straight at a listing.
         Somebody who came through the Instagram bio landed in Tayo's chat
         instead, spent a while describing what they wanted, and arrived here
         through the app, by which point the channel was long gone from the
         URL and this visit looked organic. SynArrival kept it. */
      const channel = q.get('ch')
        || (window.SynArrival ? SynArrival.channel() : '');
      /* Remember which home this visitor met on social, so coming back to Tayo can pick the conversation up from its card. */
      try { if (channel && URL_ID) localStorage.setItem('syn_last_home', JSON.stringify({ id: URL_ID, ch: channel, ts: Date.now() })); } catch (e) { /* storage blocked */ }
      if (!channel || !URL_ID) return;

      let visitor = null;
      try {
        visitor = localStorage.getItem('toju_visitor_v1');
        if (!visitor) {
          visitor = (crypto.randomUUID ? crypto.randomUUID() : null);
          if (visitor) localStorage.setItem('toju_visitor_v1', visitor);
        }
      } catch (e) { return; }   // storage blocked: no visitor id, no attribution
      if (!visitor) return;

      fetch(SUPABASE_URL + '/rest/v1/rpc/record_channel_touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
        body: JSON.stringify({
          p_property_id: URL_ID,
          p_channel: channel,
          p_session_id: visitor,
          p_post_id: q.get('post')
            || (window.SynArrival ? SynArrival.post() : null)
            || null,
          p_kind: 'visit',
        }),
      }).catch(() => { /* attribution is never worth breaking a page view over */ });
    })();

    (function hydrate() {
      if (!URL_ID) { fatal('No listing selected', 'Open a property from your matches or from Browse.'); return; }
      const q = SUPABASE_URL + '/rest/v1/properties'
        + '?select=*,property_media(url,display_order,media_type),property_enrichment(toju_summary,what_to_watch),agencies(name,verification_tier,logo_url,brand_color,brand_font,tagline,social,cac_number,cac_certificate_on_file)'
        // The neighbourhood record this listing is actually attached to.
        // Without it the section below had nothing to draw from, which is
        // why it was hardcoded to Lekki Phase 1 on every property.
        + ',neighbourhoods(name)'
        + '&id=eq.' + encodeURIComponent(URL_ID) + '&limit=1';
      fetch(q, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY } })
        .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then((rows) => {
          if (!Array.isArray(rows) || !rows.length) {
            fatal('This listing is no longer available', 'It may have expired, been removed, or never existed.');
            return;
          }
          PROP = rows[0];
          /* The Area the agency typed arrives in `*` as area_name; this page
             reads it as `neighbourhood`, as the portal does. */
          /* An area is a place name. Agencies have pasted whole landmark lists into
             this box; anything longer than a name is not used as one. */
          if (!PROP.neighbourhood && typeof PROP.area_name === 'string' && PROP.area_name.trim()
              && PROP.area_name.trim().length <= 40 && !/\n/.test(PROP.area_name.trim())) {
            PROP.neighbourhood = PROP.area_name.trim();
          }
          paintProperty(PROP);
          document.dispatchEvent(new CustomEvent('syn:property', { detail: PROP }));
        })
        .catch(() => fatal('Could not load this listing', 'Check your connection and try again.'));
    })();

    /* ── 13 · AI negotiation assistant ── */
    /* Null until Tayo has actually run the numbers. A lead sent before that
       simply carries no negotiation, which is honest, it is not an offer of
       zero. */
    let NEGOTIATION = null;
    /* The listing agent's name, once paintAgent has resolved one. Only used to
       say who received the request, null on a listing with no named agent, and
       every message below falls back to the agency wording. */
    let AGENT_NAME = null;
    /* The agency's verification standing, read once when the agency is painted
       and reused for the tick beside the agent who answers for the listing. */
    let AGENCY_VERIFIED = false;
    const negBtn = document.getElementById('negBtn');
    negBtn.addEventListener('click', async () => {
      // Nothing to negotiate over until the listing has loaded. Sending a null
      // property would have Tayo invent an offer for a home it cannot see.
      if (!PROP) { toast('Still loading this listing, one moment.'); return; }
      negBtn.disabled = true; negBtn.textContent = 'Tayo is working the numbers…';
      clearNegError();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        if (!navigator.onLine) throw Object.assign(new Error('offline'), { kind: 'offline' });
        const r = await fetch(SUPABASE_URL + '/functions/v1/toju-demo', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ action: 'negotiate', visitorId: VISITOR, property: PROP }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const d = await r.json().catch(() => ({}));
        // never reveal an empty panel: a 200 with no offer is still a failure
        if (!r.ok || d.error || (!d.openingOffer && !d.advice && !d.draft)) throw new Error('bad payload');
        document.getElementById('negOut').hidden = false;
        document.getElementById('negOffer').textContent = d.openingOffer ? 'Opening offer: ' + naira(d.openingOffer) : '';
        document.getElementById('negAdvice').textContent = d.advice || '';
        document.getElementById('negDraft').textContent = d.draft || '';
        negBtn.hidden = true;
        /* Hold on to it. Tayo has just worked out an offer and written the
           message to open with, and until now the only way that reached the
           agency was the buyer copying it to a clipboard and finding them
           somewhere else. Contact agent carries it instead. */
        NEGOTIATION = {
          offer: typeof d.openingOffer === 'number' ? d.openingOffer : null,
          advice: String(d.advice || '').slice(0, 1200),
          draft: String(d.draft || '').slice(0, 1200),
        };
      } catch (e) {
        clearTimeout(timer);
        showNegError(!navigator.onLine ? 'offline' : (e && e.name === 'AbortError') ? 'timeout' : 'server');
        negBtn.textContent = 'Get my opening offer'; negBtn.disabled = false;
      }
    });
    function clearNegError() { const p = document.getElementById('negErr'); if (p) p.remove(); }
    function showNegError(kind) {
      const msg = kind === 'offline'
        ? 'You’re offline, reconnect and I’ll run the numbers.'
        : kind === 'timeout'
          ? 'That took longer than expected. The connection is slow right now.'
          : 'I couldn’t work the numbers just now, this is on our side, not yours.';
      const p = document.createElement('p');
      p.id = 'negErr'; p.className = 'inline-err'; p.setAttribute('role', 'alert');
      p.textContent = msg + ' Nothing was sent to the agency.';
      negBtn.insertAdjacentElement('afterend', p);
    }
    document.getElementById('negCopy').addEventListener('click', async () => {
      const btn = document.getElementById('negCopy');
      try {
        await navigator.clipboard.writeText(document.getElementById('negDraft').textContent);
        btn.textContent = 'Copied ✓';
      } catch (e) {
        // clipboard blocked (insecure context / denied), tell them, don't go silent
        btn.textContent = 'Press Ctrl+C to copy';
        try {
          const r = document.createRange(); r.selectNodeContents(document.getElementById('negDraft'));
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        } catch (e2) {}
      }
    });

    /* ── 9 · Viewing assistant (checklist + notes + photos, saved to this home) ── */
    const CHECKS = ['Check water pressure', 'Test electrical outlets & sockets', 'Ask about service charges', 'Inspect ceilings & walls for leaks/damp', 'Confirm legal documentation (C of O / deed)', 'Test the backup power / generator', 'Check mobile signal & internet', 'Walk the compound security & parking'];
    const vKey = 'synapse_viewing_' + PROP_ID;
    let vState = JSON.parse(localStorage.getItem(vKey) || '{"done":[],"notes":"","photos":[]}');
    function saveV() { localStorage.setItem(vKey, JSON.stringify(vState)); }
    function renderChecks() {
      document.getElementById('vcheck').innerHTML = CHECKS.map((c, i) =>
        '<label class="' + (vState.done.includes(i) ? 'done' : '') + '"><input type="checkbox" data-i="' + i + '" ' + (vState.done.includes(i) ? 'checked' : '') + '/>' + c + '</label>').join('');
    }
    document.getElementById('vcheck').addEventListener('change', (e) => {
      const i = Number(e.target.dataset.i);
      vState.done.includes(i) ? vState.done = vState.done.filter((x) => x !== i) : vState.done.push(i);
      saveV(); renderChecks();
    });
    const vnotes = document.getElementById('vnotes');
    vnotes.value = vState.notes || '';
    vnotes.addEventListener('input', () => { vState.notes = vnotes.value; saveV(); });
    function renderPhotos() {
      document.getElementById('vphotos').innerHTML = vState.photos.map((p) => '<img src="' + p + '" alt="" />').join('')
        + '<div class="add" id="addPhoto">＋</div>';
      document.getElementById('addPhoto').addEventListener('click', () => document.getElementById('vfile').click());
    }
    document.getElementById('vfile').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { vState.photos.push(rd.result); saveV(); renderPhotos(); };
      rd.readAsDataURL(f);
    });
    renderChecks(); renderPhotos();
  