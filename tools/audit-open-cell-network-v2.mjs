#!/usr/bin/env node
// Independent audit for the isolated camera-facing v2 open-cell candidate.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const glbPath = process.argv[3] || '.context/ab/camera-facing-open-cell-v2/facility-built-camera-facing-open-cell-v2.glb';
const reportPath = process.argv[4] || '.context/ab/camera-facing-open-cell-v2/build-report.json';
const outPath = process.argv[5] || '.context/ab/camera-facing-open-cell-v2/open-cell-audit.json';
const baselinePath = process.argv[6] || 'editor/facility-built.glb';
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const expectedBaselineSha256 = 'd6476c5e6e95ebebcacd70843787376cd2f61d19c4f0e346408c5cea16e4694e';
const expectedIds = [
  'ocn-v2-spawn-threshold', 'ocn-v2-courtyard-transition', 'ocn-v2-covered-pocket', 'ocn-v2-objective-service',
  'ocn-v2-flank-relay', 'ocn-v2-tunnel-portal', 'ocn-v2-bridge-utility', 'ocn-v2-plant-relay', 'ocn-v2-boundary-service',
];
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(glbPath);
const baseline = fs.readFileSync(baselinePath);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const bounds = segment => ({ minX: Math.min(segment.bounds[0], segment.bounds[2]), minZ: Math.min(segment.bounds[1], segment.bounds[3]), maxX: Math.max(segment.bounds[0], segment.bounds[2]), maxZ: Math.max(segment.bounds[1], segment.bounds[3]) });
// The generator serializes the already-rotated AABB as footprint.
const featureBounds = feature => ({ minX: feature.center[0] - feature.footprint[0] / 2, minZ: feature.center[1] - feature.footprint[1] / 2, maxX: feature.center[0] + feature.footprint[0] / 2, maxZ: feature.center[1] + feature.footprint[1] / 2 });
const boxDistance = (a, b) => Math.hypot(Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ));
const pointSegmentDistance = (point, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2));
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dz * t));
};
const segmentBoxDistance = (a, b, box) => {
  const pointBoxDistance = point => Math.hypot(Math.max(box.minX - point[0], 0, point[0] - box.maxX), Math.max(box.minZ - point[1], 0, point[1] - box.maxZ));
  const corners = [[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.maxZ], [box.maxX, box.minZ]];
  const intersects = (p, q) => {
    let low = 0, high = 1;
    for (const [origin, delta, min, max] of [[p[0], q[0] - p[0], box.minX, box.maxX], [p[1], q[1] - p[1], box.minZ, box.maxZ]]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < min || origin > max) return false;
        continue;
      }
      let near = (min - origin) / delta, far = (max - origin) / delta;
      if (near > far) [near, far] = [far, near];
      low = Math.max(low, near); high = Math.min(high, far);
      if (low > high) return false;
    }
    return high >= 0 && low <= 1;
  };
  let best = Math.min(pointBoxDistance(a), pointBoxDistance(b), ...corners.map(corner => pointSegmentDistance(corner, a, b)));
  if (intersects(a, b)) best = 0;
  return best;
};
const routeBoxDistance = (route, box) => Math.min(...route.waypoints.slice(1).map((point, index) => segmentBoxDistance(route.waypoints[index], point, box)));
const readGlbJson = bytes => {
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) return JSON.parse(bytes.toString('utf8', offset, offset + length));
    offset += length;
  }
  throw new Error('GLB JSON chunk missing');
};
const identity = bytes => {
  const document = readGlbJson(bytes), accessors = document.accessors || [];
  return {
    materials: document.materials?.length || 0,
    meshes: document.meshes?.length || 0,
    nodes: document.nodes?.length || 0,
    images: document.images?.length || 0,
    primitives: document.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
    indexedTriangles: (document.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? accessors[primitive.attributes.POSITION].count / 3 : accessors[primitive.indices].count / 3), 0),
  };
};

const document = readGlbJson(artifact);
const artifactIdentity = identity(artifact), baselineIdentity = identity(baseline);
const exported = document.nodes?.find(node => node.extras?.openCellNetwork)?.extras.openCellNetwork;
const candidate = report.openCellNetwork;
const sourceHash = sha256(fs.readFileSync(sourcePath));
const artifactHash = sha256(artifact), baselineHash = sha256(baseline);
const candidateFeatures = candidate?.features || [];
const routes = source.routes || [];
const routesById = new Map(routes.map(route => [route.id, route]));
const groundById = new Map(source.segments.filter(segment => segment.category === 'ground-surface-type').map(segment => [segment.id, segment]));
const buildings = source.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(segment.category)).map(bounds);
const gameplay = source.segments.filter(segment => ['kill-zone', 'objective', 'cover', 'entrance-player', 'stair', 'incline', 'bridge', 'hole-drone-entry'].includes(segment.category)).map(segment => ({ id: segment.id, box: bounds(segment) }));

check('artifact-report-hash', report.artifact?.sha256 === artifactHash, `${artifactHash} != ${report.artifact?.sha256 || 'missing'}`);
check('artifact-report-size', report.artifact?.bytes === artifact.length, `${artifact.length} != ${report.artifact?.bytes || 'missing'}`);
check('artifact-geometry-counts-bound', JSON.stringify(report.artifact?.identity) === JSON.stringify(artifactIdentity), `${JSON.stringify(artifactIdentity)} vs report ${JSON.stringify(report.artifact?.identity || {})}`);
check('source-hash-is-current', sourceHash === expectedSourceSha256, `${sourceHash} != ${expectedSourceSha256}`);
check('authoritative-artifact-unchanged', baselineHash === expectedBaselineSha256, `${baselineHash} != ${expectedBaselineSha256}`);
check('candidate-is-not-authoritative-bytes', artifactHash !== baselineHash);
check('candidate-generation-profile-bound', report.sourceSha256 === expectedSourceSha256
  && report.deterministicProfile?.openCellNetworkOnly === false
  && report.deterministicProfile?.openCellNetworkV2Only === true
  && report.deterministicProfile?.campusSpineOnly === false
  && report.deterministicProfile?.operationalStreetwallOnly === false
  && report.deterministicProfile?.isolatedTransferOnly === false, JSON.stringify(report.deterministicProfile || {}));
check('open-cell-exported', Boolean(exported));
check('open-cell-report-export-match', JSON.stringify(exported) === JSON.stringify(candidate));
check('open-cell-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'camera-facing-open-cell-operations-v2' && candidate?.owner === 'recovery-cycle-6');
check('feature-identities', JSON.stringify(candidateFeatures.map(feature => feature.id)) === JSON.stringify(expectedIds));
check('feature-owners-unique', new Set(candidateFeatures.map(feature => feature.owner)).size === expectedIds.length);
check('trace-fields-complete', candidateFeatures.length === expectedIds.length && candidateFeatures.every(feature => feature.sourceRefs?.length >= 10 && feature.referenceIds?.length >= 4 && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 6));
check('all-build-checks-pass', (report.checks || []).every(item => item.p === true));
check('triangle-growth-cap', artifactIdentity.indexedTriangles <= baselineIdentity.indexedTriangles * 1.15 && artifactIdentity.indexedTriangles <= 880216, `${artifactIdentity.indexedTriangles} <= ${Math.floor(baselineIdentity.indexedTriangles * 1.15)} and 880216`);
check('baseline-identity-known', baselineIdentity.materials === 78 && baselineIdentity.meshes === 97 && baselineIdentity.nodes === 123 && baselineIdentity.images === 73, JSON.stringify(baselineIdentity));

const featureResults = [];
for (const feature of candidateFeatures) {
  const local = [];
  const localCheck = (name, pass, details = '') => local.push({ name, pass: Boolean(pass), details });
  const footprint = featureBounds(feature);
  const pad = groundById.get(feature.padId);
  const padBox = pad && bounds(pad);
  localCheck('pad-exists-and-is-authored-ground', Boolean(pad && pad.category === 'ground-surface-type'), feature.padId);
  localCheck('ground-pad-containment', Boolean(padBox && footprint.minX >= padBox.minX + 2 && footprint.maxX <= padBox.maxX - 2 && footprint.minZ >= padBox.minZ + 2 && footprint.maxZ <= padBox.maxZ - 2), JSON.stringify({ footprint, pad: padBox }));
  const buildingMargins = buildings.map(building => boxDistance(footprint, building));
  const routeMargins = routes.filter(route => route.kind !== 'air').map(route => ({ id: route.id, margin: routeBoxDistance(route, footprint) - (route.width || 6) / 2 }));
  const airMargins = routes.filter(route => route.kind === 'air').map(route => ({ id: route.id, margin: routeBoxDistance(route, footprint) - (route.width || 6) / 2 }));
  const gameplayMargins = gameplay.map(item => ({ id: item.id, margin: boxDistance(footprint, item.box) }));
  localCheck('authored-building-clearance', buildingMargins.every(margin => margin >= feature.buildingClearanceMeters), `minimum ${Math.min(...buildingMargins).toFixed(2)}m`);
  localCheck('all-route-clearance', routeMargins.every(item => item.margin >= feature.routeClearanceMeters), routeMargins.filter(item => item.margin < feature.routeClearanceMeters).map(item => `${item.id}:${item.margin.toFixed(2)}`).join(', '));
  localCheck('air-lane-clearance', airMargins.every(item => item.margin >= feature.airLaneClearanceMeters), airMargins.filter(item => item.margin < feature.airLaneClearanceMeters).map(item => `${item.id}:${item.margin.toFixed(2)}`).join(', '));
  localCheck('gameplay-clearance', gameplayMargins.every(item => item.margin >= feature.gameplayClearanceMeters), gameplayMargins.filter(item => item.margin < feature.gameplayClearanceMeters).map(item => `${item.id}:${item.margin.toFixed(2)}`).join(', '));
  localCheck('route-bindings', feature.routes?.length > 0 && feature.routes.every(routeId => routesById.has(routeId)), (feature.routes || []).join(', '));
  localCheck('ground-support-contact-recorded', feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS' && Number.isFinite(pad?.surfaceY), `${feature.placementStatus}/${feature.supportStatus}/${feature.contactStatus}`);
  localCheck('paired-relationship-recorded', expectedIds.includes(feature.pairedWith) && typeof feature.relationship === 'string' && feature.relationship.length > 0, `${feature.pairedWith}:${feature.relationship}`);
  featureResults.push({ id: feature.id, pass: local.every(item => item.pass), footprint, checks: local });
  for (const item of local) check(`${feature.id}:${item.name}`, item.pass, item.details);
}

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL' : 'PASS',
  strategy: candidate?.strategy,
  artifact: { path: glbPath, sha256: artifactHash, bytes: artifact.length },
  identity: artifactIdentity,
  baseline: { path: baselinePath, sha256: baselineHash, identity: baselineIdentity },
  source: { path: sourcePath, sha256: sourceHash },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  featureResults,
  checks,
};
fs.mkdirSync(dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`OPEN-CELL NETWORK AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed`);
if (failed.length) process.exitCode = 1;
