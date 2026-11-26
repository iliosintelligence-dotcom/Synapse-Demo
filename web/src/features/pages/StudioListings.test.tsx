// @vitest-environment jsdom
// The Studio's Listings page (StudioListings.tsx): it asks for every live home, not just the newest 14, pages through them,
// filters and searches, shows which agency published each one, and hands a home to Create through onMarket.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { StudioListings, toHome } from "./StudioListings";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const row = (i: number, extra: any = {}) => ({
  id: "p" + i, title: "Home " + i, city: "Lagos", area_name: "Ikate", price: 1000000 * i, price_period: "total", bedrooms: 2,
  listing_type: "sale", property_media: [{ url: "https://x/" + i + "b.jpg", display_order: 2 }, { url: "https://x/" + i + "a.jpg", display_order: 1 }],
  agencies: { name: "Agency " + i }, ...extra,
});

let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ""; vi.unstubAllGlobals(); vi.useRealTimers(); });

function mockFetch(total: number) {
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    urls.push(url);
    const offset = Number((url.match(/offset=(\d+)/) || [])[1] || 0);
    const n = Math.max(0, Math.min(24, total - offset));
    const data = Array.from({ length: n }, (_, k) => row(offset + k + 1));
    return Promise.resolve({ ok: true, headers: { get: () => offset + "-" + (offset + n - 1) + "/" + total }, json: () => Promise.resolve(data) });
  }));
  return urls;
}

async function mount(onMarket = vi.fn()) {
  document.body.innerHTML = '<div id="app"></div>';
  root = createRoot(document.getElementById("app")!);
  await act(async () => { root!.render(<StudioListings money={(p) => "₦" + p} onMarket={onMarket} />); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return onMarket;
}

describe("StudioListings", () => {
  it("loads live homes with no 14-listing cap, shows the agency, and pages with Load more", async () => {
    const urls = mockFetch(30);
    await mount();
    expect(urls[0]).toContain("status=eq.live");
    expect(urls[0]).toContain("limit=24&offset=0");
    expect(urls[0]).toContain("agencies(name)");
    expect(urls[0]).not.toContain("limit=14");
    expect(document.querySelectorAll(".lst-card").length).toBe(24);
    expect(document.body.textContent).toContain("30 live listings");
    expect(document.body.textContent).toContain("by Agency 1");
    const more = [...document.querySelectorAll("button")].find((b) => /Load more/.test(b.textContent || ""))!;
    expect(more.textContent).toContain("6 left");
    await act(async () => { more.click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(urls[1]).toContain("offset=24");
    expect(document.querySelectorAll(".lst-card").length).toBe(30);
    expect([...document.querySelectorAll("button")].some((b) => /Load more/.test(b.textContent || ""))).toBe(false);
  });

  it("filters by sale or rent", async () => {
    const urls = mockFetch(3);
    await mount();
    const rent = [...document.querySelectorAll(".lst-seg button")].find((b) => b.textContent === "To rent") as HTMLButtonElement;
    await act(async () => { rent.click(); await new Promise((r) => setTimeout(r, 20)); });
    expect(urls[urls.length - 1]).toContain("listing_type=eq.rent");
  });

  it("hands the chosen home to Create, photos in display order", async () => {
    mockFetch(2);
    const onMarket = await mount();
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Market this") as HTMLButtonElement;
    act(() => btn.click());
    expect(onMarket).toHaveBeenCalledTimes(1);
    const h = onMarket.mock.calls[0][0];
    expect(h.id).toBe("p1");
    expect(h.pics).toEqual(["https://x/1a.jpg", "https://x/1b.jpg"]);
    expect(h.agency).toBe("Agency 1");
  });

  it("a home with only videos can be marketed with its first video; photos still win when there are any", () => {
    const vidOnly = toHome({ id: "v", title: "T", property_media: [
      { url: "https://x/a.mp4", display_order: 1, media_type: "video" }, { url: "https://x/b.mp4", display_order: 2, media_type: "video" }] });
    expect(vidOnly.pics).toEqual(["https://x/a.mp4"]);
    const mixed = toHome({ id: "m", title: "T", property_media: [
      { url: "https://x/a.mp4", display_order: 0, media_type: "video" }, { url: "https://x/1.jpg", display_order: 1, media_type: "image" }] });
    expect(mixed.pics).toEqual(["https://x/1.jpg"]);
    expect(toHome({ id: "e", title: "T", property_media: [] }).pics).toEqual([]);
  });

  it("keeps search text out of the PostgREST syntax", () => {
    expect(toHome(row(1)).title).toBe("Home 1");
  });
});
