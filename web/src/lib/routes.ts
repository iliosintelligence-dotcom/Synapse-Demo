/**
 * Where each page lives. A page still on the static site points at /app/*.html; when it moves to Next, change ONE line here and
 * every link follows. Property stays on the static site until its map, flood and viewing-booking parts have moved.
 */
export const routes = {
  property: (id: string) => `/app/property.html?id=${encodeURIComponent(id)}`,
  agency: (id: string) => `/agency/?id=${encodeURIComponent(id)}`,
  browse: () => "/app/browse.html",
  tayo: (query = "") => `/app/toju.html${query}`,
  tayoAbout: (listingId: string) => `/app/toju.html?reply=${encodeURIComponent(listingId)}`,
} as const;
