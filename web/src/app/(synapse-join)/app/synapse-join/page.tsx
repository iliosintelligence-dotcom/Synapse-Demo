/* eslint-disable */
// The move to React (2026-10-23): this page runs React. Its existing markup is src/legacy/synapse-join/body.html and its scripts are the
// files listed below, in a protected section React never reconciles (src/legacy/LegacyPage.tsx). React parts sit beside it.
import { LegacyPage } from "@/legacy/LegacyPage";
import { SiteReact } from "@/features/site/SiteReact";

export default function Page() {
  return (
    <>
      <LegacyPage page="synapse-join" files={["inline-2.js"]} />
      <SiteReact />
    </>
  );
}
