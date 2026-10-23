# Every page of the original site, and where it lives in Next

The original site is 17 HTML pages. Each is now a Next.js page, written out as JSX from the original file, with the original stylesheets and scripts in the
original order. Addresses are the original ones without `.html` (`/app/toju`, `/buyers`); the old `.html` addresses redirect to them with their query string, so every link, email, QR code and bookmark still works.

| # | Address | Original file | Next source (the page's markup) | What it is |
|---|---------|---------------|---------------------------------|------------|
| 1 | `/` | `index.html` | `src/app/(index)/page.tsx` | Landing page for agencies |
| 2 | `/buyers` | `buyers.html` | `src/app/(buyers)/buyers/page.tsx` | Landing page for customers |
| 3 | `/privacy` | `privacy.html` | `src/app/(privacy)/privacy/page.tsx` | Privacy policy |
| 4 | `/terms` | `terms.html` | `src/app/(terms)/terms/page.tsx` | Terms of service |
| 5 | `/app/toju` | `app/toju.html` | `src/app/(toju)/app/toju/page.tsx` | Tayo, the chat |
| 6 | `/app/browse` | `app/browse.html` | `src/app/(browse)/app/browse/page.tsx` | Your matches / since you last visited |
| 7 | `/app/property` | `app/property.html` | `src/app/(property)/app/property/page.tsx` | One property |
| 8 | `/app/dream` | `app/dream.html` | `src/app/(dream)/app/dream/page.tsx` | Dream boards |
| 9 | `/app/signin` | `app/signin.html` | `src/app/(signin)/app/signin/page.tsx` | Sign in / sign up / reset |
| 10 | `/app/agency-profile` | `app/agency-profile.html` | `src/app/(agency-profile)/app/agency-profile/page.tsx` | An agency's public page |
| 11 | `/app/agency` | `app/agency.html` | `src/app/(agency)/app/agency/page.tsx` | The agency portal |
| 12 | `/app/go` (`/go/<handle>`) | `app/go.html` | `src/app/(go)/app/go/page.tsx` | Bio link: homes an agency just posted |
| 13 | `/app/your-data` (`/your-data`) | `app/your-data.html` | `src/app/(your-data)/app/your-data/page.tsx` | Download or delete your data |
| 14 | `/app/synapse` | `app/synapse.html` | `src/app/(synapse)/app/synapse/page.tsx` | Synapse studio (team only) |
| 15 | `/app/synapse-join` | `app/synapse-join.html` | `src/app/(synapse-join)/app/synapse-join/page.tsx` | Team invitation |
| 16 | `/app/verify` | `app/verify.html` | `src/app/(verify)/app/verify/page.tsx` | Verification desk (team only) |
| 17 | `/app/syndication-test` | `app/syndication-test.html` | `src/app/(syndication-test)/app/syndication-test/page.tsx` | Syndication engine checks (team only) |

Not ported, on purpose: `agencies.html` (a redirect to `/`, already handled by `vercel.json`) and `design-sample.html` (a design scratch pad, "not part of the app").

## How a page is built

- `src/app/(<page>)/layout.tsx` is the page's `<html>` and `<head>`: the same tags in the same order, so the cascade and the script order are unchanged.
- `src/app/(<page>)/<route>/page.tsx` is the page's `<body>` content as JSX, element for element.
- `src/legacy/<page>/` holds each inline `<script>` and `<style>` of the page as its own file, character for character.
- Each page is its own root layout, so moving from one page to another is a full page load, as it always was. One page's styles and scripts cannot leak into another.
- Next renders these pages to plain HTML at build time. `scripts/strip-next-runtime.mjs` (part of `npm run build`) then removes Next's client runtime from exactly these pages: the page's own scripts build and change the page after it loads, and React must not try to take over markup they have already changed.
- `scripts/port-legacy.mjs` made these files from the originals. **It was a one-time migration: re-running it overwrites hand edits.** The generated files are now the source.

## Proof that nothing changed

`tests/parity/` compares each page with its original:

```bash
cd tests/parity
node serve.mjs ../.. 4001                              # the original static site
node serve.mjs ../../web/out 4002 ../../web/vercel.json # the Next build, served the way Vercel serves it
node compare.mjs all --tol 0.005 --dom                 # pixels (desktop + mobile, light + dark) and the DOM after the scripts have run
node domdiff.mjs                                       # the markup itself, without a browser
```

## Moving to React (stage 1 started 2026-10-23)

Tayo (`/app/toju`) now runs React. Its existing markup is `src/legacy/toju/body.html` and its main script is still `src/legacy/toju/inline-5.js`; both are placed in a protected section (`#syn-legacy`, `dangerouslySetInnerHTML`, never hydrated), so the old scripts keep working untouched. React's own parts live in `src/features/tayo/` (the first is the toast host, sileo, reachable from old code as `window.SynToast('Copied')`). `scripts/strip-next-runtime.mjs` keeps Next's runtime for the pages in `KEEP_RUNTIME`. Stage 2 moves sections out of `body.html` into components, one at a time; the other pages follow the same path.

## The React pages (parked)

`src/app/(react)/` still holds the earlier React rebuild (chat, browse, property, dream, sign-in, agency page, portal). It is not reachable on the live site:
`vercel.json` forwards `/chat/`, `/browse/`, `/portal/` and the others to the original addresses above. It stays only as a source of ported logic.
