// @vitest-environment jsdom
// The portal's "Take over" button. The code lives inside the portal's big inline script, so this lifts exactly that block out of the
// file and runs it against a stand-in page, to prove what the button does: calls take_over_lead, shows the handover summary with
// the buyer's phone, email and handle, says honestly what happened to the WhatsApp, and never sends anything itself.
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src/legacy/agency/inline-3.js"), "utf8");
const from = src.indexOf("const TAKEN = new Set();");
const to = src.indexOf("function buildHandoffs(rows) {");
const block = src.slice(from, to);

type Handoff = { id: string; agentId: string | null; buyer: string };

function harness(rpc: (name: string, args: unknown) => Promise<{ data?: unknown; error?: { message: string } | null }>) {
  document.body.innerHTML = '<div id="drawer"></div><div id="scrim"></div><div id="toast"></div>';
  const drawer = document.getElementById("drawer")!;
  const scrim = document.getElementById("scrim")!;
  const toasts: string[] = [];
  const HANDOFFS: Handoff[] = [{ id: "lead-1", agentId: null, buyer: "Chinaza" }];
  const renders: number[] = [];
  const renderHandoffs = () => { renders.push(1); };
  const esc2 = (s: unknown) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const SynAuth = { ready: () => Promise.resolve({ id: "me-1" }), client: () => Promise.resolve({ rpc }) };
  const make = new Function("window", "document", "SynAuth", "HANDOFFS", "renderHandoffs", "toast", "esc2", "drawer", "scrim", "navigator",
    `${block}\nreturn { takeOver, openHandover, isTaken, TAKEN };`);
  const api = make({ SynAuth }, document, SynAuth, HANDOFFS, renderHandoffs, (m: string) => toasts.push(m), esc2, drawer, scrim, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
  return { api, drawer, scrim, toasts, HANDOFFS, renders };
}

const summary = {
  lead_id: "lead-1",
  buyer: { name: "Chinaza <Obi>", phone: "+2348031234567", email: "chinaza@example.com", handle: "@chinaza.homes" },
  listing: "Bodija Park 3-Bedroom Flat", listed: "₦52,000,000", agreed: "₦48,000,000",
  advice: "Hold at 48M, trade the deposit.", draft: "Hello, is it still available?", whatsapp: "queued",
};

describe("Take over", () => {
  it("calls take_over_lead for that lead and shows the summary: phone, email, handle, price, reasoning", async () => {
    const calls: Array<[string, unknown]> = [];
    const { api, drawer, scrim, HANDOFFS, renders } = harness(async (name, args) => { calls.push([name, args]); return { data: summary, error: null }; });
    const btn = document.createElement("button"); btn.textContent = "Take over →";
    api.takeOver(0, btn);
    await vi.waitFor(() => expect(drawer.innerHTML).toContain("Taken over"));
    expect(calls).toEqual([["take_over_lead", { p_lead_id: "lead-1" }]]);
    expect(drawer.textContent).toContain("+2348031234567");
    expect(drawer.textContent).toContain("chinaza@example.com");
    expect(drawer.textContent).toContain("@chinaza.homes");
    expect(drawer.textContent).toContain("₦48,000,000");
    expect(drawer.textContent).toContain("Hold at 48M");
    expect(drawer.innerHTML).toContain("tel:+2348031234567");
    expect(drawer.innerHTML).toContain("mailto:chinaza@example.com");
    expect(drawer.innerHTML).toContain("Chinaza &lt;Obi&gt;"); // buyer-supplied text is escaped
    expect(scrim.classList.contains("on") && drawer.classList.contains("on")).toBe(true);
    expect(api.isTaken(HANDOFFS[0])).toBe(true);
    expect(renders.length).toBeGreaterThan(0); // the card redraws as taken
  });

  it("says what happened to the WhatsApp, and never claims it was sent", async () => {
    for (const [state, words] of [["queued", "waits in the outbox"], ["no_phone", "no phone number on file"], ["failed", "could not be queued"], ["already_queued", "already queued"]] as const) {
      const { api, drawer } = harness(async () => ({ data: { ...summary, whatsapp: state }, error: null }));
      api.openHandover({ ...summary, whatsapp: state });
      expect(drawer.textContent).toContain(words);
      expect(drawer.textContent).not.toMatch(/\bwas sent\b|\bsent to your\b/);
    }
  });

  it("leaves out what the buyer has not given instead of inventing it", () => {
    const { api, drawer } = harness(async () => ({ data: null }));
    api.openHandover({ ...summary, buyer: { name: "Ada", phone: null, email: "ada@example.com", handle: null } });
    expect(drawer.textContent).toContain("ada@example.com");
    expect((drawer.textContent!.match(/Not given/g) || []).length).toBe(2);
  });

  it("puts the button back and says why when the take-over is refused", async () => {
    const { api, toasts, HANDOFFS } = harness(async () => ({ data: null, error: { message: "This lead is with a teammate. Ask an admin to reassign it to you." } }));
    const btn = document.createElement("button"); btn.textContent = "Take over →";
    api.takeOver(0, btn);
    await vi.waitFor(() => expect(toasts.length).toBe(1));
    expect(toasts[0]).toContain("teammate");
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe("Take over →");
    expect(api.isTaken(HANDOFFS[0])).toBe(false);
  });

  it("a lead that is already this agent's reads as taken", async () => {
    const { api } = harness(async () => ({ data: summary }));
    await new Promise((r) => setTimeout(r, 0)); // the signed-in id arrives
    expect(api.isTaken({ id: "x", agentId: "me-1", buyer: "B" })).toBe(true);
    expect(api.isTaken({ id: "y", agentId: "someone-else", buyer: "B" })).toBe(false);
  });
});
