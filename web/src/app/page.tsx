import Link from "next/link";

/** A developer index of every route in the Next app, for clicking through staging. It is replaced by the real landing page at cutover (see ../../DEPLOY.md). */
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 20px" }}>
      <h1>Synapse (Next.js)</h1>
      <p>Staging index. Every page of the app now lives here:</p>
      <ul>
        <li><Link href="/signin/">Sign in</Link></li>
        <li><Link href="/browse/">Browse</Link></li>
        <li><Link href="/chat/">Tayo chat</Link></li>
        <li><Link href="/dream/">Dream Home</Link></li>
        <li><Link href="/property/?id=c0893b6a-ce6b-46c7-8030-bb55a2704532">Property page</Link> (sample listing)</li>
        <li><Link href="/agency/?id=0f90aa7a-4329-4bb8-b36d-18aa5079289d">Agency page</Link> (sample agency)</li>
        <li><Link href="/portal/">Agency portal</Link> (sign in as an agency; every pane, the advisor, the bell)</li>
      </ul>
    </main>
  );
}
