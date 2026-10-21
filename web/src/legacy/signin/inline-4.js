
        /* ── THE PANEL CYCLES ────────────────────────────────────────────
           A sign-in page is somewhere people come back to, and the same
           photograph every time makes it feel like the page never changed --
           which, for someone who signs in daily, is most of what they see of
           the product. So each door has a set and moves through it.

           Two sets, because the two doors argue different things. A buyer
           gets INTERIORS: rooms, from inside, where somebody lives. An
           agency gets LANDMARKS: the country they sell into, at the scale
           they sell at.

           IN ORDER, NOT AT RANDOM. Random repeats -- roughly one visit in
           five would show the same picture twice running, which reads as
           broken rather than varied. An index in localStorage means the next
           visit is always a different photograph, and it degrades to the
           first one in a private window where storage throws.

           TO ADD MORE: drop the file in images/ and add it to the array.
           That is the whole procedure. A file that fails to load is skipped
           rather than leaving an empty panel, so a typo costs one slot and
           not the page. */
        (function () {
          var agency = document.documentElement.getAttribute('data-role') === 'agency';

          /* WHERE THESE CAME FROM. All ten are Pexels, whose licence allows
             commercial use with no attribution. NOT Pinterest: those are
             other people's copyrighted photographs and this is a product
             agencies pay for, which makes it a liability rather than a
             technicality. Downloaded at 1800px on the long edge -- sharp at
             2x on the panel's real width, and a fraction of the weight of an
             actual 4K file on a page whose whole job is to load fast.

             Rooms, from the inside, with somebody living in them. The old
             set was a street of houses shot from outside and an empty
             unfurnished hall; neither is what the line beside them promises. */
          /* THE LINE TRAVELS WITH THE PICTURE, not beside it. They are one
             pair in one array because the alternative -- two arrays and two
             indices -- drifts the first time somebody adds a photograph and
             not a line, and drifts silently: the page still renders, it just
             says the wrong thing about the room behind it. */
          var INTERIORS = [
            { src: '../images/interior-navy-sofa.jpg',
              line: 'The last step before the keys.' },
            { src: '../images/interior-brick-window.jpg',
              line: 'A window you have not looked out of yet.' },
            { src: '../images/interior-contemporary.jpg',
              line: 'Somewhere to put your things down.' },
            { src: '../images/interior-minimal-living.jpg',
              line: 'The quiet after the search.' },
            { src: '../images/interior-art-decor.jpg',
              line: 'A room that already looks like you.' },
          ];

          /* Nigeria at the scale an agency works at. abuja-gate.jpg is out:
             it is 541px square, which is why it looked soft blown up across
             a full-height panel. */
          /* The agency lines carry what the `.au-work` list used to say. That
             list is hidden on a phone now -- it overflowed the panel and sat
             on top of the wordmark -- so the three things it promised move
             into the rotation instead of being lost with it. */
          var LANDMARKS = [
            { src: '../images/landmark-eko-bridge.jpg',    // Lekki-Ikoyi Link Bridge
              line: 'The leads are already waiting.' },
            { src: '../images/landmark-carter-bridge.jpg', // Carter Bridge, Lagos Island
              line: 'Every enquiry in one inbox.' },
            { src: '../images/landmark-lagos-sunset.jpg',  // Lagos skyline from the water
              line: 'Follow-ups that go out on time.' },
            { src: '../images/landmark-lagos-skyline.jpg', // Lagos skyline
              line: 'One listing, every channel, at once.' },
            { src: '../images/landmark-lagos-aerial.jpg',  // Lagos from above at sunset
              line: 'The market you already sell into.' },
          ];

          var set = agency ? LANDMARKS : INTERIORS;
          var KEY = 'syn_art_' + (agency ? 'agency' : 'customer');

          var i = 0;
          try {
            i = (parseInt(localStorage.getItem(KEY), 10) || 0) % set.length;
            localStorage.setItem(KEY, String((i + 1) % set.length));
          } catch (e) { i = 0; }   // private window: always the first, never broken

          var img = document.getElementById('artPhoto');

          /* This script runs where it sits -- inside the panel, straight after
             the <img> -- so that the photograph starts downloading before the
             rest of the page is parsed. Which means #artQuote DOES NOT EXIST
             yet on the first call. So the line is stashed as well as written,
             and the block that knows about roles applies it once the markup
             is there. On a later call -- a file 404s and the set walks on --
             the element does exist and gets written directly, so the line
             follows the photograph it belongs to instead of describing the
             one that failed to load. */
          function paint() {
            /* ── THE PHONE WAS DOWNLOADING A BILLBOARD ───────────────────
               These are 1800px files, 237KB to 584KB each, and on a phone
               this panel is 375x208 CSS pixels. That is roughly five times
               the pixels anyone can see, on the page that gates the whole
               product, for an audience paying for the megabyte. At 900px the
               same picture is 69% smaller and identical at this size.

               srcset BEFORE src, deliberately. A browser that supports
               srcset chooses from it and never fetches src -- but only if
               both are set before the load begins. Set src first and some
               browsers start the 1800px fetch immediately, then fetch again
               from srcset, and the page pays twice for one photograph.

               sizes says how wide the panel actually is, which srcset cannot
               know: full width on a phone, about half the window beside the
               form on a desktop. Without it the browser assumes 100vw and
               over-fetches on every large screen. */
            var base = set[i].src.replace(/\.jpg$/, '');
            img.sizes = '(max-width: 1024px) 100vw, 52vw';
            img.srcset = base + '-900.jpg 900w, '
                       + base + '-1200.jpg 1200w, '
                       + set[i].src + ' 1800w';
            img.src = set[i].src;
            window.SYN_ART_LINE = set[i].line;
            var q = document.getElementById('artQuote');
            if (q) q.textContent = set[i].line;
          }

          /* Walk on to the next one if a file is missing, and stop after a
             full lap so a wholly absent set cannot loop forever. */
          var tried = 0;
          img.addEventListener('error', function () {
            if (++tried >= set.length) return;
            i = (i + 1) % set.length;
            paint();
          });
          paint();
        })();
      