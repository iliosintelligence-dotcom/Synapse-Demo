# Deploying the Next app

The app builds to plain static files (`npm run build` writes `out/`). It needs no server: all server logic is Supabase.

## 1. A staging copy (safe: the live site is untouched)

1. Vercel, Add New, Project, import this repository.
2. **Root Directory: `web`.** Framework: Next.js. Build command `npm run build`; output is read from `out/` automatically.
3. Environment Variables (both Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   Both values are in `.env.example` and are public by design. Never add a service-role key to this project.
4. Deploy. Under Domains, give it an address such as `next.synapsecore.dev`.

`web/vercel.json` carries the rewrites (`/m/…` image resizing, `/s/<token>` short links), the security headers, and the redirects.
The existing project keeps serving `www.synapsecore.dev` and ignores `web/` (see `../.vercelignore`).

## 2. Things to check on staging

- **Maps blank?** Stadia authorises by domain. `synapsecore.dev` is registered; if tiles fail on a subdomain, register it too.
  A 401 from `tiles.stadiamaps.com` in the browser's network tab is the sign.
- **Sign-in links:** emailed and Google return links still point at `/app/signin.html` (see `src/lib/auth-config.ts`). On staging the
  `/app/…` redirects in `vercel.json` send that to `/signin/`, but Supabase only allows addresses on its redirect allow-list, so add the
  staging address there before testing email confirmation, password reset or Google.
- **Chat route:** the chat is `/chat/`, not `/tayo/`, because `/tayo` and `/tayo/<channel>` are the Instagram bio and campaign links.
  They redirect to `/chat/?via=bio[&ch=<channel>]` and the chat reads those.

## 3. Going live (cutover)

The agency portal is not migrated yet, so the live site must keep serving the static `app/*.html` files until it is. Then make this
the one project: copy the static site (`index.html`, `buyers.html`, `app/`, `images/`, legal pages, `sitemap.xml`…) into `web/public/`,
point `www.synapsecore.dev` at the project, and keep the `/app/…` redirects in `vercel.json` for the pages that have moved. Do it on
a quiet day, with the staging copy already tested, and keep the old project for a week so it can be switched back.
