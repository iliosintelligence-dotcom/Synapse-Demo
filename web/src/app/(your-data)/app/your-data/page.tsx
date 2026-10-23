// The your-data page's markup is React (2026-10-24): src/features/pages/YourDataBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { YourDataBody } from "@/features/pages/YourDataBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <YourDataBody />
      <SiteReact />
    </>
  );
}
