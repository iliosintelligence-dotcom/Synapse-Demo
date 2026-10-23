// The synapse page's markup is React (2026-10-24): src/features/pages/SynapseBody.tsx. Its scripts run right after React takes the
// page over, in their original order (src/legacy/AfterHydration.tsx).
import { SynapseBody } from "@/features/pages/SynapseBody";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <SynapseBody />
      <SiteReact />
    </>
  );
}
