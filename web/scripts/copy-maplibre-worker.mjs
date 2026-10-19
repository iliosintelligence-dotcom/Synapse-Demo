// MapLibre runs its tile work in a web worker. The bundler cannot find the worker file by itself, so it is copied to public/ and the
// map is told where it is (see src/components/map/SynapseMap.tsx). Runs before dev and build; the copies are not committed.
import { cpSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(`${from}/${f}`, `${to}/${f}`);
