import type { Session, User } from "@supabase/supabase-js";
import { AUTH_RETURN_PATH, CANONICAL_ORIGIN } from "./auth-config";
import { supabase } from "./supabase";

/**
 * Everything that talks to Supabase Auth. Pages call these and never touch `supabase.auth` directly, so the rules (what role an
 * account gets, where emailed links go, which redirects are allowed) live in one place.
 */

export type Role = "customer" | "agency";

/* ── roles ───────────────────────────────────────────────────────────────────
   The database trigger that provisions `profiles` on sign-up casts `role` to a real Postgres enum (consumer, agent, agency_admin,
   agency_owner, platform_admin). Sending any other value aborts the sign-up. The app only has two sides, so these map to them. */
const AGENCY_DB_ROLES = ["agency_owner", "agency_admin", "agent", "platform_admin"];

export function roleOf(user: User | null | undefined): Role | null {
  if (!user) return null;
  const role = (user.user_metadata as { role?: string } | undefined)?.role;
  return role && AGENCY_DB_ROLES.includes(role) ? "agency" : "customer";
}

/* ── redirect safety ─────────────────────────────────────────────────────────
   Only ever navigate to a same-origin path. Anything absolute, protocol-relative or cross-origin is discarded rather than "cleaned":
   rejecting is safer than trying to sanitise a hostile URL. A relative `next` (written by the static pages, e.g. "property.html?id=")
   means "relative to /app/". */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return fallback;
    const base = new URL("/app/", window.location.origin);
    const u = new URL(raw, raw.startsWith("/") ? window.location.origin : base);
    if (u.origin !== window.location.origin) return fallback;
    const path = u.pathname + u.search + u.hash;
    // A path that begins with // or /\ is a protocol-relative address to a browser: it would leave the site even though it parsed as same-origin.
    return /^\/[\/]/.test(path) ? fallback : path;
  } catch {
    return fallback;
  }
}

/** Where a link that travels through email must point. Any real origin is used as-is (previews keep working); only localhost is rewritten. */
export function mailOrigin(): string {
  const o = window.location.origin;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/i.test(o) ? CANONICAL_ORIGIN : o;
}

/* ── phone ───────────────────────────────────────────────────────────────────
   Nigerian numbers get typed every way there is: 0803..., 234803..., +234803..., with spaces and dashes. GoTrue wants strict E.164. */
export function normalisePhone(raw: string): string {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) return d;
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  if (d.length === 10) return `+234${d}`;
  return `+${d}`;
}

interface SignUpOpts { role: Role; name?: string; agencyName?: string; agencyWebsite?: string; phone?: string; next?: string }

function metadata(o: SignUpOpts): Record<string, string | null> {
  const meta: Record<string, string | null> = { role: o.role === "agency" ? "agency_owner" : "consumer", full_name: o.name || null };
  if (o.role === "agency" && o.agencyName) meta.agency_name = o.agencyName;
  if (o.role === "agency" && o.agencyWebsite) meta.agency_website = o.agencyWebsite;
  return meta;
}

/** A self-serve agency sign-up is treated as that agency's owner; the database trigger provisions the agency and owner membership atomically. */
export function signUp(email: string, password: string, o: SignUpOpts) {
  const meta = metadata(o);
  if (o.phone) {
    const tel = normalisePhone(o.phone);
    if (tel) meta.phone = tel;
  }
  // The confirmation link comes back WITH the context the person left in, or an agency owner would land as a customer.
  const back = `${mailOrigin()}${AUTH_RETURN_PATH}?role=${o.role}${o.next ? `&next=${encodeURIComponent(o.next)}` : ""}`;
  return supabase.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: back } });
}

export const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });

export function resendConfirmation(email: string, role: Role) {
  return supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${mailOrigin()}${AUTH_RETURN_PATH}?role=${role}` } });
}

/** Sends the six-digit code. Creates the account if there is not one yet, with the same metadata the email path sends. */
export async function sendPhoneCode(phone: string, o: SignUpOpts) {
  const to = normalisePhone(phone);
  if (!to || to.length < 10) return { error: { message: "Enter a phone number, including the network code." }, phone: to };
  const r = await supabase.auth.signInWithOtp({ phone: to, options: { data: metadata(o), shouldCreateUser: true } });
  return { ...r, phone: to };
}

export const verifyPhoneCode = (phone: string, code: string) =>
  supabase.auth.verifyOtp({ phone: normalisePhone(phone), token: String(code || "").replace(/\D/g, ""), type: "sms" });

/**
 * A password reset in IMPLICIT form, on purpose. The SDK's reset sends a PKCE challenge, and a PKCE link can only be redeemed by the
 * browser that asked for it, so a reset requested on a laptop and opened on a phone fails silently. Asked for without a challenge, the
 * link carries the session and works anywhere; the sign-in page redeems it on arrival.
 */
export async function resetPassword(email: string): Promise<void> {
  const to = `${mailOrigin()}${AUTH_RETURN_PATH}`;
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(to)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (r.ok) return;
  const j = await r.json().catch(() => ({}));
  throw Object.assign(new Error(j.msg || j.message || j.error_description || `Reset request failed (${r.status})`), { code: j.error_code || j.code || "", status: r.status });
}

/**
 * Signs out. A global sign-out revokes the refresh token on the server and needs the network, but the button has to end the session on THIS
 * device even when the network does not answer, so if it has not returned in 2.5 s the local session is cleared and we carry on.
 * What the next person on this browser must not see goes too: Tayo's saved chat, its archived chats, and the id that restores them from the server.
 */
export async function signOut(): Promise<void> {
  const global = supabase.auth.signOut();
  const fallback = new Promise((resolve) => setTimeout(() => resolve(supabase.auth.signOut({ scope: "local" })), 2500));
  await Promise.race([global, fallback]).catch(() => {});
  try {
    for (const k of ["toju_chat_v1", "toju_sessions_v1", "toju_visitor_v1", "synapse_proximity_v1"]) localStorage.removeItem(k);
  } catch { /* nothing to clear */ }
}

export const updatePassword = (password: string) => supabase.auth.updateUser({ password });

/* ── Google ──────────────────────────────────────────────────────────────────
   The button is offered only if the project has the provider switched on (GoTrue publishes that), so a dead button can never throw
   the person out to a raw JSON error on a supabase.co domain. */
let providers: Promise<string[]> | null = null;
export function enabledProviders(): Promise<string[]> {
  providers ??= fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => ["google"].filter((name) => d?.external?.[name] === true))
    .catch(() => []);
  return providers;
}

/** The role has to survive the round trip: OAuth cannot carry metadata, so the intent travels in the return URL and is settled on return. */
export function signInWithGoogle(next: string, role: Role) {
  const dest = `${AUTH_RETURN_PATH}?oauth=1&role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return supabase.auth
    .signInWithOAuth({ provider: "google", options: { redirectTo: new URL(dest, window.location.origin).toString(), scopes: "email profile" } })
    .then((r) => {
      if (r.error) throw r.error;
      return r;
    });
}

/* ── agencies ────────────────────────────────────────────────────────────────── */

/** Whether this account has an agency behind it. After a Google return we ASK the database rather than trust the token. */
export async function hasAgency(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const r = await supabase.from("agency_members").select("agency_id").eq("profile_id", data.user.id).is("deleted_at", null).limit(1);
    return !!r.data?.length;
  } catch {
    return false;
  }
}

/** Gives the signed-in account its first agency. Refused server-side if they already have one. user_metadata is a UI hint only, never a grant. */
export async function provisionAgency(name: string, city: string) {
  const res = await supabase.rpc("provision_agency_for_current_user", { p_agency_name: name, p_city: city || null });
  if (res.error) return res;
  await supabase.auth.updateUser({ data: { role: "agency_owner" } }).catch(() => {});
  return res;
}

/** The agency's own website, saved onto the agency this account owns. A bare domain gets https://; anything that is not plain http(s) is refused. */
export async function saveAgencyWebsite(raw: string): Promise<void> {
  let v = String(raw || "").trim();
  if (!v) return;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = `https://${v}`;
  let href: string;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || v.length > 200) throw new Error("bad url");
    href = u.href;
  } catch {
    throw new Error("That does not look like a website address.");
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in.");
  const r = await supabase.from("agencies").select("id,social").eq("owner_id", data.user.id).limit(1);
  if (r.error) throw r.error;
  const a = r.data?.[0];
  if (!a) throw new Error("No agency yet.");
  await supabase.from("agencies").update({ social: { ...(a.social ?? {}), website: href } }).eq("id", a.id);
}

/** Written at the first point a session exists (consent_records requires profile_id = auth.uid()). Fire and forget: never trap anyone over an audit row. */
export async function recordConsent(version: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    const r = await supabase.from("consent_records").insert(
      ["terms_of_service", "privacy_policy", "ai_processing"].map((kind) => ({ profile_id: id, kind, version, granted: true, context: "signup" })),
    );
    if (r.error) console.warn("[consent] not recorded:", r.error.message);
  } catch (e) {
    console.warn("[consent] not recorded:", (e as Error)?.message);
  }
}

export type { Session, User };
