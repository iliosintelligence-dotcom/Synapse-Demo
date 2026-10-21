# The Synapse app (Android and iOS)

## What it is

A native shell, made with Capacitor, that opens the live site (`https://www.synapsecore.dev/app/toju`). Every change to the site
reaches the app at once, with no store release. Config: `capacitor.config.ts`. Projects: `android/` and `ios/`. If the site cannot
be reached the app shows `native/www/offline.html`. The app ID is `dev.synapsecore.app` and **cannot change once the app is
published**.

Inside the app the site sees `SynapseApp/1.0` in its user agent. Today that does one thing: sign-in offers email and password only,
because Google refuses to run in an embedded browser and a sign-in finished in the phone's own browser could not complete in the
app (the PKCE verifier lives in the app's browser). Proper Google sign-in needs the in-app browser plugin and a return link; it is
the first native job after the first store build.

## Testing without any store account

GitHub builds both apps, because this PC has neither Android Studio nor a Mac.

- **Android:** Actions → *Android app* → Run workflow. When it finishes, download `synapse-debug-apk`, copy `app-debug.apk` to the
  phone, open it and allow "install from this source". It is a debug build; it is not what goes to a store.
- **iOS:** Actions → *iOS app* → Run workflow. It builds for the simulator, unsigned, to prove the project compiles. A real iPhone
  needs signing (below).

Change the icon or splash by replacing the PNGs in `resources/` and running `node scripts/make-app-icons.mjs`.

## Accounts you need (held by ILIOS Digital)

| Store | Cost | Notes |
|---|---|---|
| Apple Developer Program | US$99 a year | Already exists. Needed: the App Store Connect app record for `dev.synapsecore.app`, a signing certificate and provisioning profile (made in the Apple developer site; the build then runs on GitHub's Macs, so no Mac is required). |
| Google Play Console | US$25, once | Does not exist yet. A **personal** account created now must run a closed test with 12 testers for 14 days before it can publish to production. An **organisation** account (ILIOS Digital, with a D-U-N-S number) skips that. |

## Before a store will accept it

1. **Apple guideline 4.2 (minimum functionality).** An app that only shows a website can be rejected. The answer is to add what a
   website cannot do: push notifications (a viewing confirmed, a price drop, an agent's reply: the notification rows already
   exist in the database), the camera for listing photos, the share sheet, and links that open the app. Plan these for the first
   iOS submission, not after it.
2. **Account deletion inside the app.** Apple and Google both require it. `/app/your-data` already erases an account; link it from
   the account menu and put its address in the Play Console data-safety form.
3. **Privacy labels (Apple) and the data-safety form (Google).** The privacy policy is already written; the forms must match it
   (name, email, phone, a social handle the buyer chooses to add, location when they use Nearby, analytics with consent).
4. **Paystack** must use its hosted page. **Meta and TikTok connect** (agency side) must open in the phone's browser and return to
   the app by a link; do those after the customer app is out.
5. **App Links / Universal Links** (so a `/s/<token>` link from a post opens the app). Android: publish
   `https://www.synapsecore.dev/.well-known/assetlinks.json` with the signing certificate's SHA-256 (the manifest already asks for
   it). iOS: add the Associated Domains capability and publish `apple-app-site-association` with the Apple team ID.

## Signing and release (later)

- Android: make an upload keystore once and keep it safe (losing it means losing the ability to update the app); store it as a
  GitHub secret; add a workflow step that builds the signed `.aab` Google Play wants.
- iOS: a distribution certificate and provisioning profile as GitHub secrets; a workflow step that archives and uploads to
  TestFlight.
