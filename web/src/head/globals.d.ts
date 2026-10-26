/* What the <head> scripts in this folder put on window, and the browser pieces the DOM types do not have yet. */
export {};
declare global {
  type SynMode = "light" | "dark";
  /* arrival.ts: the channel that first brought this visitor, kept for lead attribution */
  interface SynArrivalRecord { channel: string; post: string | null; at: string }
  /* seam.ts: where each screen was left, so coming back lands on the same card */
  interface SynSeamSpot { y: number; id: string | null; at: number }
  /* The Navigation API's activation on pageswap / pagereveal (cross-document view transitions); not in the DOM types yet. */
  interface SynNavActivation { entry?: { url: string | null } | null; from?: { url: string | null } | null }
  interface PageSwapEvent { activation?: SynNavActivation | null }
  interface PageRevealEvent { activation?: SynNavActivation | null }

  /* native.ts: what the Android app (Capacitor) puts on window, as much of it as the page uses */
  interface SynCapacitor {
    isNativePlatform?: () => boolean;
    Plugins?: {
      SystemBars?: { setStyle?: (o: { style: "DARK" | "LIGHT" }) => Promise<unknown> };
      App?: { addListener?: (event: "appUrlOpen", cb: (e: { url: string }) => void) => unknown };
      Camera?: { getPhoto: (o: Record<string, unknown>) => Promise<{ base64String?: string; format?: string } | null> };
    };
  }

  /* syndication-audit.ts: the part of src/shared/syndication.ts it drives, and the report it builds */
  interface SynSyndicateVariant { platform: string; angle?: string; angleName?: string; caption?: string; issues?: string[] }
  interface SynSyndicate {
    PLATFORMS: Record<string, unknown>;
    shape: (row: unknown) => { title: string };
    generate: (row: unknown, o: { platforms: string[] }) => { skipped?: { name: string; reason: string }[]; variants?: SynSyndicateVariant[] };
  }
  interface SynSyndicateAuditReport {
    ranAt: string; listings: number; platforms: string[]; totalVariants: number; clean: number; withIssues: number;
    byPlatform: Record<string, { variants: number; issues: number }>;
    byIssue: Record<string, number>;
    skippedAngles: { listing: string; angle: string; reason: string }[];
    failures: { listing: string; platform: string; angle: string | undefined; issues: string[]; captionLength: number }[];
  }

  /* brand.ts: the living logo. Flags it leaves on the elements it has handled. */
  interface SynBrandFlags { _still?: boolean; _bw?: boolean; _bm?: boolean }
  type SynBrandSvg = SVGSVGElement & SynBrandFlags;
  interface SynBrandOpts { white?: boolean; wait?: boolean; still?: boolean; host?: Element }

  /* swipe-nav.ts: the shared swipe helper the landing pages use */
  type SynSwipeDir = "left" | "right";
  interface SynSwipeHandlers {
    canGo?: (dir: SynSwipeDir) => boolean; onMove?: (dx: number, owned: boolean) => void; onCancel?: () => void;
    onCommit?: (dir: SynSwipeDir) => void; onFirstTouch?: () => void; onOwned?: () => void;
  }
  interface SynSwipeHint {
    t1?: ReturnType<typeof setTimeout>; t2?: ReturnType<typeof setTimeout>; t3?: ReturnType<typeof setTimeout>; t4?: ReturnType<typeof setTimeout>;
    tap?: () => void; strip?: HTMLElement | null;
  }
  interface SynSwipe {
    enabled: () => boolean; reducedMotion: () => boolean; attach: (el: HTMLElement | null, o: SynSwipeHandlers) => () => void;
    track: (name: string, params?: Record<string, unknown>) => void;
    hop: (surface: string, dir: string, from: string, to: string, method: string) => void;
    hintSeen: (surface: string) => boolean; markHintSeen: (surface: string) => void; lastKey: string;
  }

  interface Window {
    /* inline/landing-theme.ts: the first paint's theme on the landing pages */
    SynHome?: { byClock: () => SynMode; chosen: () => SynMode | null; choose: (t: SynMode | null) => void };
    /* Google Analytics, only once the cookie banner has been answered */
    gtag?: (...args: unknown[]) => void;
    SynSwipe?: SynSwipe;
    SynBrand?: {
      mark: (o?: SynBrandOpts) => SynBrandSvg; word: () => SVGSVGElement; spring: unknown;
      sparks: (x: number, y: number) => void; hop: (el: Element) => void;
    };
    SynSyndicate?: SynSyndicate;
    SynSyndicateAudit?: {
      run: (opts?: { platforms?: string[] }) => Promise<SynSyndicateAuditReport>;
      print: (r: SynSyndicateAuditReport) => string;
      allPlatforms: () => string[];
    };
    SynLoad?: {
      html: (kind: string, size?: string, label?: string) => string;
      line: (kind: string, text: string) => string;
      busy: (btn: HTMLButtonElement | null, kind?: string, text?: string) => () => void;
    };
    Capacitor?: SynCapacitor;
    /* set by the app's MainActivity before the page paints: the status bar and gesture bar sizes, in CSS px */
    SynInsets?: { top: () => number; bottom: () => number; left: () => number; right: () => number };
    SynArrival?: { channel: () => string; post: () => string | null; all: () => SynArrivalRecord | null };
    SynTheme?: { get: () => SynMode; set: (mode: SynMode) => void; byClock: () => SynMode };
    SynSeam?: { tagPhoto: (el: HTMLElement | null) => void; clear: () => void; remember: () => void };
    SynReact?: { ready: boolean };
  }
}
