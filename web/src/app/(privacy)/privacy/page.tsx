// The privacy page is React all the way down (2026-10-24): its markup is src/features/legal/PrivacyBody.tsx, and its one behaviour
// (the mobile bar turning solid on scroll) is SolidBarOnScroll. The old protected copy in src/legacy/privacy/ is no longer used.
import { PrivacyBody } from "@/features/legal/PrivacyBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <PrivacyBody />
      <SiteReact />
    </>
  );
}
