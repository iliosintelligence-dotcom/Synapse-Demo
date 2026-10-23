/* eslint-disable */
/**
 * A page's existing markup and scripts, in a protected section React never reconciles (the move to React, 2026-10-23).
 *
 * src/legacy/<page>/body.html is the page's markup as it was, with each inline script or style written as a placeholder
 * (/*@inline-3.js*\/) that is filled from src/legacy/<page>/<file> here, so those files stay the place to edit behaviour.
 * dangerouslySetInnerHTML is not hydrated, so the page's own scripts can change this section freely, as they always have, while
 * the page itself now runs React. Sections move out of body.html into components one at a time.
 */
import { inline } from "@/legacy/read";

export function legacyBody(page: string, files: string[]): string {
  let html = inline(page, "body.html");
  for (const f of files) html = html.replace(`/*@${f}*/`, () => inline(page, f));
  return html;
}

export function LegacyPage({ page, files }: { page: string; files: string[] }) {
  return <div id="syn-legacy" style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: legacyBody(page, files) }} />;
}
