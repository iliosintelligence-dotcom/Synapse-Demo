// Tayo's page is React markup (2026-10-24): src/features/tayo/TojuBody.tsx, with the React parts in <TayoReact /> (top bar, sheets,
// conversation, matches panel, Replying about, typing box). The chat engine and the shared scripts run right after React takes the
// page over (src/legacy/AfterHydration.tsx); the React parts wait for the engine's signal before they attach.
import { TojuBody } from "@/features/tayo/TojuBody";
import { TayoReact } from "@/features/tayo/TayoReact";

export default function Page() {
  return (
    <>
      <TojuBody />
      <TayoReact />
    </>
  );
}
