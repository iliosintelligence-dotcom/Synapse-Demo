"use client";
/** The mobile bar needs a backdrop once the document scrolls under it (was the page's inline script). */
import { useEffect } from "react";

export function SolidBarOnScroll() {
  useEffect(() => {
    const bar = document.getElementById("mNavbar");
    if (!bar) return;
    const upd = () => bar.classList.toggle("solid", window.scrollY > 10);
    window.addEventListener("scroll", upd, { passive: true });
    upd();
    return () => window.removeEventListener("scroll", upd);
  }, []);
  return null;
}
