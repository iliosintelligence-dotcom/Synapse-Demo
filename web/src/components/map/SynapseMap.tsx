"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadSynapseStyle } from "./style";
import s from "./SynapseMap.module.css";

export interface MapPin {
  id: string;
  lng: number;
  lat: number;
  /** Text inside the pin (a price, a distance); empty draws a plain dot. */
  label?: string;
  kind?: "home" | "place" | "listing";
  title?: string;
  href?: string;
  onClick?: () => void;
}

export interface ImageOverlay {
  id: string;
  url: string;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  opacity?: number;
}

interface Props {
  center: [number, number]; // lng, lat
  zoom?: number;
  pins: MapPin[];
  /** Fit the view around the pins instead of using center and zoom. */
  fit?: boolean;
  overlay?: ImageOverlay | null;
  className?: string;
  label?: string;
  /** Called with where the map was tapped. Used where a person places something (a listing's pin). */
  onMapClick?: (lng: number, lat: number) => void;
}

/**
 * The map. MapLibre is loaded only here, only in the browser, and only when a map is on screen. Pins are DOM markers so they stay
 * real links and buttons (keyboard and screen-reader reachable), not pixels on a canvas.
 */
export function SynapseMap({ center, zoom = 14, pins, fit = false, overlay = null, className, label = "Map", onMapClick }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // create once
  useEffect(() => {
    let dead = false;
    Promise.all([import("maplibre-gl"), loadSynapseStyle()])
      .then(([ml, style]) => {
        if (dead || !host.current) return;
        lib.current = ml;
        ml.setWorkerUrl(new URL("/maplibre/maplibre-gl-worker.mjs", window.location.origin).href);
        const map = new ml.Map({ container: host.current, style, center, zoom, attributionControl: { compact: true } });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => !dead && setReady(true));
        mapRef.current = map;
      })
      .catch(() => !dead && setFailed(true));
    return () => {
      dead = true;
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; later changes to pins and overlay are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // taps on the map itself
  const clickRef = useRef(onMapClick);
  useEffect(() => { clickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const h = (e: { lngLat: { lng: number; lat: number } }) => clickRef.current?.(e.lngLat.lng, e.lngLat.lat);
    map.on("click", h);
    return () => { map.off("click", h); };
  }, [ready]);

  // pins
  useEffect(() => {
    const map = mapRef.current;
    const ml = lib.current;
    if (!ready || !map || !ml) return;
    markers.current.forEach((m) => m.remove());
    markers.current = pins.map((p) => {
      const el = document.createElement(p.href ? "a" : "button");
      el.className = `${s.pin} ${p.kind === "home" ? s.home : p.kind === "listing" ? s.listing : s.place}`;
      el.textContent = p.label ?? "";
      if (p.title) el.setAttribute("aria-label", p.title);
      if (p.href) (el as HTMLAnchorElement).href = p.href;
      else el.setAttribute("type", "button");
      if (p.onClick) el.addEventListener("click", p.onClick);
      return new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    if (fit && pins.length) {
      const b = new ml.LngLatBounds();
      pins.forEach((p) => b.extend([p.lng, p.lat]));
      map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 0 });
    }
  }, [ready, pins, fit]);

  // image overlay (the flood map)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const id = overlay?.id;
    const clear = () => {
      for (const prev of map.getStyle().layers.filter((l) => l.id.startsWith("syn-overlay-"))) map.removeLayer(prev.id);
      for (const key of Object.keys(map.getStyle().sources).filter((k) => k.startsWith("syn-overlay-"))) map.removeSource(key);
    };
    clear();
    if (!overlay || !id) return;
    const [w, so, e, n] = overlay.bbox;
    map.addSource(`syn-overlay-${id}`, { type: "image", url: overlay.url, coordinates: [[w, n], [e, n], [e, so], [w, so]] });
    map.addLayer({ id: `syn-overlay-${id}`, type: "raster", source: `syn-overlay-${id}`, paint: { "raster-opacity": overlay.opacity ?? 0.95, "raster-resampling": "linear" } });
    return clear;
  }, [ready, overlay]);

  if (failed) return <div className={`${s.map} ${className ?? ""} ${s.failed}`}>The map could not load right now.</div>;
  return <div ref={host} className={`${s.map} ${className ?? ""}`} role="region" aria-label={label} />;
}
