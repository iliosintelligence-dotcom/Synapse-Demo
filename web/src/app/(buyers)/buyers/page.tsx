// The buyers page's markup is React (2026-10-24): src/features/landing/BuyersBody.tsx. Its scripts (the theme switch and clock, the listing
// feed, sharing) run right after React takes the page over, in their original order (src/legacy/AfterHydration.tsx).
import { BuyersBody } from "@/features/landing/BuyersBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <BuyersBody />
      <SiteReact />
    </>
  );
}
