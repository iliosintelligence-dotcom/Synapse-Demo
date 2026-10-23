// The terms page is React all the way down (2026-10-24): its markup is src/features/legal/TermsBody.tsx, and its one behaviour
// (the mobile bar turning solid on scroll) is SolidBarOnScroll. The old protected copy in src/legacy/terms/ is no longer used.
import { TermsBody } from "@/features/legal/TermsBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <TermsBody />
      <SiteReact />
    </>
  );
}
