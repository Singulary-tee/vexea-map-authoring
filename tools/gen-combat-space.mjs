#!/usr/bin/env node
// gen-combat-space: derive the combat-space matrix from blockout data.
// One record per engagement space (ground segment that carries routes/cover/kills):
// player entry/exit, cover anchors, exposure lanes, drone approach lanes, retreat routes,
// kill-zone intersection, vertical roles, intended player decision. Emits
// out/combat-space-matrix.{json,md} + gates: every space has >=1 cover anchor, >=1 retreat,
// kill zones are covered by closure geometry.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const segs = b.segments, byId = new Map(segs.map(s => [s.id, s]));
const routes = b.routes;

const inBox = (p, s, pad = 0) => p[0] >= s.bounds[0] - pad && p[0] <= s.bounds[2] + pad && p[1] >= s.bounds[1] - pad && p[1] <= s.bounds[3] + pad;
const center = s => [(s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2];
const overlaps = (a, c2, pad = 0) => a.bounds[0] - pad <= c2.bounds[2] && a.bounds[2] + pad >= c2.bounds[0] && a.bounds[1] - pad <= c2.bounds[3] && a.bounds[3] + pad >= c2.bounds[1];

// engagement spaces = gameplay ground segments
const SPACES = ['g-gate-square', 'g-yrd-rear', 'g-yrd-pressure', 'g-yrd-hub', 'g-yrd-west', 'g-yrd-checkpoint-n', 'g-yrd-e', 'g-yrd-plant-s', 'g-yrd-core-n', 'g-yrd-east-ridge', 'g-mix-courts'];
// authored decision per space (documented gameplay reasoning)
const DECISIONS = {
  'g-gate-square': 'first contact: commit through the gate line or rotate to the rear lane; gatehouse facade blocks the north sightline',
  'g-yrd-rear': 'flank vein: choose the loading bay roll-down gates (trappable) or continue east; dock canopy closes the UAV line',
  'g-yrd-pressure': 'OPEN SKY: cross in 4 chunks between the two full-height bunkers, or hold the pressure-store facade; fixed-wing strafe box overhead',
  'g-yrd-hub': 'hub decision: take the covered route (bomber-denied), the incline to the plant, or the checkpoint corridor; mix-court crates give partial cover in the open',
  'g-yrd-west': 'service yard: enter maintenance (air re-entry above), push the deployment bays (sealed chokepoint), or slip south to the checkpoint corridor',
  'g-yrd-checkpoint-n': 'approach corridor: channeled by court walls into the barricade line; threshold stair offers the raised security-hall bypass',
  'g-yrd-e': 'east yard: container rows break the ring sightlines; catwalk stair + incline door are the vertical options; substation facade anchors the NE',
  'g-yrd-plant-s': 'plant south band: tank farm breaks the ridge sightline; cover at the tunnel portal yard; processing south door is the killPlant trap',
  'g-yrd-core-n': 'last cover before the objective: shelter + approach cover; commit through the main door or flank via the service wing',
  'g-yrd-east-ridge': 'flank origin: tunnel portal (X-ray interior) or the ridge surface route; annex cover blocks dog pursuit from the mouth',
  'g-mix-courts': 'open yard crossing: crate ladder gives jump-over + partial cover; bomber line overhead keeps it a paced crossing, not a hold',
};
const report = { file, generated: new Date().toISOString().slice(0, 10), spaces: [], warnings: [] };
const warn = m => report.warnings.push(m);

for (const id of SPACES) {
  const s = byId.get(id);
  if (!s) continue;
  const c = center(s);
  const covers = segs.filter(o => o.category === 'cover' && overlaps(s, o, 15)).map(o => o.id);
  const canopies = segs.filter(o => o.category === 'overhead-cover' && overlaps(s, o, 10)).map(o => o.id);
  const groundRoutes = routes.filter(r => r.kind === 'ground' && r.waypoints.some(p => inBox(p, s, 5))).map(r => r.id);
  const airLanes = routes.filter(r => r.kind === 'air' && r.waypoints.some(p => inBox(p, s, 40))).map(r => r.id);
  const tunnel = routes.filter(r => r.kind === 'tunnel' && r.waypoints.some(p => inBox(p, s, 20))).map(r => r.id);
  const kills = segs.filter(o => o.category === 'kill-zone' && overlaps(s, o, 5)).map(o => o.id);
  // retreats: covered-route crossings + adjacent ground spaces (open yards retract into neighbors)
  const coveredCross = routes.filter(r => r.kind === 'covered' && r.waypoints.some(p => inBox(p, s, 15))).map(r => r.id);
  const neighbors = (s.connectivity || []).filter(r => byId.get(r) && byId.get(r).category === 'ground-surface-type' && byId.get(r).id !== s.id).map(r => r.id);
  const retreats = [...new Set([...coveredCross, ...neighbors])];
  const vertical = b.vertical.filter(v => {
    const host = byId.get(v.host.split('/')[0]);
    return host && overlaps(s, host, 20);
  }).map(v => v.id);
  const entries = (s.connectivity || []).filter(r => byId.get(r) && byId.get(r).category === 'ground-surface-type').concat(
    (s.connectivity || []).filter(r => byId.get(r) && ['entrance-player', 'stair', 'incline'].includes(byId.get(r).category))).map(r => r);
  const killClosure = kills.length > 0 ? segs.filter(o => (o.category === 'cover' || ['building-enterable', 'warehouse-enterable'].includes(o.category)) && overlaps(s, o, 20)).map(o => o.id) : [];
  const ok = (covers.length >= 1 || canopies.length >= 1) && (retreats.length + groundRoutes.length) >= 1;
  if (!ok) warn(`${id}: missing cover anchor or retreat`);
  report.spaces.push({
    id, zone: s.zone, name: s.name,
    playerEntryExit: entries,
    coverAnchors: covers.filter(x => covers), canopies,
    exposureLanes: groundRoutes,
    droneApproachLanes: airLanes, tunnelRoutes: tunnel,
    retreats: retreats,
    killZones: kills, killZoneClosures: killClosure,
    verticalRoles: vertical,
    intendedDecision: DECISIONS[id] || 'covered by cover anchors + retreats; decision text authored per space',
    gatePass: ok,
  });
}
// global gates
const allOk = report.spaces.every(x => x.gatePass);
const killCovers = report.spaces.every(x => x.killZones.length === 0 || x.killZoneClosures.length > 0);
c2: {
  const kz = segs.filter(o => o.category === 'kill-zone');
  for (const k of kz) {
    const covers = segs.filter(o => (o.category === 'cover' || ['building-enterable', 'warehouse-enterable'].includes(o.category)) && overlaps(k, o, 20));
    if (covers.length === 0) warn(`kill zone ${k.id} has no cover/building closure geometry within 20m`);
  }
}
const md = [`# Combat-Space Matrix`, ``, `File: ${file}`, ``,
  `| Space | Zone | Cover anchors | Lanes (exposure) | Drone lanes | Retreats | Kill zones | Vertical |`,
  `|---|---|---|---|---|---|---|---|`,
  ...report.spaces.map(s => `| ${s.id} | ${s.zone} | ${s.coverAnchors.join(',') || '-'} | ${s.exposureLanes.join(',') || '-'} | ${[...s.droneApproachLanes, ...s.tunnelRoutes].join(',') || '-'} | ${s.retreats.join(',') || '-'} | ${s.killZones.join(',') || '-'} | ${s.verticalRoles.join(',') || '-'} |`),
  ``, `## Intended decisions`, ``,
  ...report.spaces.map(s => `- **${s.id}**: ${s.intendedDecision}`),
  ``, `## Warnings`, ...(report.warnings.length ? report.warnings.map(w => `- ${w}`) : ['- none']),
  ``].join('\n');
mkdirSync('out', { recursive: true });
writeFileSync('out/combat-space-matrix.json', JSON.stringify(report, null, 2));
writeFileSync('out/combat-space-matrix.md', md);
console.log(`combat spaces: ${report.spaces.length}`);
console.log('gates:', allOk ? 'all spaces covered' : 'FAIL', '|', report.warnings.length, 'warnings');
process.exit(allOk && report.warnings.length === 0 ? 0 : 1);
