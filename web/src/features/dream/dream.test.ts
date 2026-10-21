import { describe, expect, it } from "vitest";
import { inferCat, mirrorOf, normalise, reduce, safeImageUrl, signalCounts, signalRead, starterBoard, tojuQuestion, type Board, type State } from "./boards";

const mine = (over: Partial<Board> = {}): Board => ({ id: "b1", name: "Mine", vibe: [], images: [], mode: "dream", ...over });
const st = (boards: Board[], activeId: string | null = "b1"): State => ({ boards, activeId });

describe("what Tayo reads", () => {
  it("never reads the starter board: it is inspiration we authored, not the visitor's taste", () => {
    expect(mirrorOf(starterBoard())).toBeNull();
    expect(mirrorOf(null)).toBeNull();
  });
  it("splits pins by category: areas are a location signal, housing a type signal, décor and palette aesthetic", () => {
    const m = mirrorOf(mine({ vibe: ["calm"], images: [
      { u: "https://a/1.jpg", c: "Lekki street", cat: "area" }, { u: "https://a/2.jpg", c: "Detached duplex", cat: "housing" },
      { u: "https://a/3.jpg", c: "Warm wood", cat: "decor" }, { u: "https://a/4.jpg", c: "Soft light", cat: "palette" },
    ] }))!;
    expect(m.areas).toEqual(["Lekki street"]);
    expect(m.housing).toEqual(["Detached duplex"]);
    expect(m.aesthetic).toEqual(["Warm wood", "Soft light"]);
    expect(m.vibe).toEqual(["calm"]);
  });
  it("keeping the starter makes it theirs, so Tayo may read it", () => {
    const next = reduce(st([starterBoard()].map((b) => ({ ...b, id: "b1" }))), { type: "keep" });
    expect(next.boards[0].starter).toBeUndefined();
    expect(mirrorOf(next.boards[0])).not.toBeNull();
  });
});

describe("categories", () => {
  it.each([["Modern facade", "housing"], ["Waterfront view", "area"], ["Soft light", "palette"], ["Poolside", "lifestyle"], ["Kitchen", "decor"]])("%s is %s", (caption, cat) => expect(inferCat(caption)).toBe(cat));
});

describe("normalise: old data is made safe, never thrown away", () => {
  it("offers the labelled starter when there is nothing, never a pre-filled board passed off as theirs", () => {
    const s = normalise(null, null);
    expect(s.boards).toHaveLength(1);
    expect(s.boards[0].starter).toBe(true);
    expect(s.boards[0].mode).toBe("mood");
  });
  it("migrates a legacy single mood board into the first board", () => {
    const s = normalise(null, { name: "Old", vibe: ["bright"], images: [{ u: "https://a/1.jpg", c: "Kitchen" }] });
    expect(s.boards[0].name).toBe("Old");
    expect(s.boards[0].images[0].cat).toBe("decor");
  });
  it("gives every board a mode and every pin a category", () => {
    const s = normalise({ boards: [{ id: "x", name: "n", vibe: [], images: [{ u: "https://a/1.jpg", c: "City skyline" }] }], activeId: null }, null);
    expect(s.boards[0].mode).toBe("dream");
    expect(s.boards[0].images[0].cat).toBe("area");
  });
});

describe("reduce", () => {
  it("creating a board opens it; the name falls back to 'New board'", () => {
    const s = reduce(st([], null), { type: "create", name: "  " });
    expect(s.boards[0].name).toBe("New board");
    expect(s.activeId).toBe(s.boards[0].id);
  });
  it("deleting the last board leaves an empty one rather than none", () => {
    const s = reduce(st([mine()]), { type: "delete" });
    expect(s.boards).toHaveLength(1);
    expect(s.boards[0].name).toBe("My dream home");
    expect(s.activeId).toBeNull();
  });
  it("pinning from the palette toggles", () => {
    const pin = { u: "https://a/1.jpg", c: "Kitchen", cat: "decor" as const };
    const on = reduce(st([mine()]), { type: "togglePalette", pin });
    expect(on.boards[0].images).toHaveLength(1);
    expect(reduce(on, { type: "togglePalette", pin }).boards[0].images).toHaveLength(0);
  });
  it("ignores an empty vibe and a board that does not exist", () => {
    expect(reduce(st([mine()]), { type: "addVibe", text: "  " }).boards[0].vibe).toEqual([]);
    expect(reduce(st([mine()]), { type: "open", id: "nope" }).activeId).toBe("b1");
  });
});

describe("signals are stated honestly: no score, only what the board holds", () => {
  it("counts style from décor, palette and vibes", () => {
    const n = signalCounts(mine({ vibe: ["calm"], images: [{ u: "u", c: "Warm wood", cat: "decor" }, { u: "v", c: "Soft light", cat: "palette" }, { u: "w", c: "Lekki street", cat: "area" }] }));
    expect(n).toEqual({ style: 3, area: 1, housing: 0, lifestyle: 0 });
  });
  it("says nothing is pinned, names a gap, and only says ready when every signal is clear", () => {
    expect(signalRead({ style: 0, area: 0, housing: 0, lifestyle: 0 }).kind).toBe("empty");
    expect(signalRead({ style: 4, area: 1, housing: 0, lifestyle: 0 }).kind).toBe("gap");
    expect(signalRead({ style: 4, area: 1, housing: 3, lifestyle: 3 }).kind).toBe("thin");
    expect(signalRead({ style: 3, area: 3, housing: 3, lifestyle: 3 }).kind).toBe("ready");
  });
});

describe("pins and the question to Tayo", () => {
  it("only plain http(s) images are pinned", () => {
    expect(safeImageUrl("https://a.com/x.jpg")).toBe("https://a.com/x.jpg");
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
    expect(safeImageUrl("data:text/html,x")).toBeNull();
    expect(safeImageUrl("not a url")).toBeNull();
  });
  it("asks Tayo from what the board holds", () => {
    expect(tojuQuestion(mine({ name: "Lekki", vibe: ["calm"], images: [{ u: "u", c: "Lekki street", cat: "area" }] }))).toBe('Find me verified homes that match my "Lekki" board, vibe: calm; areas that feel right: Lekki street.');
  });
});
