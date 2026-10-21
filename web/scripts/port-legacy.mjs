// Turns the original static pages into Next.js pages WITHOUT redrawing them.
//
//   node scripts/port-legacy.mjs              write every page below
//   node scripts/port-legacy.mjs toju buyers  write some (by key)
//   node scripts/port-legacy.mjs --check      say what would be written; change nothing
//
// For each page this writes, from the original HTML file:
//   src/app/(<key>)/layout.tsx           a root layout: the page's <html>, its <head> in the original order, and its <body> tag
//   src/app/(<key>)/<route>/page.tsx     the page's <body> content as JSX, element for element
//   src/legacy/<key>/inline-N.{js,css,json}   each inline <script>/<style> of the page, character for character
//
// Why this and not a redraw: the approved design is the original markup, CSS and scripts. A page redrawn by hand drifted from it; this one
// cannot, because the markup is the same, the stylesheets are the same files in the same order, and the scripts run at the same places in the
// same order. tests/parity proves it pixel for pixel. These pages are rendered to plain HTML by Next at build time and then shipped WITHOUT
// the React client runtime (scripts/strip-next-runtime.mjs): the page's own scripts build and change the page, so React must not hydrate it.
// Each page is its own ROOT layout, so going from one page to another is a full page load, exactly as on the static site.
//
// Run this once to migrate; after that the generated files ARE the source. Edit them directly (the page is page.tsx, its scripts are in
// src/legacy/<key>/). Re-running overwrites them, so do not re-run it over edits.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const repo = resolve(web, "..");

/** key → { src: original file (repo root), route: where Next builds it ("" is "/") } */
export const PAGES = {
  index: { src: "index.html", route: "" },
  buyers: { src: "buyers.html", route: "buyers" },
  privacy: { src: "privacy.html", route: "privacy" },
  terms: { src: "terms.html", route: "terms" },
  toju: { src: "app/toju.html", route: "app/toju" },
  browse: { src: "app/browse.html", route: "app/browse" },
  property: { src: "app/property.html", route: "app/property" },
  dream: { src: "app/dream.html", route: "app/dream" },
  signin: { src: "app/signin.html", route: "app/signin" },
  "agency-profile": { src: "app/agency-profile.html", route: "app/agency-profile" },
  agency: { src: "app/agency.html", route: "app/agency" },
  go: { src: "app/go.html", route: "app/go" },
  "your-data": { src: "app/your-data.html", route: "app/your-data" },
  synapse: { src: "app/synapse.html", route: "app/synapse" },
  "synapse-join": { src: "app/synapse-join.html", route: "app/synapse-join" },
  verify: { src: "app/verify.html", route: "app/verify" },
  "syndication-test": { src: "app/syndication-test.html", route: "app/syndication-test" },
};

// ── attribute names ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RENAME = {
  class: "className", for: "htmlFor", tabindex: "tabIndex", colspan: "colSpan", rowspan: "rowSpan", maxlength: "maxLength", minlength: "minLength",
  readonly: "readOnly", autocomplete: "autoComplete", autofocus: "autoFocus", autoplay: "autoPlay", playsinline: "playsInline", crossorigin: "crossOrigin",
  srcset: "srcSet", imagesizes: "imageSizes", imagesrcset: "imageSrcSet", fetchpriority: "fetchPriority", referrerpolicy: "referrerPolicy",
  hreflang: "hrefLang", nomodule: "noModule", novalidate: "noValidate", contenteditable: "contentEditable", spellcheck: "spellCheck",
  autocapitalize: "autoCapitalize", enterkeyhint: "enterKeyHint", inputmode: "inputMode", usemap: "useMap", datetime: "dateTime", itemprop: "itemProp",
  "http-equiv": "httpEquiv", "accept-charset": "acceptCharset", charset: "charSet", allowfullscreen: "allowFullScreen", formaction: "formAction",
  "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin", "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset", "stroke-miterlimit": "strokeMiterlimit", "stroke-opacity": "strokeOpacity", "fill-opacity": "fillOpacity",
  "fill-rule": "fillRule", "clip-rule": "clipRule", "clip-path": "clipPath", "stop-color": "stopColor", "stop-opacity": "stopOpacity",
  "text-anchor": "textAnchor", "font-size": "fontSize", "font-family": "fontFamily", "font-weight": "fontWeight", "letter-spacing": "letterSpacing",
  "dominant-baseline": "dominantBaseline", "alignment-baseline": "alignmentBaseline", "vector-effect": "vectorEffect", "paint-order": "paintOrder",
  "marker-start": "markerStart", "marker-mid": "markerMid", "marker-end": "markerEnd", "shape-rendering": "shapeRendering", "text-rendering": "textRendering",
  "color-interpolation-filters": "colorInterpolationFilters", "flood-color": "floodColor", "flood-opacity": "floodOpacity",
  "xlink:href": "xlinkHref", "xml:space": "xmlSpace", "xmlns:xlink": "xmlnsXlink", "stroke-linecap ": "strokeLinecap",
};
const BOOLEAN = new Set(["async", "defer", "nomodule", "hidden", "disabled", "required", "autofocus", "autoplay", "controls", "loop", "muted", "playsinline", "readonly", "multiple", "open", "novalidate", "inert", "selected", "allowfullscreen"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

// Elements whose neighbours' whitespace cannot show: it is dropped when it only separates these (or sits at the start or end of one).
const BLOCK = new Set(["address", "article", "aside", "blockquote", "body", "caption", "col", "colgroup", "dd", "details", "dialog", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "li", "link", "main", "meta", "nav", "noscript", "ol", "optgroup", "option", "p", "pre", "script", "section", "style", "summary", "table", "tbody", "td", "template", "tfoot", "th", "thead", "title", "tr", "ul", "br", "select", "button", "textarea"]);
const KEEP_SPACE_IN = new Set(["pre", "textarea", "listing", "plaintext", "xmp"]);

const SPECIAL_CHARS = new RegExp("[\u00a0\u1680\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff]", "g");
const lit = (s) => JSON.stringify(s).replace(SPECIAL_CHARS, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const attrLit = (s) => (new RegExp("^[^\"\\\n\r{}<>&\u0000-\u001f\u007f-\uffff]*$").test(s) ? '"' + s + '"' : "{" + lit(s) + "}");

function cssToObject(css) {
  const out = [];
  for (const decl of css.split(/;(?![^(]*\))/)) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith("--") ? prop : prop.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out.push(`${lit(key)}: ${lit(val)}`);
  }
  return `{{ ${out.join(", ")} }}`;
}

// React refuses to render a javascript: URL (it swaps in code that throws). The page keeps its own, so each is written as a numbered placeholder
// and put back after the build by scripts/strip-next-runtime.mjs, from src/legacy/<page>/javascript-urls.json.
let jsUrls = [];

function attrsToJsx(tag, attrs, skip = []) {
  const parts = [];
  for (const a of attrs) {
    if (skip.includes(a.name)) continue;
    let name = RENAME[a.name] ?? a.name;
    if (/^(href|src|action|formaction)$/.test(a.name) && /^\s*javascript:/i.test(a.value)) {
      jsUrls.push(a.value);
      parts.push(`${name}="#syn-js-url-${jsUrls.length - 1}"`);
      continue;
    }
    if (a.name === "style") { parts.push(`style=${cssToObject(a.value)}`); continue; }
    if (BOOLEAN.has(a.name) && (a.value === "" || a.value === a.name)) { parts.push(name); continue; }
    if (tag === "input" && a.name === "checked") { parts.push("defaultChecked"); continue; }
    if ((tag === "input" || tag === "textarea" || tag === "select") && a.name === "value") name = "defaultValue";
    parts.push(`${name}=${attrLit(a.value)}`);
  }
  return parts.join(" ");
}

const textOf = (n) => (n.childNodes || []).map((c) => (c.nodeName === "#text" ? c.value : "")).join("");
const tagOf = (n) => n.tagName || n.nodeName;
const isElement = (n) => n.nodeName !== "#text" && n.nodeName !== "#comment" && n.nodeName !== "#documentType";

// ── the page's <head> ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function viewportObject(content) {
  const o = {};
  for (const part of content.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (!k) continue;
    const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : x);
    if (k === "width") o.width = v;
    else if (k === "height") o.height = v;
    else if (k === "initial-scale") o.initialScale = num(v);
    else if (k === "minimum-scale") o.minimumScale = num(v);
    else if (k === "maximum-scale") o.maximumScale = num(v);
    else if (k === "user-scalable") o.userScalable = v === "yes" || v === "1" || v === "true";
    else if (k === "viewport-fit") o.viewportFit = v;
    else if (k === "interactive-widget") o.interactiveWidget = v;
  }
  return o;
}

function makeInliner(key, files) {
  let n = 0;
  return (ext, text) => {
    n += 1;
    const name = `inline-${n}.${ext}`;
    files.push([`src/legacy/${key}/${name}`, text]);
    return name;
  };
}

function headToJsx(key, head, inliner, warn) {
  const out = [];
  let viewport = null;
  for (const n of head.childNodes) {
    const tag = n.nodeName;
    if (tag === "#text" || tag === "#comment") continue;
    const get = (k) => n.attrs.find((a) => a.name === k)?.value;
    if (tag === "meta") {
      if (get("charset") != null) continue; // Next writes its own
      if (get("name") === "viewport") { viewport = viewportObject(get("content") || ""); continue; }
      out.push(`<meta ${attrsToJsx(tag, n.attrs)} />`);
    } else if (tag === "title") {
      out.push(`<title>{${lit(textOf(n))}}</title>`);
    } else if (tag === "link" || tag === "base") {
      out.push(`<${tag} ${attrsToJsx(tag, n.attrs)} />`);
    } else if (tag === "script") {
      if (get("src") != null) out.push(`<script ${attrsToJsx(tag, n.attrs)} />`);
      else {
        const ext = /json/.test(get("type") || "") ? "json" : "js";
        out.push(`<script ${attrsToJsx(tag, n.attrs)} dangerouslySetInnerHTML={{ __html: inline(${lit(key)}, ${lit(inliner(ext, textOf(n)))}) }} />`);
      }
    } else if (tag === "style") {
      out.push(`<style ${attrsToJsx(tag, n.attrs)} dangerouslySetInnerHTML={{ __html: inline(${lit(key)}, ${lit(inliner("css", textOf(n)))}) }} />`);
    } else {
      warn(`head element <${tag}> was not carried over`);
    }
  }
  return { jsx: out, viewport };
}

// ── the page's <body> ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function bodyToJsx(key, body, inliner) {
  const lines = [];
  const pad = (d) => "  ".repeat(d);

  function childrenOf(node, depth, preserve) {
    const kids = node.content ? node.content.childNodes : node.childNodes || [];
    const parentTag = tagOf(node);
    const parentBlock = BLOCK.has(parentTag);
    kids.forEach((c, i) => {
      if (c.nodeName === "#comment") return;
      if (c.nodeName === "#text") {
        const v = c.value;
        if (!v) return;
        if (!preserve && /^[\t\n\f\r ]+$/.test(v)) {
          // whitespace between things: dropped where it cannot show, kept as one space where it can
          let prev = null, next = null;
          for (let j = i - 1; j >= 0 && !prev; j--) if (kids[j].nodeName !== "#comment") prev = kids[j];
          for (let j = i + 1; j < kids.length && !next; j++) if (kids[j].nodeName !== "#comment") next = kids[j];
          const prevBlock = prev ? isElement(prev) && BLOCK.has(tagOf(prev)) : parentBlock;
          const nextBlock = next ? isElement(next) && BLOCK.has(tagOf(next)) : parentBlock;
          if (prevBlock || nextBlock) return;
          lines.push(`${pad(depth)}{" "}`);
          return;
        }
        const plain = !/[{}<>&\n\r]/.test(v) && !/^\s|\s$/.test(v) && !SPECIAL_CHARS.test(v);
        SPECIAL_CHARS.lastIndex = 0;
        lines.push(plain ? `${pad(depth)}${v}` : `${pad(depth)}{${lit(v)}}`);
        return;
      }
      element(c, depth, preserve);
    });
  }

  function element(n, depth, preserve) {
    const tag = tagOf(n);
    const keep = preserve || KEEP_SPACE_IN.has(tag);
    if (tag === "script") {
      if (n.attrs.some((a) => a.name === "src")) { lines.push(`${pad(depth)}<script ${attrsToJsx(tag, n.attrs)} />`); return; }
      const ext = /json/.test(n.attrs.find((a) => a.name === "type")?.value || "") ? "json" : "js";
      lines.push(`${pad(depth)}<script ${attrsToJsx(tag, n.attrs)} dangerouslySetInnerHTML={{ __html: inline(${lit(key)}, ${lit(inliner(ext, textOf(n)))}) }} />`);
      return;
    }
    if (tag === "style") {
      lines.push(`${pad(depth)}<style ${attrsToJsx(tag, n.attrs)} dangerouslySetInnerHTML={{ __html: inline(${lit(key)}, ${lit(inliner("css", textOf(n)))}) }} />`);
      return;
    }
    if (tag === "textarea") {
      const attrs = attrsToJsx(tag, n.attrs);
      const text = textOf(n).replace(/^\r?\n/, "");
      lines.push(`${pad(depth)}<textarea ${attrs}${text ? ` defaultValue={${lit(text)}}` : ""} />`);
      return;
    }
    if (tag === "select") {
      // React wants the chosen option on the <select> itself
      const opts = (n.childNodes || []).filter((c) => c.nodeName === "option");
      const chosen = opts.find((o) => o.attrs.some((a) => a.name === "selected"));
      const value = chosen ? (chosen.attrs.find((a) => a.name === "value")?.value ?? textOf(chosen)) : null;
      const attrs = attrsToJsx(tag, n.attrs, ["value"]);
      lines.push(`${pad(depth)}<select ${attrs}${value != null ? ` defaultValue=${attrLit(value)}` : ""}>`);
      childrenOf({ ...n, childNodes: n.childNodes.map((c) => (c.nodeName === "option" ? { ...c, attrs: c.attrs.filter((a) => a.name !== "selected") } : c)) }, depth + 1, false);
      lines.push(`${pad(depth)}</select>`);
      return;
    }
    const attrs = attrsToJsx(tag, n.attrs);
    const open = `<${tag}${attrs ? " " + attrs : ""}`;
    const kids = n.content ? n.content.childNodes : n.childNodes || [];
    if (VOID.has(tag) || kids.length === 0 && /^(path|circle|rect|line|polyline|polygon|ellipse|stop|use)$/.test(tag)) {
      lines.push(`${pad(depth)}${open} />`);
      return;
    }
    const meaningful = kids.filter((c) => c.nodeName !== "#comment");
    if (meaningful.length === 0) { lines.push(`${pad(depth)}${open}></${tag}>`); return; }
    lines.push(`${pad(depth)}${open}>`);
    childrenOf(n, depth + 1, keep);
    lines.push(`${pad(depth)}</${tag}>`);
  }

  childrenOf(body, 3, false);
  return lines.join("\n");
}

function convert(key, spec, { check }) {
  const warnings = [];
  const warn = (m) => warnings.push(`${key}: ${m}`);
  const source = readFileSync(join(repo, spec.src), "utf8");
  const doc = parse(source);
  const html = doc.childNodes.find((n) => n.nodeName === "html");
  const head = html.childNodes.find((n) => n.nodeName === "head");
  const body = html.childNodes.find((n) => n.nodeName === "body");

  const files = [];
  jsUrls = [];
  const inliner = makeInliner(key, files);
  const { jsx: headJsx, viewport } = headToJsx(key, head, inliner, warn);
  const bodyJsx = bodyToJsx(key, body, inliner);
  const htmlAttrs = attrsToJsx("html", html.attrs);
  const bodyAttrs = attrsToJsx("body", body.attrs);

  const layout = `/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from ${spec.src} by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's <head>.
// The page's <body> is page.tsx beside the route; its inline scripts and styles are in src/legacy/${key}/.
import type { Viewport } from "next";
import { inline } from "@/legacy/read";
${viewport ? `\nexport const viewport: Viewport = ${JSON.stringify(viewport)};\n` : ""}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html${htmlAttrs ? " " + htmlAttrs : ""}>
      <head>
        ${headJsx.join("\n        ")}
      </head>
      <body${bodyAttrs ? " " + bodyAttrs : ""}>{children}</body>
    </html>
  );
}
`;
  const page = `/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// GENERATED from ${spec.src} by scripts/port-legacy.mjs, then edited by hand: this file is now the source of the page's markup.
import { inline } from "@/legacy/read";

export default function Page() {
  return (
    <>
${bodyJsx}
    </>
  );
}
`;
  if (jsUrls.length) files.push([`src/legacy/${key}/javascript-urls.json`, JSON.stringify(jsUrls, null, 2) + "\n"]);
  files.push([`src/app/(${key})/layout.tsx`, layout]);
  files.push([`src/app/(${key})/${spec.route ? spec.route + "/" : ""}page.tsx`, page]);

  if (!check) {
    for (const [rel, text] of files) {
      const p = join(web, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
  }
  console.log(`${check ? "would write" : "wrote"} ${key.padEnd(18)} <- ${spec.src}  (${bodyJsx.split("\n").length} lines of JSX, ${headJsx.length} head elements, ${files.length - 2} inline files)`);
  warnings.forEach((w) => console.log(`  WARN ${w}`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const keys = args.filter((a) => !a.startsWith("--"));
  const todo = keys.length ? keys : Object.keys(PAGES);
  mkdirSync(join(web, "src/legacy"), { recursive: true });
  if (!check) {
    writeFileSync(join(web, "src/legacy/read.ts"), `import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The text of one inline <script> or <style> of a ported page (src/legacy/<page>/<file>), read at build time and written into the page as it was. */
export const inline = (page: string, file: string): string => readFileSync(join(process.cwd(), "src/legacy", page, file), "utf8");
`);
  }
  for (const k of todo) {
    if (!PAGES[k]) { console.error(`Unknown page "${k}". Known: ${Object.keys(PAGES).join(", ")}`); process.exit(2); }
    if (!existsSync(join(repo, PAGES[k].src))) { console.error(`Missing source ${PAGES[k].src}`); process.exit(2); }
    convert(k, PAGES[k], { check });
  }
}
