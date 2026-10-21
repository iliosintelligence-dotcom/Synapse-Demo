import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Synapse app is a native shell around the live site (decided 2026-10-21): it opens www.synapsecore.dev, so every site change
 * reaches the app at once with no store release. Native features are added on top where the phone does something a web page cannot
 * (push, camera, share, links that open the app). Nothing in webDir is the product; it is only what shows when the site cannot be
 * reached (native/www/offline.html).
 *
 * appId is permanent once the app is published: it names the app to Google Play and Apple. dev.synapsecore.app is the domain ILIOS
 * Digital already owns, reversed.
 */
const config: CapacitorConfig = {
  appId: "dev.synapsecore.app",
  appName: "Synapse",
  webDir: "native/www",
  server: {
    // Opens on Tayo: the app is the customer's way in. An agency signs in from there and lands in its portal.
    url: "https://www.synapsecore.dev/app/toju",
    // Pages the app may stay on. Anything else (Google, Facebook, a listing's own website) opens in the phone's browser.
    allowNavigation: ["www.synapsecore.dev", "synapsecore.dev", "*.supabase.co"],
    // Shown by the shell when the site cannot be reached, instead of a browser error page.
    errorPath: "offline.html",
    cleartext: false,
  },
  android: {
    // Lets the site know it is inside the app (auth.js offers email sign-in only there for now).
    appendUserAgent: "SynapseApp/1.0",
    allowMixedContent: false,
    backgroundColor: "#FAF6F0",
  },
  ios: {
    appendUserAgent: "SynapseApp/1.0",
    backgroundColor: "#FAF6F0",
    contentInset: "never",
  },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#FAF6F0", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#FAF6F0", overlaysWebView: false },
  },
};

export default config;
