/**
 * Turns an auth error into a sentence a person can act on. Two rules:
 *  - Never reveal whether an email has an account (an enumeration oracle): sign-in failures are always the same sentence.
 *  - ORDER MATTERS. Codes first, then narrow message tests, then the broad ones, so a broad test ("rate") can never shadow a specific one.
 */
export const GENERIC_ERR = "Something went wrong. Please try again.";

export interface AuthErrorLike { message?: string; code?: string; error_code?: string; status?: number }

export const errorCode = (e: AuthErrorLike | null | undefined): string => e?.code || e?.error_code || "";

export function friendly(err: AuthErrorLike | null | undefined): string {
  const m = String(err?.message ?? "").toLowerCase();
  const code = errorCode(err);

  // GoTrue refuses a new password equal to the current one: code same_password, "New password should be different from the old password."
  if (code === "same_password" || m.includes("different from the old password")) return "That is already your password. Choose a different one, or simply sign in with it.";
  // The server states the rule it applied, which is more useful than any paraphrase.
  if (code === "weak_password") return err?.message || "That password is too weak. Choose a stronger one.";
  if (code === "reauthentication_needed") return "For security, sign in again before changing your password.";

  // Supabase's built-in email sender allows only a handful of messages an hour; name the real cause.
  if (code === "over_email_send_rate_limit" || m.includes("email rate limit")) return "The project has sent as many emails as it is allowed this hour. This is our sending limit, not anything you did. Wait an hour, or turn off email confirmation while testing.";
  if (code === "over_request_rate_limit") return "Too many requests from this device just now. Wait a minute and try again.";
  if (code === "over_sms_send_rate_limit" || (m.includes("sms") && m.includes("rate"))) return "Too many codes requested. Wait a minute, then ask for another.";
  if (code === "phone_provider_disabled" || m.includes("unsupported phone provider")) return "Signing in by phone is not switched on yet. Use your email address for now.";
  if (code === "otp_disabled") return "One-time codes are not switched on for this project yet.";
  if (code === "otp_expired") return "That code has expired. Ask for a new one.";
  if (code === "user_already_exists" || m.includes("already registered") || m.includes("already been registered")) return "There is already an account with that email. Try signing in instead.";
  if (code === "email_not_confirmed") return "That account still needs confirming. Check your email for the link we sent.";

  if (m.includes("invalid login") || m.includes("invalid credentials")) return "That email and password do not match. Try again, or reset your password.";
  if (m.includes("invalid") && (m.includes("otp") || m.includes("token"))) return "That code is not right. Check it and try again.";
  if (m.includes("password") && m.includes("short")) return "That password is too short. Use at least 8 characters.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("compromised")) return "That password has appeared in a known breach. Please choose a different one.";
  if (m.includes("same") && m.includes("password")) return "That is your current password. Choose a different one.";
  if (m.includes("provider is not enabled")) return "That sign-in method is not switched on for this project yet.";
  if (m.includes("fetch") || m.includes("network") || m.includes("unreachable")) return "We could not reach the sign-in service. Check your connection and try again.";
  if (m.includes("session") || m.includes("expired") || m.includes("token")) return "This reset link has expired. Request a new one and use it within a few minutes.";

  // Broad, and last. "For security purposes, you can only request this after N seconds" is the throttle GoTrue usually returns.
  const wait = /after (\d+) seconds?/i.exec(m);
  if (wait) return `Please wait ${wait[1]} ${wait[1] === "1" ? "second" : "seconds"} before trying that again.`;
  if (m.includes("for security purposes")) return "Please wait a few seconds before trying that again.";
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts just now. Wait a minute and try again.";
  return GENERIC_ERR;
}

/** Why-am-I-here framing, from `?reason=`. */
export const WHY: Record<string, { title: string; body: string }> = {
  contact: {
    title: "One step before we introduce you.",
    body: "We ask for an account before sharing your details with an agent, so you can see every conversation in one place, and so no agency ever gets your number without you choosing.",
  },
  agency: { title: "Set up your agency workspace.", body: "Your listings, leads and verification all live behind this login." },
  saved: { title: "Keep your saved homes.", body: "An account keeps them on every device instead of just this browser." },
  idle: { title: "You were signed out.", body: "For your security we sign you out after a couple of hours away. Sign in again to carry on." },
  inspection: { title: "Sign in to book a tour.", body: "A tour is booked in your name, so the agent knows who is coming." },
};
