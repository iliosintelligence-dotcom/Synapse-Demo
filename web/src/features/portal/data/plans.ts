/** The plans as shown to agencies. Prices that are CHARGED come from billing_prices() in the database; these are the list prices and copy. */
export interface PlanCard { code: string; tier: string; name: string; headline: string; price: number | null; cta: string; badge?: string; features: string[] }

export const PLANS: PlanCard[] = [
  { code: "foundation", tier: "free", name: "Free", headline: "Everything you need to start winning buyers.", price: 0, cta: "Move to Free", features: [
    "Up to 20 active listings", "2 team members", "CRM with WhatsApp handoff", "Tayo AI referrals", "Standard verification", "Basic analytics"] },
  { code: "accelerator", tier: "accelerator", name: "Accelerate", headline: "Grow faster with AI-powered marketing and verification.", price: 25000, cta: "Upgrade to Accelerate", badge: "MOST POPULAR", features: [
    "Up to 100 listings · 5 agent seats", "Get verified in 48 hours", "Publish once, reach everywhere", "AI writes and posts for you", "Know which channels make buyers", "Marketing performance dashboard"] },
  { code: "market_leader", tier: "market_leader", name: "Leader", headline: "Dominate your local market.", price: 75000, cta: "Choose Leader", features: [
    "Unlimited listings and seats", "Gold Verified badge everywhere", "Every marketing channel + AI campaigns", "Proximity marketing", "Dedicated verification desk and priority support (Tayo still ranks purely on buyer fit, never payment)", "Premium analytics: first touch to closed ₦"] },
  { code: "enterprise", tier: "enterprise", name: "Enterprise", headline: "Terms built around your business.", price: null, cta: "Talk to us", features: [
    "Everything in Leader", "Pricing agreed with you: monthly, per project, or a commission on closed deals", "A dedicated relationship manager", "Onboarding and integrations"] },
];

export const ADDONS = [
  { name: "Extra Listing Pack", desc: "+25 active listings when your catalogue outgrows the plan.", price: "₦15k", unit: "/mo" },
  { name: "AI Marketing Credits", desc: "More AI captions, variations and campaign generations.", price: "₦8k", unit: "pack" },
  { name: "Social Reach Boost", desc: "Extra paid reach behind one listing on social channels. Never affects Tayo’s ranking.", price: "₦10k", unit: "each" },
  { name: "Verification Credits", desc: "Fast-track extra listings through the trust desk.", price: "₦6k", unit: "pack" },
  { name: "Campaign Boost", desc: "Extra reach behind a marketing campaign that’s working.", price: "₦20k", unit: "each" },
];

export const ROI = {
  title: "One sale can pay for your subscription many times over.",
  points: ["Generate more qualified buyers", "Reduce wasted advertising spend", "Automate repetitive marketing", "Build trust through verification", "Understand which campaigns actually close deals"],
  close: "The goal isn’t to save money. The goal is to help you earn more.",
};
