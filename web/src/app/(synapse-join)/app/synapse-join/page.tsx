// The synapse-join page's markup is React (2026-10-24): src/features/pages/SynapseJoinBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { SynapseJoinBody } from "@/features/pages/SynapseJoinBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <SynapseJoinBody />
      <SiteReact />
    </>
  );
}
