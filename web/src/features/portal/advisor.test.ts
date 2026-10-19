import { describe, expect, it } from "vitest";
import { PANE_NOTE, PANE_Q, STAGE_QS, boldParts, chipsFor, recent, stageOf } from "./data/advisor";

describe("advisor rules", () => {
  it("suggestions follow where the agency is", () => {
    expect(stageOf({ listings: 0, leads: 0, brandThin: true })).toBe("new");
    expect(stageOf({ listings: 0, leads: 0, brandThin: false })).toBe("no-listings");
    expect(stageOf({ listings: 3, leads: 0, brandThin: true })).toBe("no-leads");
    expect(stageOf({ listings: 3, leads: 9, brandThin: true })).toBe("running");
  });
  it("adds the question for the pane you are on, once", () => {
    const c = chipsFor("running", "tours");
    expect(c).toHaveLength(STAGE_QS.running.length + 1);
    expect(c[c.length - 1]).toBe(PANE_Q.tours);
  });
  it("every pane has a question and a note", () => {
    Object.keys(PANE_Q).forEach((p) => { expect(PANE_Q[p as keyof typeof PANE_Q]).toBeTruthy(); expect(PANE_NOTE[p as keyof typeof PANE_NOTE].title).toBeTruthy(); });
    expect(Object.keys(PANE_Q).sort()).toEqual(Object.keys(PANE_NOTE).sort());
  });
  it("sends only the last ten turns", () => {
    const h = Array.from({ length: 14 }, (_, i) => ({ role: "user" as const, content: String(i) }));
    expect(recent(h)).toHaveLength(10);
    expect(recent(h)[0].content).toBe("4");
  });
  it("renders **bold** only, and shows anything else as typed", () => {
    expect(boldParts("Do **this** now")).toEqual([{ t: "Do ", b: false }, { t: "this", b: true }, { t: " now", b: false }]);
    expect(boldParts("<script>x</script> ****")).toEqual([{ t: "<script>x</script> ****", b: false }]);
  });
});
