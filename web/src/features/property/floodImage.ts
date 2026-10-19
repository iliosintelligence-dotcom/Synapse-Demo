import type { FloodGrid } from "./queries";

export const FLOOD_LEGEND = [
  { color: "#8CC8FF", text: "Under 0.5 m" },
  { color: "#4696EB", text: "0.5 to 1.5 m" },
  { color: "#1E64D7", text: "1.5 to 3 m" },
  { color: "#0C32A0", text: "Over 3 m" },
] as const;

/**
 * Draws the depth grid as a soft blue image to lay over the map. 90 m model cells drawn as hard squares look like blocks floating on
 * the map, so the grid is scaled up and blurred until water reads as water. Returns null when there is no water in the window.
 */
export function floodImage(g: FloodGrid): string | null {
  if (!g.depth_b64 || typeof document === "undefined") return null;
  const bin = atob(g.depth_b64);
  const cv = document.createElement("canvas");
  cv.width = g.cols;
  cv.height = g.rows;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  const im = cx.createImageData(g.cols, g.rows);
  let wet = 0;
  for (let i = 0; i < bin.length; i++) {
    const d = bin.charCodeAt(i) * 0.05;
    if (!d) continue;
    wet++;
    const c = d < 0.5 ? [140, 200, 255, 150] : d < 1.5 ? [70, 150, 235, 175] : d < 3 ? [30, 100, 215, 195] : [12, 50, 160, 215];
    im.data.set(c, i * 4);
  }
  if (!wet) return null;
  cx.putImageData(im, 0, 0);
  const big = document.createElement("canvas");
  big.width = g.cols * 4;
  big.height = g.rows * 4;
  const bx = big.getContext("2d");
  if (!bx) return null;
  bx.imageSmoothingEnabled = true;
  bx.filter = "blur(1.6px)";
  bx.drawImage(cv, 0, 0, big.width, big.height);
  return big.toDataURL("image/png");
}
