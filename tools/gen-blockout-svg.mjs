#!/usr/bin/env node
// gen-blockout-svg.mjs — top-down orthographic SVG of a blockout (VM-safe, no deps).
// Usage: node tools/gen-blockout-svg.mjs [blockout.json] [out.svg]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? 'blockout/blockout-map-full.json';
const dst = process.argv[3] ?? 'out/' + src.split('/').pop().replace('.json', '.svg');
const b = JSON.parse(readFileSync(join(root, src), 'utf8'));
const CATCOL = { 'ground-surface-type':'#8a8a8a','warehouse-enterable':'#7a6a4a','building-enterable':'#8a8a9a',
  'service-pressure':'#9a8a3a','wall-blocking':'#6a6a6a','entrance-player':'#2a8a2a','cover':'#2a6a2a',
  'kill-zone':'#aa2a2a','spawn':'#6a2a8a','bridge':'#8a8a8a','tunnel-passage':'#3a3a4a',
  'overhead-cover':'#2a9a9a','hole-drone-entry':'#aa6a2a' };
const S = 768, PAD = 24, X = v => PAD + v, Y = v => PAD + (S - v); // north up
const p = [`<svg xmlns="http://www.w3.org/2000/svg" width="${S+2*PAD}" height="${S+2*PAD}" viewBox="0 0 ${S+2*PAD} ${S+2*PAD}"><rect width="${S+2*PAD}" height="${S+2*PAD}" fill="#101316"/>`];
for (const s of b.segments){ if(!s.bounds) continue;
  const [a,c]=s.bounds.min,[d,e]=s.bounds.max;
  p.push(`<rect x="${X(a)}" y="${Y(e)}" width="${d-a}" height="${e-c}" fill="${CATCOL[s.category]||'#555'}" stroke="#000"/>`); }
p.push(`<text x="${PAD}" y="${S+PAD-4}" fill="#889" font-family="monospace" font-size="12">VEXEA Facility 01 - LLM Center | ${b.slice} | ${b.segments.length} segments (top-down, north up)</text></svg>`);
mkdirSync(join(root,'out'),{recursive:true});
writeFileSync(join(root,dst), p.join(''));
console.log('wrote', dst, '('+b.segments.length+' segments)');
