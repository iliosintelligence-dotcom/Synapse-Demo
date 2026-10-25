/* eslint-disable */
// The studio page (/app/synapse.html): React since 2026-10-24 (Studio, was src/legacy/synapse/inline-2.js). The shared auth.js
// still runs after hydration; the studio waits for it.
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";
import { Studio } from "./Studio";
import { StudioGuide } from "./StudioGuide";

const SCRIPTS: PageScript[] = [
  { shared: "auth" },
];

export function SynapseBody() {
  return (
    <>
      <Studio guide={<StudioGuide />} />
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
