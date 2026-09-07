#!/usr/bin/env node
// gen-semantic-export: gameplay-first semantic export for the game runtime (LLM zone layer,
// navmesh, spawns, objective, surveillance, drone deployment). Preserves the 7-zone contract,
// GAMEMODE objective config, drone-role anchors from v2, camera/destructible cues.
// Emits out/semantic-export.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const b = JSON.parse(readFileSync('blockout/blockout-full-v1.json', 'utf8'));
const segs = b.segments, byId = new Map(segs.map(s => [s.id, s]));
const boxOf = s => ({ min: [s.bounds[0], s.bounds[1]], max: [s.bounds[2], s.bounds[3]] });

const zones = b.zones.map(z => {
  const zsegs = segs.filter(s => s.zone === z.id);
  const bounds = zsegs.length ? {
    min: [Math.min(...zsegs.map(s => s.bounds[0])), Math.min(...zsegs.map(s => s.bounds[1]))],
    max: [Math.max(...zsegs.map(s => s.bounds[2])), Math.max(...zsegs.map(s => s.bounds[3]))],
  } : null;
  return { id: z.id, name: z.name, role: z.role, bounds };
});
// adjacency: from segment connectivity (ground-to-ground / building-to-ground edges)
const adj = new Set();
for (const s of segs) for (const r of s.connectivity || []) {
  const t = byId.get(r);
  if (t && t.zone !== s.zone) adj.add([s.zone, t.zone].sort().join('|'));
}
const adjacency = [...adj].map(e => { const [a, c2] = e.split('|'); return { from: a, to: c2, kind: 'open' }; });
const core = byId.get('bld-core-ops-hall');
const coreInt = (b.interiors || []).find(i => i.building === 'bld-core-ops-hall');
const spawn = segs.find(s => s.category === 'spawn');
const exportData = {
  format: 'vexea-semantic/1',
  map: 'map_1_facility', slice: 'full-map',
  match: { players: '5-10', durationS: 480, llmCycleMs: 8000 },
  zones, adjacency,
  spawn: { id: spawn.id, box: boxOf(spawn), safeApron: b.spawn.safeApron, northExit: b.spawn.northExit },
  objective: {
    zone: 'zone_core', building: 'bld-core-ops-hall', floor: coreInt?.objectiveLevel || 2,
    holdTimeS: 8, proximityRadius: 3, terminalDamageable: false,
    box: boxOf(core), killZone: 'kz-core',
  },
  surveillance: (b.destructibles || []).map(d => ({ id: d.id, type: d.type, pos: [d.x, d.z], destructible: true })),
  killZones: segs.filter(s => s.category === 'kill-zone').map(s => ({ id: s.id, box: boxOf(s), note: s.note })),
  droneDeployment: [
    { unit: 'fixed_wing', zone: 'zone_courtyard', anchor: b.openSky, note: 'open-sky strafe box; GAMEPLAY primary target zone_courtyard' },
    { unit: 'wheeled', zone: 'zone_warehouse', anchor: boxOf(byId.get('bld-deployment-bays')), note: 'enclosed deployment bays; sealed roll-down egress' },
    { unit: 'rotary_shooter', zone: 'zone_courtyard', anchor: boxOf(byId.get('g-yrd-hub')), note: 'hub harassment' },
    { unit: 'robot_dog', zone: 'zone_plant', anchor: boxOf(byId.get('g-yrd-plant-s')), note: 'agile flank from plant south band' },
    { unit: 'wheeled', zone: 'zone_tunnels', anchor: boxOf(byId.get('tun-b')), note: 'below-grade interdiction (X-ray interior)' },
  ],
  routes: b.routes.map(r => ({ id: r.id, kind: r.kind, width: r.width, waypoints: r.waypoints })),
  airRoutes: b.routes.filter(r => r.kind === 'air').map(r => r.id),
  tunnelXray: segs.filter(s => s.category === 'tunnel-passage').every(s => s.xray),
  droneHoles: segs.filter(s => s.category === 'hole-drone-entry').map(s => ({ id: s.id, clearWidth: s.clearWidth, pos: [(s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2] })),
  openSky: b.openSky,
  sourceHashes: { blockout: createHash('sha256').update(readFileSync('blockout/blockout-full-v1.json')).digest('hex').slice(0, 12) },
};
mkdirSync('out', { recursive: true });
writeFileSync('out/semantic-export.json', JSON.stringify(exportData, null, 2));
console.log('semantic export:', zones.length, 'zones,', adjacency.length, 'adjacencies,', exportData.droneDeployment.length, 'drone anchors');
