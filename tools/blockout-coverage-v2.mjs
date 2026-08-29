#!/usr/bin/env node
// blockout-coverage-v2.mjs — measures 2D tiling quality of a v0.2 blockout:
//   pairwise zone overlaps (area), world coverage %, largest empty pockets.
// Below-grade zones (tunnels) are excluded from overlap checks (they pass UNDER
// at-grade zones) but their footprints count as covered.
// Usage: node tools/blockout-coverage-v2.mjs blockout/blockout-v2.json
import { readFileSync } from 'node:fs';
const path = process.argv[2] ?? 'blockout/blockout-v2.json';
const b = JSON.parse(readFileSync(path, 'utf8'));
const W = b.world;
const zones = (b.zones ?? []).filter(z => z.bounds);
const atGrade = zones.filter(z => !z.belowGradeY);
const below = zones.filter(z => z.belowGradeY);

// --- pairwise overlap among at-grade zones (grid-sampled, 4m cell) ---
const CELL = 4;
const NX = Math.ceil((W.xMax - W.xMin) / CELL), NZ = Math.ceil((W.zMax - W.zMin) / CELL);
const owner = new Int16Array(NX * NZ).fill(-1); // -1 empty, -2 contested
let contested = 0, covered = 0;
const claim = (z, idx) => { if (owner[idx] === -1) { owner[idx] = z; covered++; } else if (owner[idx] !== z && owner[idx] !== -2) { owner[idx] = -2; contested++; } };
const zoneIdx = new Map(zones.map((z, i) => [z.id, i]));
for (const z of zones) {
  const [a, c, d, e] = z.bounds;
  for (let gx = Math.floor((a - W.xMin) / CELL); gx < Math.ceil((c - W.xMin) / CELL); gx++)
    for (let gz = Math.floor((d - W.zMin) / CELL); gz < Math.ceil((e - W.zMin) / CELL); gz++)
      if (gx >= 0 && gx < NX && gz >= 0 && gz < NZ) claim(zoneIdx.get(z.id), gz * NX + gx);
}
const contestedM2 = contested * CELL * CELL;
const worldM2 = (W.xMax - W.xMin) * (W.zMax - W.zMin);
const coverage = ((covered) / (NX * NZ)) * 100;

// --- pairwise rect overlap list (exact, at-grade only) ---
const overlaps = [];
for (let i = 0; i < atGrade.length; i++) for (let j = i + 1; j < atGrade.length; j++) {
  const A = atGrade[i].bounds, B = atGrade[j].bounds;
  const ix = Math.min(A[1], B[1]) - Math.max(A[0], B[0]);
  const iz = Math.min(A[3], B[3]) - Math.max(A[2], B[2]);
  if (ix > 0 && iz > 0) overlaps.push(`${atGrade[i].id} x ${atGrade[j].id}: ${ix}x${iz}m (${(ix * iz)}m2)`);
}

// --- largest empty square (grid scan) ---
let best = 0, bestAt = null;
const dp = new Int16Array(NX * NZ);
for (let gz = 0; gz < NZ; gz++) for (let gx = 0; gx < NX; gx++) {
  const i = gz * NX + gx;
  if (owner[i] === -1) { dp[i] = (gx && gz) ? Math.min(dp[i - 1], dp[i - NX], dp[i - NX - 1]) + 1 : 1;
    if (dp[i] > best) { best = dp[i]; bestAt = [W.xMin + gx * CELL, W.zMin + gz * CELL]; } }
  else dp[i] = 0;
}

console.log(`WORLD ${W.xMax - W.xMin}x${W.zMax - W.zMin}m  cells ${NX}x${NZ}@${CELL}m`);
console.log(`coverage: ${coverage.toFixed(1)}%  (empty ${(100 - coverage).toFixed(1)}% = ${((NX * NZ - covered) * CELL * CELL).toLocaleString()} m2)`);
console.log(`at-grade overlap: ${contestedM2.toLocaleString()} m2 across ${overlaps.length} pairs`);
for (const o of overlaps) console.log('  OVERLAP ' + o);
console.log(`largest empty square: ${best * CELL}m at (${bestAt?.[0]},${bestAt?.[1]})`);

const fails = [];
if (overlaps.length) fails.push(`${overlaps.length} overlapping at-grade zone pairs (${contestedM2.toLocaleString()} m2)`);
if (coverage < 88) fails.push(`coverage ${coverage.toFixed(1)}% < 88% (empty pockets)`);
if (best * CELL > 48) fails.push(`empty pocket ${best * CELL}m wide at (${bestAt?.[0]},${bestAt?.[1]})`);
console.log(fails.length ? '\nTILING FAILS:\n  - ' + fails.join('\n  - ') : '\nTILING CLEAN');
process.exit(fails.length ? 1 : 0);