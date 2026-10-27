/* What the shared scripts in this folder put on window, and the slices of third-party globals they use. */
import type { Map as MapLibreMap } from "maplibre-gl";
declare global {
  /* map/style-synapse.ts: our look for Stadia's vector style, and the place badges */
  interface SynMapStyle {
    load: (styleName?: string) => Promise<{ layers?: { id?: string; type?: string }[] }>;
    addMarks: (map: MapLibreMap) => void;
    wireMissingMarks: (map: MapLibreMap | null) => void;
    COLOURS: Record<string, string>;
    MARKS: Record<string, string>;
  }
  /* map-tiles.ts: as much of Leaflet (window.L, loaded by the agency page) as the tile helper touches */
  interface SynLeafletLayer { on: (event: string, fn: () => void) => unknown; addTo: (map: SynLeafletMap) => SynLeafletLayer }
  interface SynLeafletMap {
    removeLayer: (layer: SynLeafletLayer) => void;
    getContainer: () => HTMLElement & { _synGestures?: boolean };
    dragging: { enable: () => void; disable: () => void };
    touchZoom?: { enable: () => void };
    attributionControl?: { _synCredit?: boolean; setPrefix: (p: string) => void; getContainer: () => HTMLElement | undefined };
  }
  interface SynTiles {
    KEY: string; STYLE: string; STYLE_DETAIL: string;
    add: (map: SynLeafletMap, opts?: { detail?: boolean }) => SynLeafletLayer | null;
    _gestures: (map: SynLeafletMap) => void; _gestureCss: () => void; _credit: (map: SynLeafletMap) => void;
    _osm: (map: SynLeafletMap) => SynLeafletLayer;
  }
  /* stamp.ts */
  interface SynStamp { html: (opts?: { land?: boolean }) => string }

  /* motion.ts: lottie-web (loaded on demand from cdnjs) */
  interface SynLottieAnim {
    setSpeed: (s: number) => void; play: () => void; pause: () => void; goToAndStop: (frame: number, isFrame: boolean) => void;
    addEventListener: (ev: string, fn: () => void) => void; totalFrames: number; isPaused: boolean;
  }
  interface SynLottie { loadAnimation: (o: { container: Element; renderer: string; loop: boolean; autoplay: boolean; path: string }) => SynLottieAnim }
  /* icons.ts */
  interface SynIcons {
    svg: (name: string, opts?: { cls?: string; size?: number | string }) => string;
    brand: (name: string, opts?: { cls?: string; size?: number }) => string;
    hydrate: (root?: ParentNode | null) => void;
    has: (n: string) => boolean;
    hasBrand: (n: string) => boolean;
  }
  /* loader.ts: the page-wide "one moment" overlay */
  interface SynLoader { show: (msg?: string) => void; hide: () => void; watchNavigation: () => void }

  /* icon-morph.ts: an icon's button, with the morph it drives once it has one */
  type SynMorphHost = HTMLElement & { __morph?: { morphTo: (node: unknown, spring: string) => void }; __morphName?: string; __icond?: boolean };
  interface SynMorph {
    morphTo: (host: SynMorphHost | null, name: string, spring?: string) => boolean;
    bindToggle: (host: SynMorphHost | null, restName: string, openName: string, opts?: { spring?: string }) => ((open: boolean) => void) | null;
  }
  /* ng-places.ts: Nigerian states, cities and areas for the listing form */
  interface SynPlaces {
    canonicalState: (raw: unknown) => string; STATES: string[]; citiesIn: (state: string) => string[];
    areasIn: (city: string, extra?: string[]) => string[]; allCities: () => string[]; stateOf: (city: string) => string;
  }
  /* scramble.ts: text that arrives as if being decoded */
  interface SynScrambleOpts { numbers?: boolean; duration?: number; done?: () => void }
  type SynScrambleTarget = HTMLElement & { __scr?: { raf: number; finish: () => void } | null };
  interface SynScramble {
    text: (el: SynScrambleTarget | null, finalText?: string | null, opts?: SynScrambleOpts) => void;
    value: (inp: (HTMLInputElement | HTMLTextAreaElement) & SynScrambleTarget | null, finalText: string, opts?: SynScrambleOpts) => void;
    numbers: (root: ParentNode | null, selector?: string) => void;
    finish: (el: SynScrambleTarget | null) => void;
  }

  /* zyn.ts: the mascot */
  type SynZynImg = HTMLImageElement & { __emoting?: boolean };
  interface SynZynReply {
    text?: string; matches?: { verificationStatus?: string }[]; searched?: { live?: number | string };
    priceHistory?: { rows?: unknown[] }; greeting?: boolean; failed?: boolean;
  }
  interface SynZyn {
    emote: (el: SynZynImg | null) => void;
    img: (state: string, px: number, o?: { alt?: string; still?: boolean; cls?: string }) => string;
    set: (el: SynZynImg | null, state: string, still?: boolean) => void;
    url: (state: string) => string;
    forReply: (r?: SynZynReply | null) => string;
    preload: (list?: string[]) => void;
    ids: string[];
  }

  /* map/query.ts: the homes in the visible box, and the "Search this area" pill */
  interface SynMapBounds { west: number; south: number; east: number; north: number }
  interface SynMapViewport extends SynMapBounds { zoom: number }
  interface SynMapFilters { listingType?: string; minPrice?: number | null; maxPrice?: number | null; minBeds?: number | null; verifiedOnly?: boolean; limit?: number }
  interface SynMapPin { id: string; lat: number; lng: number; price: string; beds: string; verified: boolean; title: string; loc: string; img: string }
  /* the part of map/render.ts's renderer the pill and the card use */
  interface SynMapRenderer {
    map: { getContainer: () => HTMLElement };
    viewport: () => SynMapViewport | null;
    onViewport: (fn: (vp: SynMapViewport) => void) => void;
  }
  /* map/card.ts: the card for the pin or cluster you pressed */
  interface SynMapCardRenderer extends SynMapRenderer {
    map: SynMapRenderer["map"] & {
      project: (lngLat: [number, number]) => { x: number; y: number };
      easeTo: (o: { center: [number, number]; offset: [number, number]; duration: number }) => void;
    };
    select: (id: string) => { props: { price?: string; title?: string; loc?: string; img?: string; beds?: string; verified?: boolean | string }; lng: number; lat: number } | null;
    clearSelection: () => void;
    onSelect: (fn: (id: string) => void) => void;
    onCluster: (fn: (ids: string[] | null) => void) => void;
  }
  interface SynMapCardOpts { href?: (id: string) => string; ask?: (id: string) => string; sb?: { url: string; anon: string } }
  interface SynMapCard {
    attach: (renderer: SynMapCardRenderer, host: HTMLElement, opts?: SynMapCardOpts) => { show: (id: string, how?: { moveCamera?: boolean }) => void; hide: () => void; el: HTMLDivElement };
  }
  interface SynMapQuery {
    inView: (bounds: SynMapBounds, filters?: SynMapFilters) => Promise<SynMapPin[]>;
    attachSearchArea: (renderer: SynMapRenderer, onResults: (rows: SynMapPin[], vp: SynMapViewport) => void, filters?: SynMapFilters) => { el: HTMLButtonElement };
    shape: (p: Record<string, unknown>) => SynMapPin;
    setConfig: (c: { url?: string; anon?: string } | null) => void;
  }

  interface Window {
    SynMapStyle?: SynMapStyle;
    SynMapCard?: SynMapCard;
    SynMapQuery?: SynMapQuery;
    /* Supabase settings a page may set as globals; map/query.ts prefers what setConfig is given */
    SUPABASE_URL?: string; SB_URL?: string; ANON_KEY?: string; SB_KEY?: string;
    Zyn?: SynZyn;
    SynMorph?: SynMorph;
    SynPlaces?: SynPlaces;
    Scramble?: SynScramble;
    lottie?: SynLottie;
    SynIcons?: SynIcons;
    SynLoader?: SynLoader;
    L?: { tileLayer: (url: string, o: Record<string, unknown>) => SynLeafletLayer };
    SynTiles?: SynTiles;
    SynStamp?: SynStamp;
  }
}
