#!/usr/bin/env node
// Independent audit for the isolated route-bound streetwall candidate.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const glbPath = process.argv[3] || '.context/ab/route-bound-streetwall/facility-built-route-bound-streetwall.glb';
const reportPath = process.argv[4] || '.context/ab/route-bound-streetwall/build-report.json';
const outPath = process.argv[5] || '.context/ab/route-bound-streetwall/streetwall-audit.json';
const baselinePath = process.argv[6] || 'editor/facility-built.glb';
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const expectedIds = [
  'rbs-spawn-threshold', 'rbs-gate-service', 'rbs-rear-approach', 'rbs-west-loading', 'rbs-mix-workshop',
  'rbs-bridge-service', 'rbs-plant-yard', 'rbs-core-checkpoint', 'rbs-tunnel-relay', 'rbs-boundary-pump',
];
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(glbPath);
const baseline = fs.readFileSync(baselinePath);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const bounds = segment => ({ minX: Math.min(segment.bounds[0], segment.bounds[2]), minZ: Math.min(segment.bounds[1], segment.bounds[3]), maxX: Math.max(segment.bounds[0], segment.bounds[2]), maxZ: Math.max(segment.bounds[1], segment.bounds[3]) });
const boxFromFeature = feature => ({ minX: feature.center[0] - feature.footprint[0] / 2, minZ: feature.center[1] - feature.footprint[1] / 2, maxX: feature.center[0] + feature.footprint[0] / 2, maxZ: feature.center[1] + feature.footprint[1] / 2 });
const boxDistance = (a, b) => Math.hypot(Math.max(b.minX - a.maxX, 0, a.minX - b.maxX), Math.max(b.minZ - a.maxZ, 0, a.minZ - b.maxZ));
const pointSegmentDistance = (point, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2));
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dz * t));
};
const segmentBoxDistance = (a, b, box) => {
  const pointBoxDistance = point => Math.hypot(Math.max(box.minX - point[0], 0, point[0] - box.maxX), Math.max(box.minZ - point[1], 0, point[1] - box.maxZ));
  const corners = [[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.maxZ], [box.maxX, box.minZ]];
  const cross = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
  const intersects = (p, q, r, s) => {
    const sign = value => value > 1e-8 ? 1 : value < -1e-8 ? -1 : 0;
    const pqR = sign(cross(p, q, r)), pqS = sign(cross(p, q, s)), rsP = sign(cross(r, s, p)), rsQ = sign(cross(r, s, q));
    return (pqR !== pqS && rsP !== rsQ) || pqR === 0 || pqS === 0 || rsP === 0 || rsQ === 0;
  };
  let best = Math.min(pointBoxDistance(a), pointBoxDistance(b), ...corners.map(corner => pointSegmentDistance(corner, a, b)));
  for (let i = 0; i < 4; i++) if (intersects(a, b, corners[i], corners[(i + 1) % 4])) best = 0;
  return best;
};
const polylineBoxDistance = (waypoints, box) => Math.min(...waypoints.slice(1).map((point, index) => segmentBoxDistance(waypoints[index], point, box)));
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
const exported = document.nodes?.find(node => node.extras?.operationalStreetwall)?.extras.operationalStreetwall;
const candidate = report.operationalStreetwall;
const sourceHash = sha256(fs.readFileSync(sourcePath));

check('artifact-report-hash', report.artifact?.sha256 === sha256(artifact), `${sha256(artifact)} != ${report.artifact?.sha256 || 'missing'}`);
check('artifact-report-size', report.artifact?.bytes === artifact.length, `${artifact.length} != ${report.artifact?.bytes || 'missing'}`);
check('artifact-geometry-counts-bound', JSON.stringify(report.artifact?.identity) === JSON.stringify(artifactIdentity), `${JSON.stringify(artifactIdentity)} vs report ${JSON.stringify(report.artifact?.identity || {})}`);
check('source-hash-is-current', sourceHash === expectedSourceSha256, `${sourceHash} != ${expectedSourceSha256}`);
check('candidate-generation-profile-bound', report.sourceSha256 === expectedSourceSha256 && report.deterministicProfile?.operationalStreetwallOnly === true && report.deterministicProfile?.campusSpineOnly === false && report.deterministicProfile?.isolatedTransferOnly === false, JSON.stringify(report.deterministicProfile || {}));
check('streetwall-exported', Boolean(exported));
check('streetwall-report-export-match', JSON.stringify(exported) === JSON.stringify(candidate));
check('streetwall-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'route-bound-operational-streetwall-v1' && candidate?.owner === 'recovery-cycle-4');
check('feature-identities', JSON.stringify(candidate?.features?.map(feature => feature.id)) === JSON.stringify(expectedIds));
check('feature-owners-unique', new Set(candidate?.features?.map(feature => feature.owner)).size === expectedIds.length);
check('trace-fields-complete', candidate?.features?.every(feature => feature.sourceRefs?.length >= 8 && feature.referenceIds?.length >= 3 && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 6));
check('all-build-checks-pass', (report.checks || []).every(item => item.p === true));
check('triangle-growth-cap', artifactIdentity.indexedTriangles <= baselineIdentity.indexedTriangles * 1.15, `${artifactIdentity.indexedTriangles} <= ${Math.round(baselineIdentity.indexedTriangles * 1.15)}; baseline ${baselineIdentity.indexedTriangles}`);

const grounds = new Map(source.segments.filter(segment => segment.category === 'ground-surface-type').map(segment => [segment.id, bounds(segment)]));
const buildings = source.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(segment.category)).map(bounds);
const routes = source.routes;
const routesById = new Map(routes.map(route => [route.id, route]));
const featureResults = [];
for (const feature of candidate?.features || []) {
  const footprint = boxFromFeature(feature), local = [];
  const localCheck = (name, pass, details = '') => local.push({ name, pass: Boolean(pass), details });
  const pad = grounds.get(feature.padId);
  localCheck('ground-pad-binding', Boolean(pad), feature.padId);
  if (pad) localCheck('ground-pad-containment', footprint.minX >= pad.minX + 2 && footprint.maxX <= pad.maxX - 2 && footprint.minZ >= pad.minZ + 2 && footprint.maxZ <= pad.maxZ - 2, JSON.stringify({ footprint, pad }));
  const buildingMargins = buildings.map(building => boxDistance(footprint, building));
  localCheck('authored-building-clearance', buildingMargins.every(margin => margin >= feature.buildingClearanceMeters), `minimum ${Math.min(...buildingMargins).toFixed(2)}m`);
  const featureRoutes = (feature.routes || []).map(routeId => routesById.get(routeId));
  localCheck('route-bindings', featureRoutes.length === (feature.routes || []).length && featureRoutes.every(Boolean), (feature.routes || []).join(', '));
  const routeMargins = routes.map(route => ({ id: route.id, margin: polylineBoxDistance(route.waypoints, footprint) - (route.width || 6) / 2 }));
  localCheck('all-route-clearance', routeMargins.every(item => item.margin >= feature.routeClearanceMeters), routeMargins.filter(item => item.margin < feature.routeClearanceMeters).map(item => `${item.id}:${item.margin.toFixed(2)}`).join(', '));
  const airMargins = routes.filter(route => route.kind === 'air').map(route => ({ id: route.id, margin: polylineBoxDistance(route.waypoints, footprint) - (route.width || 6) / 2 }));
  localCheck('air-lane-clearance', airMargins.every(item => item.margin >= feature.airLaneClearanceMeters), airMargins.filter(item => item.margin < feature.airLaneClearanceMeters).map(item => `${item.id}:${item.margin.toFixed(2)}`).join(', '));
  localCheck('placement-status-recorded', feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS');
  featureResults.push({ id: feature.id, pass: local.every(item => item.pass), footprint, checks: local });
  for (const item of local) check(`${feature.id}:${item.name}`, item.pass, item.details);
}

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL' : 'PASS',
  strategy: candidate?.strategy,
  artifact: { path: glbPath, sha256: sha256(artifact), bytes: artifact.length },
  identity: artifactIdentity,
  baseline: { path: baselinePath, sha256: sha256(baseline), identity: baselineIdentity },
  source: { path: sourcePath, sha256: sourceHash },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  featureResults,
  checks,
};
fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outPath}`).pathname, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`OPERATIONAL STREETWALL AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed`);
if (failed.length) process.exitCode = 1;
