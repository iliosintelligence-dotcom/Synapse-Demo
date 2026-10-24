"use client";
import { useLayoutEffect, useRef } from "react";

/**
 * motion.js tags every .card with data-reveal (hidden until on screen) and adds .in once it has been seen, then stops watching
 * it. When a React card's class changes, React rewrites className and drops .in, and the card would stay invisible. Pass the
 * class string; put the returned ref on the card and .in comes back before the browser paints.
 */
export function useRevealed<T extends HTMLElement = HTMLDivElement>(cls: string) {
  const el = useRef<T>(null);
  useLayoutEffect(() => { if (el.current && el.current.hasAttribute("data-reveal")) el.current.classList.add("in"); }, [cls]);
  return el;
}
