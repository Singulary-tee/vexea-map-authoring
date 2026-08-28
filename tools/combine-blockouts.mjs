#!/usr/bin/env node
// combine-blockouts.mjs — merge slice + campus-coarse into one full-map blockout deliverable.
// Usage: node tools/combine-blockouts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

const slice = read('blockout/blockout-slice-cw.json');
const campus = read('blockout/blockout-campus-coarse.json');
const segs = [...slice.segments, ...campus.segments];
const ids = segs.map(s => s.id);
const dups = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
if (dups.length) { console.error('DUPLICATE IDs:', dups.join(',')); process.exit(1); }

const full = {
  format: 'vexea-blockout/0.1',
  map: 'map_1_facility',
  slice: 'full-map',
  fixture: 'spec/calibration.md',
  snapGrid: { major: 10, minor: 1 },
  zones: ['zone_spawn','zone_courtyard','zone_warehouse','zone_plant','zone_core','zone_tunnels','zone_bridge'],
  detail: { 'courtyard-warehouse': 'detailed', 'other-zones': 'coarse' },
  segments: segs,
  openQuestions: [...slice.openQuestions, ...campus.openQuestions]
};
const out = join(root, 'blockout/blockout-map-full.json');
writeFileSync(out, JSON.stringify(full, null, 2));
console.log(`merged ${slice.segments.length}+${campus.segments.length}=${segs.length} segments -> blockout/blockout-map-full.json`);