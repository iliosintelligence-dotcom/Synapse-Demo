/**
 * Where sign-in related links point. READ BEFORE CHANGING.
 *
 * Every link that leaves the site and comes back (a confirmation email, a password-reset email, the return from Google) must be on
 * the Supabase project's redirect allow-list, which is configured in the Supabase dashboard, not in code.
 *
 * Switched to the Next sign-in page at cutover (2026-10-21), after `https://www.synapsecore.dev/signin/` and the bare domain were confirmed
 * on that list. Links already sent to `/app/signin.html` still work: vercel.json redirects it to `/signin/` and keeps the query string.
 * If a return address is ever changed again, add it to the allow-list FIRST, or every emailed link will be refused.
 */
export const AUTH_RETURN_PATH = "/signin/";

/** An emailed link must never carry a loopback origin: it is read on another device, where localhost means nothing. */
export const CANONICAL_ORIGIN = "https://synapsecore.dev";

/** The version of the Terms and Privacy Policy a sign-up accepts. It is a date because a date IS the version; change it in the same commit as the documents. */
export const POLICY_VERSION = "2026-09-19";

/** Pages that are still the static site, for `next` destinations and defaults. */
export const DEFAULT_CUSTOMER_DEST = "/chat/";
/** The agency workspace: the Next portal, now the front door. */
export const DEFAULT_AGENCY_DEST = "/portal/";
