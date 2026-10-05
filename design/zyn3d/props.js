/* Props are built in world units. P(x, y) turns a point from the 2D sheet into the
   3D scene, so each prop sits where it sat on the flat drawing. */
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildProps(name, g, THREE, M, P) {
  const px = (n) => n * 0.0135;
  const V = (x, y, z = 0) => { const p = P(x, y); return new THREE.Vector3(p.x, p.y, z); };
  const add = (mesh, x, y, z = 0.7) => { const p = P(x, y); mesh.position.set(p.x, p.y, z); g.add(mesh); return mesh; };
  const sphere = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat);
  const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(px(w), px(h), px(d), 5, px(r)), mat);
  const GL = M.glassBlue || M.glass;

  /* a tube through 2D sheet points */
  const tubeAt = (pts, r, mat, z = 0.78, closed = false) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, z)), closed, 'catmullrom', 0.5), 48, px(r), 12, closed), mat); g.add(m); return m;
  };
  /* a polyline with sharp corners and round joints */
  const polyAt = (pts, r, mat, z = 0.8) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const c = new THREE.LineCurve3(V(...pts[i], z), V(...pts[i + 1], z));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 2, px(r), 12, false), mat));
    }
    for (const p of pts) { const s = sphere(px(r), mat); s.position.copy(V(p[0], p[1], z)); g.add(s); }
  };
  /* an extruded outline given in sheet coordinates */
  const shapeAt = (cmds, depth, mat, bev = 0.035, z = 0.72) => {
    const s = new THREE.Shape();
    for (const c of cmds) {
      const [t, ...a] = c; const w = (i) => { const p = P(a[i], a[i + 1]); return [p.x, p.y]; };
      if (t === 'm') s.moveTo(...w(0)); else if (t === 'l') s.lineTo(...w(0));
      else if (t === 'b') s.bezierCurveTo(...w(0), ...w(2), ...w(4)); else if (t === 'q') s.quadraticCurveTo(...w(0), ...w(2));
    }
    s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: px(depth), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 5, curveSegments: 28 }), mat);
    m.position.z = z; g.add(m); return m;
  };
  const star = (r, mat) => {
    const s = new THREE.Shape(); const ro = r, ri = r * 0.26;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? ri : ro, x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    s.closePath(); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), mat);
    m.geometry.translate(0, 0, -0.02); return m;
  };
  const heart = (sc, mat) => {
    const h = new THREE.Shape(); h.moveTo(0, -0.55 * sc); h.bezierCurveTo(-1 * sc, 0.1 * sc, -0.55 * sc, 0.85 * sc, 0, 0.4 * sc); h.bezierCurveTo(0.55 * sc, 0.85 * sc, 1 * sc, 0.1 * sc, 0, -0.55 * sc);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(h, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3 }), mat); m.geometry.translate(0, 0, -0.03); return m;
  };
  const spark = (x, y, r, z = 0.82) => add(star(px(r), M.white), x, y, z);
  const checkAt = (cx, cy, s, mat = M.white) => polyAt([[cx - 6 * s, cy], [cx - 1.5 * s, cy + 4.5 * s], [cx + 6.5 * s, cy - 5 * s]], 1.6 * s, mat, 0.92);
  const badge = (x, y) => { add(sphere(px(11), M.green), x, y, 0.85); checkAt(x, y, 1); };
  const cyl = (rt, rb, h, mat) => new THREE.Mesh(new THREE.CylinderGeometry(px(rt), px(rb), px(h), 28), mat);

  switch (name) {
    /* ── feelings ── */
    case 'twinkle': spark(200, 94, 8); spark(216, 78, 5); break;
    case 'twinkle3': spark(204, 56, 10); spark(224, 88, 6); spark(30, 70, 7); break;
    case 'sparkleHeart': spark(204, 52, 9); add(heart(px(8), M.coral), 210, 88, 0.82); break;
    case 'hearts': add(heart(px(12), M.coral), 204, 62, 0.82); add(heart(px(8), M.coral), 222, 90, 0.82); add(heart(px(9), M.coral), 30, 92, 0.82); break;
    case 'bang': add(rbox(8, 30, 8, 4, M.orange), 210, 45, 0.82); add(sphere(px(5), M.orange), 210, 76, 0.82); break;
    case 'thought':
      add(sphere(px(4), M.glass), 184, 76, 0.8); add(sphere(px(6), M.glass), 196, 60, 0.8); add(sphere(px(10), M.glass), 212, 38, 0.8); break;
    case 'burst':
      polyAt([[52, 52], [40, 44]], 2, M.blue); polyAt([[60, 40], [54, 28]], 2, M.blue); polyAt([[188, 40], [196, 28]], 2, M.blue); polyAt([[196, 54], [208, 46]], 2, M.blue);
      spark(212, 92, 8); spark(30, 104, 7); break;
    case 'zzz': polyAt([[186, 56], [200, 56], [186, 72], [200, 72]], 2, M.blue); polyAt([[206, 36], [216, 36], [206, 48], [216, 48]], 1.6, M.blue); break;
    case 'question':
      tubeAt([[196, 54], [198, 44], [206, 39], [213, 45], [212, 55], [204, 62], [204, 70]], 3, M.blue, 0.8); add(sphere(px(4), M.blue), 204, 83, 0.8); break;
    case 'drop': { const b = sphere(px(9), M.glass); add(b, 207, 56, 0.8); const c = new THREE.Mesh(new THREE.ConeGeometry(px(8.2), px(16), 28), M.glass); add(c, 207, 44, 0.8); break; }

    /* ── actions ── */
    case 'magnifier': {
      const lens = cyl(20, 20, 4, M.glass); lens.rotation.x = Math.PI / 2; add(lens, 200, 62, 0.75);
      add(new THREE.Mesh(new THREE.TorusGeometry(px(20), px(3.6), 20, 64), M.blue), 200, 62, 0.75);
      const h = cyl(4.8, 4.8, 36, M.blue); h.rotation.z = Math.PI / 4; add(h, 220, 84, 0.72); break;
    }
    case 'waves':
      for (const [x, h] of [[184, 16], [196, 40], [208, 60], [220, 32]]) add(rbox(7, h, 7, 3.5, M.blue), x, 98, 0.8);
      tubeAt([[36, 80], [28, 98], [36, 116]], 2, M.sky, 0.6); break;
    case 'bubble':
      add(rbox(58, 34, 10, 17, GL), 201, 47, 0.78); add(sphere(px(4), M.blue), 188, 47, 0.9); add(sphere(px(4), M.blue), 201, 47, 0.9); add(sphere(px(4), M.blue), 214, 47, 0.9);
      { const t = new THREE.Mesh(new THREE.ConeGeometry(px(7), px(13), 24), GL); t.rotation.z = Math.PI * 0.8; add(t, 186, 68, 0.78); } break;
    case 'calculator':
      add(rbox(46, 62, 10, 9, GL), 199, 61, 0.76); add(rbox(34, 14, 6, 3, M.ink), 199, 43, 0.88);
      for (const [x, y, m] of [[188, 62, M.blue], [199, 62, M.blue], [210, 62, M.blue], [188, 76, M.blue], [199, 76, M.blue], [210, 76, M.orange]]) add(sphere(px(4.6), m), x, y, 0.88); break;
    case 'cards': {
      const a = rbox(36, 48, 8, 7, GL); a.rotation.z = 0.14; add(a, 188, 58, 0.72);
      polyAt([[180, 50], [196, 52]], 1.5, M.blue, 0.8); polyAt([[180, 60], [192, 62]], 1.5, M.blue, 0.8);
      const b = rbox(36, 48, 8, 7, GL); b.rotation.z = -0.1; add(b, 212, 78, 0.82);
      polyAt([[202, 82], [212, 72], [222, 82]], 2.2, M.blue, 0.92); add(rbox(14, 10, 4, 2, M.blue), 212, 87, 0.92); break;
    }
    case 'pin': {
      add(sphere(px(18), M.blue), 206, 48, 0.78);
      const c = new THREE.Mesh(new THREE.ConeGeometry(px(16), px(30), 32), M.blue); c.rotation.z = Math.PI; add(c, 206, 66, 0.78);
      add(sphere(px(6.4), M.white), 206, 48, 0.9);
      for (const [x, y] of [[172, 106], [180, 112], [190, 115], [200, 114], [210, 118], [219, 126]]) add(sphere(px(2.6), M.blue), x, y, 0.7); break;
    }
    case 'wave':
      tubeAt([[178, 84], [192, 80], [196, 64]], 2, M.blue, 0.78); tubeAt([[184, 98], [206, 92], [212, 68]], 2, M.blue, 0.78); tubeAt([[192, 112], [222, 102], [228, 72]], 2, M.sky, 0.78); spark(214, 40, 8); break;
    case 'spinner':
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(px(16), px(3.4), 14, 36, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x3f64ec, roughness: 0.2, clearcoat: 1, transparent: true, opacity: [1, 0.55, 0.3][i] }));
        m.rotation.z = -i * Math.PI / 2 + Math.PI / 4; add(m, 204, 60, 0.8);
      } break;
    case 'calendar':
      add(rbox(52, 50, 8, 9, GL), 198, 55, 0.74); add(rbox(52, 14, 9, 7, M.blue), 198, 37, 0.76);
      add(cyl(2, 2, 12, M.ink), 186, 30, 0.82); add(cyl(2, 2, 12, M.ink), 210, 30, 0.82);
      for (const [x, y] of [[185, 58], [211, 58], [185, 72], [198, 72], [211, 72]]) add(rbox(10, 8, 4, 2, M.sky), x, y, 0.84);
      add(rbox(14, 12, 5, 3, M.orange), 198, 58, 0.86); break;
    case 'phone':
      add(rbox(38, 64, 9, 10, GL), 203, 60, 0.76); add(rbox(28, 44, 4, 5, M.sky), 203, 58, 0.84);
      add(sphere(px(7), M.blue), 203, 52, 0.9); { const s = sphere(px(11), M.blue); s.scale.set(1, 0.55, 0.5); add(s, 203, 74, 0.9); }
      tubeAt([[228, 48], [234, 60], [228, 72]], 2, M.blue, 0.7); break;
    case 'confetti':
      for (const [x, y, c, r] of [[44, 50, M.orange, 0.5], [196, 70, M.blue, -0.4], [32, 100, M.gold, 0.9], [150, 20, M.coral, 0.3], [226, 62, M.gold, -0.7]]) { const b = rbox(8, 8, 3, 1.5, c); b.rotation.z = r; add(b, x, y, 0.8); }
      for (const [x, y, c] of [[30, 72, M.blue], [204, 46, M.orange], [216, 98, M.coral], [60, 24, M.gold], [236, 40, M.blue]]) add(sphere(px(3.8), c), x, y, 0.8);
      tubeAt([[60, 36], [70, 20], [82, 30]], 1.8, M.orange, 0.8); tubeAt([[180, 28], [192, 16], [204, 26]], 1.8, M.blue, 0.8); break;
    case 'bookmark':
      shapeAt([['m', 186, 28], ['l', 225, 28], ['l', 225, 91], ['l', 205.5, 77], ['l', 186, 91]], 6, M.blue, 0.03, 0.74);
      { const h = heart(px(7), M.white); add(h, 205, 52, 0.96); } break;

    /* ── what a reply carries ── */
    case 'house':
      polyAt([[172, 70], [204, 40], [236, 70]], 3.6, M.blue, 0.8); add(rbox(48, 32, 12, 4, GL), 204, 84, 0.76); add(rbox(12, 20, 5, 3, M.blue), 204, 90, 0.88); badge(228, 46); break;
    case 'tag':
      shapeAt([['m', 176, 38], ['l', 210, 38], ['l', 234, 64], ['l', 234, 72], ['l', 210, 98], ['l', 176, 98], ['l', 170, 92], ['l', 170, 44]], 7, GL, 0.04, 0.74);
      add(sphere(px(4), M.blue), 184, 50, 0.92);
      polyAt([[196, 82], [196, 56], [214, 82], [214, 56]], 2.2, M.ink, 0.9); polyAt([[191, 64], [219, 64]], 1.7, M.ink, 0.9); polyAt([[191, 74], [219, 74]], 1.7, M.ink, 0.9); break;
    case 'shield':
      shapeAt([['m', 204, 30], ['l', 232, 40], ['l', 232, 68], ['b', 232, 88, 220, 98, 204, 104], ['b', 188, 98, 176, 88, 176, 68], ['l', 176, 40]], 7, M.blue, 0.04, 0.74);
      polyAt([[192, 68], [201, 77], [218, 58]], 3, M.white, 0.96); break;
    case 'skyline':
      add(rbox(18, 42, 12, 3, GL), 183, 83, 0.74); add(rbox(22, 62, 12, 3, GL), 205, 73, 0.76); add(rbox(16, 46, 12, 3, GL), 226, 81, 0.74);
      for (const [x, y] of [[183, 73], [183, 85], [205, 53], [205, 65], [205, 77], [226, 71]]) add(rbox(7, 6, 4, 1.5, M.blue), x, y, 0.88);
      spark(226, 36, 8); break;
    case 'document':
      shapeAt([['m', 178, 30], ['l', 210, 30], ['l', 226, 46], ['l', 226, 101], ['l', 173, 101], ['l', 173, 35]], 6, GL, 0.035, 0.74);
      polyAt([[210, 30], [210, 46], [226, 46]], 1.4, M.blue, 0.9); polyAt([[184, 62], [214, 62]], 1.6, M.blue, 0.9); polyAt([[184, 72], [206, 72]], 1.6, M.blue, 0.9); badge(224, 92); break;
    case 'offer':
      add(rbox(44, 30, 8, 15, GL), 192, 47, 0.74); polyAt([[184, 54], [184, 40], [196, 54], [196, 40]], 1.5, M.ink, 0.88);
      add(rbox(44, 30, 8, 15, M.blue), 216, 77, 0.82); polyAt([[216, 68], [216, 84]], 1.8, M.white, 0.96); polyAt([[209, 78], [216, 85], [223, 78]], 1.8, M.white, 0.96); break;
    case 'key': {
      add(new THREE.Mesh(new THREE.TorusGeometry(px(13), px(3.6), 20, 48), M.orange), 192, 60, 0.8);
      polyAt([[200, 68], [230, 98]], 3.4, M.orange, 0.8); polyAt([[220, 88], [212, 96]], 3, M.orange, 0.8); polyAt([[227, 95], [220, 102]], 3, M.orange, 0.8); spark(224, 48, 8); break;
    }
    case 'warning':
      shapeAt([['m', 204, 30], ['l', 236, 86], ['l', 172, 86]], 7, M.orange, 0.06, 0.74);
      add(rbox(5, 20, 4, 2.4, M.white), 204, 66, 0.96); add(sphere(px(3), M.white), 204, 77, 0.96); break;
    case 'emptybox':
      add(rbox(52, 30, 12, 4, GL), 200, 87, 0.74); polyAt([[174, 72], [186, 56], [214, 56], [226, 72]], 2.4, M.blue, 0.8); tubeAt([[194, 86], [200, 80], [206, 86]], 1.4, M.blue, 0.9); break;
    case 'bell': {
      const prof = [[0, 0.0], [0.1, 0.02], [0.26, 0.1], [0.36, 0.3], [0.4, 0.55], [0.46, 0.68], [0.6, 0.74], [0.6, 0.8], [0, 0.8]];
      const pts = prof.map(([r, y]) => new THREE.Vector2(px(54) * r, px(52) * (1 - y) - px(26)));
      const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.blue); add(bell, 204, 57, 0.78);
      add(sphere(px(6), M.royal), 204, 86, 0.78); add(sphere(px(3), M.royal), 204, 29, 0.78); tubeAt([[168, 50], [162, 62], [168, 74]], 2, M.sky, 0.7); spark(230, 44, 7); break;
    }
    case 'people':
      add(sphere(px(9), M.blue), 186, 50, 0.8); { const b = sphere(px(16), M.blue); b.scale.set(1, 0.62, 0.6); add(b, 186, 70, 0.8); }
      add(sphere(px(9), M.orange), 222, 50, 0.8); { const b = sphere(px(16), M.orange); b.scale.set(1, 0.62, 0.6); add(b, 222, 70, 0.8); }
      tubeAt([[192, 32], [204, 20], [216, 32]], 1.6, M.blue, 0.8); break;
    case 'plane':
      shapeAt([['m', 166, 70], ['l', 226, 38], ['l', 206, 100], ['l', 188, 80]], 6, GL, 0.03, 0.74);
      polyAt([[188, 80], [226, 38]], 1.5, M.blue, 0.9);
      for (const [x, y] of [[158, 98], [164, 106], [172, 110], [182, 108]]) add(sphere(px(2.4), M.blue), x, y, 0.7); break;
    default: break;
  }
}
