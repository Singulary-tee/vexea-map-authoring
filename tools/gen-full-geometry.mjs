#!/usr/bin/env node
// gen-full-geometry: full-map blockout -> category-color-coded GLB (orthographic blockout style).
// Deterministic: every mesh derives from blockout data; no seeded decoration (stage discipline:
// segments only, color-coded by category, primitives standing in for categories).
import fs from 'node:fs';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(ab => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64'); this.onloadend?.(); }); }
};
const { Scene, Mesh, BoxGeometry, ShapeGeometry, Shape, MeshStandardMaterial, MeshBasicMaterial, Group, Vector2, Vector3, DoubleSide } = await import('three');
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');

const file = process.argv[2] || 'blockout/blockout-full-v1.json';
const outName = process.argv[3] || 'editor/blockout-full.glb';
const b = JSON.parse(fs.readFileSync(file, 'utf8'));

// category palette (hex) — mirrors gen-blockout-svg-full.mjs
const PAL = {
  'ground-surface-type': 0x6e6a5a, 'building-enterable': 0x3a5a7c, 'warehouse-enterable': 0x46688c,
  'facade-non-enterable': 0x4a5560, 'tower': 0x5b4a8c, 'bridge': 0x2e8c8c, 'wall-blocking': 0x7a6a4a,
  'stair': 0xc07a2e, 'incline': 0xd08a3a, 'tunnel-passage': 0x8a5ab8, 'hole-drone-entry': 0xd84a8c,
  'entrance-player': 0xe0c040, 'cover': 0x3f7a45, 'overhead-cover': 0x5a9a5a,
  'mountain-boundary': 0x5a4a3a, 'waterbody-boundary': 0x2e5d7a, 'spawn': 0x40c0c0, 'kill-zone': 0xd04040,
};
const mat = (hex, opt = {}) => new MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0.0, ...opt });
const mats = new Map(Object.entries(PAL).map(([k, v]) => [k, mat(v)]));
const trans = (hex, op) => mat(hex, { transparent: true, opacity: op, depthWrite: false, side: DoubleSide });
const group = new Group();
const box = (w, h, d, x, y, z, m) => { const g = new Group(); const mesh = new Mesh(new BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); g.add(mesh); return g; };

for (const s of b.segments) {
  const [x1, z1, x2, z2] = s.bounds;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, w = x2 - x1, d = z2 - z1;
  const M = mats.get(s.category) || mat(0x333333);
  switch (s.category) {
    case 'ground-surface-type':
      group.add(box(w, 0.3, d, cx, -0.15, cz, M));
      break;
    case 'building-enterable':
    case 'warehouse-enterable':
    case 'facade-non-enterable':
    case 'tower': {
      const base = s.raisedBase || 0;
      if (base > 0) group.add(box(w + 4, base, d + 4, cx, base / 2, cz, mat(0x565b63)));
      group.add(box(w, s.height, d, cx, base + s.height / 2, cz, M));
      break;
    }
    case 'wall-blocking':
    case 'mountain-boundary':
      group.add(box(w, s.height || 4, d, cx, (s.height || 4) / 2, cz, M));
      break;
    case 'stair': {
      const steps = Math.min(12, Math.max(3, s.gauge?.steps || 6));
      const sh = (s.height || 1.5) / steps, sd = d / steps;
      for (let i = 0; i < steps; i++) group.add(box(w, sh * (i + 1), sd, cx, sh * (i + 1) / 2, z2 - sd * (i + 0.5), M));
      break;
    }
    case 'incline': {
      // wedge along X: rises from x1 (ground) to x2 (height)
      const shp = new Shape([new Vector2(0, 0), new Vector2(w, 0), new Vector2(w, s.height)]);
      const geo = new ShapeGeometry(shp);
      const m = new Mesh(geo, M);
      m.rotation.set(0, Math.PI / 2, 0);
      m.position.set(x2, 0, cz);
      m.scale.set(d / 1, 1, 1); // width along Z after rotation
      m.updateMatrix();
      group.add(m);
      break;
    }
    case 'tunnel-passage': {
      const y = s.belowGradeY ?? -14;
      group.add(box(w, s.height, d, cx, y + s.height / 2, cz, trans(PAL['tunnel-passage'], 0.85)));
      // shaft marker at portals
      if (s.id.startsWith('tp-')) group.add(box(w * 0.4, 14 + s.height, d * 0.4, cx, (14 + s.height) / 2, cz, trans(0xb06ee8, 0.25)));
      break;
    }
    case 'hole-drone-entry':
      group.add(box(s.clearWidth || 2.4, 0.1, s.clearWidth || 2.4, cx, 0.05, cz, M));
      group.add(box((s.clearWidth || 2.4) + 1.2, 0.5, (s.clearWidth || 2.4) + 1.2, cx, 0.25, cz, trans(0xd84a8c, 0.2)));
      break;
    case 'entrance-player': {
      const dw = Math.min(w, d), dh = s.height || 2.4;
      const thick = Math.max(w, d);
      group.add(box(w >= d ? 0.4 : w, dh, w >= d ? d : 0.4, cx, dh / 2, cz, M));
      break;
    }
    case 'cover':
      group.add(box(w, s.height, d, cx, s.height / 2, cz, M));
      break;
    case 'overhead-cover':
      group.add(box(w, 0.6, d, cx, s.height - 0.3, cz, trans(PAL['overhead-cover'], 0.55)));
      // support posts at corners (blockout restraint: support contract, not detail)
      for (const [px, pz] of [[x1 + 0.5, z1 + 0.5], [x2 - 0.5, z1 + 0.5], [x1 + 0.5, z2 - 0.5], [x2 - 0.5, z2 - 0.5]])
        group.add(box(0.4, s.height - 0.6, 0.4, px, (s.height - 0.6) / 2, pz, mat(0x5a6570)));
      break;
    case 'bridge':
      group.add(box(w, 1.2, d, cx, s.height - 0.6, cz, M));
      break;
    case 'kill-zone':
      group.add(box(w, 0.12, d, cx, 0.06, cz, trans(PAL['kill-zone'], 0.3)));
      break;
    case 'spawn':
      group.add(box(w, 0.08, d, cx, 0.04, cz, trans(PAL['spawn'], 0.35)));
      break;
    case 'waterbody-boundary': {
      // shoreline polygon from terrain.waterEdge, closed to the map's east/south edges
      const we = b.terrain?.waterEdge || [];
      if (we.length) {
        const shp = new Shape(we.map(p => new Vector2(p[0], p[1])));
        // close along east edge and south edge back to start
        shp.lineTo(475, we[0][1]);
        shp.lineTo(475, -325);
        shp.lineTo(80, -325);
        shp.lineTo(we[we.length - 1][0], we[we.length - 1][1]);
        const g2 = new ShapeGeometry(shp);
        const wm = new Mesh(g2, trans(PAL['waterbody-boundary'], 0.9));
        wm.rotation.x = -Math.PI / 2;
        wm.position.y = 0.06;
        wm.updateMatrix();
        group.add(wm);
      }
      break;
    }
  }
}
// route ribbons (surface/covered; tunnel ribbons below grade; air lanes omitted)
{
  const roadMat = mat(0x494c50);
  for (const r of b.routes) {
    if (r.kind === 'air') continue;
    const y = r.kind === 'tunnel' ? -13.9 : 0.16;
    const wd = Math.max(2, r.width || 6);
    const wp = r.waypoints;
    for (let i = 0; i < wp.length - 1; i++) {
      const [ax, az] = wp[i], [bx, bz] = wp[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const g = new Group();
      const m = new Mesh(new BoxGeometry(len + 2, 0.1, wd), roadMat);
      m.position.set((ax + bx) / 2, y, (az + bz) / 2);
      m.rotation.y = -Math.atan2(bz - az, bx - ax);
      g.add(m);
      group.add(g);
    }
  }
}

// merge per material (blockout stays single-draw per category)
group.updateMatrixWorld(true);
const byMat = new Map();
group.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  const k = o.material.uuid;
  if (!byMat.has(k)) byMat.set(k, { m: o.material, geos: [] });
  byMat.get(k).geos.push(g);
});
const merged = new Group();
for (const { m, geos } of byMat.values()) merged.add(new Mesh(mergeGeometries(geos, false), m));
merged.name = 'blockout-full-v1';

const exporter = new GLTFExporter();
exporter.parse(merged, glb => {
  fs.writeFileSync(outName, Buffer.from(new Uint8Array(glb)));
  console.log('wrote', outName, glb.byteLength, 'bytes');
}, err => { console.error('export failed', err); process.exit(1); }, { binary: true });
