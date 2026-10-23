// The syndication-test page's markup is React (2026-10-24): src/features/pages/SyndicationTestBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { SyndicationTestBody } from "@/features/pages/SyndicationTestBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <SyndicationTestBody />
      <SiteReact />
    </>
  );
}
