#!/usr/bin/env node
// Independent placement and trace audit for the isolated elevated transfer candidate.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const glbPath = process.argv[3] || '.context/ab/transfer-network/facility-built-transfer-network.glb';
const reportPath = process.argv[4] || '.context/ab/transfer-network/build-report.json';
const outPath = process.argv[5] || '.context/ab/transfer-network/transfer-audit.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(glbPath);
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const sha256 = value => createHash('sha256').update(value).digest('hex');
const bounds = segment => ({ minX: Math.min(segment.bounds[0], segment.bounds[2]), minZ: Math.min(segment.bounds[1], segment.bounds[3]), maxX: Math.max(segment.bounds[0], segment.bounds[2]), maxZ: Math.max(segment.bounds[1], segment.bounds[3]) });
const sourceSegments = new Map(source.segments.map(segment => [segment.id, segment]));
const authoredBuildings = source.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(segment.category)).map(segment => ({ ...segment, box: bounds(segment) }));
const groundRoutes = source.routes.filter(route => route.kind !== 'air');
const airRoutes = source.routes.filter(route => route.kind === 'air');
const pointSegmentDistance = (point, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], length2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / length2));
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dz * t));
};
const polylineDistance = (point, waypoints) => Math.min(...waypoints.slice(1).map((waypoint, index) => pointSegmentDistance(point, waypoints[index], waypoint)));
const pointBoxDistance = (point, box) => Math.hypot(Math.max(box.minX - point[0], 0, point[0] - box.maxX), Math.max(box.minZ - point[1], 0, point[1] - box.maxZ));
const orientation = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSegment = (a, b, p) => Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
const intersects = (a, b, c, d) => {
  const sign = value => value > 1e-8 ? 1 : value < -1e-8 ? -1 : 0;
  const abC = sign(orientation(a, b, c)), abD = sign(orientation(a, b, d));
  const cdA = sign(orientation(c, d, a)), cdB = sign(orientation(c, d, b));
  return (abC !== abD && cdA !== cdB) || (abC === 0 && onSegment(a, b, c)) || (abD === 0 && onSegment(a, b, d)) || (cdA === 0 && onSegment(c, d, a)) || (cdB === 0 && onSegment(c, d, b));
};
const boxCorners = box => [[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.maxZ], [box.maxX, box.minZ]];
const expandedBox = (box, padding) => ({ minX: box.minX - padding, minZ: box.minZ - padding, maxX: box.maxX + padding, maxZ: box.maxZ + padding });
const polylineBoxDistance = (waypoints, box) => {
  const corners = boxCorners(box);
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    if (pointBoxDistance(a, box) === 0 || pointBoxDistance(b, box) === 0) return 0;
    for (let j = 0; j < corners.length; j++) if (intersects(a, b, corners[j], corners[(j + 1) % corners.length])) return 0;
  }
  return Math.min(...waypoints.map(point => pointBoxDistance(point, box)), ...corners.flatMap(corner => waypoints.slice(1).map((waypoint, index) => pointSegmentDistance(corner, waypoints[index], waypoint))));
};
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
const exportedNetwork = document.nodes?.find(node => node.extras?.transferNetwork)?.extras.transferNetwork;
const network = report.transferNetwork;
const identity = {
  materials: document.materials?.length || 0,
  meshes: document.meshes?.length || 0,
  nodes: document.nodes?.length || 0,
  images: document.images?.length || 0,
  primitives: document.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
  indexedTriangles: (document.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? document.accessors[primitive.attributes.POSITION].count / 3 : document.accessors[primitive.indices].count / 3), 0),
};
check('artifact-report-hash', report.artifact?.sha256 === sha256(artifact), `${sha256(artifact)} != ${report.artifact?.sha256 || 'missing'}`);
check('artifact-report-size', report.artifact?.bytes === artifact.length, `${artifact.length} != ${report.artifact?.bytes || 'missing'}`);
check('artifact-geometry-counts-bound', JSON.stringify(report.artifact?.identity) === JSON.stringify(identity), `${JSON.stringify(identity)} vs report ${JSON.stringify(report.artifact?.identity || {})}`);
check('source-hash-is-current', sha256(fs.readFileSync(sourcePath)) === expectedSourceSha256, `${sha256(fs.readFileSync(sourcePath))} != ${expectedSourceSha256}`);
check('candidate-generation-profile-bound', report.sourceSha256 === expectedSourceSha256 && report.deterministicProfile?.isolatedTransferOnly === true && report.sourceCommit, JSON.stringify(report.deterministicProfile || {}));
check('transfer-network-exported', Boolean(exportedNetwork));
check('transfer-network-report-export-match', JSON.stringify(exportedNetwork) === JSON.stringify(network));
check('transfer-network-schema', network?.schemaVersion === 1 && network?.strategy === 'elevated-interior-transfer-network-v1');
const expectedIds = ['trn-hub-transfer', 'trn-core-transfer', 'trn-core-transformer-skid'];
check('transfer-feature-identities', JSON.stringify(network?.features?.map(feature => feature.id)) === JSON.stringify(expectedIds));
check('transfer-feature-owners-unique', new Set(network?.features?.map(feature => feature.owner)).size === expectedIds.length);
check('transfer-trace-fields-complete', network?.features?.every(feature => feature.sourceRefs?.length >= 6 && feature.referenceIds?.length >= 2 && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 4));
check('source-references-resolve', network?.sourceRefs?.filter(ref => ref.startsWith('blockout/')).every(ref => {
  const [, fragment] = ref.split('#');
  const id = fragment?.split('.').pop();
  return sourceSegments.has(id) || source.routes.some(route => route.id === id);
}));
check('source-route-contracts-unchanged', source.routes.length === 14 && sourceSegments.size === 93, `${source.routes.length} routes / ${sourceSegments.size} segments`);

const featureResults = [];
for (const feature of network.features || []) {
  const local = { id: feature.id, checks: [] };
  const localCheck = (name, pass, details = '') => local.checks.push({ name, pass: Boolean(pass), details });
  const supportRadius = feature.supportSize ? Math.max(...feature.supportSize) / 2 : 0;
  const featureBox = feature.center ? { minX: feature.center[0] - feature.width / 2, minZ: feature.center[1] - feature.depth / 2, maxX: feature.center[0] + feature.width / 2, maxZ: feature.center[1] + feature.depth / 2 } : null;
  const bridgeBox = feature.endpoints ? { minX: Math.min(feature.endpoints[0][0], feature.endpoints[1][0]), minZ: Math.min(feature.endpoints[0][1], feature.endpoints[1][1]) - feature.width / 2, maxX: Math.max(feature.endpoints[0][0], feature.endpoints[1][0]), maxZ: Math.max(feature.endpoints[0][1], feature.endpoints[1][1]) + feature.width / 2 } : null;
  const footprint = featureBox || bridgeBox;
  const routeMargins = [];
  for (const center of feature.supportCenters || [feature.center]) {
    const nearestRoute = Math.min(...groundRoutes.map(route => polylineDistance(center, route.waypoints) - (route.width || 0) / 2));
    routeMargins.push(nearestRoute - supportRadius);
  }
  const routePass = routeMargins.every(margin => margin >= feature.routeClearanceMeters);
  localCheck('route-clearance', routePass, `support margins ${routeMargins.map(value => value.toFixed(2)).join(',')}m; required ${feature.routeClearanceMeters}m`);
  const buildingMargins = authoredBuildings.map(building => pointBoxDistance(feature.center || [0, 0], building.box));
  const supportBuildingMargins = (feature.supportCenters || []).flatMap(center => authoredBuildings.map(building => pointBoxDistance(center, building.box) - supportRadius));
  const buildingPass = (feature.center ? authoredBuildings.every(building => pointBoxDistance(feature.center, building.box) >= feature.buildingClearanceMeters + Math.max(feature.width || 0, feature.depth || 0) / 2) : supportBuildingMargins.every(margin => margin >= feature.buildingClearanceMeters))
    && (!bridgeBox || authoredBuildings.every(building => polylineBoxDistance(feature.endpoints, expandedBox(building.box, feature.width / 2)) > 0));
  localCheck('authored-building-clearance', buildingPass, `minimum support/center margin ${Math.min(...(supportBuildingMargins.length ? supportBuildingMargins : buildingMargins)).toFixed(2)}m`);
  const airMargins = airRoutes.map(route => polylineBoxDistance(route.waypoints, footprint) - (route.width || 0) / 2);
  const airPass = airMargins.every(margin => margin >= feature.airLaneClearanceMeters);
  localCheck('air-lane-clearance', airPass, `margins ${airMargins.map(value => value.toFixed(2)).join(',')}m; required ${feature.airLaneClearanceMeters}m`);
  if (feature.endpoints) {
    const verticalMargins = groundRoutes.map(route => {
      const near = route.waypoints.filter(point => pointSegmentDistance(point, feature.endpoints[0], feature.endpoints[1]) <= feature.width / 2 + (route.width || 0) / 2);
      return near.length ? feature.deckY - Math.max(...near.map(() => Math.max(...route.elevations))) : Infinity;
    });
    const verticalPass = verticalMargins.every(margin => margin === Infinity || margin >= feature.verticalRouteClearanceMeters);
    localCheck('vertical-route-clearance', verticalPass, `minimum ${Math.min(...verticalMargins).toFixed(2)}m; required ${feature.verticalRouteClearanceMeters}m`);
  }
  localCheck('placement-status-recorded', feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS');
  featureResults.push({ ...local, pass: local.checks.every(item => item.pass), footprint });
  for (const item of local.checks) check(`${feature.id}:${item.name}`, item.pass, item.details);
}

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL' : 'PASS',
  artifact: { path: glbPath, sha256: sha256(artifact), bytes: artifact.length },
  identity,
  source: { path: sourcePath, sha256: sha256(fs.readFileSync(sourcePath)) },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  featureResults,
  checks,
};
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`TRANSFER AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed`);
if (failed.length) process.exitCode = 1;
