/**
 * Dream Home: mood boards, and the signal they send to Tayo. All of it is local: boards live on the device, and only the ACTIVE board
 * that the visitor actually curated is mirrored where Tayo reads it. Keys match the static site so boards carry across both pages.
 */

export type CatId = "housing" | "area" | "decor" | "lifestyle" | "palette";
export type ModeId = "dream" | "mood" | "vision";

export interface Pin { u: string; c: string; cat: CatId }
export interface Board {
  id: string;
  name: string;
  starter?: boolean;
  mode?: ModeId;
  vibe: string[];
  images: Pin[];
}
export interface State { boards: Board[]; activeId: string | null }

export const BOARDS_KEY = "synapse_dream_boards_v1"; // all boards
export const MIRROR_KEY = "synapse_moodboard_v1"; // the active board: what Tayo reads

export const CATS: Array<{ id: CatId; label: string; dot: string }> = [
  { id: "housing", label: "Housing", dot: "#121212" },
  { id: "area", label: "Areas", dot: "#3f9c6d" },
  { id: "decor", label: "Décor", dot: "#c98b3a" },
  { id: "lifestyle", label: "Lifestyle", dot: "#8a5cd6" },
  { id: "palette", label: "Palette", dot: "#2f6dbd" },
];
export const catOf = (id: string | undefined) => CATS.find((c) => c.id === id) ?? CATS[2];

/** A pin is tagged so Tayo reads it as the right signal: an Area pin is a location, Housing is a type, Décor and Palette are aesthetic. */
export function inferCat(caption: string): CatId {
  const c = String(caption || "").toLowerCase();
  if (/facade|duplex|penthouse|curb|exterior|villa|bungalow|maisonette|block|storey|building/.test(c)) return "housing";
  if (/lekki|ikoyi|island|ikeja|yaba|estate|street|waterfront|neighbourhood|\barea\b|gated|skyline|corridor|district/.test(c)) return "area";
  if (/palette|colou?r|texture|material|tone|marble|wood|light|airy|minimal/.test(c)) return "palette";
  if (/pool|gym|garden|terrace|lounge|workspace|balcony|patio|rooftop|bar|spa/.test(c)) return "lifestyle";
  return "decor";
}

export const MODES: Array<{ id: ModeId; label: string; hint: string; hintUnadopted?: string }> = [
  { id: "dream", label: "Dream", hint: "Your concrete wishlist: homes and must-haves. This is what Tayo matches you to.", hintUnadopted: "Your concrete wishlist: homes and must-haves. Keep this board and Tayo starts matching you to it." },
  { id: "mood", label: "Mood", hint: "The feeling: palettes, textures and interior vibe." },
  { id: "vision", label: "Vision", hint: "The whole outcome: home, neighbourhood and lifestyle you're aiming for." },
];

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=500&q=70`;

/** Inspiration to pin from, by category. */
export const PALETTE: Pin[] = [
  { u: U("1616486338812-3dadae4b4ace"), c: "Modern facade", cat: "housing" },
  { u: U("1512917774080-9991f1c4c750"), c: "Detached duplex", cat: "housing" },
  { u: U("1600596542815-ffad4c1539a9"), c: "Terrace houses", cat: "housing" },
  { u: U("1470071459604-3b5ec3a7fe05"), c: "Leafy estate street", cat: "area" },
  { u: U("1502005229762-cf1b2da7c5d6"), c: "Waterfront view", cat: "area" },
  { u: U("1477959858617-67f85cf4f1df"), c: "City skyline", cat: "area" },
  { u: U("1600585154340-be6161a56a0c"), c: "Open plan", cat: "decor" },
  { u: U("1600210492486-724fe5c67fb0"), c: "Quiet bedroom", cat: "decor" },
  { u: U("1600121848594-d8644e57abab"), c: "Kitchen", cat: "decor" },
  { u: U("1493809842364-78817add7ffb"), c: "Living room", cat: "decor" },
  { u: U("1524758631624-e2822e304c36"), c: "Lounge", cat: "lifestyle" },
  { u: U("1585128792020-803d29415281"), c: "Terrace view", cat: "lifestyle" },
  { u: U("1580587771525-78b9dba3b914"), c: "Poolside", cat: "lifestyle" },
  { u: U("1600607687939-ce8a6c25118c"), c: "Warm minimal", cat: "palette" },
  { u: U("1600566753086-00f18fb6b3ea"), c: "Soft light", cat: "palette" },
  { u: U("1502672260266-1c1ef2d93688"), c: "Bright & airy", cat: "palette" },
];

/**
 * The starter board is INSPIRATION content, never listings. Guardrail: nothing here may look like inventory (no prices, no addresses, no
 * verification chips, no agency names). A starter board never mirrors to Tayo (that would be a signal the visitor did not send); it only
 * becomes theirs via "Keep this board".
 */
const STARTER_PINS: Pin[] = [
  { u: U("1556911220-bff31c812dba"), c: "Warm wood, stone counters", cat: "decor" },
  { u: U("1565538810643-b5bdb714032a"), c: "An island for slow Sunday cooking", cat: "decor" },
  { u: U("1588854337221-4cf9fa96059c"), c: "Deep green cabinetry", cat: "decor" },
  { u: U("1556909212-d5b604d0c90d"), c: "White and timber, kept simple", cat: "decor" },
  { u: U("1600121848594-d8644e57abab"), c: "Clean lines, open shelves", cat: "decor" },
  { u: U("1600566753086-00f18fb6b3ea"), c: "Soft morning light", cat: "palette" },
  { u: U("1600607687939-ce8a6c25118c"), c: "Warm minimal", cat: "palette" },
  { u: U("1502672260266-1c1ef2d93688"), c: "Bright and airy", cat: "palette" },
];

export const newId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const starterBoard = (): Board => ({ id: newId(), name: "Lagos kitchens we love", starter: true, vibe: [], images: STARTER_PINS.map((p) => ({ ...p })) });

/** Only plain http(s) images are ever pinned. */
export function safeImageUrl(raw: string): string | null {
  try {
    const u = new URL(String(raw).trim());
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

/** Boards as stored, made safe to use: a legacy single mood board becomes the first board (else the labelled starter, never a pre-filled board passed off as theirs); every board gets a mode and every pin a category. */
export function normalise(raw: unknown, legacy: unknown): State {
  let state = raw as State | null;
  if (!state || !Array.isArray(state.boards)) {
    const l = legacy as { name?: string; vibe?: string[]; images?: Pin[] } | null;
    const first: Board = l && (l.images || l.vibe) ? { id: newId(), name: l.name || "My dream home", vibe: l.vibe ?? [], images: l.images ?? [] } : starterBoard();
    state = { boards: [first], activeId: null };
  }
  state.boards.forEach((b) => {
    b.vibe = Array.isArray(b.vibe) ? b.vibe : [];
    b.images = Array.isArray(b.images) ? b.images : [];
    // a starter board does not mirror to Tayo until adopted, so it is Mood (what it actually is), not "your concrete wishlist"
    if (!b.mode) b.mode = b.starter ? "mood" : "dream";
    b.images.forEach((im) => { if (!im.cat) im.cat = inferCat(im.c); });
  });
  return state;
}

/** The shape Tayo reads, split by category. Null for a starter board: it is inspiration we authored, not the visitor's taste. */
export function mirrorOf(b: Board | null) {
  if (!b || b.starter) return null;
  const capsOf = (id: CatId) => b.images.filter((im) => (im.cat || "decor") === id).map((im) => im.c).filter(Boolean);
  return { name: b.name, mode: b.mode || "dream", vibe: b.vibe, images: b.images, areas: capsOf("area"), housing: capsOf("housing"), lifestyle: capsOf("lifestyle"), aesthetic: capsOf("decor").concat(capsOf("palette")) };
}

/** What the board says, honestly. No score, no percentage: there is no scoring model, so only the signals the board holds are surfaced, and which are thin. */
export const SIGNALS = [
  { id: "style", label: "style", tip: "pin an interior or a palette you love" },
  { id: "area", label: "areas", tip: "pin a street, skyline or neighbourhood that feels right" },
  { id: "housing", label: "housing", tip: "pin the kind of building you see yourself in" },
  { id: "lifestyle", label: "lifestyle", tip: "pin how you want to live: a pool, a terrace, a workspace" },
] as const;
export type SignalId = (typeof SIGNALS)[number]["id"];

export function signalCounts(b: Board): Record<SignalId, number> {
  const n: Record<SignalId, number> = { style: 0, area: 0, housing: 0, lifestyle: 0 };
  b.images.forEach((im) => {
    const c = im.cat || "decor";
    if (c === "decor" || c === "palette") n.style++;
    else n[c]++;
  });
  n.style += b.vibe.length;
  return n;
}
export const signalWord = (n: number) => (n === 0 ? "nothing yet" : n < 3 ? "starting to show" : "coming through clearly");

/** One honest guidance line: the strongest signal against the thinnest one. */
export function signalRead(n: Record<SignalId, number>): { kind: "empty" | "gap" | "thin" | "ready"; strong?: string; weak?: string; tip?: string; many?: boolean } {
  const total = SIGNALS.reduce((t, s) => t + n[s.id], 0);
  if (total === 0) return { kind: "empty" };
  const sorted = [...SIGNALS].sort((a, c) => n[c.id] - n[a.id]);
  const strong = sorted[0], weak = sorted[sorted.length - 1];
  if (n[weak.id] === 0) return { kind: "gap", strong: strong.label, weak: weak.label, tip: weak.tip, many: n[strong.id] >= 3 };
  if (n[weak.id] < 3) return { kind: "thin", weak: weak.label, tip: weak.tip };
  return { kind: "ready" };
}

/** The question "Find my matches" asks Tayo, from what the board holds. */
export function tojuQuestion(b: Board): string {
  const caps = (id: CatId) => b.images.filter((im) => (im.cat || "decor") === id).map((im) => im.c).filter(Boolean);
  const parts: string[] = [];
  if (b.vibe.length) parts.push(`vibe: ${b.vibe.join(", ")}`);
  if (caps("housing").length) parts.push(`home type: ${caps("housing").join(", ")}`);
  if (caps("area").length) parts.push(`areas that feel right: ${caps("area").join(", ")}`);
  return `Find me verified homes that match my "${b.name || "dream"}" board${parts.length ? `, ${parts.join("; ")}` : ""}.`;
}

/* ── the reducer: every change to the boards, in one place ───────────────────── */

export type Action =
  | { type: "create"; name: string }
  | { type: "open"; id: string }
  | { type: "home" }
  | { type: "rename"; name: string }
  | { type: "delete" }
  | { type: "mode"; mode: ModeId }
  | { type: "keep" }
  | { type: "addVibe"; text: string }
  | { type: "removeVibe"; index: number }
  | { type: "pin"; pin: Pin }
  | { type: "unpin"; index: number }
  | { type: "togglePalette"; pin: Pin };

export function reduce(state: State, a: Action): State {
  const active = state.boards.find((b) => b.id === state.activeId);
  const edit = (fn: (b: Board) => Board): State => (active ? { ...state, boards: state.boards.map((b) => (b.id === active.id ? fn(b) : b)) } : state);
  switch (a.type) {
    case "create": {
      const b: Board = { id: newId(), name: a.name.trim() || "New board", vibe: [], images: [], mode: "dream" };
      return { boards: [...state.boards, b], activeId: b.id };
    }
    case "open": return state.boards.some((b) => b.id === a.id) ? { ...state, activeId: a.id } : state;
    case "home": return { ...state, activeId: null };
    case "rename": return edit((b) => ({ ...b, name: a.name }));
    case "delete": {
      const boards = state.boards.filter((b) => b.id !== state.activeId);
      return { boards: boards.length ? boards : [{ id: newId(), name: "My dream home", vibe: [], images: [], mode: "dream" }], activeId: null };
    }
    case "mode": return edit((b) => ({ ...b, mode: a.mode }));
    case "keep": return edit((b) => { const { starter, ...rest } = b; void starter; return rest; }); // now it is theirs: Tayo may read it
    case "addVibe": return a.text.trim() ? edit((b) => ({ ...b, vibe: [...b.vibe, a.text.trim()] })) : state;
    case "removeVibe": return edit((b) => ({ ...b, vibe: b.vibe.filter((_, i) => i !== a.index) }));
    case "pin": return edit((b) => ({ ...b, images: [...b.images, a.pin] }));
    case "unpin": return edit((b) => ({ ...b, images: b.images.filter((_, i) => i !== a.index) }));
    case "togglePalette":
      return edit((b) => (b.images.some((i) => i.u === a.pin.u) ? { ...b, images: b.images.filter((i) => i.u !== a.pin.u) } : { ...b, images: [...b.images, a.pin] }));
  }
}

/* ── the device ──────────────────────────────────────────────────────────────── */

export function load(): State {
  const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
  return normalise(read(BOARDS_KEY), read(MIRROR_KEY));
}

/** Persists the boards, and keeps the mirror (what Tayo reads) in step with the active board. A starter board leaves the mirror untouched: it still holds the last board the visitor actually curated. */
export function persist(state: State): void {
  try {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(state));
    const m = mirrorOf(state.boards.find((b) => b.id === state.activeId) ?? null);
    if (m) localStorage.setItem(MIRROR_KEY, JSON.stringify(m));
  } catch { /* not kept this time */ }
}
/** A deleted board must stop informing Tayo: the mirror is cleared until another board is opened. */
export const clearMirror = () => { try { localStorage.removeItem(MIRROR_KEY); } catch { /* nothing to clear */ } };

export const savedCount = (): number => {
  try { const v = JSON.parse(localStorage.getItem("synapse_saved") ?? "[]"); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
};
