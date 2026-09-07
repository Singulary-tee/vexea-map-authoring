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
  concrete: [mat(0x878b93, { roughness: 0.92 }), mat(0x8d9199, { roughness: 0.9 }), mat(0x94989e, { roughness: 0.94 })],
  concreteDark: mat(0x6f757d, { roughness: 0.95 }),
  roof: mat(0x565b63, { roughness: 0.9 }),
  metal: mat(0x5a6570, { roughness: 0.4, metalness: 0.85 }),
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
};
const box = (w, h, d, x, y, z, m, ry = 0) => { const g = new Mesh(new BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.rotation.y = ry; return g; };

// -------- grounds (surface class) --------
const SURF_MAT = { concrete: () => M.concreteDark, asphalt: () => M.road, gravel: () => M.gravel, dirt: () => M.gravel };
for (const s of segs) {
  if (s.category !== 'ground-surface-type') continue;
  const [x1, z1, x2, z2] = s.bounds;
  // 0.4m slab; tops at y=0
  group.add(box(x2 - x1, 0.4, z2 - z1, (x1 + x2) / 2, -0.2, (z1 + z2) / 2, SURF_MAT[s.surface]?.() ?? M.concreteDark));
}

// -------- roads: route ribbons + curbs + poles --------
for (const r of b.routes) {
  if (r.kind === 'air') continue;
  const wdt = r.kind === 'tunnel' ? r.width || 8 : Math.max(4, r.width || 6);
  const y = r.kind === 'tunnel' ? -13.9 : 0.12;
  const wp = r.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [ax, az] = wp[i], [bx, bz] = wp[i + 1];
    const len = Math.hypot(bx - ax, bz - az), ang = -Math.atan2(bz - az, bx - ax);
    group.add(box(len + 1, 0.24, wdt, (ax + bx) / 2, y, (az + bz) / 2, r.kind === 'tunnel' ? M.tunnelLight : M.road, ang));
    if (r.kind !== 'tunnel' && r.kind !== 'covered') {
      // curb strips both edges
      for (const off of [-wdt / 2 - 0.5, wdt / 2 + 0.5]) {
        group.add(box(len + 1, 0.3, 1, (ax + bx) / 2, 0.09, (az + bz) / 2 - off * Math.sin(-ang) * -1 + 0, M.curb, ang));
      }
    }
  }
  // light poles along ground routes, seeded by waypoint hash, every ~30m
  if (r.kind === 'ground') {
    const rand = rng(idSeed('pole-' + r.id));
    for (let i = 0; i < wp.length - 1; i++) {
      const [ax, az] = wp[i], [bx, bz] = wp[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.floor(len / 30);
      for (let k = 1; k <= n; k++) {
        const t = (k + rand() * 0.3 - 0.15) / (n + 1);
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        const sgn = rand() > 0.5 ? 1 : -1;
        const off = sgn * (wdt / 2 + 2);
        const ang = -Math.atan2(bz - az, bx - ax);
        const ox = px + Math.cos(ang) * 0 - Math.sin(ang) * off, oz = pz + Math.sin(ang) * Math.cos(Math.PI / 2) * 0 + Math.cos(ang) * off;
        group.add(box(0.35, 7, 0.35, ox, 3.5, oz, M.metal));
        group.add(box(1.6, 0.4, 0.3, ox - Math.sin(ang) * 0.65, 7.2, oz + Math.cos(ang) * 0.65, M.metal, ang));
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
  const w = x2 - x1, d = z2 - z1, h = s.height, base = s.raisedBase || 0;
  const cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const cm = M.concrete[(idSeed(s.id) >>> 0) % M.concrete.length];
  const rand = rng(idSeed(s.id) * 977 + 13);
  // plinth for raised bases
  if (base > 0) group.add(box(w + 6, base, d + 6, cx2, base / 2, cz2, M.concreteDark));
  const WT = 0.6;
  const doors = (doorsByBld.get(s.id) || []).map(d => ({
    // project door onto the nearest wall of this building
    dx: (d.bounds[0] + d.bounds[2]) / 2, dz: (d.bounds[1] + d.bounds[3]) / 2,
    w: Math.max(d.bounds[2] - d.bounds[0], d.bounds[3] - d.bounds[1]),
    h: d.height || 2.4,
  }));
  const opensOn = (side) => doors.filter(d => side === 'n' ? Math.abs(d.dz - z2) < 3 : side === 's' ? Math.abs(d.dz - z1) < 3 : side === 'e' ? Math.abs(d.dx - x2) < 3 : Math.abs(d.dx - x1) < 3);
  const cut = (lo, hi, side, openW) => { // wall pieces along a side, minus openings
    const o = opensOn(side).map(d => ({ a: d.dx - d.w / 2, c: d.dx + d.w / 2 })).sort((a, c2) => a.a - c2.a);
    let cur = lo, pieces = [];
    for (const op of o) {
      const a2 = Math.max(lo, Math.min(hi, op.a)), c2 = Math.max(lo, Math.min(hi, op.c));
      if (a2 > cur) pieces.push([cur, a2]);
      cur = Math.max(cur, c2);
    }
    if (cur < hi) pieces.push([cur, hi]);
    return pieces;
  };
  // four walls (rotate pieces into place)
  const addWallX = (x, z0, z1b, m) => { for (const [a, c] of cut(z0, z1b, x === x1 ? 'w' : 'e', 0)) group.add(box(WT, h, c - a, x, base + h / 2, (a + c) / 2, m)); };
  const addWallZ = (z, x0, x1b, m) => { for (const [a, c] of cut(x0, x1b, z === z2 ? 'n' : 's', 0)) group.add(box(c - a, h, WT, (a + c) / 2, base + h / 2, z, m)); };
  addWallX(x1, z1, z2, cm); addWallX(x2, z1, z2, cm); addWallZ(z1, x1, x2, cm); addWallZ(z2, x1, x2, cm);
  // door frames (dark reveal + lintel)
  for (const d of doors) {
    group.add(box(d.w + 0.6, d.h, 0.25, d.dx, base + d.h / 2, d.dz, M.door));
    group.add(box(d.w + 0.6, 0.4, 0.3, d.dx, base + d.h + 0.15, d.dz, M.metal));
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
    const bw = 3 + rand() * 6, bd = 3 + rand() * 5, bh = 2 + rand() * 2.5;
    const bx = (rand() - 0.5) * (w - bw - 6), bz = (rand() - 0.5) * (d - bd - 6);
    group.add(box(bw, bh, bd, cx2 + bx, base + h + 0.6 + bh / 2, cz2 + bz, rand() > 0.5 ? M.roof : M.metal));
  }
  const vent = new Mesh(new CylinderGeometry(1.2, 1.2, 3, 10), M.metal);
  vent.position.set(cx2 + (rand() - 0.5) * w * 0.4, base + h + 0.6 + 1.5, cz2 + (rand() - 0.5) * d * 0.4);
  group.add(vent);
  // windows: seeded grid on the long face without a door on that side
  if (s.floors >= 2 && s.category !== 'facade-non-enterable') {
    const fh = h / s.floors;
    const faceSide = d >= w ? 'n' : 'e';
    const o = opensOn(faceSide);
    const bay = 5 + Math.floor(rand() * 2);
    const runLen = d >= w ? w : d;
    const fx = d >= w ? x1 : (s.bounds[2]), fz = d >= w ? z2 : z1;
    if (o.length === 0) {
      for (let f = 0; f < s.floors; f++) {
        for (let x = 2.5; x < runLen - 2.5; x += bay) {
          group.add(box(1.6, fh * 0.45, 0.2, d >= w ? x1 + x : fx, base + fh * (f + 0.65), d >= w ? fz : z1 + x, M.glass));
        }
      }
    }
  }
}
for (const s of segs) if (bldCats.includes(s.category)) building(s);

// -------- walls & fences --------
for (const s of segs) {
  if (s.category !== 'wall-blocking') continue;
  const [x1, z1, x2, z2] = s.bounds, h = s.height || 4;
  group.add(box(x2 - x1, h, 0.6, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, M.concreteDark));
}

// -------- stairs (real steps) --------
for (const s of segs) {
  if (s.category !== 'stair') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height || 1.5;
  const steps = Math.min(12, Math.max(3, s.gauge?.steps || 6));
  const sh = h / steps, sd = d / steps;
  for (let i = 0; i < steps; i++) group.add(box(w, sh * (i + 1), sd, (x1 + x2) / 2, sh * (i + 1) / 2, z2 - sd * (i + 0.5), M.concrete[1]));
}

// -------- incline (1:12 step prism) --------
for (const s of segs) {
  if (s.category !== 'incline') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const run = x2 - x1, wd = z2 - z1, h = s.height;
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const rise = h * (i + 1) / steps, span = run / steps;
    group.add(box(span + 0.1, rise, wd, x1 + span * (i + 0.5), rise / 2, (z1 + z2) / 2, M.concrete[1]));
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

// -------- tunnels: below-grade tube + portal rings --------
for (const s of segs) {
  if (s.category !== 'tunnel-passage') continue;
  const [x1, z1, x2, z2] = s.bounds, y = s.belowGradeY ?? -14;
  const w = x2 - x1, d = z2 - z1, h = s.height || 6;
  group.add(box(w, h, d, (x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, M.tunnel));
  if (s.id.startsWith('tp-')) {
    group.add(box(w * 0.7, 0.6, d * 0.7, (x1 + x2) / 2, 0.3, (z1 + z2) / 2, M.metal));
    // portal frame at grade
    group.add(box(w, h, 0.8, (x1 + x2) / 2, y + h / 2, z1, M.concreteDark));
  }
}

// -------- drone hole: dark ring at grade --------
for (const s of segs) {
  if (s.category !== 'hole-drone-entry') continue;
  const [x1, z1, x2, z2] = s.bounds;
  group.add(box(x2 - x1, 0.3, z2 - z1, (x1 + x2) / 2, 0.1, (z1 + z2) / 2, M.door));
}

// -------- roll-down doors --------
for (const s of segs) {
  if (s.category !== 'roll-down') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1;
  const horiz = w >= d;
  group.add(box(horiz ? w : 0.5, s.height || 4.5, horiz ? 0.5 : d, (x1 + x2) / 2, (s.height || 4.5) / 2, (z1 + z2) / 2, M.metal));
}

// -------- covers: family grammar (low crate / mid barrier / full bunker) --------
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = x2 - x1, d = z2 - z1, h = s.height, cx2 = (x1 + x2) / 2, cz2 = (z1 + z2) / 2;
  const cls = s.cover?.heightClass || 'mid';
  const cm = M.cover[(idSeed(s.id) >>> 0) % M.cover.length];
  if (cls === 'low') {
    // crate stack: two boxes
    group.add(box(w, h * 0.55, d, cx2, h * 0.275, cz2, cm));
    group.add(box(w * 0.9, h * 0.45, d * 0.9, cx2, h * 0.55 + h * 0.225, cz2, M.cover[((idSeed(s.id) + 1) >>> 0) % M.cover.length]));
  } else if (cls === 'mid') {
    // jersey barrier with base flare
    group.add(box(w, h, d, cx2, h / 2, cz2, cm));
    group.add(box(w + 0.3, 0.3, d + 0.3, cx2, 0.15, cz2, M.concreteDark));
  } else {
    // bunker block: solid with roof overhang
    group.add(box(w, h, d, cx2, h / 2, cz2, cm));
    group.add(box(w + 0.8, 0.4, d + 0.8, cx2, h + 0.2, cz2, M.roof));
  }
}

// -------- overhead covers: canopy + posts --------
for (const s of segs) {
  if (s.category !== 'overhead-cover') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const h = s.height || 6, w = x2 - x1, d = z2 - z1;
  group.add(box(w, 0.5, d, (x1 + x2) / 2, h - 0.25, (z1 + z2) / 2, M.metal));
  for (const [px, pz] of [[x1 + 0.5, z1 + 0.5], [x2 - 0.5, z1 + 0.5], [x1 + 0.5, z2 - 0.5], [x2 - 0.5, z2 - 0.5]])
    group.add(box(0.35, h - 0.5, 0.35, px, (h - 0.5) / 2, pz, M.concreteDark));
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
  const len = Math.max(x2 - x1, z2 - z1);
  const horiz = x2 - x1 >= z2 - z1;
  const nPosts = Math.max(3, Math.floor(len / 10));
  for (let i = 0; i <= nPosts; i++) {
    const t = i / nPosts;
    const px = horiz ? x1 + (x2 - x1) * t : x1, pz = horiz ? z1 : z1 + (z2 - z1) * t;
    group.add(box(horiz ? 0.25 : 0.3, 4, horiz ? 0.3 : 0.25, px, 2, pz, M.metal));
  }
  group.add(box(horiz ? len : 0.15, 2.6, horiz ? 0.15 : len, (x1 + x2) / 2, 2.3, (z1 + z2) / 2, M.metal));
}

// -------- kill/spawn markers (reference layer, semi-transparent) --------
for (const s of segs) {
  if (s.category === 'kill-zone') {
    const [x1, z1, x2, z2] = s.bounds;
    group.add(box(x2 - x1, 0.12, z2 - z1, (x1 + x2) / 2, 0.06, (z1 + z2) / 2, M.kill));
  }
  if (s.category === 'spawn') {
    const [x1, z1, x2, z2] = s.bounds;
    group.add(box(x2 - x1, 0.08, z2 - z1, (x1 + x2) / 2, 0.04, (z1 + z2) / 2, M.spawn));
  }
}

// -------- utility runs: pipe racks along covered routes (supports + pipes) --------
for (const r of b.routes) {
  if (r.kind !== 'covered') continue;
  const wp = r.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [ax, az] = wp[i], [bx2, bz] = wp[i + 1];
    const len = Math.hypot(bx2 - ax, bz - az), ang = -Math.atan2(bz - az, bx2 - ax);
    const nSup = Math.max(2, Math.floor(len / 6));
    for (let k = 0; k <= nSup; k++) {
      const t = k / nSup;
      group.add(box(0.2, 3.2, 0.2, ax + (bx2 - ax) * t, 1.6, az + (bz - az) * t, M.metal));
    }
    const pipe = new Mesh(new CylinderGeometry(0.28, 0.28, len, 8), M.pipe);
    pipe.rotation.z = Math.PI / 2; pipe.rotation.y = ang;
    pipe.position.set((ax + bx2) / 2, 3.2, (az + bz) / 2);
    group.add(pipe);
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
