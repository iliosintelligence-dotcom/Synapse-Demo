import type { Role } from "@/lib/auth-actions";

/**
 * The shared demo accounts. "Just looking?" signs in to a genuine fixed account rather than faking the UI, so row-level security, the
 * agency-portal role gate and everything else behave exactly as they do for anybody. These are example accounts with example data,
 * public by design (they are in the static sign-in page too); nothing private lives behind them. They run only when the URL asks
 * (?demo=1) or the visitor presses the demo button, never as a fallback for a wrong password.
 */
export const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  customer: { email: "demo-customer@synapse.ng", password: "SynDemo-Cust-9f42x" },
  agency: { email: "demo-agency@synapse.ng", password: "SynDemo-Agcy-7k18q" },
};
