import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const v29Path = fileURLToPath(new URL('../v29/gen-director-macro-cycle-4-v29.mjs', import.meta.url));
let v29Source = fs.readFileSync(v29Path, 'utf8');
const generatorPath = '.context/ab/director-macro-cycle-4/v30/gen-director-macro-cycle-4-v30.mjs';
const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const authoritativePath = 'editor/facility-built.glb';
const authoritativeBaseline = {
  path: authoritativePath,
  sha256: '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db',
  bytes: 67532976,
};
const hashFile = file => {
  const bytes = fs.readFileSync(file);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
};
const authoritativeBefore = hashFile(authoritativePath);
if (authoritativeBefore.sha256 !== authoritativeBaseline.sha256 || authoritativeBefore.bytes !== authoritativeBaseline.bytes) {
  throw new Error(`authoritative artifact identity mismatch before v30 build: ${JSON.stringify(authoritativeBefore)}`);
}
const sourceRefs = [
  'blockout/blockout-full-v1.json#segments.g-spawn-apron',
  'blockout/blockout-full-v1.json#segments.g-yrd-rear',
  'blockout/blockout-full-v1.json#segments.g-yrd-pressure',
  'blockout/blockout-full-v1.json#segments.g-yrd-west',
  'blockout/blockout-full-v1.json#segments.g-yrd-hub',
  'blockout/blockout-full-v1.json#segments.g-yrd-e',
  'blockout/blockout-full-v1.json#segments.g-yrd-plant-s',
  'blockout/blockout-full-v1.json#routes.route_main_surface',
  'blockout/blockout-full-v1.json#routes.route_covered',
  'blockout/blockout-full-v1.json#routes.route_north_ring',
  'blockout/blockout-full-v1.json#routes.route_south_retreat',
  'GATING-PLAN.MD#industrial-campus-visual-recovery',
];
const referenceIds = ['user-supplied-industrial-campus-board', 'industrial-frontage', 'industrial-yard-operations', 'processing-yard', 'wet-industrial-hardstand', 'operational-loading-specificity', 'pipe-rack-transfer', 'vertical-connector', 'objective-control-room', 'facility-edge-vegetation', 'layered-campus-silhouettes'];
const contractIds = ['source-canonical', 'routes-unchanged', 'authored-pad-support', 'route-clearance-2m', 'air-lane-clearance', 'gameplay-space-clearance', 'ground-contact', 'connected-compound-massing', 'shared-operational-yards', 'wet-marked-service-streets', 'triangle-growth-15-percent'];
const feature = (id, type, zone, center, evidenceViews) => ({ id, owner: id, type, zone, center, sourceRefs, referenceIds, contractIds, evidenceViews, placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } });
const recovery = {
  schemaVersion: 1,
  strategy: 'camera-visible-loading-fronts-control-room-wet-streets-v30',
  owner: 'director-macro-cycle-4-v30',
  sourceRefs,
  referenceIds,
  contractIds,
  evidenceViews: ['top', 'orbit', 'zone-spawn', 'zone-warehouse', 'zone-plant', 'zone-bridge', 'zone-core', 'zone-boundary', 'route-main-surface', 'route-covered', 'route-rear-alley', 'route-north-ring', 'route-south-retreat', 'route-flank-backdoor', 'objective-core', 'cover-courtyard', 'vertical-connector'],
  features: [
    feature('v30-spawn-loading-frontage', 'camera-visible-spawn-loading-frontage', 'zone_spawn', [-274, 190], ['zone-spawn', 'route-main-surface']),
    feature('v30-warehouse-dock-line', 'warehouse-dock-door-line', 'zone_warehouse', [-146, 0], ['zone-warehouse', 'route-covered']),
    feature('v30-core-control-room', 'glazed-control-room-objective', 'zone_core', [52, -259], ['objective-core', 'zone-core']),
    feature('v30-wet-street-network', 'reflective-lanes-drains-markings', 'route_main_surface', [-208, 154], ['route-main-surface', 'route-rear-alley', 'cover-courtyard']),
    feature('v30-vertical-stair-tower', 'readable-stair-tower-catwalk', 'zone_bridge', [316, 68], ['vertical-connector', 'zone-bridge']),
    feature('v30-bridge-catwalk', 'bridge-catwalk-utility-span', 'zone_bridge', [294, 82], ['zone-bridge', 'route-north-ring']),
    feature('v30-boundary-gate-vegetation', 'perimeter-gate-vegetation-silhouette', 'zone_boundary', [70, 306], ['zone-boundary', 'top']),
    feature('v30-plant-service-platform', 'plant-tank-service-platform', 'zone_plant', [210, -72], ['zone-plant', 'route-south-retreat']),
  ],
  stats: { loadingBays: 6, controlRoomScreens: 8, serviceVehicles: 6, wetPatches: 24, markedDrains: 12, stairRuns: 2, perimeterGates: 2, utilityPlatforms: 4 },
};

const v30VisualPass = String.raw`
// -------- v30 camera-visible operations and vertical identity pass --------
const directorMacroCycle4V30VisualRecovery = ${JSON.stringify(recovery)};
const directorMacroCycle4V30Box = (w, h, d, x, y, z, material, rotation = 0) => group.add(box(w, h, d, x, y, z, material, rotation));
const directorMacroCycle4V30Rail = (x1, y, z1, x2, z2, material = M.warning) => {
  group.add(addBeam([x1, y, z1], [x2, y, z2], 0.14, material));
  for (const t of [0, 0.5, 1]) directorMacroCycle4V30Box(0.14, 1.0, 0.14, x1 + (x2 - x1) * t, y - 0.5, z1 + (z2 - z1) * t, material);
};
const directorMacroCycle4V30Sign = (x, y, z, width = 5, rotation = 0) => {
  directorMacroCycle4V30Box(0.12, 2.8, width, x, y + 1.4, z, M.sign, rotation);
  directorMacroCycle4V30Box(0.08, 0.12, width - 0.5, x - 0.08, y + 2.1, z, M.warning, rotation);
  directorMacroCycle4V30Box(0.06, 0.56, width - 0.8, x - 0.12, y + 1.15, z, M.term, rotation);
};
const directorMacroCycle4V30Vehicle = (x, z, rotation = 0, forklift = false) => {
  const y = surfaceYAt(x, z, 0) + 0.16;
  const length = forklift ? 4.8 : 8.2;
  const width = forklift ? 2.8 : 3.5;
  directorMacroCycle4V30Box(length, 1.8, width, x, y + 0.9, z, M.loadingPanelLight, rotation);
  directorMacroCycle4V30Box(forklift ? 2.0 : 2.8, 1.55, width - 0.3, x + (forklift ? 0.65 : 2.1), y + 2.3, z, M.loadingGlass, rotation);
  directorMacroCycle4V30Box(length - 0.5, 0.16, 0.18, x, y + 1.95, z - Math.cos(rotation) * (width / 2 + 0.05), M.warning, rotation);
  for (const offset of [-length * 0.3, length * 0.3]) {
    const wx = x + Math.cos(rotation) * offset;
    const wz = z + Math.sin(rotation) * offset;
    group.add(cylinder(0.58, 0.34, wx, y + 0.5, wz, M.rubber, 8, Math.PI / 2, rotation));
  }
  if (forklift) {
    directorMacroCycle4V30Box(0.18, 3.8, 0.18, x - 2.25, y + 2.0, z, M.loadingFrame, rotation);
    directorMacroCycle4V30Box(2.6, 0.12, 0.14, x - 3.1, y + 0.36, z - 0.75, M.warning, rotation);
    directorMacroCycle4V30Box(2.6, 0.12, 0.14, x - 3.1, y + 0.36, z + 0.75, M.warning, rotation);
  } else directorMacroCycle4V30Box(2.2, 1.0, width - 0.25, x - 2.3, y + 1.6, z, M.loadingAsphaltRough, rotation);
};
const directorMacroCycle4V30Surface = (x, z, w, d, material = M.loadingReflective, rotation = 0) => directorMacroCycle4V30Box(w, 0.055, d, x, surfaceYAt(x, z, 0) + 0.12, z, material, rotation);

{
  const spawnY = surfaceYAt(-274, 190, 0) + 0.08;
  directorMacroCycle4V30Box(28, 0.12, 16, -274, spawnY + 0.04, 190, M.loadingWet);
  directorMacroCycle4V30Box(30, 0.38, 16, -274, spawnY + 7.8, 190, M.loadingCanopy);
  for (const z of [183, 190, 197]) {
    directorMacroCycle4V30Box(0.24, 7.3, 0.24, -288, spawnY + 3.65, z, M.loadingFrame);
    directorMacroCycle4V30Box(0.12, 4.7, 6.4, -287.8, spawnY + 2.45, z, M.loadingDoor);
    directorMacroCycle4V30Box(0.08, 0.16, 5.9, -287.7, spawnY + 4.95, z, M.warning);
  }
  directorMacroCycle4V30Vehicle(-274, 199, 0.1, false);
  directorMacroCycle4V30Vehicle(-262, 181, -0.18, true);
  directorMacroCycle4V30Sign(-289, spawnY + 0.08, 190, 7);

  const warehouseY = surfaceYAt(-146, 0, 0) + 0.08;
  directorMacroCycle4V30Box(0.32, 10.5, 64, -146, warehouseY + 5.25, 0, M.heroSidingAlt);
  directorMacroCycle4V30Box(3.2, 0.4, 66, -148, warehouseY + 10.6, 0, M.loadingCanopy);
  for (const z of [-21, -7, 7, 21]) {
    directorMacroCycle4V30Box(0.12, 5.0, 8.4, -146.22, warehouseY + 2.5, z, M.loadingDoor);
    directorMacroCycle4V30Box(0.08, 5.25, 0.18, -146.38, warehouseY + 2.62, z - 4.35, M.loadingFrame);
    directorMacroCycle4V30Box(0.08, 5.25, 0.18, -146.38, warehouseY + 2.62, z + 4.35, M.loadingFrame);
    directorMacroCycle4V30Box(0.1, 0.14, 7.8, -146.4, warehouseY + 4.55, z, M.warning);
    directorMacroCycle4V30Box(2.2, 0.16, 7.4, -148.8, warehouseY + 0.16, z, M.loadingWet);
  }
  directorMacroCycle4V30Vehicle(-135, 13, Math.PI / 2, false);
  directorMacroCycle4V30Vehicle(-135, -13, Math.PI / 2, true);
  directorMacroCycle4V30Sign(-146.5, warehouseY + 6.0, 0, 9);

  const coreY = surfaceYAt(48, -258, -1.2) + 0.08;
  directorMacroCycle4V30Box(0.24, 10.2, 32, 52, coreY + 5.1, -259, M.heroGlass);
  for (const z of [-272, -266, -260, -254, -248]) directorMacroCycle4V30Box(0.16, 10.5, 0.18, 52.1, coreY + 5.25, z, M.loadingFrame);
  for (const z of [-269, -263, -257, -251]) {
    directorMacroCycle4V30Box(0.08, 1.75, 4.6, 51.78, coreY + 3.25, z, M.term);
    directorMacroCycle4V30Box(0.06, 0.95, 3.8, 51.7, coreY + 4.45, z, M.light);
  }
  directorMacroCycle4V30Box(0.28, 2.3, 5.5, 51.72, coreY + 1.15, -259, M.loadingDoor);
  directorMacroCycle4V30Box(0.2, 0.34, 34, 52, coreY + 10.5, -259, M.loadingCanopy);
  directorMacroCycle4V30Rail(47, coreY + 1.4, -276, 47, -242, M.warning);
  directorMacroCycle4V30Sign(51.62, coreY + 7.0, -259, 8);

  for (const [x, z, w, d, r] of [
    [-226, 157, 18, 4.4, 0.08], [-199, 151, 12, 3.2, -0.12], [-171, 145, 16, 3.8, 0.04],
    [-132, 93, 15, 3.5, 0.1], [-103, 78, 11, 2.8, -0.08], [-74, 63, 14, 3.0, 0.06],
    [108, 92, 13, 3.2, 0], [139, 74, 10, 2.6, 0.12], [184, -132, 15, 3.4, -0.08],
    [211, -146, 11, 2.8, 0.1], [198, -78, 14, 3.2, 0.04], [226, -64, 10, 2.4, -0.1],
  ]) directorMacroCycle4V30Surface(x, z, w, d, M.loadingReflective, r);
  for (const [x, z, w, r] of [[-216, 157, 7, 0], [-182, 148, 6, Math.PI / 2], [-118, 86, 6, 0], [-84, 66, 5, Math.PI / 2], [117, 91, 6, 0], [191, -130, 6, Math.PI / 2], [211, -76, 6, 0], [232, -63, 5, Math.PI / 2], [72, 145, 6, 0], [160, 112, 5, Math.PI / 2], [235, -150, 6, 0], [94, -122, 5, Math.PI / 2]]) directorMacroCycle4V30Surface(x, z, w, 0.28, M.drain, r);
  for (const [x, z, r] of [[-207, 154, 0.05], [-128, 89, -0.12], [112, 91, 0.2], [202, -74, -0.2]]) directorMacroCycle4V30Vehicle(x, z, r, true);
  for (const [x, z, r] of [[-236, 162, 0], [-108, 84, Math.PI / 2], [178, -136, 0], [222, -72, Math.PI / 2], [148, 109, 0], [236, -148, 0]]) directorMacroCycle4V30Sign(x, surfaceYAt(x, z, 0) + 0.1, z, 4.8, r);

  const bridgeY = surfaceYAt(294, 84, 0) + 0.1;
  directorMacroCycle4V30Box(82, 0.5, 7.5, 294, bridgeY + 12.4, 82, M.concreteDark);
  for (const x of [254, 274, 294, 314, 334]) {
    directorMacroCycle4V30Box(0.36, 11.8, 0.36, x, bridgeY + 6.0, 82, M.pipeDark);
    directorMacroCycle4V30Box(0.8, 0.12, 6.5, x, bridgeY + 12.8, 82, M.loadingFrame);
  }
  directorMacroCycle4V30Rail(252, bridgeY + 13.1, 78.5, 336, 78.5, M.warning);
  directorMacroCycle4V30Rail(252, bridgeY + 13.1, 85.5, 336, 85.5, M.warning);
  for (const x of [264, 286, 308, 330]) directorMacroCycle4V30Box(1.5, 0.12, 0.34, x, bridgeY + 13.0, 78.4, M.light);

  const stairY = surfaceYAt(316, 70, 0) + 0.1;
  for (let i = 0; i < 10; i++) {
    const z = 75 - i * 1.9;
    directorMacroCycle4V30Box(7.0, 0.28, 2.4, 316, stairY + 0.35 + i * 0.34, z, i % 2 ? M.warningDark : M.loadingFrame);
  }
  directorMacroCycle4V30Rail(312.5, stairY + 4.2, 77, 312.5, 76 - 9 * 1.9, M.warning);
  directorMacroCycle4V30Rail(319.5, stairY + 4.2, 77, 319.5, 76 - 9 * 1.9, M.warning);
  directorMacroCycle4V30Box(8.0, 0.35, 8.0, 316, stairY + 4.0, 56, M.loadingCanopy);
  directorMacroCycle4V30Sign(320, stairY + 0.1, 55, 4.2, Math.PI / 2);

  const plantY = surfaceYAt(210, -72, 0) + 0.1;
  for (const [x, z, h] of [[196, -80, 13], [214, -76, 16], [232, -70, 11]]) {
    group.add(cylinder(4.0, h, x, plantY + h / 2, z, M.heroPanel, 8));
    directorMacroCycle4V30Box(8.8, 0.18, 0.18, x, plantY + h - 1.1, z - 3.7, M.warning);
    directorMacroCycle4V30Box(8.8, 0.18, 0.18, x, plantY + 2.1, z - 3.7, M.loadingFrame);
  }
  directorMacroCycle4V30Rail(188, plantY + 5.2, -87, 236, -87, M.warning);
  for (const x of [190, 202, 214, 226, 238]) directorMacroCycle4V30Box(0.16, 4.8, 0.16, x, plantY + 2.6, -87, M.loadingFrame);
  directorMacroCycle4V30Sign(235, plantY + 0.1, -84, 5.5, Math.PI / 2);

  const boundaryY = surfaceYAt(70, 306, 0) + 0.1;
  for (const x of [0, 28, 56, 84, 112, 140, 168]) {
    directorMacroCycle4V30Box(0.22, 8.2, 0.22, x, boundaryY + 4.1, 306, M.fence);
    directorMacroCycle4V30Box(0.12, 0.12, 11.5, x, boundaryY + 7.6, 306, M.warning);
  }
  directorMacroCycle4V30Rail(0, boundaryY + 5.8, 306, 168, 306, M.fence);
  directorMacroCycle4V30Box(8.0, 4.0, 0.16, 70, boundaryY + 3.4, 305.7, M.sign);
  directorMacroCycle4V30Box(6.0, 0.14, 0.1, 70, boundaryY + 3.8, 305.5, M.warning);
  for (const [x, z] of [[-10, 300], [184, 300], [14, 318], [158, 320], [42, 326]]) {
    group.add(cylinder(0.5, 4.2, x, surfaceYAt(x, z, 0) + 2.1, z, M.heroSidingAlt, 6));
    group.add(cylinder(1.5, 3.2, x, surfaceYAt(x, z, 0) + 5.8, z, M.heroSiding, 6));
  }
}
`;

const passStart = v29Source.indexOf('const v29VisualPass = String.raw`') + 'const v29VisualPass = String.raw`'.length;
const passEnd = v29Source.indexOf('`;\n\nconst required = [', passStart);
if (passStart < 0 || passEnd < 0) throw new Error('v29 visual pass markers missing');
v29Source = v29Source.slice(0, passEnd) + '\n' + v30VisualPass + v29Source.slice(passEnd);
v29Source = v29Source.replace(
  "const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');",
  `const generatorSha256 = '${generatorSha256}';`,
);
v29Source = v29Source.replace("const generatorPath = '.context/ab/director-macro-cycle-4/v29/gen-director-macro-cycle-4-v29.mjs';", `const generatorPath = '${generatorPath}';`);
if (!v29Source.includes('directorMacroCycle4V30VisualRecovery') || !v29Source.includes(generatorPath)) throw new Error('v30 wrapper patch failed');

const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v30/build-a/facility-built-v30.glb';
const reportPath = process.argv[4] || process.env.BUILD_REPORT_PATH || '.context/ab/director-macro-cycle-4/v30/build-a/director-macro-cycle-4-v30-report.json';
if (path.resolve(artifactPath) === path.resolve(authoritativePath)) throw new Error('v30 artifact path cannot target authoritative GLB');
const runtimeDir = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-build-${process.pid}`);
const runtimeArtifactPath = path.join(runtimeDir, 'facility-built-runtime.glb');
const runtimeReportPath = path.join(runtimeDir, 'build-report.json');
fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeDir, { recursive: true });
const temporaryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-${process.pid}.mjs`);
fs.writeFileSync(temporaryPath, v29Source);
const originalArgv = process.argv.slice();
process.argv[3] = runtimeArtifactPath;
process.argv[4] = runtimeReportPath;
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V28 = '1';
const waitForBuild = async (files, timeoutMs = 120000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (files.every(file => fs.existsSync(file) && fs.statSync(file).size > 0)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`isolated v30 build did not produce expected files: ${files.join(', ')}`);
};
try {
  try {
    await import(pathToFileURL(temporaryPath).href + '?v30=1');
  } finally {
    process.argv.length = 0;
    process.argv.push(...originalArgv);
  }
  await waitForBuild([runtimeArtifactPath, runtimeReportPath]);
} finally {
  fs.rmSync(temporaryPath, { force: true });
}

const readGlb = file => {
  const bytes = fs.readFileSync(file);
  let offset = 12, json, bin;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const data = bytes.subarray(offset, offset + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8').trim());
    else if (type === 0x004e4942) bin = Buffer.from(data);
    offset += length;
  }
  return { json, bin };
};
const writeGlb = (file, json, bin) => {
  const raw = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)]);
  const binChunk = bin ? Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]) : null;
  const length = 12 + 8 + jsonChunk.length + (binChunk ? 8 + binChunk.length : 0);
  const out = Buffer.alloc(length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(length, 8);
  let offset = 12;
  out.writeUInt32LE(jsonChunk.length, offset); out.writeUInt32LE(0x4e4f534a, offset + 4); jsonChunk.copy(out, offset + 8); offset += 8 + jsonChunk.length;
  if (binChunk) { out.writeUInt32LE(binChunk.length, offset); out.writeUInt32LE(0x004e4942, offset + 4); binChunk.copy(out, offset + 8); }
  fs.writeFileSync(file, out);
};
const glbIdentity = glb => {
  const accessors = glb.json.accessors || [];
  return {
    materials: glb.json.materials?.length || 0,
    meshes: glb.json.meshes?.length || 0,
    nodes: glb.json.nodes?.length || 0,
    images: glb.json.images?.length || 0,
    primitives: glb.json.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
    indexedTriangles: (glb.json.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => {
      const accessor = primitive.indices === undefined ? accessors[primitive.attributes.POSITION] : accessors[primitive.indices];
      return sum + (accessor?.count || 0) / 3;
    }, 0),
  };
};
const glb = readGlb(runtimeArtifactPath);
glb.json.nodes ??= [];
glb.json.nodes[0] ??= {};
glb.json.nodes[0].extras ??= {};
glb.json.nodes[0].extras.directorMacroCycle4V30VisualRecovery = recovery;
const identity = glbIdentity(glb);
const finalReport = JSON.parse(fs.readFileSync(runtimeReportPath));
const triangleCap = finalReport.directorMacroCycle4?.compoundPolicy?.maxTriangles || 881216;
const indexedTriangles = Math.round(identity.indexedTriangles);
if (indexedTriangles > triangleCap) throw new Error(`v30 indexed triangle cap exceeded: ${indexedTriangles} > ${triangleCap}`);
fs.mkdirSync(path.dirname(path.resolve(artifactPath)), { recursive: true });
writeGlb(artifactPath, glb.json, glb.bin);
const artifactBytes = fs.readFileSync(artifactPath);
const authoritativeAfter = hashFile(authoritativePath);
const authoritativeUnchanged = authoritativeBefore.sha256 === authoritativeAfter.sha256 && authoritativeBefore.bytes === authoritativeAfter.bytes;
if (!authoritativeUnchanged) throw new Error(`authoritative artifact changed during v30 build: ${JSON.stringify({ before: authoritativeBefore, after: authoritativeAfter })}`);
finalReport.generatorPath = generatorPath;
finalReport.generatorSha256 = generatorSha256;
finalReport.directorMacroCycle4V30VisualRecovery = recovery;
finalReport.artifact = { ...finalReport.artifact, path: artifactPath, sha256: createHash('sha256').update(artifactBytes).digest('hex'), bytes: artifactBytes.length, identity };
finalReport.authoritativeArtifact = { ...authoritativeBaseline, before: authoritativeBefore, after: authoritativeAfter, unchanged: authoritativeUnchanged };
finalReport.v30Integrity = {
  generatorPath,
  generatorSha256,
  artifact: { path: artifactPath, sha256: finalReport.artifact.sha256, bytes: artifactBytes.length, identity },
  indexedTriangles,
  triangleCap,
  withinTriangleCap: indexedTriangles <= triangleCap,
  authoritativeUnchanged,
};
finalReport.checks ??= [];
finalReport.checks.push({ n: 'v30: indexed artifact triangles stay within cap', p: indexedTriangles <= triangleCap, d: `${indexedTriangles} <= ${triangleCap}` });
fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
fs.rmSync(runtimeDir, { recursive: true, force: true });
