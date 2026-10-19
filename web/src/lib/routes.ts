/**
 * Where each page lives. A page still on the static site points at /app/*.html; when it moves to Next, change ONE line here and
 * every link follows. Property and Browse are now Next pages; Tayo chat, sign-in and the agency portal are still static.
 */
export const routes = {
  property: (id: string) => `/property/?id=${encodeURIComponent(id)}`,
  agency: (id: string) => `/agency/?id=${encodeURIComponent(id)}`,
  browse: () => "/browse/",
  tayo: (query = "") => `/app/toju.html${query}`,
  tayoAbout: (listingId: string) => `/app/toju.html?reply=${encodeURIComponent(listingId)}`,
} as const;
