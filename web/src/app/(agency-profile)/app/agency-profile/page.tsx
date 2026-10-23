// The agency-profile page's markup is React (2026-10-24): src/features/pages/AgencyProfileBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { AgencyProfileBody } from "@/features/pages/AgencyProfileBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <AgencyProfileBody />
      <SiteReact />
    </>
  );
}
