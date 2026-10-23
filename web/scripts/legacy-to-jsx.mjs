// Turns one page's protected markup (src/legacy/<key>/body.html) into real JSX (2026-10-24, the move to React, stage 2):
//
//   node scripts/legacy-to-jsx.mjs <key> <ComponentName> <out.tsx>
//
// The markup becomes a React component, element for element (the attribute, style and whitespace rules are port-legacy.mjs's,
// which tests/parity proved pixel for pixel). Inline <script> placeholders are reported, not converted: each page's behaviour is
// moved into React by hand. Run once per page; after that the .tsx is the source.
import { readFileSync, writeFileSync } from "node:fs";
import { parseFragment } from "parse5";

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


const [key, name, outPath] = process.argv.slice(2);
if (!key || !name || !outPath) { console.error("usage: node scripts/legacy-to-jsx.mjs <key> <ComponentName> <out.tsx>"); process.exit(2); }
const html = readFileSync(new URL(`../src/legacy/${key}/body.html`, import.meta.url), "utf8");
const scripts = [];
const frag = parseFragment(html);
const inliner = (ext, text) => { const m = text.match(/\/\*@(inline-\d+\.\w+)\*\//); scripts.push(m ? m[1] : "(inline " + ext + ")"); return m ? m[1] : "inline-x." + ext; };
let jsx = bodyToJsx(key, frag, inliner);
/* The page's scripts leave the markup: they run after hydration, in order (src/legacy/AfterHydration.tsx). */
const pageScripts = [];
const NL = String.fromCharCode(10);
jsx = jsx.split(NL).filter((line) => {
  const t = line.trim();
  if (!t.startsWith("<script ")) return true;
  const src = t.match(/ src=(?:"([^"]*)"|\{"([^"]*)"\})/);
  const file = t.match(/inline\([^,]+, "([^"]+)"\)/);
  const mod = / type="module"/.test(t);
  pageScripts.push(src ? `{ src: ${JSON.stringify(src[1] ?? src[2])}${mod ? ", module: true" : ""} }` : `{ code: inline(${JSON.stringify(key)}, ${JSON.stringify(file ? file[1] : "?")}) }`);
  return false;
}).join(NL);
if (jsUrls.length) console.error("javascript: URLs left as #syn-js-url-N placeholders; replace them by hand:", jsUrls);
const file = `/* eslint-disable */
// @ts-nocheck (attribute values are the original page's strings, e.g. aria-level="2")
// The ${key} page's markup as React (converted from src/legacy/${key}/body.html by scripts/legacy-to-jsx.mjs, then edited by hand).
// Its scripts run once React has taken the page over (AfterHydration), in their original order.
import { inline } from "@/legacy/read";
import { AfterHydration, type PageScript } from "@/legacy/AfterHydration";

const SCRIPTS: PageScript[] = [
${pageScripts.map((x) => "  " + x + ",").join(NL)}
];

export function ${name}() {
  return (
    <>
${jsx}
      <AfterHydration scripts={SCRIPTS} />
    </>
  );
}
`;
writeFileSync(outPath, file);
console.log("wrote " + outPath + "; scripts in the markup: " + (scripts.join(", ") || "none"));
