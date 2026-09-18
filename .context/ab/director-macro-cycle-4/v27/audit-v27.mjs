#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v27/build-f/facility-built-v27.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v27/build-f/director-macro-cycle-4-v27-report.json';
const outPath = process.argv[5] || '.context/ab/director-macro-cycle-4/v27/build-f/audit-v27.json';
const authoritativePath = process.argv[6] || 'editor/facility-built.glb';
const generatorPath = process.argv[7] || '.context/ab/director-macro-cycle-4/v27/gen-director-macro-cycle-4-v27.mjs';
const expectedSourceSha256 = 'd4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d';
const expectedAuthoritativeSha256 = '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(artifactPath);
const authoritative = fs.readFileSync(authoritativePath);
const generator = fs.readFileSync(generatorPath);
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });

const readGlb = bytes => {
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
  let offset = 12, document, bin = Buffer.alloc(0);
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) document = JSON.parse(bytes.toString('utf8', offset, offset + length));
    if (type === 0x004e4942) bin = bytes.subarray(offset, offset + length);
    offset += length;
  }
  if (!document) throw new Error('GLB JSON chunk missing');
  return { document, bin };
};
const { document, bin } = readGlb(artifact);
const identity = value => ({
  materials: value.materials?.length || 0,
  meshes: value.meshes?.length || 0,
  nodes: value.nodes?.length || 0,
  images: value.images?.length || 0,
  primitives: value.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
  indexedTriangles: (value.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => sum + (primitive.indices === undefined ? value.accessors[primitive.attributes.POSITION].count / 3 : value.accessors[primitive.indices].count / 3), 0),
});
const artifactIdentity = identity(document);
const sourceHash = sha256(fs.readFileSync(sourcePath));
const artifactHash = sha256(artifact);
const authoritativeHash = sha256(authoritative);
const generatorHash = sha256(generator);

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
const transform = (matrix, point) => [
  matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
  matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
  matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
];
const nodes = document.nodes || [], parents = nodes.map(() => -1);
for (let id = 0; id < nodes.length; id++) for (const child of nodes[id].children || []) parents[child] = id;
const world = id => {
  const chain = [], seen = new Set();
  for (let current = id; current >= 0 && !seen.has(current); current = parents[current]) { seen.add(current); chain.unshift(current); }
  return chain.reduce((matrix, nodeId) => multiply(matrix, localMatrix(nodes[nodeId])), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
};
const positions = [];
for (let nodeId = 0; nodeId < nodes.length; nodeId++) {
  const mesh = nodes[nodeId].mesh === undefined ? null : document.meshes[nodes[nodeId].mesh];
  for (const primitive of mesh?.primitives || []) {
    const accessor = document.accessors[primitive.attributes?.POSITION];
    const view = accessor && document.bufferViews[accessor.bufferView];
    if (!accessor || !view || accessor.componentType !== 5126 || accessor.type !== 'VEC3') continue;
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0), stride = view.byteStride || 12, matrix = world(nodeId);
    for (let i = 0; i < accessor.count; i++) positions.push(transform(matrix, [bin.readFloatLE(start + i * stride), bin.readFloatLE(start + i * stride + 4), bin.readFloatLE(start + i * stride + 8)]));
  }
}

const candidate = report.directorMacroCycle4V27VisualRecovery;
const exported = document.nodes?.[0]?.extras?.directorMacroCycle4V27VisualRecovery;
const zoneIds = new Set((source.zones || []).map(zone => zone.id));
const evidenceIds = new Set(['top', 'orbit', 'zone-spawn', 'zone-courtyard', 'zone-warehouse', 'zone-plant', 'zone-bridge', 'zone-tunnels', 'zone-core', 'zone-boundary', 'route-main-surface', 'route-covered', 'route-rear-alley', 'route-north-ring', 'route-south-retreat', 'route-flank-backdoor', 'objective-core', 'cover-courtyard', 'tunnel-portal', 'vertical-connector']);
const expectedStats = { frontageWalls: 4, loadingDoors: 12, wetOperationalSurfaces: 13, pipeTransferSpans: 8, processVessels: 8, vehicles: 12, fences: 11, trees: 24, controlRoomScreens: 9 };

check('source-hash', sourceHash === expectedSourceSha256, `${sourceHash} != ${expectedSourceSha256}`);
check('source-contract-counts', source.zones?.length === 8 && source.routes?.length === 14 && source.segments?.length === 93 && source.segments.filter(segment => segment.category === 'cover').length === 22);
check('report-source-binding', report.file === sourcePath && report.sourceSha256 === sourceHash);
check('generator-binding', report.generatorPath === generatorPath && report.generatorSha256 === generatorHash, `${report.generatorPath || 'missing'} / ${report.generatorSha256 || 'missing'}`);
check('artifact-report-binding', report.artifact?.path === artifactPath && report.artifact?.sha256 === artifactHash && report.artifact?.bytes === artifact.length);
check('artifact-geometry-counts', JSON.stringify(report.artifact?.identity) === JSON.stringify(artifactIdentity));
check('authoritative-unchanged', authoritativeHash === expectedAuthoritativeSha256, `${authoritativeHash} != ${expectedAuthoritativeSha256}`);
check('candidate-is-not-authoritative', artifactHash !== authoritativeHash);
check('explicit-v27-profile', report.deterministicProfile?.directorMacroCycle4V27Only === true && report.deterministicProfile?.directorMacroCycle4V26Only === true);
check('internal-generator-checks', (report.checks || []).every(item => item.p === true));
check('triangle-cap', report.triangles <= 881216 && artifactIdentity.indexedTriangles <= 881216, `${report.triangles}/${artifactIdentity.indexedTriangles} <= 881216`);
check('v27-export-match', JSON.stringify(candidate) === JSON.stringify(exported));
check('v27-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'camera-facing-operational-composition-v27' && candidate?.owner === 'director-macro-cycle-4-v27');
check('v27-stats', JSON.stringify(candidate?.stats) === JSON.stringify(expectedStats), JSON.stringify(candidate?.stats));
check('v27-global-trace', candidate?.sourceRefs?.length >= 6 && candidate.referenceIds?.includes('user-supplied-industrial-campus-board') && candidate.contractIds?.includes('source-canonical') && candidate.evidenceViews?.every(id => evidenceIds.has(id)));
check('v27-feature-identities', candidate?.features?.length === 14 && new Set(candidate.features.map(feature => feature.id)).size === 14 && candidate.features.every(feature => feature.owner === feature.id));
check('v27-feature-trace-fields', candidate?.features?.every(feature => feature.type && zoneIds.has(feature.zone) && feature.sourceRefs?.length >= 6 && feature.referenceIds?.includes('user-supplied-industrial-campus-board') && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 2 && feature.evidenceViews.every(id => evidenceIds.has(id))));
check('v27-feature-status-fields', candidate?.features?.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS' && feature.clearance?.pad === 'PASS'));
check('v27-centers-finite', candidate?.features?.every(feature => feature.center?.length === 2 && feature.center.every(Number.isFinite)));

const featureGeometry = (candidate?.features || []).map(feature => {
  const [x, z] = feature.center;
  const nearby = positions.filter(point => point[1] > -12 && Math.hypot(point[0] - x, point[2] - z) <= 40).length;
  return { id: feature.id, center: feature.center, nearbyVerticesWithin40m: nearby, pass: nearby >= 8 };
});
check('v27-camera-region-geometry', featureGeometry.length === 14 && featureGeometry.every(feature => feature.pass), JSON.stringify(featureGeometry.filter(feature => !feature.pass)));

const failed = checks.filter(item => !item.pass);
const result = {
  schemaVersion: 1,
  status: failed.length ? 'FAIL_CLOSED' : 'PASS',
  candidate: { artifactPath, reportPath, generatorPath, artifactSha256: artifactHash, bytes: artifact.length, identity: artifactIdentity },
  authoritative: { path: authoritativePath, sha256: authoritativeHash, identity: identity(readGlb(authoritative).document) },
  source: { path: sourcePath, sha256: sourceHash },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  metrics: { worldSpaceVertices: positions.length, indexedTriangles: artifactIdentity.indexedTriangles },
  featureGeometry,
  checks,
};
fs.mkdirSync(dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`DIRECTOR MACRO CYCLE 4 V27 AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed; ${result.status}`);
if (failed.length) process.exitCode = 1;
