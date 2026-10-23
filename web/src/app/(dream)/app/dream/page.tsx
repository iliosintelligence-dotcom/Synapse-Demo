// The dream page's markup is React (2026-10-24): src/features/pages/DreamBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { DreamBody } from "@/features/pages/DreamBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <DreamBody />
      <SiteReact />
    </>
  );
}
