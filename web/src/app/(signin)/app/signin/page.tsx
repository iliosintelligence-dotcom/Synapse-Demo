// The signin page's markup is React (2026-10-24): src/features/pages/SigninBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { SigninBody } from "@/features/pages/SigninBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <SigninBody />
      <SiteReact />
    </>
  );
}
