// @vitest-environment jsdom
// The portal's "Take over" button (NegotiatorPane.tsx), rendered against a stand-in page, to prove what it does: calls
// take_over_lead, shows the handover summary with the buyer's phone, email and handle, says honestly what happened to the
// WhatsApp, and never sends anything itself.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NegotiatorPane } from "./NegotiatorPane";
import { SideDrawer } from "./SideDrawer";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const W = window as any;

type Rpc = (name: string, args: unknown) => Promise<{ data?: unknown; error?: { message: string } | null }>;
const handoff = (id: string, agentId: string | null, buyer = "Chinaza") => ({
  id, agentId, buyer, prop: "Bodija Park", source: "Tayo", price: "₦52M", agreed: "₦48M", rating: "High intent", rec: "", draft: "", signals: [],
});
const summary = {
  lead_id: "lead-1",
  buyer: { name: "Chinaza <Obi>", phone: "+2348031234567", email: "chinaza@example.com", handle: "@chinaza.homes" },
  listing: "Bodija Park 3-Bedroom Flat", listed: "₦52,000,000", agreed: "₦48,000,000",
  advice: "Hold at 48M, trade the deposit.", draft: "Hello, is it still available?", whatsapp: "queued",
};

let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ""; });

async function harness(rpc: Rpc, list = [handoff("lead-1", null)]) {
  document.body.innerHTML = '<div id="scrim"></div><div id="app"></div>';
  const toasts: string[] = [];
  const calls: Array<[string, unknown]> = [];
  W.toast = (m: string) => toasts.push(m);
  W.closeLead = () => { document.getElementById("scrim")!.classList.remove("on"); window.dispatchEvent(new Event("syn:drawer-close")); };
  W.SynHandoffs = () => list;
  W.SynAuth = { ready: () => Promise.resolve({ id: "me-1" }), client: () => Promise.resolve({ rpc: (n: string, a: unknown) => { calls.push([n, a]); return rpc(n, a); } }) };
  W.SynPageScriptsReady = true;
  root = createRoot(document.getElementById("app")!);
  await act(async () => { root!.render(<><NegotiatorPane /><SideDrawer /></>); });
  await act(async () => { window.dispatchEvent(new Event("syn:handoffs")); });
  const drawer = () => document.getElementById("reactDrawer")!;
  const button = (id = 0) => document.querySelectorAll<HTMLButtonElement>(".rp-actions .btn-primary")[id];
  const press = async (id = 0) => { await act(async () => { button(id).click(); }); await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
  return { toasts, calls, drawer, button, press };
}

describe("Take over", () => {
  it("calls take_over_lead for that lead and shows the summary: phone, email, handle, price, reasoning", async () => {
    const { calls, drawer, button, press } = await harness(async () => ({ data: summary, error: null }));
    expect(button().textContent).toBe("Take over →");
    await press();
    expect(calls).toEqual([["take_over_lead", { p_lead_id: "lead-1" }]]);
    const t = drawer().textContent!;
    expect(t).toContain("Taken over");
    expect(t).toContain("+2348031234567");
    expect(t).toContain("chinaza@example.com");
    expect(t).toContain("@chinaza.homes");
    expect(t).toContain("₦48,000,000");
    expect(t).toContain("Hold at 48M");
    expect(drawer().innerHTML).toContain("tel:+2348031234567");
    expect(drawer().innerHTML).toContain("mailto:chinaza@example.com");
    expect(drawer().innerHTML).toContain("Chinaza &lt;Obi&gt;"); // buyer-supplied text is escaped
    expect(document.getElementById("scrim")!.classList.contains("on") && drawer().classList.contains("on")).toBe(true);
    expect(button().textContent).toContain("Taken over"); // the card redraws as taken
  });

  it("says what happened to the WhatsApp, and never claims it was sent", async () => {
    for (const [state, words] of [["queued", "waits in the outbox"], ["no_phone", "no phone number on file"], ["failed", "could not be queued"], ["already_queued", "already queued"]] as const) {
      const { drawer, press } = await harness(async () => ({ data: { ...summary, whatsapp: state }, error: null }), [handoff("lead-" + state, null)]);
      await press();
      expect(drawer().textContent).toContain(words);
      expect(drawer().textContent).not.toMatch(/\bwas sent\b|\bsent to your\b/);
      act(() => root?.unmount()); root = null;
    }
  });

  it("leaves out what the buyer has not given instead of inventing it", async () => {
    const { drawer, press } = await harness(async () => ({ data: { ...summary, buyer: { name: "Ada", phone: null, email: "ada@example.com", handle: null } }, error: null }), [handoff("lead-ada", null)]);
    await press();
    expect(drawer().textContent).toContain("ada@example.com");
    expect((drawer().textContent!.match(/Not given/g) || []).length).toBe(2);
  });

  it("puts the button back and says why when the take-over is refused", async () => {
    const { toasts, button, press } = await harness(async () => ({ data: null, error: { message: "This lead is with a teammate. Ask an admin to reassign it to you." } }), [handoff("lead-refused", null)]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await press();
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toContain("teammate");
    expect(button().disabled).toBe(false);
    expect(button().textContent).toBe("Take over →");
  });

  it("a lead that is already this agent's reads as taken", async () => {
    const { button } = await harness(async () => ({ data: summary }), [handoff("x", "me-1", "B"), handoff("y", "someone-else", "C")]);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); // the signed-in id arrives
    expect(button(0).textContent).toContain("Taken over");
    expect(button(1).textContent).toBe("Take over →");
  });
});
