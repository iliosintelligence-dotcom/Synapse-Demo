/* The shared scripts that are part of the app's code now (they were files in public/app). A page names the ones it uses in its
   AfterHydration list ({ shared: "auth" }); each is loaded on demand, so a page downloads only its own, and run() at the point in
   the order where its file used to load. */
export const SHARED = {
  "agency-listings": () => import("./agency-listings"),
  /* the agency portal's leads, pipeline and listings: agency-only, so it sits beside its panes */
  "agency-data": () => import("@/features/agency/portalData"),
  /* what the portal needs between its panes: the role, the toast, the task registry, checkout, the names the panes call */
  "agency-shell": () => import("@/features/agency/portalShell"),
  auth: () => import("./auth"),
  "cust-nav": () => import("./cust-nav"),
  "icon-morph": () => import("./icon-morph"),
  icons: () => import("./icons"),
  loader: () => import("./loader"),
  "map-tiles": () => import("./map-tiles"),
  "map/card": () => import("./map/card"),
  "map/query": () => import("./map/query"),
  "map/render": () => import("./map/render"),
  "map/style-synapse": () => import("./map/style-synapse"),
  "matches-shared": () => import("./matches-shared"),
  motion: () => import("./motion"),
  "ng-places": () => import("./ng-places"),
  notify: () => import("./notify"),
  scramble: () => import("./scramble"),
  stamp: () => import("./stamp"),
  syndication: () => import("./syndication"),
  zyn: () => import("./zyn"),
} satisfies Record<string, () => Promise<{ run: () => void }>>;
export type SharedName = keyof typeof SHARED;
