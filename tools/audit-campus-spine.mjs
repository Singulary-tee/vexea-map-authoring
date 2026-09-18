#!/usr/bin/env node
// Independent placement, trace, and artifact audit for the campus-spine candidate.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const glbPath = process.argv[3] || '.context/ab/distributed-operations-spine/facility-built-campus-spine.glb';
const reportPath = process.argv[4] || '.context/ab/distributed-operations-spine/build-report.json';
const outPath = process.argv[5] || '.context/ab/distributed-operations-spine/spine-audit.json';
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const expectedIds = [
  'csp-spawn-logistics', 'csp-gate-service', 'csp-warehouse-transfer', 'csp-courtyard-workshop',
  'csp-bridge-utilities', 'csp-plant-process', 'csp-checkpoint-service', 'csp-core-operations',
  'csp-east-relay', 'csp-boundary-pump',
];
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(glbPath);
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
  const pointBoxDistance = point => Math.hypot(
    Math.max(box.minX - point[0], 0, point[0] - box.maxX),
    Math.max(box.minZ - point[1], 0, point[1] - box.maxZ),
  );
  const corners = [[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.maxZ], [box.maxX, box.minZ]];
  let best = Math.min(pointBoxDistance(a), pointBoxDistance(b), ...corners.map(corner => pointSegmentDistance(corner, a, b)));
  const intersects = (p, q, r, s) => {
    const cross = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
    const sign = value => value > 1e-8 ? 1 : value < -1e-8 ? -1 : 0;
    const abR = sign(cross(p, q, r)), abS = sign(cross(p, q, s)), rsP = sign(cross(r, s, p)), rsQ = sign(cross(r, s, q));
    return (abR !== abS && rsP !== rsQ) || abR === 0 || abS === 0 || rsP === 0 || rsQ === 0;
  };
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
const document = readGlbJson(artifact);
const exportedSpine = document.nodes?.find(node => node.extras?.campusSpine)?.extras.campusSpine;
const identity = {
  materials: document.materials?.length || 0,
  meshes: document.meshes?.length || 0,
  nodes: document.nodes?.length || 0,
  images: document.images?.length || 0,
  primitives: document.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
  indexedTriangles: (document.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? document.accessors[primitive.attributes.POSITION].count / 3 : document.accessors[primitive.indices].count / 3), 0),
};
const spine = report.campusSpine;
const groundSegments = new Map(source.segments.filter(segment => segment.category === 'ground-surface-type').map(segment => [segment.id, segment]));
const buildings = source.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(segment.category)).map(segment => ({ ...segment, box: bounds(segment) }));
const routes = source.routes;
const routesById = new Map(routes.map(route => [route.id, route]));

check('artifact-report-hash', report.artifact?.sha256 === sha256(artifact), `${sha256(artifact)} != ${report.artifact?.sha256 || 'missing'}`);
check('artifact-report-size', report.artifact?.bytes === artifact.length, `${artifact.length} != ${report.artifact?.bytes || 'missing'}`);
check('artifact-geometry-counts-bound', JSON.stringify(report.artifact?.identity) === JSON.stringify(identity), `${JSON.stringify(identity)} vs report ${JSON.stringify(report.artifact?.identity || {})}`);
check('source-hash-is-current', sha256(fs.readFileSync(sourcePath)) === expectedSourceSha256, `${sha256(fs.readFileSync(sourcePath))} != ${expectedSourceSha256}`);
check('candidate-generation-profile-bound', report.sourceSha256 === expectedSourceSha256 && report.deterministicProfile?.campusSpineOnly === true && report.deterministicProfile?.isolatedTransferOnly === false, JSON.stringify(report.deterministicProfile || {}));
check('campus-spine-exported', Boolean(exportedSpine));
check('campus-spine-report-export-match', JSON.stringify(exportedSpine) === JSON.stringify(spine));
check('campus-spine-schema', spine?.schemaVersion === 1 && spine?.strategy === 'distributed-campus-operations-spine-v1' && spine?.owner === 'recovery-cycle-3');
check('feature-identities', JSON.stringify(spine?.features?.map(feature => feature.id)) === JSON.stringify(expectedIds));
check('feature-owners-unique', new Set(spine?.features?.map(feature => feature.owner)).size === expectedIds.length);
check('trace-fields-complete', spine?.features?.every(feature => feature.sourceRefs?.length >= 8 && feature.referenceIds?.length >= 3 && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 6));
check('all-build-checks-pass', (report.checks || []).every(item => item.p === true), (report.checks || []).filter(item => item.p !== true).map(item => item.n).join(', '));

const featureResults = [];
for (const feature of spine?.features || []) {
  const local = [];
  const localCheck = (name, pass, details = '') => local.push({ name, pass: Boolean(pass), details });
  const footprint = boxFromFeature(feature);
  const pad = groundSegments.get(feature.padId);
  if (feature.type === 'grounded-boundary-compound') {
    localCheck('boundary-band-clearance', footprint.minX > -280 && footprint.maxX < -180 && footprint.minZ > 290 && footprint.maxZ < 306);
  } else {
    localCheck('ground-pad-binding', Boolean(pad));
    if (pad) {
      const padBox = bounds(pad);
      localCheck('ground-pad-containment', footprint.minX >= padBox.minX + 2.5 && footprint.maxX <= padBox.maxX - 2.5 && footprint.minZ >= padBox.minZ + 2.5 && footprint.maxZ <= padBox.maxZ - 2.5, JSON.stringify({ footprint, pad: padBox }));
    }
  }
  const buildingMargins = buildings.map(building => boxDistance(footprint, building.box));
  localCheck('authored-building-clearance', buildingMargins.every(margin => margin >= feature.buildingClearanceMeters), `minimum ${Math.min(...buildingMargins).toFixed(2)}m; required ${feature.buildingClearanceMeters}m`);
  const featureRoutes = (feature.routes || []).map(routeId => routesById.get(routeId));
  localCheck('route-bindings', featureRoutes.length === (feature.routes || []).length && featureRoutes.every(Boolean), (feature.routes || []).join(', '));
  const routeMargins = featureRoutes.filter(Boolean).map(route => polylineBoxDistance(route.waypoints, footprint) - (route.width || 0) / 2);
  localCheck('route-clearance', routeMargins.every(margin => margin >= feature.routeClearanceMeters), `minimum ${Math.min(...routeMargins).toFixed(2)}m; required ${feature.routeClearanceMeters}m`);
  const airMargins = featureRoutes.filter(route => route?.kind === 'air').map(route => polylineBoxDistance(route.waypoints, footprint) - (route.width || 0) / 2);
  localCheck('air-lane-clearance', airMargins.every(margin => margin >= feature.airLaneClearanceMeters), `minimum ${Math.min(...airMargins).toFixed(2)}m; required ${feature.airLaneClearanceMeters}m`);
  localCheck('placement-status-recorded', feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS');
  featureResults.push({ id: feature.id, pass: local.every(item => item.pass), footprint, checks: local });
  for (const item of local) check(`${feature.id}:${item.name}`, item.pass, item.details);
}

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL' : 'PASS',
  strategy: spine?.strategy,
  artifact: { path: glbPath, sha256: sha256(artifact), bytes: artifact.length },
  identity,
  source: { path: sourcePath, sha256: sha256(fs.readFileSync(sourcePath)) },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  featureResults,
  checks,
};
fs.mkdirSync(new URL('.', `file://${process.cwd()}/${outPath}`).pathname, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`CAMPUS SPINE AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed`);
if (failed.length) process.exitCode = 1;
