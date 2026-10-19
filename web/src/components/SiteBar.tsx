"use client";

import { routes } from "@/lib/routes";
import { AuthSlot } from "./AuthSlot";
import s from "./SiteBar.module.css";

type Page = "tayo" | "matches" | "dream";

/** The customer top bar: brand, the three customer pages, and the account control. */
export function SiteBar({ active }: { active: Page }) {
  const link = (page: Page, href: string, label: string) => (
    <a href={href} className={active === page ? s.on : undefined} aria-current={active === page ? "page" : undefined}>{label}</a>
  );
  return (
    <header className={s.bar}>
      {/* The landing page is a static file, not a Next route, so a plain link is right here. */}
      { }
      <a className={s.brand} href="/buyers">Synapse</a>
      <nav className={s.nav} aria-label="Main">
        {link("tayo", routes.tayo(), "Tayo")}
        {link("matches", routes.browse(), "Your matches")}
        {link("dream", routes.dream(), "Dream Home")}
      </nav>
      <span className={s.spacer} />
      <AuthSlot />
    </header>
  );
}
