/* What the site's plain scripts put on window, as the React parts see it (one declaration, shared). */
export {};
declare global {
  interface SynAuthClient { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
  interface Window {
    /* src/shared/auth.js */
    SynAuth?: { client?: () => Promise<SynAuthClient>; ready?: () => Promise<{ id?: string } | null> };
  }
}
