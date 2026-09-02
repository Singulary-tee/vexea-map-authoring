#!/usr/bin/env node
// gen-v3-geometry: blockout-v3 -> procedural GLB. Seeded, deterministic, no art packs.
// Variation rule: not cubes, not 90-degrees-everywhere — chamfered footprints, parapets,
// roof machinery, raised bases. Grounded routes respected (validated upstream).
import fs from 'node:fs';
// FileReader shim for GLTFExporter on node (same as gen-slice-cw-geometry)
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(ab => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64'); this.onloadend?.(); }); }
};
const { Scene, Mesh, BoxGeometry, MeshStandardMaterial, Group, CylinderGeometry, Shape, ExtrudeGeometry, Vector2, BufferAttribute } = await import('three');
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');

const blockout = JSON.parse(fs.readFileSync(process.argv[2] || 'blockout/blockout-v3.json', 'utf8'));
const outName = process.argv[3] || 'editor/facility-v3.glb';

// deterministic PRNG (mulberry32)
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const group = new Group();
const matConcrete = new MeshStandardMaterial({ color: 0x8d9199, roughness: 0.92, metalness: 0.02 });
const matConcreteDark = new MeshStandardMaterial({ color: 0x6f757d, roughness: 0.95 });
const matRoof = new MeshStandardMaterial({ color: 0x565b63, roughness: 0.9 });
const matMetal = new MeshStandardMaterial({ color: 0x5a6570, roughness: 0.55, metalness: 0.55 });

function chamferFootprint(w, d, r) {
  // octagonal-ish footprint: rectangle with cut corners (Shape in XZ, extruded as Y)
  const hw = w / 2 - r, hd = d / 2 - r;
  const pts = [
    new Vector2(-hw - r, -hd), new Vector2(hw + r, -hd), new Vector2(hw + r, hd),
    new Vector2(hw, hd + r), new Vector2(hw, -hd - r + 2 * hd), // placeholder, rebuilt below
  ];
  // clean octagon
  const o = [
    new Vector2(-hw - r, -hd), new Vector2(hw + r, -hd),
    new Vector2(hw + r, hd), new Vector2(hw, hd + r),
    new Vector2(-hw, hd + r), new Vector2(-hw - r, hd),
  ];
  return new Shape(o);
}

function building(s, rand) {
  const g = new Group();
  const seed = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const randB = rng(seed * 977 + 13);
  const baseY = (s.raisedBase || 0);
  const chamfer = Math.min(s.w, s.d) * (0.10 + randB() * 0.10); // 10-20% corner cut => not 90-deg everywhere
  const shape = chamferFootprint(s.w, s.d, chamfer);
  const geo = new ExtrudeGeometry(shape, { depth: s.h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new Mesh(geo, matConcrete);
  m.position.set(s.x, baseY, s.z);
  g.add(m);
  if (baseY > 0) { // raised plinth slightly wider
    const pl = new Mesh(new BoxGeometry(s.w + 6, baseY, s.d + 6), matConcreteDark);
    pl.position.set(s.x, baseY / 2, s.z);
    g.add(pl);
  }
  // parapet ring (visual read: roof edge)
  const pw = 0.8, ph = 1.2;
  for (const [dx, dz, ww, dd] of [[0, s.d / 2, s.w, pw], [0, -s.d / 2, s.w, pw], [s.w / 2, 0, pw, s.d], [-s.w / 2, 0, pw, s.d]]) {
    const p = new Mesh(new BoxGeometry(ww, ph, dd), matConcreteDark);
    p.position.set(s.x + dx, baseY + s.h + ph / 2, s.z + dz);
    g.add(p);
  }
  // roof machinery: 1-3 seeded boxes + a vent cylinder
  const n = 1 + Math.floor(randB() * 3);
  for (let i = 0; i < n; i++) {
    const bw = 3 + randB() * 8, bd = 3 + randB() * 6, bh = 2 + randB() * 3;
    const bx = (randB() - 0.5) * (s.w - bw - 8), bz = (randB() - 0.5) * (s.d - bd - 8);
    const box = new Mesh(new BoxGeometry(bw, bh, bd), randB() > 0.5 ? matRoof : matMetal);
    box.position.set(s.x + bx, baseY + s.h + bh / 2, s.z + bz);
    g.add(box);
  }
  const vent = new Mesh(new CylinderGeometry(1.4, 1.4, 3.5, 10), matMetal);
  vent.position.set(s.x + (randB() - 0.5) * s.w * 0.5, baseY + s.h + 1.75, s.z + (randB() - 0.5) * s.d * 0.5);
  g.add(vent);
  // floor banding: one dark inset band per 2 floors
  if (s.floors >= 2) {
    const band = new Mesh(new BoxGeometry(s.w + 0.4, 0.9, s.d + 0.4), matConcreteDark);
    band.position.set(s.x, baseY + s.h * 0.45, s.z);
    g.add(band);
  }
  return g;
}

for (const s of blockout.structures) group.add(building(s));

// below-grade tunnel: dark trench (visual negative space along waypoints)
const tunnel = blockout.vertical.find(v => v.type === 'belowGrade');
if (tunnel) {
  const wp = tunnel.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [x1, z1] = wp[i], [x2, z2] = wp[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const seg = new Mesh(new BoxGeometry(len, 6, 10), matConcreteDark);
    seg.position.set((x1 + x2) / 2, -3.05, (z1 + z2) / 2);
    seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(seg);
  }
}

// grounded route ribbons (roads) — validator guarantees they avoid buildings
const matRoad = new MeshStandardMaterial({ color: 0x494c50, roughness: 0.98 });
for (const r of blockout.routes) {
  if (r.kind === 'tunnel') continue;
  const wp = r.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [x1, z1] = wp[i], [x2, z2] = wp[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1) + 4;
    const seg = new Mesh(new BoxGeometry(len, 0.15, r.kind === 'covered' ? 5 : 9), matRoad);
    seg.position.set((x1 + x2) / 2, 0.08, (z1 + z2) / 2);
    seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(seg);
  }
}
// water edge: big plane east/south of the water polyline (visual stand-in)
const water = new Mesh(new BoxGeometry(500, 0.1, 900), new MeshStandardMaterial({ color: 0x2e5d7a, roughness: 0.25, metalness: 0.1 }));
water.position.set(560, 0.05, -40);
// ---- DETAIL PASS (grammar families) ----
const matRib = new MeshStandardMaterial({ color: 0x77808a, roughness: 0.75, metalness: 0.3 });
const matGlass = new MeshStandardMaterial({ color: 0x2c3844, roughness: 0.2, metalness: 0.6 });
const matPipe = new MeshStandardMaterial({ color: 0xb08a2e, roughness: 0.55, metalness: 0.5 });
const matCover = new MeshStandardMaterial({ color: 0x707a66, roughness: 0.9 });

// facade ribs (warehouse family): seeded rhythm, not on enterable face near ground
for (const s of blockout.structures) {
  const seed = [...s.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = rng(seed * 313 + 7);
  const bay = 8 + Math.floor(r() * 3) * 2; // 8/10/12 bay rhythm
  const ribH = s.h - 1.5;
  for (let x = -s.w / 2 + bay / 2; x < s.w / 2; x += bay) {
    const rib = new Mesh(new BoxGeometry(0.25, ribH, 0.35), matRib);
    rib.position.set(s.x + x, (s.raisedBase || 0) + ribH / 2 + 0.5, s.z + s.d / 2 + 0.15);
    group.add(rib);
  }
  // admin blocks: window grid on the long face
  if (s.floors >= 2) {
    const fh = s.h / s.floors;
    for (let f = 0; f < s.floors; f++) {
      for (let x = -s.w / 2 + 3; x < s.w / 2 - 2; x += 5.5) {
        const win = new Mesh(new BoxGeometry(1.8, fh * 0.5, 0.2), matGlass);
        win.position.set(s.x + x, (s.raisedBase || 0) + fh * (f + 0.65), s.z + s.d / 2 + 0.05);
        group.add(win);
      }
    }
  }
}

// pipe racks along covered routes (grammar: supportEvery 6, elevation 3)
const matSupport = matMetal;
for (const r of blockout.routes) {
  if (r.kind !== 'covered') continue;
  const wp = r.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [x1, z1] = wp[i], [x2, z2] = wp[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = -Math.atan2(z2 - z1, x2 - x1);
    const nSup = Math.max(2, Math.floor(len / 6));
    for (let k = 0; k <= nSup; k++) {
      const t = k / nSup;
      const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
      const col = new Mesh(new CylinderGeometry(0.18, 0.18, 3, 8), matSupport);
      col.position.set(px, 1.5, pz);
      group.add(col);
    }
    for (const [dy, dr] of [[3.0, 0.3], [3.35, 0.22]]) {
      const pipe = new Mesh(new CylinderGeometry(dr, dr, len, 8), matPipe);
      pipe.rotation.z = Math.PI / 2; pipe.rotation.y = ang;
      pipe.position.set((x1 + x2) / 2, dy, (z1 + z2) / 2);
      group.add(pipe);
    }
  }
}

// cover objects: grammar bands along ground routes — low (jump-over), mid (crouch), full (breaks sightline)
const b = blockout;
for (const r of b.routes) {
  if (r.kind === 'tunnel') continue;
  const wp = r.waypoints;
  for (let i = 0; i < wp.length - 1; i++) {
    const [x1, z1] = wp[i], [x2, z2] = wp[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const seed = (x1 * 7919 + z1 * 104729 + i) | 0;
    const rand = rng(seed);
    const n = Math.floor(len / 22);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.3 + rand() * 0.4) / n;
      const px = x1 + (x2 - x1) * t + (rand() - 0.5) * 10;
      const pz = z1 + (z2 - z1) * t + (rand() - 0.5) * 10;
      // skip if inside any structure footprint (validator: no unexplained overlaps)
      const inB = b.structures.some(s => Math.abs(px - s.x) < s.w / 2 + 2 && Math.abs(pz - s.z) < s.d / 2 + 2);
      if (inB) continue;
      const roll = rand();
      let cw, chh, cd;
      if (roll < 0.45) { cw = 2.4; chh = 0.45 + rand() * 0.15; cd = 1.2; }       // low band
      else if (roll < 0.8) { cw = 3.2; chh = 0.9 + rand() * 0.5; cd = 1.4; }     // mid band
      else { cw = 4.5; chh = 1.6 + rand() * 0.1; cd = 0.9; }                     // full band
      const c = new Mesh(new BoxGeometry(cw, chh, cd), matCover);
      c.rotation.y = rand() * Math.PI;
      c.position.set(px, chh / 2, pz);
      group.add(c);
    }
  }
}

const exporter = new GLTFExporter();
group.add(water);

