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

Every page and pane now lives in the Next app, so it can become the one project that serves `www.synapsecore.dev`. The plan keeps the old static
pages in the deployment (nothing is deleted) and redirects `/app/agency.html` to `/portal/`, so the old portal is one redirect away if it is needed.

**Order matters. Each step is safe to stop after.**

| # | Step | Who | Undo |
|---|------|-----|------|
| 1 | Create the staging project (section 1) on `next.synapsecore.dev`. | You (Vercel) | Delete the project |
| 2 | Supabase, Authentication, URL Configuration: add `https://next.synapsecore.dev/**` to Redirect URLs. | You (Supabase) | Remove it |
| 3 | Test staging end to end (section 4). | You, with Claude | n/a |
| 4 | Register `next.synapsecore.dev` on Stadia if maps are blank there. | You (Stadia) | n/a |
| 5 | ~~In this repo: remove the placeholder home page and run the static assembler.~~ **Done 2026-10-21.** Staging now serves the landing page, `/buyers`, `/privacy`, `/terms`, `/your-data`, `/go/<handle>` and the old `/app/*.html` pages. | Claude | `git revert` |
| 6 | ~~Re-test staging~~ **Done for everything that needs no login** (all pages, redirects, short links `/s/…`, image resizer, headers, `/web/` blocked). Still to do signed in: sign-in and email flows, the portal panes, Google sign-in. Original list: landing page, `/go/<handle>`, `/s/<token>`, `/buyers`, `/privacy`, `/terms`, `/your-data`, and `/app/agency.html?invite=x#crm` (should land on `/portal/?invite=x#crm`). | You, with Claude | n/a |
| 7 | Supabase Redirect URLs: make sure `https://www.synapsecore.dev/**` is allowed (it already is, for the current site). | You | n/a |
| 8 | ~~Move the domain~~ **Done.** Original:  Vercel, the new project, Domains, add `www.synapsecore.dev` (take it from `synapse-demo`). Keep `synapse-demo` for a week. | You (Vercel) | Move the domain back |
| 9 | **Done (optional).** Supabase, Edge Functions, `social-connect`, secret `PORTAL_URL` = `https://www.synapsecore.dev/portal/`. (Until then OAuth returns to `/app/agency.html`, which now redirects to the portal, so it still works.) | You (Supabase) | Set it back |
| 10 | **Done 2026-10-21.** Flip two constants in `web/src/lib/auth-config.ts`: `AUTH_RETURN_PATH` to `"/signin/"` and `DEFAULT_AGENCY_DEST` to `"/portal/"`. Only after step 7. | Claude | `git revert` |
| 11 | Watch for a day: sign-in, email confirmation, password reset, Google, a lead arriving, a social connect. | You | Step 8's undo |

**Rolling back.** Move the domain back to `synapse-demo` (step 8). Nothing in the database changes at any step, so there is no data to restore.

**What changes for the old pages.** `/app/agency.html` redirects to `/portal/`. The other old `/app/*.html` pages that have moved redirect to their Next
versions (see `vercel.json`). Pages with no Next version yet (`go.html`, `your-data.html`, `verify.html`, `synapse.html`, `synapse-join.html`) keep being served
as files, and `/go/<handle>` and `/your-data` are rewritten to them.

## 4. Test list for staging (signed in as an agency, then as a buyer)

Agency (`/portal/`): the sidebar opens every pane; add a listing with photos and a pin; edit it; Share; generate captions, send for approval, schedule one;
connect then disconnect a social account; invite someone and accept in a second browser; set a phone number; save My profile; open the bell and the Ask Tayo panel;
the Delete agency dialog opens (**do not press Delete**).
Buyer: the landing page, browse, a property page, Tayo chat, a Dream Home board, sign in and out.
Redirects: the list in step 6 above.
