#!/usr/bin/env node
// Emit the explicit handoff contract consumed by the game integration.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const outPath = process.argv[3] || 'out/runtime-map-bundle.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const collisionPath = 'out/collision-manifest.json';
const semanticPath = 'out/semantic-export.json';
const geometryPath = 'editor/facility-built.glb';
const collision = JSON.parse(fs.readFileSync(collisionPath, 'utf8'));
const semantic = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const geometry = fs.statSync(geometryPath);
const sourceHash = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 12);
const checks = [
  ['geometry-exists', geometry.size > 100000, `${geometry.size} bytes`],
  ['collision-source-matches', collision.file === sourcePath, collision.file || 'missing file field'],
  ['semantic-source-matches', semantic.sourceHashes?.blockout === sourceHash, semantic.sourceHashes?.blockout || 'missing source hash'],
  ['semantic-map-id', semantic.map === 'map_1_facility', semantic.map || 'missing map id'],
  ['collision-y-up', collision.yUp === true, String(collision.yUp)],
  ['terrain-grading-exported', Boolean(semantic.terrain?.grading && semantic.routes?.some(r => Array.isArray(r.elevations))), semantic.terrain?.grading?.method || 'missing terrain grading'],
];
const bundle = {
  format: 'vexea-runtime-map/1',
  map: semantic.map,
  revision: source.meta?.revision ?? null,
  source: {
    path: sourcePath,
    hash: sourceHash,
    generated: source.meta?.generated || null,
  },
  coordinateSystem: {
    up: 'y',
    horizontal: ['x', 'z'],
    world: source.meta?.world || null,
    tunnelFloorY: source.tunnelInterior?.floorY ?? null,
    collisionBoxFormat: collision.boxFormat || ['minX', 'minZ', 'maxX', 'minY', 'maxY', 'maxZ'],
    note: 'Use authored v3 coordinates directly; do not apply the legacy 768x768 or tunnel-Y=-20 calibration.',
  },
  terrain: {
    defaultSurfaceY: source.terrain?.defaultSurfaceY ?? 0,
    grading: source.terrain?.grading ?? null,
    routeProfiles: source.routes.filter(r => Array.isArray(r.elevations)).map(r => ({ id: r.id, elevations: r.elevations, wheelAllowed: r.wheelAllowed ?? (r.kind !== 'air') })),
  },
  geometry: { path: geometryPath, bytes: geometry.size },
  collision: {
    path: collisionPath,
    format: collision.format || null,
    boxFormat: collision.boxFormat || null,
    colliders: collision.colliders.length,
    walkable: collision.walkable.length,
    openings: collision.openings.length,
  },
  semantic: { path: semanticPath, format: semantic.format || null, zones: semantic.zones.length, routes: semantic.routes.length, droneAnchors: semantic.droneDeployment.length },
  checks: checks.map(([name, pass, details]) => ({ name, pass, details })),
};
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
for (const [name, pass, details] of checks) console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${details ? ` -> ${details}` : ''}`);
console.log(`RUNTIME BUNDLE: ${checks.filter(([, pass]) => pass).length}/${checks.length} checks passed`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
