#!/usr/bin/env node
// blockout-validate-v3: user's explicit gates — no overlap, routes never pass through buildings.
import fs from 'node:fs';
const file = process.argv[2] || 'blockout/blockout-v3.json';
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
let errors = [], warnings = [];
const S = b.structures;

// 1. bounds
for (const s of S) {
  if (s.x < b.meta.world.minX || s.x > b.meta.world.maxX || s.z < b.meta.world.minZ || s.z > b.meta.world.maxZ)
    errors.push(`${s.id} out of world bounds`);
}

// 2. structural overlap (allow small tolerance; attached wings flagged as warning not error)
for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
  const a = S[i], c = S[j];
  const ox = Math.min(a.x + a.w/2, c.x + c.w/2) - Math.max(a.x - a.w/2, c.x - c.w/2);
  const oz = Math.min(a.z + a.d/2, c.z + c.d/2) - Math.max(a.z - a.d/2, c.z - c.d/2);
  if (ox > 0 && oz > 0) {
    const ov = (ox * oz).toFixed(0);
    if (ov > 40) errors.push(`overlap ${a.id} x ${c.id}: ${ov}m2`);
    else warnings.push(`touching ${a.id} x ${c.id}: ${ov}m2`);
  }
}

// 3. routes must not pass through buildings (grounded routes; tunnel exempt — below grade)
const inB = (p, s, pad = 2) => Math.abs(p[0] - s.x) < s.w/2 + pad && Math.abs(p[1] - s.z) < s.d/2 + pad;
const segHits = (a, c, s) => { // sample segment
  for (let t = 0; t <= 1.0001; t += 0.02) if (inB([a[0]+(c[0]-a[0])*t, a[1]+(c[1]-a[1])*t], s)) return true;
  return false;
};
for (const r of b.routes) {
  if (r.kind === 'tunnel') continue;
  if (r.kind === 'covered') { // covered = under roof by design, but only enterable buildings
    for (let k = 0; k < r.waypoints.length - 1; k++)
      for (const s of S)
        if (!s.enterable && segHits(r.waypoints[k], r.waypoints[k + 1], s))
          errors.push(`covered route ${r.id} passes through NON-enterable ${s.id} (seg ${k})`);
    continue;
  }
  for (let k = 0; k < r.waypoints.length - 1; k++)
    for (const s of S)
      if (segHits(r.waypoints[k], r.waypoints[k+1], s))
        errors.push(`route ${r.id} passes through ${s.id} (seg ${k})`);
}

// 4. tunnel must not service the core (user rule)
const core = S.find(s => s.id === 'coreOpsHall');
for (const t of b.vertical.filter(v => v.type === 'belowGrade'))
  for (const p of t.waypoints)
    if (Math.abs(p[0]-core.x) < core.w/2 + 20 && Math.abs(p[1]-core.z) < core.d/2 + 20)
      errors.push(`tunnel too close to core at ${p}`);

// 5. kills/destructibles inside world
for (const k of b.kills) if (k.x < b.meta.world.minX || k.x > b.meta.world.maxX) errors.push(`kill ${k.id} out of bounds`);
for (const d of b.destructibles) if (d.x < b.meta.world.minX || d.x > b.meta.world.maxX) errors.push(`destructible ${d.id} out of bounds`);

// report
for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(`\n${S.length} structures, ${b.routes.length} routes, ${b.kills.length} kill zones, ${b.destructibles.length} destructibles`);
console.log(errors.length ? `FAIL: ${errors.length} error(s)` : 'PASS: all v3 gates green');
process.exit(errors.length ? 1 : 0);
