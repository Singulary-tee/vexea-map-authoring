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
  'roll-down': 0xb06030,
};
// ground surface classes get their own color so yards/roads read distinctly
const SURF = { concrete: 0x7a7668, asphalt: 0x5f5c4e, gravel: 0x6e6a5a, dirt: 0x6a5f4e };
const mat = (hex, opt = {}) => new MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0.0, ...opt });
const mats = new Map(Object.entries(PAL).map(([k, v]) => [k, mat(v)]));
Object.entries(SURF).forEach(([k, v]) => mats.set('ground:' + k, mat(v)));
const trans = (hex, op) => mat(hex, { transparent: true, opacity: op, depthWrite: false, side: DoubleSide });
const group = new Group();
const box = (w, h, d, x, y, z, m) => { const g = new Group(); const mesh = new Mesh(new BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); g.add(mesh); return g; };
const groundSegments = b.segments.filter(s => s.category === 'ground-surface-type');
const surfaceYAt = (x, z) => {
  const candidates = groundSegments.filter(s => x >= Math.min(s.bounds[0], s.bounds[2]) && x <= Math.max(s.bounds[0], s.bounds[2]) && z >= Math.min(s.bounds[1], s.bounds[3]) && z <= Math.max(s.bounds[1], s.bounds[3]));
  candidates.sort((a, c) => Math.abs((a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1])) - Math.abs((c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1])));
  return candidates[0]?.surfaceY ?? b.terrain?.defaultSurfaceY ?? 0;
};
const routeElevation = (r, i, t) => {
  const a = r.elevations?.[i] ?? b.terrain?.defaultSurfaceY ?? 0, c = r.elevations?.[i + 1] ?? a;
  return a + (c - a) * t;
};
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
const routeSamples = r => {
  const out = [];
  for (let i = 0; i < r.waypoints.length - 1; i++) {
    const prev = r.waypoints[i - 1] || r.waypoints[i], a = r.waypoints[i], c = r.waypoints[i + 1], next = r.waypoints[i + 2] || c;
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 10));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      out.push([catmull(prev[0], a[0], c[0], next[0], t), routeElevation(r, i, t), catmull(prev[1], a[1], c[1], next[1], t)]);
    }
  }
  const last = r.waypoints.at(-1);
  out.push([last[0], r.elevations?.at(-1) ?? b.terrain?.defaultSurfaceY ?? 0, last[1]]);
  return out;
};
const orientedBox = (w, h, d, cx, cy, cz, dx, dy, dz, m) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), m);
  mesh.position.set(cx, cy, cz);
  mesh.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), new Vector3(dx, dy, dz).normalize());
  const g = new Group(); g.add(mesh); return g;
};

for (const s of b.segments) {
  const [x1, z1, x2, z2] = s.bounds;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, w = x2 - x1, d = z2 - z1;
  const M = mats.get(s.category) || mat(0x333333);
  switch (s.category) {
    case 'ground-surface-type':
      group.add(box(w, 0.3, d, cx, (s.surfaceY ?? 0) - 0.15, cz, mats.get('ground:' + (s.surface || 'concrete')) || M));
      break;
    case 'building-enterable':
    case 'warehouse-enterable':
    case 'facade-non-enterable':
    case 'tower': {
      const base = (s.terrainY ?? surfaceYAt(cx, cz)) + (s.raisedBase ?? s.raisedThreshold ?? 0);
      if (base > 0) group.add(box(w + 4, base, d + 4, cx, base / 2, cz, mat(0x565b63)));
      group.add(box(w, s.height, d, cx, base + s.height / 2, cz, M));
      break;
    }
    case 'wall-blocking':
    case 'mountain-boundary':
      group.add(box(w, s.height || 4, d, cx, surfaceYAt(cx, cz) + (s.height || 4) / 2, cz, M));
      break;
    case 'stair': {
      const steps = Math.min(12, Math.max(3, s.gauge?.steps || 6));
      const sh = (s.height || 1.5) / steps, sd = d / steps;
      const sy = s.terrainY ?? surfaceYAt(cx, cz);
      for (let i = 0; i < steps; i++) group.add(box(w, sh * (i + 1), sd, cx, sy + sh * (i + 1) / 2, z2 - sd * (i + 0.5), M));
      break;
    }
    case 'incline': {
      // ramp as stacked steps (12 x 0.5m rise / 6m run = 1:12): robust prism, no wedge math
      const run = x2 - x1, wd = z2 - z1, h = s.height;
      const sy = s.terrainY ?? surfaceYAt(cx, cz);
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const rise = h * (i + 1) / steps, span = run / steps;
        const stp = new Mesh(new BoxGeometry(span + 0.1, rise, wd), M);
        stp.position.set(x1 + span * (i + 0.5), sy + rise / 2, cz);
        group.add(stp);
      }
      break;
    }
    case 'tunnel-passage': {
      const y = s.belowGradeY ?? -14;
      group.add(box(w, s.height, d, cx, y + s.height / 2, cz, trans(PAL['tunnel-passage'], 0.85)));
      // portal marker: low inset ring at grade (reads as marker, not a shaft)
      if (s.id.startsWith('tp-')) group.add(box(w * 0.6, 0.5, d * 0.6, cx, 0.25, cz, trans(0xb06ee8, 0.3)));
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
    case 'roll-down': {
      // door panel: thin slab at the opening plane
      const dw = Math.min(w, d), dh = s.height || 4.5;
      group.add(box(w >= d ? 0.6 : w, dh, w >= d ? d : 0.6, cx, dh / 2, cz, M));
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
      group.add(box(w, 0.12, d, cx, surfaceYAt(cx, cz) + 0.06, cz, trans(PAL['kill-zone'], 0.3)));
      break;
    case 'spawn':
      group.add(box(w, 0.08, d, cx, surfaceYAt(cx, cz) + 0.04, cz, trans(PAL['spawn'], 0.35)));
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
    const wd = Math.max(2, r.width || 6);
    const samples = r.kind === 'tunnel' ? r.waypoints.map(([x, z]) => [x, -13.9, z]) : routeSamples(r);
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], c = samples[i + 1];
      const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
      group.add(orientedBox(Math.hypot(dx, dy, dz) + 2, 0.1, wd, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2, dx, dy, dz, roadMat));
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
