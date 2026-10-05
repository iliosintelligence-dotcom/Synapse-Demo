import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildProps } from '/props.js';

/* ─────────────────────────── renderer, environment ─────────────────────────── */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();

/* A studio of soft boxes: neutral room plus coloured panels, so the glass picks
   up blue and peach in its reflections the way the reference does. */
const envRoom = new RoomEnvironment();
function panel(w, h, color, intensity, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; envRoom.add(m);
}
panel(6, 10, 0x4f7dff, 9, -9, 3, 2, Math.PI / 2);
panel(6, 10, 0xff9f80, 4, 9, 3, 3, -Math.PI / 2);
panel(8, 4, 0xc9a8ff, 6, 0, -6, 4, 0);
panel(10, 3, 0xffffff, 9, 0, 10, 0, 0);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(envRoom, 0.02).texture;

const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0x7aa5ff, 1.3); fill.position.set(5, 1, 3); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd0b8, 1.4); rim.position.set(0, 3, -5); scene.add(rim);

const camera = new THREE.PerspectiveCamera(23, 1, 0.1, 100);
camera.position.set(0.32, 0.95, 13.2);
camera.lookAt(0.32, 0.9, 0);

/* ─────────────────────────────── materials ─────────────────────────────── */
const M = {
  pearl: new THREE.MeshPhysicalMaterial({
    color: 0xeaf1ff, metalness: 0, roughness: 0.14, transmission: 0.52, thickness: 1.5, ior: 1.45,
    attenuationColor: new THREE.Color(0xc2d4ff), attenuationDistance: 3,
    clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.9, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 620],
    sheen: 0.5, sheenColor: new THREE.Color(0xcfe0ff), sheenRoughness: 0.35, envMapIntensity: 1.35,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xcfe0ff, metalness: 0, roughness: 0.03, transmission: 0.96, thickness: 0.3, ior: 1.45,
    clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 700], envMapIntensity: 1.8,
  }),
  fin: new THREE.MeshPhysicalMaterial({
    color: 0xb9d0ff, metalness: 0, roughness: 0.02, transmission: 0.94, thickness: 0.7, ior: 1.5, side: THREE.DoubleSide,
    attenuationColor: new THREE.Color(0x6f95ff), attenuationDistance: 1.3, sheen: 0.6, sheenColor: new THREE.Color(0xffffff),
    clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 800], envMapIntensity: 3.2, specularIntensity: 1,
  }),
  visor: new THREE.MeshPhysicalMaterial({ color: 0x050a34, metalness: 0.1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, side: THREE.DoubleSide }),
  eye: new THREE.MeshBasicMaterial({ color: 0x8fcaff, toneMapped: false }),
};
const solid = (hex, rough = 0.18) => new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0, roughness: rough, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 });
M.blue = solid(0x3f64ec); M.royal = solid(0x2a44d4); M.orange = solid(0xff8a2d); M.green = solid(0x2fb67c);
M.coral = solid(0xff6b81); M.gold = solid(0xffc247); M.white = solid(0xffffff, 0.1); M.ink = solid(0x16206b, 0.12);
M.sky = solid(0xbfd3ff, 0.12);
M.hand = new THREE.MeshPhysicalMaterial({
  color: 0xf4f8ff, metalness: 0, roughness: 0.16, transmission: 0.12, thickness: 0.6, ior: 1.45,
  clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.7, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 560], sheen: 0.5, sheenColor: new THREE.Color(0xcfe0ff), envMapIntensity: 1.4,
});
M.glassBlue = new THREE.MeshPhysicalMaterial({
  color: 0xa9c4ff, metalness: 0, roughness: 0.03, transmission: 0.88, thickness: 0.5, ior: 1.5,
  attenuationColor: new THREE.Color(0x6f95ff), attenuationDistance: 1.0,
  clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.9, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 760], envMapIntensity: 2.4,
});
export { THREE, M, RoundedBoxGeometry };

/* ─────────────────────────────── helpers ─────────────────────────────── */
const K = 0.0135; // one pixel of the 2D sheet, in world units
const PROP_SCALE = 1.35;
export const P = (x, y) => new THREE.Vector3((x - 120) * K, (132 - y) * K, 0);

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,190,255,0.75)'); gr.addColorStop(0.35, 'rgba(110,170,255,0.32)'); gr.addColorStop(1, 'rgba(110,170,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(40,66,160,0.42)'); gr.addColorStop(0.6, 'rgba(40,66,160,0.16)'); gr.addColorStop(1, 'rgba(40,66,160,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture(), SHADOW = shadowTexture();

/* ─────────────────────────────── the body ─────────────────────────────── */
let PROFILE = null;
function bodyGeometry() {
  const pts = [[0, -1.16], [0.14, -1.14], [0.28, -1.05], [0.46, -0.86], [0.7, -0.58], [0.93, -0.22], [1.07, 0.18], [1.11, 0.58], [1.05, 0.98], [0.83, 1.3], [0.45, 1.5], [0, 1.56]];
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)));
  const prof = curve.getPoints(180).map((v) => new THREE.Vector2(Math.max(v.x, 0.0001), v.y));
  PROFILE = prof;
  return new THREE.LatheGeometry(prof, 144);
}
function radiusAt(y) {
  const a = PROFILE; let lo = 0, hi = a.length - 1;
  if (y <= a[0].y) return a[0].x; if (y >= a[hi].y) return a[hi].x;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].y <= y) lo = m; else hi = m; }
  const t = (y - a[lo].y) / (a[hi].y - a[lo].y); return a[lo].x + (a[hi].x - a[lo].x) * t;
}
const VIS = { cx: 0, cy: 0.5, rx: 0.86, ry: 0.5, off: 0.035 };
const zOn = (x, y) => Math.sqrt(Math.max(radiusAt(y) ** 2 - x * x, 0.01)) + VIS.off + 0.012;
function visorGeometry() {
  const rings = 26, seg = 72, n = 3.4, pos = [], idx = [];
  const q = (t) => { const c = Math.cos(t), s2 = Math.sin(t); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s2) * Math.pow(Math.abs(s2), 2 / n)]; };
  pos.push(0, VIS.cy, Math.sqrt(radiusAt(VIS.cy) ** 2) + VIS.off);
  for (let r = 1; r <= rings; r++) for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2, f = r / rings, [qx, qy] = q(t);
    const x = VIS.rx * f * qx, y = VIS.cy + VIS.ry * f * qy;
    const off = 0.012 + (VIS.off - 0.012) * (1 - Math.pow(f, 7));
    pos.push(x, y, Math.sqrt(Math.max(radiusAt(y) ** 2 - x * x, 0.01)) + off);
  }
  for (let i = 0; i < seg; i++) idx.push(0, 1 + (i + 1) % seg, 1 + i);
  for (let r = 1; r < rings; r++) for (let i = 0; i < seg; i++) {
    const a1 = 1 + (r - 1) * seg + i, a2 = 1 + (r - 1) * seg + (i + 1) % seg, b1 = 1 + r * seg + i, b2 = 1 + r * seg + (i + 1) % seg;
    idx.push(a1, a2, b1, a2, b2, b1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* an eye is drawn as glowing tubes laid on the visor's curved surface */
const surf = (x, y) => new THREE.Vector3(x, y, zOn(x, y));
function tubePath(pts2, closed, r, grp, mat) {
  const pts = pts2.map(([x, y]) => surf(x, y));
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
  const g = new THREE.TubeGeometry(curve, Math.max(24, pts.length * 6), r, 10, closed);
  const m = new THREE.Mesh(g, mat || M.eye); grp.add(m); return m;
}
function polyline(pts2, r, grp) {
  /* sharp corners: a short tube per segment and a ball at each joint */
  for (let i = 0; i < pts2.length - 1; i++) {
    const a = surf(...pts2[i]), b = surf(...pts2[i + 1]);
    const mid = a.clone().lerp(b, 0.5); mid.z = zOn(mid.x, mid.y);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, r, 10, false), M.eye));
  }
  for (const p of pts2) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M.eye); s.position.copy(surf(...p)); grp.add(s); }
}
function glow(x, y, size, grp) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, depthWrite: false, toneMapped: false }));
  m.position.copy(surf(x, y)); m.position.z += 0.03; grp.add(m);
}
const R = 0.047; // tube radius
function quad(p0, c, p2, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; o.push([a * p0[0] + b * c[0] + d * p2[0], a * p0[1] + b * c[1] + d * p2[1]]); } return o; }
function circlePts(cx, cy, r, n = 28) { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function heartShape(s) {
  const sh = new THREE.Shape(); sh.moveTo(0, -0.55 * s);
  sh.bezierCurveTo(-1.0 * s, 0.1 * s, -0.55 * s, 0.85 * s, 0, 0.4 * s);
  sh.bezierCurveTo(0.55 * s, 0.85 * s, 1.0 * s, 0.1 * s, 0, -0.55 * s); return sh;
}
export { heartShape };

/* eye descriptors: { t: type, s: size, dx, dy } placed at (side * 0.37 + dx, 0.52 + dy) */
function eye(grp, side, d) {
  const x0 = side * 0.38 + (d.dx || 0), y0 = 0.5 + (d.dy || 0), k = 0.0185, r = d.r || R;
  const rot = d.rot || 0, ex = d.sx || 1, ey = d.sy || 1, cr = Math.cos(rot), sr = Math.sin(rot);
  const P2 = (px, py) => { const qx = px * ex, qy = py * ey; return [x0 + (qx * cr - qy * sr) * k, y0 - (qx * sr + qy * cr) * k]; };
  switch (d.t) {
    case 'up': tubePath(quad(P2(-11, 5), P2(0, -9), P2(11, 5)), false, r, grp); break;
    case 'down': tubePath(quad(P2(-10, 0), P2(0, 8), P2(10, 0)), false, r, grp); break;
    case 'ring': { const rs = d.s || 9, pts = []; for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; pts.push(P2(Math.cos(a) * rs, Math.sin(a) * rs)); } tubePath(pts, true, r, grp); break; }
    case 'dash': polyline([P2(-10, 0), P2(10, 0)], r, grp); break;
    case 'caret': polyline([P2(-10, 6), P2(0, -6), P2(10, 6)], r, grp); break;
    case 'lt': polyline([P2(8, -9), P2(-7, 0), P2(8, 9)], r, grp); break;
    case 'dot': { const s = new THREE.Mesh(new THREE.SphereGeometry((d.s || 5) * k, 18, 12), M.eye); s.position.copy(surf(x0, y0)); s.scale.set(ex, ey, 0.5); grp.add(s); break; }
    case 'heart': {
      const g = new THREE.ExtrudeGeometry(heartShape(0.17), { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xff8aa0, toneMapped: false })); m.position.copy(surf(x0, y0)); m.position.z += 0.0; grp.add(m); break;
    }
  }
  glow(x0, y0, (d.glow || 0.85), grp);
}

/* ─────────────────────────────── the character ─────────────────────────────── */
function fin(side, lift, spread) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.2); sh.bezierCurveTo(0.3, 0.46, 0.7, 0.42, 0.92, 0.1); sh.bezierCurveTo(0.98, 0.0, 0.96, -0.12, 0.88, -0.28);
  sh.bezierCurveTo(0.66, -0.08, 0.34, -0.14, 0, -0.34); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 8, curveSegments: 60 });
  g.translate(0, 0, -0.025);
  const m = new THREE.Mesh(g, M.fin);
  const holder = new THREE.Group(); holder.add(m);
  holder.position.set(side * 0.9, -0.05, -0.02);
  holder.scale.set(side * 1.15, 1.15, 1.15);   // the left fin mirrors the right
  holder.rotation.z = side * -lift;            // lift: radians up from the resting droop
  holder.rotation.y = side * -spread;          // spread: swing outward toward the viewer's side
  return holder;
}

export function buildZyn(state) {
  const root = new THREE.Group();
  const pose = Object.assign({ tilt: 0, dy: 0, sx: 1, sy: 1, ant: 0, yaw: 0.14, pitch: 0 }, state.pose || {});
  const body = new THREE.Group(); root.add(body);

  const bg = bodyGeometry(); const shell = new THREE.Mesh(bg, M.pearl); body.add(shell);

  const visor = new THREE.Mesh(visorGeometry(), M.visor); body.add(visor);
  const face = new THREE.Group(); body.add(face);
  for (const e of state.eyes) eye(face, e.side, e);

  /* the crown: a stalk and a glass leaf */
  const ant = new THREE.Group(); ant.position.set(0.02, 1.56, 0); ant.rotation.z = -pose.ant * Math.PI / 180 * 0.8; body.add(ant);
  const stalk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.22, 0), new THREE.Vector3(0.16, 0.4, 0), new THREE.Vector3(0.4, 0.5, 0)]), 30, 0.032, 10, false), M.glass);
  ant.add(stalk);
  const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.bezierCurveTo(0.1, 0.3, 0.46, 0.46, 0.76, 0.28); ls.bezierCurveTo(0.62, -0.05, 0.28, -0.16, 0, 0);
  const lg = new THREE.ExtrudeGeometry(ls, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 30 });
  const leaf = new THREE.Mesh(lg, M.fin); leaf.position.set(0.38, 0.46, -0.02); leaf.rotation.z = 0.12; ant.add(leaf);

  /* a bigger lean, a nod, a turn: the body does the acting now */
  body.rotation.y = pose.yaw; body.rotation.z = -pose.tilt * Math.PI / 180; body.rotation.x = pose.pitch || 0;
  body.scale.set(pose.sx, pose.sy, pose.sx);
  root.position.y = -pose.dy * K * -1 * 1;     // dy in sheet pixels, negative = up
  root.position.y = -pose.dy * K;

  /* hands: floating glass mitts */
  const hs = Object.assign({ l: [44, 158], r: [196, 158] }, state.hands || {});
  const PS = PROP_SCALE;
  for (const [key, h] of [['l', hs.l], ['r', hs.r]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32), M.hand);
    const p = P(h[0], h[1]);
    const held = state.hands && state.hands[key] && state.props;      // a hand that holds a prop moves with it
    s.position.set(held ? p.x * PS : p.x, (held ? p.y * PS : p.y) + (-pose.dy * K), held ? 0.95 : 0.62); root.add(s);
  }

  /* the ground shadow shrinks as Zyn jumps */
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), new THREE.MeshBasicMaterial({ map: SHADOW, transparent: true, depthWrite: false, toneMapped: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, -1.3, 0.1); const ss = Math.max(0.55, 1 + pose.dy * 0.012); sh.scale.set(ss, ss, 1);
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.1), new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
  aura.position.set(0, -1.12 - pose.dy * K, -0.3);
  const world = new THREE.Group(); world.add(aura); world.add(root); world.add(sh);

  if (state.props) { const pg = new THREE.Group(); buildProps(state.props, pg, THREE, M, P); pg.scale.setScalar(PROP_SCALE); world.add(pg); }
  return world;
}

/* ─────────────────────────────── rendering with true alpha ─────────────────────────────── */
/* Rendered twice, on white and on black, in linear float; the difference gives each
   pixel's real opacity, so glass keeps its refraction over any background. */
export function renderState(state, size, ss = 2) {
  const W = size * ss;
  renderer.setSize(W, W, false);
  const rt = new THREE.WebGLRenderTarget(W, W, { type: THREE.FloatType, samples: 4 });
  const world = buildZyn(state); scene.add(world);
  const shot = (bg) => {
    scene.background = new THREE.Color(bg, bg, bg);
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const buf = new Float32Array(W * W * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, W, buf); return buf;
  };
  const cb = shot(0), cw = shot(1);
  scene.remove(world); rt.dispose();
  /* matte, downsample (premultiplied), encode */
  const out = new Uint8ClampedArray(size * size * 4);
  const enc = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
      const sy = (size - 1 - y) * ss + j, sx = x * ss + i; // GL rows are bottom-up
      const o = (sy * W + sx) * 4;
      const al = Math.min(1, Math.max(0, 1 - ((cw[o] - cb[o]) + (cw[o + 1] - cb[o + 1]) + (cw[o + 2] - cb[o + 2])) / 3));
      a += al; r += cb[o]; g += cb[o + 1]; b += cb[o + 2];
    }
    const n = ss * ss, o2 = (y * size + x) * 4; a /= n; r /= n; g /= n; b /= n;
    if (a < 0.002) { out[o2 + 3] = 0; continue; }
    out[o2] = enc(r / a); out[o2 + 1] = enc(g / a); out[o2 + 2] = enc(b / a); out[o2 + 3] = a * 255;
  }
  const c2 = document.createElement('canvas'); c2.width = c2.height = size;
  c2.getContext('2d').putImageData(new ImageData(out, size, size), 0, 0);
  return c2.toDataURL('image/png');
}

import { STATES } from '/states.js';
window.ZYN = { states: Object.keys(STATES), render: (id, size, ss) => renderState(STATES[id], size, ss) };
window.ZYN_READY = true;
