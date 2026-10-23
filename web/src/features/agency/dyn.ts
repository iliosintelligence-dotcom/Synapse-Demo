/**
 * THE DYNAMIC BUTTON (idea: dqnamo's "Dynamic Button" in The Kitchen), for the React parts of the portal; inline-3's `Dyn` is the
 * same thing for the code still there. A button that says "Save", then "Saving...", then "Saved" used to swap its text in one
 * frame and jump in width. This changes the label with a short crossfade and glides the button from its old width to its new
 * one. Reduced motion: the text changes, nothing animates.
 *
 * The button it drives must have NO React children: the label is written here, as markup WE write (icons, "Saving..."), never
 * user text -- escape anything a person typed first.
 */
const reduce = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function glide(btn: HTMLElement | null, w0: number) {
  if (!btn || !btn.isConnected || reduce() || !(w0 > 0)) return;
  btn.style.transition = "none"; btn.style.width = "";
  const w1 = btn.getBoundingClientRect().width;
  if (Math.abs(w1 - w0) < 1.5) return;
  btn.style.width = w0 + "px"; btn.style.overflow = "hidden";
  void btn.offsetWidth;
  const done = () => { btn.style.transition = ""; btn.style.width = ""; btn.style.overflow = ""; btn.removeEventListener("transitionend", onEnd); };
  const onEnd = (e: TransitionEvent) => { if (e.target === btn && e.propertyName === "width") done(); };
  /* Start the glide on a frame that has actually been drawn, or a heavy re-render leaves the transition already over. */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!btn.isConnected) return;
    btn.style.transition = "width .3s cubic-bezier(.2,.8,.2,1)"; btn.style.width = w1 + "px";
    btn.addEventListener("transitionend", onEnd); setTimeout(done, 420);
  }));
  setTimeout(done, 1200);   /* never leave a button pinned to a width */
}

export function dynSet(btn: HTMLElement | null, html: string) {
  if (!btn || btn.dataset.dynHtml === html) return;
  const w0 = btn.getBoundingClientRect().width;
  btn.dataset.dynHtml = html;
  btn.innerHTML = '<span class="dyn-l">' + html + "</span>";
  glide(btn, w0);
}
