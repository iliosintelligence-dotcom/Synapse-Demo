/**
 * Password rules (Eden, 2026-10-11), for creating an account or setting a new password: 10+ characters with upper, lower, a number and
 * a symbol, and not built from the person's own email or name. Signing IN is untouched: an existing 8-character password must still work.
 * This is the browser's check; the project's own password policy (Supabase Auth settings) should say the same so it also holds for
 * anyone who skips this page.
 */
export type PwProblem = "len" | "up" | "lo" | "num" | "sym" | "weak";

const COMMON = ["password", "passw0rd", "qwerty", "12345678", "letmein", "welcome", "iloveyou", "admin", "synapse", "nigeria", "lagos", "abc123"];

export function pwProblems(pw: string, email = "", name = ""): PwProblem[] {
  const out: PwProblem[] = [];
  const p = pw || "";
  if (p.length < 10) out.push("len");
  if (!/[A-Z]/.test(p)) out.push("up");
  if (!/[a-z]/.test(p)) out.push("lo");
  if (!/[0-9]/.test(p)) out.push("num");
  if (!/[^A-Za-z0-9]/.test(p)) out.push("sym");
  const low = p.toLowerCase();
  const local = email.split("@")[0].toLowerCase();
  const nameKey = name.trim().toLowerCase().replace(/\s+/g, "");
  const weak = COMMON.some((w) => low.includes(w)) || (local.length >= 4 && low.includes(local)) || (name.trim().length >= 4 && low.includes(nameKey));
  if (weak) out.push("weak");
  return out;
}

const PW_RULE_TEXT: Record<PwProblem, string> = {
  len: "at least 10 characters",
  up: "an uppercase letter",
  lo: "a lowercase letter",
  num: "a number",
  sym: "a symbol",
  weak: "nothing common or taken from your name or email",
};

export const pwMessage = (list: PwProblem[]) => `Your password needs ${list.map((k) => PW_RULE_TEXT[k]).join(", ")}.`;

/** 0 to 5, for the strength bar. */
export function pwScore(problems: PwProblem[]): number {
  return Math.max(0, 5 - problems.filter((k) => k !== "weak").length - (problems.includes("weak") ? 1 : 0));
}
