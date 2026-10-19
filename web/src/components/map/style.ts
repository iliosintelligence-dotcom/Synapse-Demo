import type { StyleSpecification } from "maplibre-gl";

/**
 * THE SYNAPSE MAP STYLE: "white matter". A near-white ground with the road network drawn as fine dark tracts, every colour
 * stripped out. We fetch Stadia's vector style and recolour it rather than hand-author one, so we inherit its layer order and zoom
 * ranges. Recolouring keys off the OpenMapTiles source-layer, which is stable across vendors, not off Stadia's layer ids.
 *
 * Stadia authenticates browsers by DOMAIN (register the site's domains in the Stadia dashboard); no key is needed in the browser.
 */
const STYLE_URL = "https://tiles.stadiamaps.com/styles/alidade_smooth.json";

const C = {
  paper: "#FCFCFB", tissue: "#F4F4F2", building: "#EFEFEC", vessel: "#E6E7E4",
  tractFar: "#B8B8B4", tract: "#8A8A86", tractMajor: "#3A3A38", rail: "#C9C9C5", boundary: "#D8D8D4",
  ink: "#141412", label: "#33332F", inkSoft: "#5E5E59", halo: "#FFFFFF",
};

type Layer = { id: string; type: string; "source-layer"?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };

function recolour(layer: Layer): Layer {
  const src = layer["source-layer"] ?? "";
  const id = layer.id ?? "";
  const paint: Record<string, unknown> = { ...(layer.paint ?? {}) };
  if (layer.type === "background") paint["background-color"] = C.paper;
  if (layer.type === "fill") {
    paint["fill-color"] = src === "water" || src === "waterway" ? C.vessel : src === "building" ? C.building : C.tissue;
    delete paint["fill-outline-color"];
  }
  if (layer.type === "line") {
    if (src === "waterway") paint["line-color"] = C.vessel;
    else if (src === "boundary") { paint["line-color"] = C.boundary; paint["line-dasharray"] = [2, 2]; }
    else if (/rail/.test(id)) paint["line-color"] = C.rail;
    else if (/motorway|trunk|highway_major/.test(id)) paint["line-color"] = C.tractMajor;
    else if (/primary|secondary/.test(id)) paint["line-color"] = C.tract;
    else paint["line-color"] = C.tractFar;
    if (/casing/.test(id)) paint["line-color"] = C.paper;
  }
  if (layer.type === "symbol") {
    paint["text-color"] = /^place[_-]/.test(id) ? C.ink : src === "water_name" || src === "waterway" ? C.inkSoft : C.label;
    paint["text-halo-color"] = C.halo;
    paint["text-halo-width"] = 1.7;
    paint["text-halo-blur"] = 0.3;
    delete paint["icon-color"];
  }
  return { ...layer, paint };
}

let cached: Promise<StyleSpecification> | null = null;

/** The recoloured style, fetched once per page load. Rejects if the style host cannot be reached (the caller shows a quiet fallback). */
export function loadSynapseStyle(): Promise<StyleSpecification> {
  cached ??= fetch(STYLE_URL)
    .then((r) => { if (!r.ok) throw new Error(`style ${r.status}`); return r.json(); })
    .then((style: StyleSpecification & { layers: Layer[] }) => ({ ...style, layers: style.layers.map(recolour) as unknown as StyleSpecification["layers"] }))
    .catch((e) => { cached = null; throw e; });
  return cached;
}
