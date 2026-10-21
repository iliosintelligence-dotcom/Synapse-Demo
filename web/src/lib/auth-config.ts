/**
 * Where sign-in related links point. READ BEFORE CHANGING.
 *
 * Every link that leaves the site and comes back (a confirmation email, a password-reset email, the return from Google) must be on
 * the Supabase project's redirect allow-list, which is configured in the Supabase dashboard, not in code.
 *
 * PUT BACK to the original static sign-in page on 2026-10-21: the Next pages did not yet match the approved design (see web/README.md, "Design parity"),
 * so the live site serves the original pages again. Switch to "/signin/" only when the Next sign-in is visually identical, and add the new
 * address to the Supabase allow-list FIRST, or every emailed link will be refused.
 */
export const AUTH_RETURN_PATH = "/app/signin.html";

/** An emailed link must never carry a loopback origin: it is read on another device, where localhost means nothing. */
export const CANONICAL_ORIGIN = "https://synapsecore.dev";

/** The version of the Terms and Privacy Policy a sign-up accepts. It is a date because a date IS the version; change it in the same commit as the documents. */
export const POLICY_VERSION = "2026-09-19";

/** Pages that are still the static site, for `next` destinations and defaults. */
export const DEFAULT_CUSTOMER_DEST = "/chat/";
/** The agency workspace: the original static portal, until the Next portal reaches design parity. */
export const DEFAULT_AGENCY_DEST = "/app/agency.html";
