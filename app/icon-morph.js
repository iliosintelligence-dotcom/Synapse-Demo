/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — icon morphing

   Bridges app/icons.js to morphicons (vendored, app/vendor/morphicons). Where
   an icon stands for a state that flips — a sheet open or shut — it now travels
   between the two shapes instead of being swapped out underneath you.

   Two mismatches to reconcile, and both are handled here so no caller has to
   think about them:

   1. icons.js stores an icon as inner-SVG markup ('<rect .../><rect .../>');
      morphicons wants Lucide-style [tag, attrs] data. Parsed with DOMParser
      rather than a regex, because the source of truth is real SVG and a parser
      cannot disagree with it.

   2. A morph drives ONE <path>'s `d`. Most of our icons are several elements
      (grid is four rects, pin is a path plus a circle). canonicalD flattens an
      icon to a single equivalent path, so the element it animates is a faithful
      redraw of the icon rather than a different-looking substitute.

   Loaded as a module. Everything degrades to an instant swap: no module, no
   morphicons, an unknown icon name, or reduced motion, and the icon still
   changes — it just does not travel.
   ─────────────────────────────────────────────────────────────────────────── */
import { createMorph, canonicalD } from './vendor/morphicons/dom.js';

const NODES = Object.create(null);

/* icons.js markup -> IconNode. SynIcons.svg() is the public accessor; PATHS
   itself is private, and going through svg() means this stays correct if the
   icon set changes shape. */
function iconNode(name) {
  if (NODES[name]) return NODES[name];
  if (!window.SynIcons || !SynIcons.has || !SynIcons.has(name)) return null;
  const doc = new DOMParser().parseFromString(SynIcons.svg(name), 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;
  const node = Array.from(doc.documentElement.children).map((el) => [
    el.tagName.toLowerCase(),
    Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value])),
  ]);
  return (NODES[name] = node.length ? node : null);
}

/* The <path> a morph drives, created once per host and reused. Collapsing the
   icon to a single path is what makes it drivable; the svg's own attributes
   (stroke, width, linecap) are untouched, so it keeps inheriting currentColor
   and its 1em sizing exactly as before. */
function drivable(host, name) {
  if (host.__morph) return host.__morph;
  const svg = host.querySelector('svg');
  const node = iconNode(name);
  if (!svg || !node) return null;
  const d = canonicalD(node);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.replaceChildren(path);
  host.__morph = createMorph(path, d, { reducedMotion: 'user' });
  host.__morphName = name;
  return host.__morph;
}

/* Morph `host` to `name`. Returns false when it could not (and the caller's
   fallback should swap the icon the old way). */
export function morphTo(host, name, spring) {
  if (!host) return false;
  const from = host.__morphName || host.getAttribute('data-icon');
  if (!from) return false;
  const m = drivable(host, from);
  const node = iconNode(name);
  if (!m || !node) return false;
  if (host.__morphName === name) return true;
  m.morphTo(node, spring || 'snappy');
  host.__morphName = name;
  host.setAttribute('data-icon', name);
  return true;
}

/* Bind a button whose icon reflects an open/closed state. `isOpen` is read on
   demand rather than tracked here, so the icon follows the real state even when
   something else closes the sheet — a scrim tap, Escape, a route change. */
export function bindToggle(host, restName, openName, opts) {
  if (!host) return null;
  const o = opts || {};
  const apply = (open) => {
    if (!morphTo(host, open ? openName : restName, o.spring)) {
      // no morph available: swap the icon outright, which is what used to happen
      host.__icond = false;
      host.setAttribute('data-icon', open ? openName : restName);
      if (window.SynIcons && SynIcons.hydrate) SynIcons.hydrate(host.parentNode || document);
    }
  };
  apply(false);
  return apply;
}

window.SynMorph = { morphTo, bindToggle };
