Brand fonts — Restaglick (display) + Bromolek (body)
=====================================================

These are licensed marketplace fonts, so the files are not committed.
Drop your licensed copies into this folder named exactly:

  Restaglick.woff2   (or Restaglick.woff / Restaglick.otf / Restaglick.ttf)
  Bromolek.woff2     (or Bromolek.woff  / Bromolek.otf  / Bromolek.ttf)

index.html already declares the @font-face rules and puts these families
first in the --f-serif / --f-sans token stacks. The moment the files exist
here, the landing page switches to them automatically — until then it
falls back to Fraunces (display) and Inter (body).

If you want Bromolek as the display face instead (and Restaglick for
body), swap the two family names in the :root token block of index.html.
