"use client";
/**
 * A right-hand drawer for the React parts of the portal. inline-3 fills the shared #drawer from about eleven innerHTML templates,
 * which React cannot share, so React content goes in this one beside it: same .drawer styles, same #scrim, and it closes whenever
 * inline-3's closeLead() runs (`syn:drawer-close`), so the two never stack.
 *
 *   showDrawer(<Something />)   opens it with that content (whatever the shared drawer held goes away)
 *   showDrawer(node, { bare })  the same, without the drawer's own close button, for content that draws its own in its header
 */
import { Fragment, type ReactNode, useEffect, useSyncExternalStore } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

let state: { open: boolean; node: ReactNode; turn: number; bare: boolean } = { open: false, node: null, turn: 0, bare: false };
const subs = new Set<() => void>();
const set = (v: Partial<typeof state>) => { state = { ...state, ...v }; subs.forEach((f) => f()); };
const useDrawer = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
const shut = () => W().closeLead?.();

export function showDrawer(node: ReactNode, o: { bare?: boolean } = {}) {
  shut();
  document.getElementById("scrim")?.classList.add("on");
  set({ open: true, node, turn: state.turn + 1, bare: !!o.bare });
}

export function SideDrawer() {
  const { open, node, turn, bare } = useDrawer();
  useEffect(() => {
    const close = () => set({ open: false });
    window.addEventListener("syn:drawer-close", close);
    return () => window.removeEventListener("syn:drawer-close", close);
  }, []);
  return (
    <aside className={"drawer" + (open ? " on" : "")} id="reactDrawer">
      {turn ? <>{bare ? null : <button className="x" aria-label="Close" onClick={shut}>{"×"}</button>}<Fragment key={turn}>{node}</Fragment></> : null}
    </aside>
  );
}
