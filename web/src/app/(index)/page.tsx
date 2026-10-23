// The index page's markup is React (2026-10-24): src/features/landing/IndexBody.tsx. Its scripts (the theme switch and clock, the listing
// feed, sharing) run right after React takes the page over, in their original order (src/legacy/AfterHydration.tsx).
import { IndexBody } from "@/features/landing/IndexBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <IndexBody />
      <SiteReact />
    </>
  );
}
