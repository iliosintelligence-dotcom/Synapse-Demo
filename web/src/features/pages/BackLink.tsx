"use client";
/** "← Back": the previous page if there is one, else Your matches (was a javascript: link, which React will not render). */
export function BackLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a className={className} href="browse.html"
      onClick={(e) => { if (history.length > 1) { e.preventDefault(); history.back(); } }}>{children}</a>
  );
}
