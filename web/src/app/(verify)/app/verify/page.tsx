// The verify page's markup is React (2026-10-24): src/features/pages/VerifyBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { VerifyBody } from "@/features/pages/VerifyBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <VerifyBody />
      <SiteReact />
    </>
  );
}
