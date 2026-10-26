// @vitest-environment jsdom
// src/head/native.ts: inside the app, a photo field offers the camera; everywhere else it does nothing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// The page gets it compiled by scripts/build-head.mjs; the same type-stripping here.
const src = ts.transpileModule(readFileSync(join(process.cwd(), "src/head/native.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext },
}).outputText;

// The script adds listeners to document each time it is run; the page runs it once, the tests run it many times, so take them off again.
const added: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = [];
const realAdd = document.addEventListener.bind(document);
document.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => { added.push([type, fn, o]); realAdd(type, fn, o); }) as typeof document.addEventListener;
afterEach(() => { added.splice(0).forEach(([type, fn, o]) => document.removeEventListener(type, fn, o)); });

// jsdom has no DataTransfer and only lets a real FileList be assigned to input.files; a phone's browser has both, so stand in for them.
class FakeDataTransfer {
  private list: File[] = [];
  items = { add: (f: File) => { this.list.push(f); } };
  get files() { return Object.assign([...this.list], { item: (i: number) => this.list[i] }); }
}
(globalThis as unknown as { DataTransfer: unknown }).DataTransfer = FakeDataTransfer;
Object.defineProperty(HTMLInputElement.prototype, "files", {
  configurable: true,
  get(this: HTMLInputElement & { __files?: unknown }) { return this.__files ?? Object.assign([], { item: () => null }); },
  set(this: HTMLInputElement & { __files?: unknown }, v: unknown) { this.__files = v; },
});

function load(opts: { native: boolean; getPhoto?: () => Promise<unknown>; plugins?: Record<string, unknown>; theme?: string }) {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  if (opts.theme) document.documentElement.setAttribute("data-theme", opts.theme); else document.documentElement.removeAttribute("data-theme");
  const w = window as unknown as { Capacitor?: unknown };
  w.Capacitor = opts.native
    ? { isNativePlatform: () => true, Plugins: { Camera: { getPhoto: opts.getPhoto ?? (() => Promise.resolve({})) }, ...(opts.plugins ?? {}) } }
    : undefined;
  new Function(src)(); // the script is a plain browser script: run it against this window
}
const field = (accept: string, attrs: Record<string, string> = {}) => {
  const i = document.createElement("input");
  i.type = "file"; i.setAttribute("accept", accept);
  Object.entries(attrs).forEach(([k, v]) => i.setAttribute(k, v));
  document.body.appendChild(i);
  return i;
};
const tap = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

beforeEach(() => { document.body.innerHTML = ""; });

describe("native.js", () => {
  it("does nothing in an ordinary browser", () => {
    load({ native: false });
    const f = field("image/*");
    expect(tap(f)).toBe(true); // the click was not cancelled: the browser opens its own picker
    expect(document.querySelector(".syn-pick")).toBeNull();
  });

  it("in the app, a photo field asks first: take a photo, or choose", () => {
    load({ native: true });
    const f = field("image/png,image/jpeg,image/webp");
    expect(tap(f)).toBe(false); // the plain picker is held back
    const sheet = document.querySelector(".syn-pick")!;
    expect(sheet.textContent).toContain("Take a photo");
    expect(sheet.textContent).toContain("Choose from your photos");
  });

  it("leaves fields that are not for photos alone", () => {
    load({ native: true });
    expect(tap(field(".csv,text/csv"))).toBe(true);
    expect(tap(field("image/*,video/*"))).toBe(true);
    expect(tap(field(""))).toBe(true);
    expect(document.querySelector(".syn-pick")).toBeNull();
  });

  it("'Choose from your photos' hands the click back to the normal field", () => {
    load({ native: true });
    const f = field("image/*");
    let opened = 0;
    f.addEventListener("click", (e) => { if (e.defaultPrevented === false) opened++; });
    tap(f); // intercepted
    (document.querySelector('button[data-do="library"]') as HTMLButtonElement).click();
    expect(document.querySelector(".syn-pick")).toBeNull();
    expect(opened).toBe(1); // the second click went through untouched
  });

  it("'Take a photo' opens the camera and puts the picture in the field as a file, then tells the page", async () => {
    const getPhoto = vi.fn(() => Promise.resolve({ base64String: PNG, format: "jpeg" }));
    load({ native: true, getPhoto });
    const f = field("image/*");
    const changed = vi.fn();
    f.addEventListener("change", changed);
    tap(f);
    (document.querySelector('button[data-do="camera"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    expect(getPhoto).toHaveBeenCalledWith(expect.objectContaining({ source: "CAMERA", resultType: "base64" }));
    expect(f.files!.length).toBe(1);
    expect(f.files![0].type).toBe("image/jpeg");
    expect(f.files![0].name).toMatch(/^photo-\d+\.jpg$/);
    expect(document.querySelector(".syn-pick")).toBeNull();
  });

  it("a field that asks for the camera outright skips the question", async () => {
    const getPhoto = vi.fn(() => Promise.resolve({ base64String: PNG, format: "jpeg" }));
    load({ native: true, getPhoto });
    tap(field("image/*", { capture: "environment" }));
    await vi.waitFor(() => expect(getPhoto).toHaveBeenCalled());
    expect(document.querySelector(".syn-pick")).toBeNull();
  });

  it("a cancelled camera changes nothing", async () => {
    load({ native: true, getPhoto: () => Promise.reject(new Error("User cancelled photos app")) });
    const f = field("image/*");
    const changed = vi.fn();
    f.addEventListener("change", changed);
    tap(f);
    (document.querySelector('button[data-do="camera"]') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 20));
    expect(changed).not.toHaveBeenCalled();
    expect(f.files!.length).toBe(0);
  });

  it("in the app the page keeps its bars below the camera cut-out; in a browser nothing changes", () => {
    load({ native: false });
    expect(document.documentElement.classList.contains("syn-app")).toBe(false);
    expect(document.head.querySelector("style")).toBeNull();
    load({ native: true });
    expect(document.documentElement.classList.contains("syn-app")).toBe(true);
    const css = document.head.querySelector("style")!.textContent!;
    expect(css).toContain("env(safe-area-inset-top");
    for (const sel of [".syn-app .nav", ".syn-app .appbar", ".syn-app .yd-wrap"]) expect(css).toContain(sel);
  });

  it("uses the insets the app measured (older WebViews report none), and falls back to the browser's own", () => {
    (window as unknown as { SynInsets?: unknown }).SynInsets = { top: () => 51, bottom: () => 24, left: () => 0, right: () => 0 };
    load({ native: true });
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--syn-native-top")).toBe("51px");
    expect(s.getPropertyValue("--syn-native-bottom")).toBe("24px");
    const css = document.head.querySelector("style")!.textContent!;
    expect(css).toContain("--syn-top:var(--syn-native-top,env(safe-area-inset-top,0px))");
    delete (window as unknown as { SynInsets?: unknown }).SynInsets;
    load({ native: true });
    expect(document.documentElement.style.getPropertyValue("--syn-native-top")).toBe("");
  });

  it("the status-bar icons follow the page: light icons on a dark page, dark icons on a light one, and again when the theme changes", async () => {
    const setStyle = vi.fn(() => Promise.resolve());
    load({ native: true, theme: "dark", plugins: { SystemBars: { setStyle } } });
    expect(setStyle).toHaveBeenLastCalledWith({ style: "DARK" });
    document.documentElement.setAttribute("data-theme", "light");
    await vi.waitFor(() => expect(setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" }));
  });

  it("a link to the site opens in the app; a link to anywhere else is ignored", () => {
    let handler: ((e: { url: string }) => void) | null = null;
    load({ native: true, plugins: { App: { addListener: (_n: string, fn: (e: { url: string }) => void) => { handler = fn; } } } });
    expect(handler).not.toBeNull();
    expect(() => handler!({ url: "https://evil.example/app/toju" })).not.toThrow();
    expect(() => handler!({ url: "not a url" })).not.toThrow();
  });
});
