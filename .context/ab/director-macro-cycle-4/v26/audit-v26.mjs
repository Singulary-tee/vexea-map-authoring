#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v26/build-f/facility-built-director-macro-cycle-4-v26.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v26/build-f/director-macro-cycle-4-v26-report.json';
const outPath = process.argv[5] || '.context/ab/director-macro-cycle-4/v26/build-f/audit-v26.json';
const authoritativePath = process.argv[6] || 'editor/facility-built.glb';
const generatorPath = process.argv[7] || '.context/ab/director-macro-cycle-4/v26/gen-director-macro-cycle-4-v26.mjs';
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const expectedAuthoritativeSha256 = '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(artifactPath);
const authoritative = fs.readFileSync(authoritativePath);
const generator = fs.readFileSync(generatorPath);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });

const readGlb = bytes => {
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12, json, bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', offset, offset + length));
    if (type === 0x004e4942) bin = bytes.subarray(offset, offset + length);
    offset += length;
  }
  if (!json) throw new Error('GLB JSON chunk missing');
  return { json, bin };
};
const { json, bin } = readGlb(artifact);
const accessors = json.accessors || [];
const identity = document => ({
  materials: document.materials?.length || 0,
  meshes: document.meshes?.length || 0,
  nodes: document.nodes?.length || 0,
  images: document.images?.length || 0,
  primitives: document.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
  indexedTriangles: (document.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? document.accessors[primitive.attributes.POSITION].count / 3 : document.accessors[primitive.indices].count / 3), 0),
});
const artifactIdentity = identity(json);
const sourceHash = sha256(fs.readFileSync(sourcePath));
const artifactHash = sha256(artifact);
const authoritativeHash = sha256(authoritative);
const generatorHash = sha256(generator);
const candidate = report.directorMacroCycle4V26VisualRecovery;
const exported = json.nodes?.[0]?.extras?.directorMacroCycle4V26VisualRecovery;
const routes = source.routes || [];
const grounds = source.segments.filter(segment => segment.category === 'ground-surface-type');
const buildings = source.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(segment.category));
const gameplay = source.segments.filter(segment => ['kill-zone', 'objective', 'cover', 'entrance-player', 'stair', 'incline', 'bridge', 'hole-drone-entry'].includes(segment.category));

const bounds = value => ({ minX: Math.min(value.bounds[0], value.bounds[2]), minZ: Math.min(value.bounds[1], value.bounds[3]), maxX: Math.max(value.bounds[0], value.bounds[2]), maxZ: Math.max(value.bounds[1], value.bounds[3]) });
const featureBounds = feature => ({ minX: feature.center[0] - feature.footprint[0] / 2, minZ: feature.center[1] - feature.footprint[1] / 2, maxX: feature.center[0] + feature.footprint[0] / 2, maxZ: feature.center[1] + feature.footprint[1] / 2 });
const boxDistance = (a, b) => Math.hypot(Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ));
const pointSegmentDistance = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
const routeDistance = (x, z, route) => Math.min(...route.waypoints.slice(1).map((point, index) => pointSegmentDistance(x, z, route.waypoints[index], point)));
const routeMargin = (feature, route) => routeDistance(feature.center[0], feature.center[1], route) - (route.width || 6) / 2 - Math.hypot(feature.footprint[0] / 2, feature.footprint[1] / 2);

const multiply = (a, b) => {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
  return result;
};
const localMatrix = node => {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * z * w) * sx, (2 * x * z - 2 * y * w) * sx, 0,
    (2 * x * y - 2 * z * w) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * x * w) * sy, 0,
    (2 * x * z + 2 * y * w) * sz, (2 * y * z - 2 * x * w) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0,
    tx, ty, tz, 1,
  ];
};
const transform = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const nodes = json.nodes || [], parents = nodes.map(() => -1);
for (let id = 0; id < nodes.length; id++) for (const child of nodes[id].children || []) parents[child] = id;
const world = id => {
  const chain = [], seen = new Set();
  for (let current = id; current >= 0 && !seen.has(current); current = parents[current]) { seen.add(current); chain.unshift(current); }
  return chain.reduce((matrix, nodeId) => multiply(matrix, localMatrix(nodes[nodeId])), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};
const positions = [];
const readPositions = (accessorIndex, matrix) => {
  const accessor = accessors[accessorIndex], view = json.bufferViews[accessor.bufferView];
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0), stride = view.byteStride || 12;
  if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') return;
  for (let i = 0; i < accessor.count; i++) positions.push(transform(matrix, [bin.readFloatLE(start + i * stride), bin.readFloatLE(start + i * stride + 4), bin.readFloatLE(start + i * stride + 8)]));
};
for (let nodeId = 0; nodeId < nodes.length; nodeId++) {
  const mesh = nodes[nodeId].mesh === undefined ? null : json.meshes[nodes[nodeId].mesh];
  for (const primitive of mesh?.primitives || []) if (primitive.attributes?.POSITION !== undefined) readPositions(primitive.attributes.POSITION, world(nodeId));
}

check('source-hash', sourceHash === expectedSourceSha256, `${sourceHash} != ${expectedSourceSha256}`);
check('source-contract-counts', source.zones?.length === 8 && source.routes?.length === 14 && source.segments?.length === 93 && source.segments.filter(segment => segment.category === 'cover').length === 22, JSON.stringify({ zones: source.zones?.length, routes: source.routes?.length, segments: source.segments?.length, cover: source.segments?.filter(segment => segment.category === 'cover').length }));
check('report-source-binding', report.file === sourcePath && report.sourceSha256 === sourceHash, `${report.file} / ${report.sourceSha256}`);
check('generator-binding', report.generatorSha256 === generatorHash, `${generatorHash} != ${report.generatorSha256 || 'missing'}`);
check('artifact-report-binding', report.artifact?.path === artifactPath && report.artifact?.sha256 === artifactHash && report.artifact?.bytes === artifact.length, JSON.stringify(report.artifact || {}));
check('artifact-geometry-counts', JSON.stringify(report.artifact?.identity) === JSON.stringify(artifactIdentity), `${JSON.stringify(artifactIdentity)} != ${JSON.stringify(report.artifact?.identity || {})}`);
check('authoritative-unchanged', authoritativeHash === expectedAuthoritativeSha256, `${authoritativeHash} != ${expectedAuthoritativeSha256}`);
check('candidate-is-not-authoritative', artifactHash !== authoritativeHash, artifactPath);
check('explicit-v26-profile', report.deterministicProfile?.directorMacroCycle4V26Only === true && report.deterministicProfile?.directorMacroCycle4V25Only === true, JSON.stringify(report.deterministicProfile || {}));
check('v26-export-match', JSON.stringify(candidate) === JSON.stringify(exported));
check('v26-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'camera-facing-operational-composition-v26' && candidate?.owner === 'director-macro-cycle-4-v26');
check('v26-policy', candidate?.clearancePolicy?.padInsetMeters === 2 && candidate?.clearancePolicy?.routeClearanceMeters === 2 && candidate?.clearancePolicy?.airLaneClearanceMeters === 2 && candidate?.compoundPolicy?.maxTriangles === 881216);
check('internal-generator-checks', (report.checks || []).every(item => item.p === true));
check('triangle-cap', report.triangles <= 881216 && artifactIdentity.indexedTriangles <= 881216, `${report.triangles}/${artifactIdentity.indexedTriangles} <= 881216`);
check('v26-stats', JSON.stringify(candidate?.stats) === JSON.stringify({ shells: 6, tanks: 9, bridges: 1, wetStreetPatches: 17, detailMeshes: 8 }), JSON.stringify(candidate?.stats));
check('feature-identities', candidate?.features?.length === 8 && new Set(candidate.features.map(feature => feature.id)).size === 8 && candidate.features.every(feature => feature.owner === feature.id));
check('feature-trace-fields', candidate?.features?.every(feature => feature.padId && feature.routes?.length && feature.sourceRefs?.length >= 10 && feature.referenceIds?.includes('user-supplied-industrial-campus-board') && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 5));
check('v26-geometry-points', positions.length > 0, `${positions.length} world-space vertices`);

const featureResults = [];
for (const feature of candidate?.features || []) {
  const actual = featureBounds(feature), pad = grounds.find(segment => segment.id === feature.padId), padBox = pad && bounds(pad);
  const buildingMargin = Math.min(...buildings.map(segment => boxDistance(actual, bounds(segment))));
  const routeMargins = routes.filter(route => route.kind !== 'air').map(route => routeMargin(feature, route));
  const airMargins = routes.filter(route => route.kind === 'air').map(route => routeMargin(feature, route));
  const gameplayMargin = Math.min(...gameplay.map(segment => boxDistance(actual, bounds(segment))));
  const featureMargins = featureResults.map(other => boxDistance(actual, other.bounds));
  const surfaceY = pad?.surfaceY ?? source.terrain?.defaultSurfaceY ?? 0;
  const pointCount = positions.filter(point => point[0] >= actual.minX && point[0] <= actual.maxX && point[2] >= actual.minZ && point[2] <= actual.maxZ && point[1] > surfaceY + 0.5).length;
  const local = [
    ['placement-status', feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS'],
    ['pad-containment', Boolean(padBox && actual.minX >= padBox.minX + 2 && actual.maxX <= padBox.maxX - 2 && actual.minZ >= padBox.minZ + 2 && actual.maxZ <= padBox.maxZ - 2)],
    ['building-clearance', buildingMargin >= 2],
    ['route-clearance', routeMargins.every(margin => margin >= 2)],
    ['air-lane-clearance', airMargins.every(margin => margin >= 2)],
    ['gameplay-clearance', gameplayMargin >= 2],
    ['existing-feature-clearance', featureMargins.every(margin => margin >= 2)],
    ['route-bindings', feature.routes.every(routeId => routes.some(route => route.id === routeId))],
    ['geometry-in-footprint', pointCount >= 8],
  ];
  for (const [name, pass] of local) check(`${feature.id}:${name}`, pass, `${name === 'geometry-in-footprint' ? pointCount : ''}`);
  featureResults.push({ id: feature.id, bounds: actual, pointCount, buildingMargin, minimumRouteMargin: Math.min(...routeMargins), minimumAirLaneMargin: Math.min(...airMargins), minimumGameplayMargin: gameplayMargin, minimumFeatureMargin: featureMargins.length ? Math.min(...featureMargins) : null, pass: local.every(item => item[1]) });
}
check('feature-results-pass', featureResults.length === 8 && featureResults.every(result => result.pass));

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL_CLOSED' : 'PASS',
  candidate: { artifactPath, reportPath, generatorPath, artifactSha256: artifactHash, bytes: artifact.length, identity: artifactIdentity },
  authoritative: { path: authoritativePath, sha256: authoritativeHash, identity: identity(readGlb(authoritative).json) },
  source: { path: sourcePath, sha256: sourceHash },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  metrics: { worldSpaceVertices: positions.length, indexedTriangles: artifactIdentity.indexedTriangles },
  featureResults,
  checks,
};
fs.mkdirSync(dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`DIRECTOR MACRO CYCLE 4 V26 AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed; ${result.status}`);
if (failed.length) process.exitCode = 1;
