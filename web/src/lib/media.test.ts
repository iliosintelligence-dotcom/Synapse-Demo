import { describe, expect, it } from "vitest";
import { seekToMiddle } from "./media";

describe("seekToMiddle", () => {
  const vid = (duration: number) => ({ duration, currentTime: 0.1 }) as unknown as HTMLVideoElement;
  it("jumps a thumbnail video to its middle frame", () => {
    const v = vid(53.8); seekToMiddle(v); expect(v.currentTime).toBeCloseTo(26.9);
  });
  it("keeps the first frame when the length is unknown or tiny", () => {
    for (const d of [NaN, Infinity, 0, 0.3]) { const v = vid(d); seekToMiddle(v); expect(v.currentTime).toBe(0.1); }
  });
});
