/* eslint-disable */
import { inline } from "@/legacy/read";
import { TayoReact } from "@/features/tayo/TayoReact";

/* STAGE 1 OF THE MOVE TO REACT (2026-10-23).
   This page now runs React. Its existing markup and scripts (src/legacy/toju/body.html, with the main script in inline-5.js) are
   placed in a protected section that React never reconciles: dangerouslySetInnerHTML is not hydrated, so the page's own scripts can
   change it freely, as they always have. React's own parts sit beside it in <TayoReact />. In stage 2, sections move out of
   body.html into React components one at a time.
   Edit the markup in body.html and the behaviour in inline-5.js, exactly as before. */
const legacyBody = (): string =>
  inline("toju", "body.html").replace("/*@inline-5.js*/", () => inline("toju", "inline-5.js"));

export default function Page() {
  return (
    <>
      <div id="syn-legacy" style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: legacyBody() }} />
      <TayoReact />
    </>
  );
}
