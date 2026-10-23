// The browse page's markup is React (2026-10-24): src/features/pages/BrowseBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { BrowseBody } from "@/features/pages/BrowseBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <BrowseBody />
      <SiteReact />
    </>
  );
}
