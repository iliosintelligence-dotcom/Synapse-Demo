import Link from "next/link";

/** Index of the routes already migrated from the static site (see ../../README.md). Everything else is still under /app/*.html. */
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 20px" }}>
      <h1>Synapse (Next.js)</h1>
      <p>This app is being built beside the current site, one page at a time. Migrated so far:</p>
      <ul>
        <li><Link href="/agency/?id=0f90aa7a-4329-4bb8-b36d-18aa5079289d">Agency page</Link> (sample agency)</li>
      </ul>
    </main>
  );
}
