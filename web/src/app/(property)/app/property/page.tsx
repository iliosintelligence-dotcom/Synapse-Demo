// The property page's markup is React (2026-10-24): src/features/pages/PropertyBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { PropertyBody } from "@/features/pages/PropertyBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <PropertyBody />
      <SiteReact />
    </>
  );
}
