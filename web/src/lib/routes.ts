/**
 * Where each page lives. A page still on the static site points at /app/*.html; when it moves to Next, change ONE line here and
 * every link follows. Property, Browse, Sign in, Tayo chat and Dream Home are Next pages; the agency portal is still static.
 */
export const routes = {
  property: (id: string) => `/property/?id=${encodeURIComponent(id)}`,
  agency: (id: string) => `/agency/?id=${encodeURIComponent(id)}`,
  browse: () => "/browse/",
  /** Sign-in is a Next page, but emailed and Google return links still go to /app/signin.html (see lib/auth-config.ts). */
  signin: (query = "") => `/signin/${query}`,
  tayo: (query = "") => `/tayo/${query}`,
  tayoAbout: (listingId: string) => `/tayo/?reply=${encodeURIComponent(listingId)}`,
  dream: () => "/dream/",
} as const;
