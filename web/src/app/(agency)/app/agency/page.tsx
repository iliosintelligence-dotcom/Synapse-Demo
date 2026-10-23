// The agency portal's markup is React (2026-10-24): src/features/agency/AgencyBody.tsx. Its scripts run right after React takes
// the page over, in their original order (src/legacy/AfterHydration.tsx); AutoReplyLinks waits for them (it needs sign-in).
import { AgencyBody } from "@/features/agency/AgencyBody";
import { SiteReact } from "@/features/site/SiteReact";
import { AutoReplyLinks } from "@/features/agency/AutoReplyLinks";

export default function Page() {
  return (
    <>
      <AgencyBody />
      <SiteReact />
      <AutoReplyLinks />
    </>
  );
}
