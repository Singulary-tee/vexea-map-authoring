#!/usr/bin/env node
// gen-pve-reports: cover-bindings.json + verticality-report.json from blockout data.
// Cover bindings: every cover -> named lane/segment it interrupts, threat + height class,
// and the tactical tradeoff if removed. Verticality: every elevation element with gauge,
// purpose, capsule check. Gates: every cover bound to a real lane; every vertical element
// has a purpose; consistent clearance registry.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const segs = b.segments, byId = new Map(segs.map(s => [s.id, s]));
const routes = b.routes;
const routeIds = new Set(routes.map(r => r.id));
const warnings = [];
const covers = [];
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const cv = s.cover || {};
  const toks = (cv.interrupts || '').toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  const lanes = toks.filter(t => routeIds.has(t) || byId.has(t));
  if (lanes.length === 0) warnings.push(`cover ${s.id}: no bound lane`);
  covers.push({
    id: s.id, zone: s.zone, name: s.name,
    heightClass: cv.heightClass, threatElevation: cv.threatElevation,
    directionality: cv.directionality, interrupts: cv.interrupts,
    boundLanes: lanes, dimensions: { w: s.bounds[2] - s.bounds[0], d: s.bounds[3] - s.bounds[1], h: s.height },
    removedBreaks: cv.removedBreaks || 'unbound decision point on ' + lanes.join(','),
    gatePass: lanes.length > 0,
  });
}
const vertical = b.vertical.map(v => {
  const host = byId.get(v.host.split('/')[0]);
  const g = v.gauge || {};
  const ok = !!v.connects && !(g.rise && g.rise > 0.18) && (v.kind !== 'ramp' || (g.grade && parseFloat(String(g.grade).split(':')[1]) >= 12));
  if (!ok) warnings.push(`vertical ${v.id}: missing purpose or out-of-fixture gauge`);
  return {
    id: v.id, kind: v.kind, host: v.host, connects: v.connects, gauge: g,
    support: host ? `${host.id} (${host.category})` : 'recorded in vertical data',
    purpose: v.connects, capsuleOk: ok,
  };
});
const clearance = [];
for (const s of segs) {
  if (s.category === 'entrance-player') clearance.push({ kind: 'door', id: s.id, w: s.width ?? Math.min(s.bounds[2] - s.bounds[0], s.bounds[3] - s.bounds[1]), h: s.height, ok: (s.width ?? 1) >= 1 && s.height >= 2 });
  if (s.category === 'stair') clearance.push({ kind: 'stair', id: s.id, rise: s.gauge?.rise, tread: s.gauge?.tread, w: s.gauge?.width, ok: s.gauge?.rise <= 0.18 && s.gauge?.tread >= 0.28 && s.gauge?.width >= 1 });
  if (s.category === 'incline') clearance.push({ kind: 'incline', id: s.id, grade: s.gauge?.grade, w: s.gauge?.width, ok: (parseFloat(String(s.gauge?.grade).split(':')[1]) >= 12) && s.gauge?.width >= 1 });
  if (s.category === 'tunnel-passage') clearance.push({ kind: 'tunnel', id: s.id, h: s.height, w: s.width, ok: s.height >= 2.4 && s.width >= 1 });
  if (s.category === 'hole-drone-entry') clearance.push({ kind: 'drone-hole', id: s.id, clearWidth: s.clearWidth, ok: s.clearWidth >= 2 });
}
const report = { file, generated: new Date().toISOString().slice(0, 10), covers: covers.length, vertical: vertical.length, clearance: clearance.length, warnings };
const md = [
  `# PvE Reports`, ``, `File: ${file}`, ``,
  `## Cover bindings (${covers.length})`, ``,
  `| Cover | Zone | Class | Threat | Direction | Breaks |`,
  `|---|---|---|---|---|---|`,
  ...covers.map(c => `| ${c.id} | ${c.zone} | ${c.heightClass} | ${c.threatElevation} | ${c.directionality.split(';')[0]} | ${c.boundLanes.join(', ')} |`),
  ``, `## Vertical transitions (${vertical.length})`, ``,
  `| Id | Kind | Host | Connects | Gauge | Capsule |`,
  `|---|---|---|---|---|---|`,
  ...vertical.map(v => `| ${v.id} | ${v.kind} | ${v.host} | ${v.connects} | ${JSON.stringify(v.gauge)} | ${v.capsuleOk ? 'OK' : 'FAIL'} |`),
  ``, `## Clearance registry (${clearance.length})`, ``,
  `| Kind | Id | Size | Capsule |`,
  `|---|---|---|---|`,
  ...clearance.map(c => `| ${c.kind} | ${c.id} | ${'w' in c ? (c.w + 'w') : ''}${'h' in c ? (c.h + 'h') : ''}${'rise' in c ? (c.rise + 'r') : ''}${'grade' in c ? (c.grade) : ''}${'clearWidth' in c ? (c.clearWidth + 'cw') : ''} | ${c.ok ? 'OK' : 'FAIL'} |`),
  ``, `## Warnings`, ...(warnings.length ? warnings.map(w => `- ${w}`) : ['- none']), ``,
].join('\n');
mkdirSync('out', { recursive: true });
writeFileSync('out/cover-bindings.json', JSON.stringify({ report }, null, 2));
writeFileSync('out/verticality-report.json', JSON.stringify({ vertical, clearance }, null, 2));
writeFileSync('out/pve-reports.md', md);
process.exit(warnings.length ? 1 : 0);
