/**
 * Where sign-in related links point. READ BEFORE CHANGING.
 *
 * Every link that leaves the site and comes back (a confirmation email, a password-reset email, the return from Google) must be on
 * the Supabase project's redirect allow-list, which is configured in the Supabase dashboard, not in code. Today that list holds the
 * static page, `/app/signin.html`, so those links keep pointing there: the old page stays deployed and finishes the journey.
 *
 * To make the Next sign-in page the destination: add `https://synapsecore.dev/signin/` (and any preview domain) to the allow-list in
 * Supabase (Authentication, URL Configuration), then change AUTH_RETURN_PATH to "/signin/". One line. Do not change it first, or
 * every emailed link will be refused.
 */
export const AUTH_RETURN_PATH = "/app/signin.html";

/** An emailed link must never carry a loopback origin: it is read on another device, where localhost means nothing. */
export const CANONICAL_ORIGIN = "https://synapsecore.dev";

/** The version of the Terms and Privacy Policy a sign-up accepts. It is a date because a date IS the version; change it in the same commit as the documents. */
export const POLICY_VERSION = "2026-09-19";

/** Pages that are still the static site, for `next` destinations and defaults. */
export const DEFAULT_CUSTOMER_DEST = "/chat/";
export const DEFAULT_AGENCY_DEST = "/app/agency.html";
