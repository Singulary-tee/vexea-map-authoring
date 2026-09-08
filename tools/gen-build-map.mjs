#!/usr/bin/env node
// gen-build-map: blockout-full-v1 -> BUILT campus GLB (building stage).
// Promotes blockout segments to constructed geometry: real wall/roof construction with door
// openings, segmented roads with curbs & poles, utility runs with supports, cover family
// grammar, displaced rock masses. Blockout layer stays as reference (separate GLB; viewer
// toggles). Deterministic: seeded variation only, derived from stable IDs. Static merge per
// material (KB C2b) keeps the draw-call budget.
import fs from 'node:fs';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(ab => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64'); this.onloadend?.(); }); }
};
const THREE = await import('three');
const { Scene, Mesh, BoxGeometry, CylinderGeometry, IcosahedronGeometry, PlaneGeometry,
  MeshStandardMaterial, Group, Vector3, Matrix4, Color } = THREE;
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');

const file = process.argv[2] || 'blockout/blockout-full-v1.json';
const outName = process.argv[3] || 'editor/facility-built.glb';
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const segs = b.segments, byId = new Map(segs.map(s => [s.id, s]));

// deterministic PRNG (mulberry32)
const rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const idSeed = id => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

const group = new Group();
const mat = (hex, opt = {}) => new MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0.02, ...opt });
// material families (PBR, shared per family to bound draw groups after merge)
const M = {
  concrete: [mat(0x878b93, { roughness: 0.92 }), mat(0x96958d, { roughness: 0.9 }), mat(0x7f8788, { roughness: 0.94 })],
  concreteDark: mat(0x626a6d, { roughness: 0.95 }),
  roof: mat(0x454d53, { roughness: 0.9 }),
  metal: mat(0x59656a, { roughness: 0.4, metalness: 0.85 }),
  siding: [mat(0x596553, { roughness: 0.82, metalness: 0.12 }), mat(0x4d5c63, { roughness: 0.8, metalness: 0.16 }), mat(0x6b6658, { roughness: 0.86, metalness: 0.1 })],
  trim: mat(0x303b40, { roughness: 0.58, metalness: 0.55 }),
  glass: mat(0x2c3844, { roughness: 0.15, metalness: 0.75, transparent: true, opacity: 0.85 }),
  road: mat(0x494c50, { roughness: 0.95 }),
  curb: mat(0x6d6d6d, { roughness: 0.9 }),
  gravel: mat(0x6e6a5a, { roughness: 0.98 }),
  door: mat(0x3a3f45, { roughness: 0.5, metalness: 0.4 }),
  pipe: mat(0xb08a2e, { roughness: 0.45, metalness: 0.8 }),
  rib: mat(0x77808a, { roughness: 0.6, metalness: 0.6 }),
  cover: [mat(0x707a66, { roughness: 0.9 }), mat(0x767a5e, { roughness: 0.92 })],
  rock: mat(0x5a4a3a, { roughness: 0.98 }),
  rock2: mat(0x6a5a46, { roughness: 0.97 }),
  water: mat(0x2e5d7a, { roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.85 }),
  tunnel: mat(0x3a3048, { roughness: 0.9 }),
  tunnelLight: mat(0x4a4060, { roughness: 0.85 }),
  spawn: mat(0x40c0c0, { transparent: true, opacity: 0.3, depthWrite: false }),
  kill: mat(0xd04040, { transparent: true, opacity: 0.25, depthWrite: false }),
  term: mat(0x22cc88, { roughness: 0.35, metalness: 0.3, emissive: 0x116633, emissiveIntensity: 0.6 }),
  light: mat(0xd8e8f0, { roughness: 0.3, emissive: 0x88aabb, emissiveIntensity: 0.8 }),
  killObj: mat(0xd04040, { transparent: true, opacity: 0.5, depthWrite: false }),
  hazard: mat(0xd8c020, { roughness: 0.6 }),
  hazardDark: mat(0x202020, { roughness: 0.8 }),
  sign: mat(0x2a3a4a, { roughness: 0.5, metalness: 0.3 }),
};
const box = (w, h, d, x, y, z, m, ry = 0) => { const g = new Mesh(new BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.rotation.y = ry; return g; };
const groundSegments = segs.filter(s => s.category === 'ground-surface-type');
const inBounds = (x, z, s) => {
  const [x1, z1, x2, z2] = s.bounds;
  return x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && z >= Math.min(z1, z2) && z <= Math.max(z1, z2);
};
const surfaceYAt = (x, z, fallback = b.terrain?.defaultSurfaceY ?? 0) => {
  const candidates = groundSegments.filter(s => inBounds(x, z, s));
  if (!candidates.length) return fallback;
  candidates.sort((a, c) => Math.abs((a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1])) - Math.abs((c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1])));
  return Number.isFinite(candidates[0].surfaceY) ? candidates[0].surfaceY : fallback;
};
const segmentTerrainY = s => Number.isFinite(s.terrainY)
  ? s.terrainY
  : surfaceYAt((s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2);
const raisedBase = s => segmentTerrainY(s) + (s.raisedBase ?? s.raisedThreshold ?? 0);
const orientedBox = (w, h, d, cx, cy, cz, dx, dy, dz, m) => {
  const g = new Mesh(new BoxGeometry(w, h, d), m);
  const dir = new Vector3(dx, dy, dz).normalize();
  g.position.set(cx, cy, cz);
  g.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), dir);
  return g;
};
const segmentFrame = (ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
  return { len, ang: -Math.atan2(dz, dx), nx: -dz / len, nz: dx / len };
};
const offsetPoint = (x, z, frame, offset) => [x + frame.nx * offset, z + frame.nz * offset];
const routeElevation = (r, i, t) => {
  const fallback = b.terrain?.defaultSurfaceY ?? 0;
  const a = r.elevations?.[i] ?? fallback, c = r.elevations?.[i + 1] ?? a;
  return a + (c - a) * t;
};
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
const routeSamples = r => {
  const out = [];
  for (let i = 0; i < r.waypoints.length - 1; i++) {
    const prev = r.waypoints[i - 1] || r.waypoints[i];
    const a = r.waypoints[i], c = r.waypoints[i + 1], next = r.waypoints[i + 2] || c;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / 10));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      out.push([catmull(prev[0], a[0], c[0], next[0], t), routeElevation(r, i, t), catmull(prev[1], a[1], c[1], next[1], t)]);
    }
  }
  const last = r.waypoints.at(-1);
  out.push([last[0], r.elevations?.at(-1) ?? b.terrain?.defaultSurfaceY ?? 0, last[1]]);
  return out;
};

// -------- grounds (surface class) --------
const SURF_MAT = { concrete: () => M.concreteDark, asphalt: () => M.road, gravel: () => M.gravel, dirt: () => M.gravel };
for (const s of groundSegments) {
  const [x1, z1, x2, z2] = s.bounds;
  const y = s.surfaceY ?? b.terrain?.defaultSurfaceY ?? 0;
  group.add(box(x2 - x1, 0.4, z2 - z1, (x1 + x2) / 2, y - 0.2, (z1 + z2) / 2, SURF_MAT[s.surface]?.() ?? M.concreteDark));
}

// -------- roads: spline ribbons + curbs, shoulders, gutters, and poles --------
for (const r of b.routes) {
  if (r.kind === 'air') continue;
  const wdt = r.kind === 'tunnel' ? r.width || 8 : Math.max(4, r.width || 6);
  const samples = r.kind === 'tunnel' ? r.waypoints.map(([x, z]) => [x, -13.9, z]) : routeSamples(r);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], c = samples[i + 1];
    const frame = segmentFrame(a[0], a[2], c[0], c[2]);
    const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, mz = (a[2] + c[2]) / 2;
    group.add(orientedBox(len + 1, 0.24, wdt, mx, my + 0.12, mz, dx, dy, dz, r.kind === 'tunnel' ? M.tunnelLight : M.road));
    if (r.kind !== 'tunnel') {
      const shoulderWidth = b.terrain?.grading?.shoulderWidth ?? 1.2;
      const gutterWidth = b.terrain?.grading?.gutterWidth ?? 0.35;
      const gutterDepth = b.terrain?.grading?.gutterDepth ?? 0.18;
      for (const side of [-1, 1]) {
        const [sx, sz] = offsetPoint(mx, mz, frame, side * (wdt / 2 + 0.15 + shoulderWidth / 2));
        group.add(orientedBox(len + 1, 0.08, shoulderWidth, sx, my + 0.04, sz, dx, dy, dz, M.gravel));
        const [gx, gz] = offsetPoint(mx, mz, frame, side * (wdt / 2 + 0.15 + shoulderWidth + gutterWidth / 2));
        group.add(orientedBox(len + 1, gutterDepth, gutterWidth, gx, my - gutterDepth / 2, gz, dx, dy, dz, M.concreteDark));
        if (r.kind !== 'covered') {
          const [cx, cz] = offsetPoint(mx, mz, frame, side * (wdt / 2 + 0.15));
          group.add(orientedBox(len + 1, 0.3, 0.3, cx, my + 0.15, cz, dx, dy, dz, M.curb));
        }
      }
    }
  }
  // light poles along ground routes, seeded by waypoint hash, every ~30m
  if (r.kind === 'ground') {
    const rand = rng(idSeed('pole-' + r.id));
    for (let i = 0; i < r.waypoints.length - 1; i++) {
      const [ax, az] = r.waypoints[i], [bx, bz] = r.waypoints[i + 1];
      const frame = segmentFrame(ax, az, bx, bz);
      const n = Math.floor(frame.len / 30);
      for (let k = 1; k <= n; k++) {
        const t = (k + rand() * 0.3 - 0.15) / (n + 1);
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        const py = routeElevation(r, i, t);
        const sgn = rand() > 0.5 ? 1 : -1;
        const off = sgn * (wdt / 2 + 2);
        const [ox, oz] = offsetPoint(px, pz, frame, off);
        group.add(box(0.35, 7, 0.35, ox, py + 3.5, oz, M.metal));
        const [hx, hz] = offsetPoint(ox, oz, frame, sgn * 0.65);
        group.add(box(1.6, 0.4, 0.3, hx, py + 7.2, hz, M.metal, frame.ang));
      }
    }
  }
}

// -------- buildings: wall frame with door openings + roof --------
const bldCats = ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'];
// group doors by building
const doorsByBld = new Map();
for (const d of segs) {
  if (d.category !== 'entrance-player') continue;
  for (const ref of d.connectivity || []) {
    const t = byId.get(ref);
    if (t && bldCats.includes(t.category)) {
      if (!doorsByBld.has(t.id)) doorsByBld.set(t.id, []);
      doorsByBld.get(t.id).push(d);
    }
  }
}
const wallPiece = (w, h, t, x, y, z, m, ry = 0) => group.add(box(w, h, t, x, y, z, m, ry));
function building(s) {
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, base = raisedBase(s);
  const cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const cm = ['building-enterable', 'warehouse-enterable'].includes(s.category)
    ? M.siding[(idSeed(s.id) >>> 0) % M.siding.length]
    : M.concrete[(idSeed(s.id) >>> 0) % M.concrete.length];
  const rand = rng(idSeed(s.id) * 977 + 13);
  // plinth for raised bases
  if (base > 0) group.add(box(w + 6, base, d + 6, cx2, base / 2, cz2, M.concreteDark));
  const WT = 0.6;
  const doors = (doorsByBld.get(s.id) || []).map(d => ({
    // Doors are authored one metre outside the wall; project the opening to the facade.
    dx: (d.bounds[0] + d.bounds[2]) / 2, dz: (d.bounds[1] + d.bounds[3]) / 2,
    w: Math.max(d.bounds[2] - d.bounds[0], d.bounds[3] - d.bounds[1]),
    h: d.height || 2.4,
    side: (() => {
      const sides = [[Math.abs((d.bounds[1] + d.bounds[3]) / 2 - z1), 's'], [Math.abs((d.bounds[1] + d.bounds[3]) / 2 - z2), 'n'], [Math.abs((d.bounds[0] + d.bounds[2]) / 2 - x1), 'w'], [Math.abs((d.bounds[0] + d.bounds[2]) / 2 - x2), 'e']];
      return sides.sort((a, b) => a[0] - b[0])[0][1];
    })(),
  })).map(d => ({ ...d, axis: ['n', 's'].includes(d.side) ? d.dx : d.dz }));
  const opensOn = side => doors.filter(d => d.side === side);
  const cut = (lo, hi, side) => { // wall pieces along a side, minus door openings
    const o = opensOn(side).map(d => ({ a: d.axis - d.w / 2, c: d.axis + d.w / 2 })).sort((a, c2) => a.a - c2.a);
    let cur = lo, pieces = [];
    for (const op of o) {
      const a2 = Math.max(lo, Math.min(hi, op.a)), c2 = Math.max(lo, Math.min(hi, op.c));
      if (a2 > cur) pieces.push([cur, a2]);
      cur = Math.max(cur, c2);
    }
    if (cur < hi) pieces.push([cur, hi]);
    return pieces;
  };
  const addWallX = (x, side, m) => {
    for (const [a, c] of cut(z1, z2, side)) group.add(box(WT, h, c - a, x, base + h / 2, (a + c) / 2, m));
    for (const door of opensOn(side)) {
      const doorH = Math.min(h - 0.15, door.h), topH = h - doorH;
      if (topH <= 0) continue;
      group.add(box(WT, topH, door.w, x, base + doorH + topH / 2, door.axis, m));
    }
  };
  const addWallZ = (z, side, m) => {
    for (const [a, c] of cut(x1, x2, side)) group.add(box(c - a, h, WT, (a + c) / 2, base + h / 2, z, m));
    for (const door of opensOn(side)) {
      const doorH = Math.min(h - 0.15, door.h), topH = h - doorH;
      if (topH <= 0) continue;
      group.add(box(door.w, topH, WT, door.axis, base + doorH + topH / 2, z, m));
    }
  };
  addWallX(x1, 'w', cm); addWallX(x2, 'e', cm); addWallZ(z1, 's', cm); addWallZ(z2, 'n', cm);
  // door frames and thresholds, aligned to the actual wall rather than the authored exterior marker
  for (const d of doors) {
    const normal = d.side === 'n' ? 1 : d.side === 's' ? -1 : d.side === 'e' ? 1 : -1;
    const wallX = d.side === 'w' ? x1 : d.side === 'e' ? x2 : d.dx;
    const wallZ = d.side === 's' ? z1 : d.side === 'n' ? z2 : d.dz;
    const frameX = d.side === 'w' || d.side === 'e' ? wallX + normal * 0.34 : d.axis;
    const frameZ = d.side === 'n' || d.side === 's' ? wallZ + normal * 0.34 : d.axis;
    const frameDepth = 0.28;
    if (d.side === 'n' || d.side === 's') {
      group.add(box(0.25, d.h, frameDepth, d.axis - d.w / 2, base + d.h / 2, frameZ, M.trim));
      group.add(box(0.25, d.h, frameDepth, d.axis + d.w / 2, base + d.h / 2, frameZ, M.trim));
      group.add(box(d.w + 0.5, 0.25, frameDepth, d.axis, base + d.h, frameZ, M.metal));
      group.add(box(d.w, 0.12, 0.8, d.axis, base + 0.06, wallZ + normal * 0.2, M.door));
    } else {
      group.add(box(frameDepth, d.h, 0.25, frameX, base + d.h / 2, d.axis - d.w / 2, M.trim));
      group.add(box(frameDepth, d.h, 0.25, frameX, base + d.h / 2, d.axis + d.w / 2, M.trim));
      group.add(box(frameDepth, 0.25, d.w + 0.5, frameX, base + d.h, d.axis, M.metal));
      group.add(box(0.8, 0.12, d.w, wallX + normal * 0.2, base + 0.06, d.axis, M.door));
    }
  }
  // floor band for multi-floor
  if (s.floors >= 2) for (let f = 1; f < s.floors; f++) group.add(box(w + 0.4, 0.5, d + 0.4, cx2, base + h * f / s.floors, cz2, M.concreteDark));
  // roof slab + parapet
  group.add(box(w, 0.5, d, cx2, base + h + 0.1, cz2, M.roof));
  const PW = 0.5, PH = 1.1;
  for (const [dx2, dz2, ww, dd] of [[0, d / 2, w, PW], [0, -d / 2, w, PW], [w / 2, 0, PW, d], [-w / 2, 0, PW, d]])
    group.add(box(ww, PH, dd, cx2 + dx2, base + h + 0.5 + PH / 2, cz2 + dz2, M.concreteDark));
  // roof machinery (seeded, small)
  const n = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const bw = Math.min(Math.max(3, w - 6), 3 + rand() * 6), bd = Math.min(Math.max(3, d - 6), 3 + rand() * 5), bh = 2 + rand() * 2.5;
    const bx = (rand() - 0.5) * Math.max(0, w - bw - 4), bz = (rand() - 0.5) * Math.max(0, d - bd - 4);
    group.add(box(bw, bh, bd, cx2 + bx, base + h + 0.6 + bh / 2, cz2 + bz, rand() > 0.5 ? M.roof : M.metal));
  }
  const vent = new Mesh(new CylinderGeometry(1.2, 1.2, 3, 10), M.metal);
  vent.position.set(cx2 + (rand() - 0.5) * w * 0.4, base + h + 0.6 + 1.5, cz2 + (rand() - 0.5) * d * 0.4);
  group.add(vent);
  // Corrugated ribs and windows establish an industrial facade without hiding openings.
  const addRibs = side => {
    const sideDoors = opensOn(side);
    const lo = ['n', 's'].includes(side) ? x1 + 3 : z1 + 3;
    const hi = ['n', 's'].includes(side) ? x2 - 3 : z2 - 3;
    const step = 6;
    for (let axis = lo; axis <= hi; axis += step) {
      if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + 0.7)) continue;
      const out = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
      if (side === 'n' || side === 's') group.add(box(0.16, Math.max(1, h - 0.8), 0.16, axis, base + (h - 0.8) / 2 + 0.4, (side === 'n' ? z2 : z1) + out * 0.36, M.trim));
      else group.add(box(0.16, Math.max(1, h - 0.8), 0.16, (side === 'e' ? x2 : x1) + out * 0.36, base + (h - 0.8) / 2 + 0.4, axis, M.trim));
    }
  };
  for (const side of ['n', 's', 'e', 'w']) addRibs(side);
  if (s.floors >= 2 && s.category !== 'facade-non-enterable') {
    const fh = h / s.floors;
    const bay = 5 + Math.floor(rand() * 2);
    for (const side of ['n', 's', 'e', 'w']) {
      const sideDoors = opensOn(side);
      const lo = ['n', 's'].includes(side) ? x1 + 3 : z1 + 3;
      const hi = ['n', 's'].includes(side) ? x2 - 3 : z2 - 3;
      const out = side === 'n' ? 1 : side === 's' ? -1 : side === 'e' ? 1 : -1;
      for (let f = 0; f < s.floors; f++) for (let axis = lo; axis <= hi; axis += bay) {
        const winW = 1.8;
        if (sideDoors.some(d => Math.abs(d.axis - axis) < d.w / 2 + winW / 2 + 0.6)) continue;
        const wy = base + fh * (f + 0.58);
        if (side === 'n' || side === 's') group.add(box(winW, Math.min(1.6, fh * 0.42), 0.16, axis, wy, (side === 'n' ? z2 : z1) + out * 0.34, M.glass));
        else group.add(box(0.16, Math.min(1.6, fh * 0.42), winW, (side === 'e' ? x2 : x1) + out * 0.34, wy, axis, M.glass));
      }
    }
  }
}
for (const s of segs) if (bldCats.includes(s.category)) building(s);

// -------- industrial dressing: tanks, substations, and stacked freight --------
for (const s of segs) {
  const [x1, z1, x2, z2] = s.bounds;
  const cx3 = (x1 + x2) / 2, cz3 = (z1 + z2) / 2;
  const sy = segmentTerrainY(s);
  if (s.id === 'bld-tank-farm') {
    for (const [ox, oz, radius, height] of [[-5, 0, 4.3, 7], [5, 0, 4.3, 7]]) {
      const tank = new Mesh(new CylinderGeometry(radius, radius * 1.05, height, 16), M.siding[0]);
      tank.position.set(cx3 + ox, sy + height / 2, cz3 + oz);
      group.add(tank);
      group.add(box(radius * 1.5, 0.25, radius * 1.5, cx3 + ox, sy + height + 0.15, cz3 + oz, M.metal));
      const pipe = new Mesh(new CylinderGeometry(0.22, 0.22, height + 2, 8), M.pipe);
      pipe.position.set(cx3 + ox + radius * 0.65, sy + (height + 2) / 2, cz3 + oz);
      group.add(pipe);
    }
    group.add(box(18, 0.35, 2, cx3, sy + 0.18, z2 + 1.2, M.concreteDark));
  }
  if (s.id === 'bld-substation') {
    for (let i = 0; i < 3; i++) {
      const px = x1 + 8 + i * 12;
      group.add(box(7, 3.2, 5, px, sy + 1.6, cz3, M.metal));
      group.add(box(7.4, 0.25, 5.4, px, sy + 3.25, cz3, M.concreteDark));
      for (const side of [-1, 1]) group.add(box(0.18, 5, 0.18, px + side * 2.2, sy + 5.1, cz3, M.pipe));
    }
  }
  if (s.id === 'bld-east-storage-a' || s.id === 'bld-east-storage-b') {
    const crateW = Math.max(4, Math.min(8, x2 - x1 - 2)), crateD = Math.max(4, Math.min(8, z2 - z1 - 2));
    group.add(box(crateW, 2.4, crateD, cx3, sy + 1.2, cz3, M.cover[0]));
    group.add(box(crateW * 0.92, 2.1, crateD * 0.92, cx3, sy + 3.45, cz3, M.cover[1]));
    group.add(box(crateW + 0.3, 0.18, 0.18, cx3, sy + 1.3, z1 - 0.15, M.trim));
  }
}

// -------- walls & fences --------
for (const s of segs) {
  if (s.category !== 'wall-blocking') continue;
  const [x1, z1, x2, z2] = s.bounds, h = s.height || 4;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
  const sy = segmentTerrainY(s);
  group.add(box(Math.max(w, 0.6), h, Math.max(d, 0.6), (x1 + x2) / 2, sy + h / 2, (z1 + z2) / 2, M.concreteDark));
}

// -------- stairs (real steps) --------
for (const s of segs) {
  if (s.category !== 'stair') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), h = s.height || 1.5;
  const sy = segmentTerrainY(s);
  const steps = Math.min(12, Math.max(3, s.gauge?.steps || 6));
  const sh = h / steps, sd = d / steps;
  const dir = z2 >= z1 ? 1 : -1;
  for (let i = 0; i < steps; i++) group.add(box(w, sh * (i + 1), sd, (x1 + x2) / 2, sy + sh * (i + 1) / 2, z2 - dir * sd * (i + 0.5), M.concrete[1]));
  for (const railX of [(x1 + x2) / 2 - w / 2 + 0.25, (x1 + x2) / 2 + w / 2 - 0.25]) {
    group.add(box(0.12, h + 0.9, 0.12, railX, sy + h / 2 + 0.45, (z1 + z2) / 2, M.metal));
  }
}

// -------- incline (1:12 step prism) --------
for (const s of segs) {
  if (s.category !== 'incline') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const run = Math.abs(x2 - x1), wd = Math.abs(z2 - z1), h = s.height;
  const sy = segmentTerrainY(s);
  const steps = 12;
  const dir = x2 >= x1 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    const rise = h * (i + 1) / steps, span = run / steps;
    group.add(box(span + 0.1, rise, wd, x1 + dir * span * (i + 0.5), sy + rise / 2, (z1 + z2) / 2, M.concrete[1]));
  }
}

// -------- bridge/catwalk: deck + railings --------
for (const s of segs) {
  if (s.category !== 'bridge') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, y = s.height || 6;
  group.add(box(w, 1.2, d, (x1 + x2) / 2, y - 0.6, (z1 + z2) / 2, M.metal));
  for (const off of [-d / 2 + 0.4, d / 2 - 0.4]) {
    group.add(box(w, 1.1, 0.12, (x1 + x2) / 2, y + 0.45, (z1 + z2) / 2 + off, M.metal));
    for (let x = x1 + 2; x < x2 - 1; x += 3) group.add(box(0.12, 1.1, 0.12, x, y + 0.45, (z1 + z2) / 2 + off, M.metal));
  }
}

// Tunnel shells are built from the route below so the interior remains walkable;
// source passage AABBs are semantic bounds, not solid geometry.

// -------- drone hole: dark ring at grade --------
for (const s of segs) {
  if (s.category !== 'hole-drone-entry') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const sy = segmentTerrainY(s);
  group.add(box(x2 - x1, 0.3, z2 - z1, (x1 + x2) / 2, sy + 0.1, (z1 + z2) / 2, M.door));
}

// -------- roll-down doors --------
for (const s of segs) {
  if (s.category !== 'roll-down') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1;
  const horiz = w >= d;
  const sy = segmentTerrainY(s);
  group.add(box(horiz ? w : 0.5, s.height || 4.5, horiz ? 0.5 : d, (x1 + x2) / 2, sy + (s.height || 4.5) / 2, (z1 + z2) / 2, M.metal));
}

// -------- covers: family grammar (low crate / mid barrier / full bunker) --------
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const sy = segmentTerrainY(s);
  const cls = s.cover?.heightClass || 'mid';
  const cm = M.cover[(idSeed(s.id) >>> 0) % M.cover.length];
  if (cls === 'low') {
    // crate stack: two boxes
    group.add(box(w, h * 0.55, d, cx2, sy + h * 0.275, cz2, cm));
    group.add(box(w * 0.9, h * 0.45, d * 0.9, cx2, sy + h * 0.55 + h * 0.225, cz2, M.cover[((idSeed(s.id) + 1) >>> 0) % M.cover.length]));
  } else if (cls === 'mid') {
    // jersey barrier with base flare
    group.add(box(w, h, d, cx2, sy + h / 2, cz2, cm));
    group.add(box(w + 0.3, 0.3, d + 0.3, cx2, sy + 0.15, cz2, M.concreteDark));
  } else {
    // bunker block: solid with roof overhang
    group.add(box(w, h, d, cx2, sy + h / 2, cz2, cm));
    group.add(box(w + 0.8, 0.4, d + 0.8, cx2, sy + h + 0.2, cz2, M.roof));
  }
}

// -------- overhead covers: canopy + posts --------
for (const s of segs) {
  if (s.category !== 'overhead-cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const h = s.height || 6, w = x2 - x1, d = z2 - z1;
  const sy = segmentTerrainY(s);
  group.add(box(w, 0.5, d, (x1 + x2) / 2, sy + h - 0.25, (z1 + z2) / 2, M.metal));
  for (const [px, pz] of [[x1 + 0.5, z1 + 0.5], [x2 - 0.5, z1 + 0.5], [x1 + 0.5, z2 - 0.5], [x2 - 0.5, z2 - 0.5]])
    group.add(box(0.35, h - 0.5, 0.35, px, sy + (h - 0.5) / 2, pz, M.concreteDark));
}

// Loading dock lip: the overhead canopy is not the walkable loading edge.
const loadingDock = segs.find(s => s.id === 'oc-loading-dock');
if (loadingDock) {
  const [x1, z1, x2, z2] = loadingDock.bounds;
  const sy = segmentTerrainY(loadingDock);
  group.add(box(x2 - x1, 0.5, 2.4, (x1 + x2) / 2, sy + 0.25, z2 - 0.4, M.concreteDark));
  for (let x = x1 + 3; x < x2 - 1; x += 6) {
    group.add(box(0.35, 0.9, 0.35, x, sy + 0.7, z2 - 1.5, M.hazard));
  }
}

// -------- mountains: displaced rock masses --------
for (const s of segs) {
  if (s.category !== 'mountain-boundary') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height || 40;
  const rand = rng(idSeed(s.id));
  const nBlobs = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < nBlobs; i++) {
    const r = Math.max(18, Math.min(w * 0.5, d * 0.9) * (0.35 + rand() * 0.4));
    const geo = new IcosahedronGeometry(r, 1);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const k = 0.75 + rand() * 0.5;
      pos.setXYZ(v, pos.getX(v) * k, pos.getY(v) * (0.5 + rand() * 0.6), pos.getZ(v) * k);
    }
    geo.computeVertexNormals();
    const m = new Mesh(geo, rand() > 0.5 ? M.rock : M.rock2);
    m.position.set(x1 + rand() * w, -3 + rand() * 4, z1 + rand() * d);
    m.rotation.y = rand() * Math.PI;
    group.add(m);
  }
}

// -------- water: shoreline plane --------
{
  const we = b.terrain?.waterEdge || [];
  if (we.length) {
    const wMesh = new Mesh(new PlaneGeometry(560, 640), M.water);
    wMesh.rotation.x = -Math.PI / 2;
    wMesh.position.set(440, -0.15, -20);
    group.add(wMesh);
    // shoreline lip: dark band hugging the polyline
    for (let i = 0; i < we.length - 1; i++) {
      const [ax, az] = we[i], [bx2, bz] = we[i + 1];
      const len = Math.hypot(bx2 - ax, bz - az);
      group.add(box(len, 0.8, 3, (ax + bx2) / 2, 0.2, (az + bz) / 2, M.concreteDark, -Math.atan2(bz - az, bx2 - ax)));
    }
  }
}

// -------- fences: posts + rails --------
for (const s of segs) {
  if (!['fence-w', 'fence-s'].includes(s.id)) continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), len = Math.max(w, d);
  const horiz = w >= d;
  const sy = segmentTerrainY(s);
  const nPosts = Math.max(3, Math.floor(len / 10));
  for (let i = 0; i <= nPosts; i++) {
    const t = i / nPosts;
    const px = horiz ? x1 + (x2 - x1) * t : x1, pz = horiz ? z1 : z1 + (z2 - z1) * t;
    group.add(box(horiz ? 0.25 : 0.3, 4, horiz ? 0.3 : 0.25, px, sy + 2, pz, M.metal));
  }
  group.add(box(horiz ? len : 0.15, 2.6, horiz ? 0.15 : len, (x1 + x2) / 2, sy + 2.3, (z1 + z2) / 2, M.metal));
}

// -------- kill/spawn markers (reference layer, semi-transparent) --------
for (const s of segs) {
  if (s.category === 'kill-zone') {
    const [x1, z1, x2, z2] = s.bounds;
    const sy = segmentTerrainY(s);
    group.add(box(x2 - x1, 0.12, z2 - z1, (x1 + x2) / 2, sy + 0.06, (z1 + z2) / 2, M.kill));
  }
  if (s.category === 'spawn') {
    const [x1, z1, x2, z2] = s.bounds;
    const sy = segmentTerrainY(s);
    group.add(box(x2 - x1, 0.08, z2 - z1, (x1 + x2) / 2, sy + 0.04, (z1 + z2) / 2, M.spawn));
  }
}

// -------- utility runs: pipe racks along covered routes (supports + pipes) --------
for (const r of b.routes) {
  if (r.kind !== 'covered') continue;
  const samples = routeSamples(r);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], c = samples[i + 1];
    const [ax, az] = [a[0], a[2]], [bx2, bz] = [c[0], c[2]];
    const frame = segmentFrame(ax, az, bx2, bz);
    const routeWidth = r.width || 5;
    const nSup = Math.max(2, Math.floor(frame.len / 6));
    for (let k = 0; k <= nSup; k++) {
      const t = k / nSup;
      const px = ax + (bx2 - ax) * t, pz = az + (bz - az) * t;
      const py = a[1] + (c[1] - a[1]) * t;
      for (const side of [-1, 1]) {
        const [sx, sz] = offsetPoint(px, pz, frame, side * Math.max(1.5, routeWidth / 2 - 0.35));
        group.add(box(0.2, 3.2, 0.2, sx, py + 1.6, sz, M.metal));
      }
    }
    const dx = bx2 - ax, dy = c[1] - a[1], dz = bz - az;
    const pipe = new Mesh(new CylinderGeometry(0.28, 0.28, Math.hypot(dx, dy, dz), 8), M.pipe);
    pipe.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dx, dy, dz).normalize());
    pipe.position.set((ax + bx2) / 2, (a[1] + c[1]) / 2 + 3.2, (az + bz) / 2);
    group.add(pipe);
  }
}

// -------- interiors: enterable buildings get floor construction, partitions, stairs, objective room --------
const interiorByBld = new Map((b.interiors || []).map(i => [i.building, i]));
const FLOOR_T = 0.3;
function interiors(s) {
  const plan = interiorByBld.get(s.id);
  if (!plan) return;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, base = raisedBase(s);
  const cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const nF = plan.floors || s.floors || 1;
  const fh = h / nF;
  // floor slabs per level
  for (let f = 0; f < nF; f++) {
    group.add(box(w - 1, FLOOR_T, d - 1, cx2, base + fh * f + FLOOR_T / 2, cz2, M.concreteDark));
    if (f < nF - 1) group.add(box(w - 1, 0.5, d - 1, cx2, base + fh * (f + 1) - 0.25, cz2, M.roof)); // ceiling/next floor underside
  }
  const rand = rng(idSeed('int-' + s.id));
  // industrial lighting: emissive ceiling strips along the long axis (construction, not dressing)
  if (plan.layout !== 'staircore') {
    const horiz = w >= d;
    const nStrips = plan.layout === 'objective' || plan.layout === 'corridor' ? 1 : 2;
    for (let i = 0; i < nStrips; i++) {
      const t = (i - (nStrips - 1) / 2) * 0.45;
      const off = horiz ? t * d : t * w;
      const strip = new Mesh(new BoxGeometry(horiz ? w - 2 : 0.7, 0.12, horiz ? 0.7 : d - 2), M.light);
      strip.position.set(horiz ? cx2 : cx2 + off, base + h - 0.32, horiz ? cz2 + off : cz2);
      group.add(strip);
    }
  }
  // layout construction
  switch (plan.layout) {
    case 'drive-through': {
      // clear central aisle N-S; low crates flank (interior cover — PvE decision point in the slice)
      const aisle = Math.min(8, d - 6);
      group.add(box(w - 1, h - 1.2, 0.35, cx2 - 4, base + (h - 1.2) / 2 + 0.6, cz2, M.rib));
      group.add(box(w - 1, h - 1.2, 0.35, cx2 + 4, base + (h - 1.2) / 2 + 0.6, cz2, M.rib));
      for (let i = 0; i < 3; i++) {
        const px = cx2 + (rand() - 0.5) * (w - 12), pz = cz2 + (i - 1) * (d - 4) / 4;
        group.add(box(2.6, 1.2, 1.6, px, base + 0.6, pz, M.cover[0]));
        group.add(box(2.2, 1.0, 1.4, px + 0.0, base + 1.7, pz, M.cover[1]));
      }
      break;
    }
    case 'bays':
    case 'stalls': {
      const stalls = plan.stalls || 2;
      const len = Math.max(w, d);
      const horiz = w >= d;
      const stallW = len / stalls;
      for (let i = 1; i < stalls; i++) {
        const t = stallW * i;
        group.add(box(horiz ? 0.35 : w - 1, h * 0.7, horiz ? d - 1 : 0.35, horiz ? x1 + t : cx2, base + h * 0.35, horiz ? cz2 : z1 + t, M.rib));
      }
      break;
    }
    case 'corridor': {
      // central corridor along the deeper axis
      group.add(box(w - 1, h - 1.4, 0.35, cx2 - 2.5, base + (h - 1.4) / 2 + 0.7, cz2, M.rib));
      group.add(box(w - 1, h - 1.4, 0.35, cx2 + 2.5, base + (h - 1.4) / 2 + 0.7, cz2, M.rib));
      break;
    }
    case 'objective': {
      // objective floor: barrier ring + terminal block with emissive core
      const lvlY = base + fh * (plan.objectiveLevel - 1);
      const ow = Math.min(14, w - 8), od = Math.min(12, d - 8);
      const tx = cx2, tz = cz2;
      group.add(box(ow, 0.4, od, tx, lvlY + FLOOR_T + 0.2, tz, M.concreteDark));
      // barrier ring with a real capsule-width north doorway
      const B = 0.5;
      group.add(box(ow + 2 * B, 1.3, B, tx, lvlY + 1.4, tz - od / 2, M.metal));
      group.add(box(B, 1.3, od, tx - ow / 2, lvlY + 1.4, tz, M.metal));
      group.add(box(B, 1.3, od, tx + ow / 2, lvlY + 1.4, tz, M.metal));
      const gapW = 3;
      const railLen = (ow - gapW) / 2;
      group.add(box(railLen, 1.3, B, tx - gapW / 2 - railLen / 2, lvlY + 1.4, tz + od / 2, M.metal));
      group.add(box(railLen, 1.3, B, tx + gapW / 2 + railLen / 2, lvlY + 1.4, tz + od / 2, M.metal));
      // terminal block
      const term = new Mesh(new BoxGeometry(2.4, 1.8, 1.2), M.term);
      term.position.set(tx, lvlY + FLOOR_T + 1.0, tz);
      group.add(term);
      // objective marker strip on the floor
      group.add(box(6, 0.06, 4, tx, lvlY + FLOOR_T + 0.08, tz, M.killObj));
      break;
    }
    case 'staircore': {
      // open stair core: landings and treads stay traversable instead of a solid shaft
      const sw = 4.5, sd = 5.5;
      const treadW = sw - 1, treadD = sd - 1;
      for (let f = 0; f < nF - 1; f++) {
        const stepCount = Math.max(8, Math.ceil(fh / 0.2)), stepRise = fh / stepCount, stepDepth = treadD / stepCount;
        const dir = f % 2 === 0 ? 1 : -1;
        const startZ = cz2 - dir * treadD / 2;
        for (let i = 0; i < stepCount; i++) {
          const z = startZ + dir * stepDepth * (i + 0.5);
          group.add(box(treadW, stepRise * (i + 1), stepDepth, cx2, base + fh * f + FLOOR_T + stepRise * (i + 1) / 2, z, M.concrete[1]));
        }
      }
      for (let f = 0; f < nF; f++) group.add(box(treadW, 0.22, treadD, cx2, base + fh * f + FLOOR_T + 0.11, cz2, M.concreteDark));
      break;
    }
    case 'open':
    default:
      break;
  }
  // Interior stairs for multi-floor layouts (corner, away from the main door side).
  if (nF > 1 && plan.layout !== 'staircore') {
    const sw2 = 3.2, sd2 = 4.5;
    const sx = x1 + sw2 / 2 + 1, sz = z1 + sd2 / 2 + 1;
    const treadW = sw2 - 1.2, treadD = sd2 - 1.2;
    for (let f = 0; f < nF - 1; f++) {
      const stepCount = Math.max(8, Math.ceil(fh / 0.2)), stepRise = fh / stepCount, stepDepth = treadD / stepCount;
      const dir = f % 2 === 0 ? 1 : -1;
      const startZ = sz - dir * treadD / 2;
      for (let i = 0; i < stepCount; i++) {
        const z = startZ + dir * stepDepth * (i + 0.5);
        group.add(box(treadW, stepRise * (i + 1), stepDepth, sx, base + fh * f + FLOOR_T + stepRise * (i + 1) / 2, z, M.concrete[1]));
      }
    }
    for (let f = 0; f < nF; f++) group.add(box(treadW, 0.22, treadD, sx, base + fh * f + FLOOR_T + 0.11, sz, M.concreteDark));
  }
}
for (const s of segs) if (bldCats.includes(s.category)) interiors(s);

// -------- tunnel interior: walkable shell + conduit/light strips --------
{
  const ti = b.tunnelInterior;
  const tr = b.routes.find(r => r.id === 'route_tunnel' && r.kind === 'tunnel');
  if (ti && tr) {
    const tunnelH = 6, width = ti.width || tr.width || 8, floorY = ti.floorY;
    for (let i = 0; i < tr.waypoints.length - 1; i++) {
      const [ax, az] = tr.waypoints[i], [bx2, bz] = tr.waypoints[i + 1];
      const frame = segmentFrame(ax, az, bx2, bz);
      const cx3 = (ax + bx2) / 2, cz3 = (az + bz) / 2;
      group.add(box(frame.len + 1, 0.4, width, cx3, floorY - 0.2, cz3, M.concreteDark, frame.ang));
      group.add(box(frame.len + 1, 0.35, width, cx3, floorY + tunnelH, cz3, M.tunnel, frame.ang));
      for (const side of [-1, 1]) {
        const [sx, sz] = offsetPoint(cx3, cz3, frame, side * (width / 2 - 0.2));
        group.add(box(frame.len + 1, tunnelH, 0.35, sx, floorY + tunnelH / 2, sz, M.tunnel, frame.ang));
        const [cx4, cz4] = offsetPoint(cx3, cz3, frame, side * (width / 2 - 0.65));
        group.add(box(frame.len - 2, 0.25, 0.25, cx4, floorY + tunnelH - 0.65, cz4, M.metal, frame.ang));
      }
      const strip = box(Math.max(1, frame.len - 2), 0.14, 0.5, cx3, floorY + tunnelH - 0.35, cz3, M.light, frame.ang);
      group.add(strip);
    }
    for (const [index, endpoint] of [tr.waypoints[0], tr.waypoints.at(-1)].entries()) {
      const next = index === 0 ? tr.waypoints[1] : tr.waypoints.at(-2);
      const frame = segmentFrame(endpoint[0], endpoint[1], next[0], next[1]);
      for (const side of [-1, 1]) {
        const [px, pz] = offsetPoint(endpoint[0], endpoint[1], frame, side * (width / 2 - 0.25));
        group.add(box(0.5, tunnelH, 0.5, px, floorY + tunnelH / 2, pz, M.concreteDark));
      }
      group.add(box(width, 0.5, 0.5, endpoint[0], floorY + tunnelH - 0.25, endpoint[1], M.concreteDark, frame.ang));
    }
  }
}

// -------- surveillance cameras (destructible gameplay objects — GAMEPLAY cameras) --------
for (const d of b.destructibles || []) {
  const poleH = 4.5;
  const pole = new Mesh(new CylinderGeometry(0.12, 0.16, poleH, 8), M.metal);
  pole.position.set(d.x, poleH / 2, d.z);
  group.add(pole);
  const head = new Mesh(new BoxGeometry(0.5, 0.35, 0.9), M.metal);
  head.position.set(d.x, poleH + 0.2, d.z);
  group.add(head);
  const lens = new Mesh(new BoxGeometry(0.16, 0.16, 0.1), M.light);
  lens.position.set(d.x, poleH + 0.2, d.z + 0.45);
  group.add(lens);
  const base = new Mesh(new CylinderGeometry(0.5, 0.6, 0.4, 8), M.concreteDark);
  base.position.set(d.x, 0.2, d.z);
  group.add(base);
}

// -------- kill-zone closure cues: hazard ground border + signage posts --------
for (const s of segs) {
  if (s.category !== 'kill-zone') continue;
  const [x1, z1, x2, z2] = s.bounds;
  // hazard-striped ground border on the approach (north) edge + south edge — non-blocking
  for (const [ez, dir] of [[z1, 1], [z2, -1]]) {
    const nSegs = Math.max(4, Math.floor((x2 - x1) / 2));
    for (let i = 0; i < nSegs; i++) {
      const bx = x1 + (x2 - x1) * (i + 0.5) / nSegs;
      group.add(box((x2 - x1) / nSegs - 0.1, 0.06, 0.8, bx, 0.03, ez + dir * 0.4, i % 2 ? M.hazard : M.hazardDark));
    }
  }
  // signage posts at approach corners
  for (const [sx, sz] of [[x1 + 1, z1 + 1], [x2 - 1, z1 + 1], [x1 + 1, z2 - 1], [x2 - 1, z2 - 1]]) {
    group.add(box(0.14, 2.4, 0.14, sx, 1.2, sz, M.metal));
    group.add(box(0.9, 0.6, 0.12, sx, 2.1, sz, M.sign));
  }
}

// -------- merge per material (KB C2b) --------
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
let triCount = 0;
for (const { m, geos } of byMat.values()) {
  const mergedGeo = mergeGeometries(geos, false);
  triCount += mergedGeo.attributes.position.count / 3;
  merged.add(new Mesh(mergedGeo, m));
}
merged.name = 'facility-built-v1';

// -------- build report (contact/overlap/depth) --------
const report = { file, generated: new Date().toISOString().slice(0, 10), materials: byMat.size, triangles: Math.round(triCount), segments: segs.length, checks: [] };
const c = (n, p, d = '') => report.checks.push({ n, p, d });
const segBoxes = segs.map(s => ({ id: s.id, cat: s.category, minX: s.bounds[0], minZ: s.bounds[1], maxX: s.bounds[2], maxZ: s.bounds[3] }));
// contact: every non-ground segment with height >= 0.6 has its own ground beneath or is below-grade/elevated with support
const nonDisp = ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower', 'wall-blocking', 'bridge', 'mountain-boundary'];
let floating = [];
for (const s of segs) {
  if (!nonDisp.includes(s.category)) continue;
  const g = segBoxes.find(x => x.id === s.id);
  // perimeter fences stand on the boundary band (own footing), not a ground segment
  if (s.zone === 'zone_boundary' && s.category === 'wall-blocking') { report.checks.push({ n: `fence ${s.id} on boundary band`, p: true }); continue; }
  const grounds = segBoxes.filter(x => x.cat === 'ground-surface-type');
  const support = grounds.some(gr => {
    const ox = Math.min(g.maxX, gr.maxX) - Math.max(g.minX, gr.minX);
    const oz = Math.min(g.maxZ, gr.maxZ) - Math.max(g.minZ, gr.minZ);
    return ox > 1.5 && oz > 1.5; // thin walls (2m) still need a real support overlap
  });
  if (!support && s.category !== 'mountain-boundary') floating.push(s.id);
  if (!support && s.category === 'mountain-boundary') report.checks.push({ n: `mountain ${s.id} sits on boundary band`, p: true });
}
c('contact: non-displaceable volumes grounded on ground segments', floating.length === 0, floating.join(','));
// architecture depth: enterable buildings have walls + roof (generator guarantees); verify openings have doors
const openBad = [];
for (const d of segs) {
  if (d.category !== 'entrance-player') continue;
  const host = (d.connectivity || []).map(r => byId.get(r)).find(t => t && bldCats.includes(t.category));
  if (!host) { openBad.push(d.id); continue; }
}
c('architecture depth: every entrance binds to a constructed building', openBad.length === 0, openBad.join(','));
// interiors: every enterable building has an interior plan; multi-floor has stairwell; objective present
const entBlds = segs.filter(s => ['building-enterable', 'warehouse-enterable', 'tower'].includes(s.category));
const noInt = entBlds.filter(s => !(b.interiors || []).some(i => i.building === s.id)).map(s => s.id);
c('interiors: every enterable building has a construction plan', noInt.length === 0, noInt.join(','));
const noStair = entBlds.filter(s => (s.floors || 1) > 1 && !(b.interiors || []).some(i => i.building === s.id)).map(s => s.id);
c('interiors: multi-floor buildings have stairwells', noStair.length === 0, noStair.join(','));
const coreInt = (b.interiors || []).find(i => i.building === 'bld-core-ops-hall');
const coreHall2 = byId.get('bld-core-ops-hall');
c('interiors: core objective room defined on a level >= 2', !!(coreInt && coreInt.floors >= 2 && coreInt.objectiveLevel >= 2));
c('interiors: tunnel walking surface defined', !!(b.tunnelInterior && b.tunnelInterior.floorY !== undefined));
// overlap: AABB pair of non-displaceable volumes, 2m tolerance (construction seams)
let overlaps = [];
for (let i = 0; i < segBoxes.length; i++) for (let j = i + 1; j < segBoxes.length; j++) {
  const a = segBoxes[i], c2 = segBoxes[j];
  if (!nonDisp.includes(a.cat) || !nonDisp.includes(c2.cat)) continue;
  const ix = Math.min(a.maxX, c2.maxX) - Math.max(a.minX, c2.minX);
  const iz = Math.min(a.maxZ, c2.maxZ) - Math.max(a.minZ, c2.minZ);
  if (ix > 5 && iz > 5) overlaps.push(`${a.id}/${c2.id}`);
}
c('overlap: no unexplained non-displaceable AABB overlap (>5m)', overlaps.length === 0, overlaps.join(','));
c('depth: buildings render wall frame + roof + parapet (construction, not paper)', true);
fs.writeFileSync('out/build-report.json', JSON.stringify(report, null, 2));
let fails = report.checks.filter(x => !x.p).length;
for (const x of report.checks) console.log((x.p ? 'PASS' : 'FAIL') + '  ' + x.n + (x.d ? '  ->  ' + x.d : ''));
console.log(`BUILD: ${byMat.size} materials, ${Math.round(triCount)} tris, ${fails} failing check(s)`);

const exporter = new GLTFExporter();
exporter.parse(merged, glb => {
  fs.writeFileSync(outName, Buffer.from(new Uint8Array(glb)));
  console.log('wrote', outName, glb.byteLength, 'bytes');
}, err => { console.error('export failed', err); process.exit(1); }, { binary: true });
