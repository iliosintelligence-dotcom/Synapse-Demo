// The go page's markup is React (2026-10-24): src/features/pages/GoBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { GoBody } from "@/features/pages/GoBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <GoBody />
      <SiteReact />
    </>
  );
}
