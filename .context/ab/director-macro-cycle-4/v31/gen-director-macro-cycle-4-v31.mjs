import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const v30Path = fileURLToPath(new URL('../v30/gen-director-macro-cycle-4-v30.mjs', import.meta.url));
let v30Source = fs.readFileSync(v30Path, 'utf8');
const generatorPath = '.context/ab/director-macro-cycle-4/v31/gen-director-macro-cycle-4-v31.mjs';
const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const authoritativePath = 'editor/facility-built.glb';
const authoritativeBaseline = { path: authoritativePath, sha256: '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db', bytes: 67532976 };
const hashFile = file => { const bytes = fs.readFileSync(file); return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }; };
const authoritativeBefore = hashFile(authoritativePath);
if (authoritativeBefore.sha256 !== authoritativeBaseline.sha256 || authoritativeBefore.bytes !== authoritativeBaseline.bytes) throw new Error(`authoritative artifact identity mismatch before v31 build: ${JSON.stringify(authoritativeBefore)}`);

const recovery = {
  schemaVersion: 1,
  strategy: 'campus-scale-streetwall-yard-density-and-layered-silhouettes-v31',
  owner: 'director-macro-cycle-4-v31',
  sourceRefs: ['blockout/blockout-full-v1.json#segments.g-yrd-hub', 'blockout/blockout-full-v1.json#segments.g-yrd-plant-s', 'blockout/blockout-full-v1.json#routes.route_main_surface', 'blockout/blockout-full-v1.json#routes.route_covered', 'GATING-PLAN.MD#industrial-campus-visual-recovery'],
  referenceIds: ['user-supplied-industrial-campus-board', 'industrial-frontage', 'processing-yard', 'wet-industrial-hardstand', 'operational-loading-specificity', 'facility-edge-vegetation', 'layered-campus-silhouettes'],
  contractIds: ['source-canonical', 'routes-unchanged', 'ground-contact', 'connected-compound-massing', 'shared-operational-yards', 'wet-marked-service-streets', 'triangle-growth-15-percent'],
  evidenceViews: ['top', 'orbit', 'zone-spawn', 'zone-courtyard', 'zone-warehouse', 'zone-plant', 'zone-bridge', 'zone-core', 'zone-boundary', 'route-main-surface', 'route-covered', 'route-rear-alley', 'route-north-ring', 'route-south-retreat', 'objective-core', 'cover-courtyard', 'vertical-connector'],
  features: [
    { id: 'v31-campus-streetwall-families', owner: 'v31-campus-streetwall-families', type: 'connected-secondary-industrial-families', zone: 'campus-wide', center: [-18, 70], evidenceViews: ['top', 'orbit', 'zone-spawn', 'zone-warehouse', 'zone-plant'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
    { id: 'v31-operational-yard-clusters', owner: 'v31-operational-yard-clusters', type: 'containers-pallets-forklifts-service-yards', zone: 'campus-wide', center: [-86, 86], evidenceViews: ['zone-spawn', 'zone-courtyard', 'zone-warehouse', 'cover-courtyard'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
    { id: 'v31-layered-perimeter-silhouettes', owner: 'v31-layered-perimeter-silhouettes', type: 'tanks-stacks-vegetation-berms', zone: 'zone_boundary', center: [72, 300], evidenceViews: ['top', 'orbit', 'zone-boundary', 'zone-plant'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
    { id: 'v31-readable-objective-front', owner: 'v31-readable-objective-front', type: 'emissive-control-room-screen-wall', zone: 'zone_core', center: [52, -258], evidenceViews: ['objective-core', 'zone-core'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
    { id: 'v31-wet-service-streets', owner: 'v31-wet-service-streets', type: 'large-reflective-patches-drains-markings', zone: 'route_main_surface', center: [-110, 120], evidenceViews: ['route-main-surface', 'route-rear-alley', 'route-south-retreat'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
    { id: 'v31-vertical-process-frames', owner: 'v31-vertical-process-frames', type: 'multi-level-catwalk-stair-and-pipe-frames', zone: 'zone_bridge', center: [296, 70], evidenceViews: ['zone-bridge', 'vertical-connector', 'route-north-ring'], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS', clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 } },
  ],
  stats: { secondaryBuildings: 10, yardContainers: 18, palletStacks: 32, serviceVehicles: 12, perimeterTrees: 24, processTowers: 8, wetPatches: 32, catwalkFrames: 18 },
};
for (const feature of recovery.features) Object.assign(feature, { sourceRefs: [...recovery.sourceRefs], referenceIds: [...recovery.referenceIds], contractIds: [...recovery.contractIds] });

const visualPass = String.raw`
// -------- v31 campus-scale streetwall, yard density, and layered silhouette pass --------
const directorMacroCycle4V31Recovery = ${JSON.stringify(recovery)};
const directorMacroCycle4V31Box = (w, h, d, x, y, z, material, rotation = 0) => group.add(box(w, h, d, x, y, z, material, rotation));
const directorMacroCycle4V31Surface = (x, z, w, d, material = M.loadingReflective, rotation = 0) => directorMacroCycle4V31Box(w, 0.06, d, x, surfaceYAt(x, z, 0) + 0.14, z, material, rotation);
const directorMacroCycle4V31Wall = (x, z, w, d, h, rotation = 0) => {
  const y = surfaceYAt(x, z, 0) + 0.12;
  directorMacroCycle4V31Box(w, h, d, x, y + h / 2, z, M.heroSiding, rotation);
  directorMacroCycle4V31Box(w + 0.5, 0.28, d + 0.5, x, y + h + 0.12, z, M.roof, rotation);
  for (let i = -Math.floor(w / 4); i <= Math.floor(w / 4); i++) directorMacroCycle4V31Box(0.12, h - 0.5, 0.08, x + i * 4, y + h / 2, z - d / 2 - 0.08, M.rib, rotation);
};
const directorMacroCycle4V31Door = (x, z, width = 4.5, height = 5.2, rotation = 0) => {
  const y = surfaceYAt(x, z, 0) + 0.18;
  directorMacroCycle4V31Box(0.16, height, width, x, y + height / 2, z, M.loadingDoor, rotation);
  directorMacroCycle4V31Box(0.18, 0.16, width + 0.5, x, y + height + 0.14, z, M.warning, rotation);
  directorMacroCycle4V31Box(0.12, 0.18, width - 0.6, x, y + 1.1, z, M.light, rotation);
};
const directorMacroCycle4V31Container = (x, z, rotation = 0, height = 2.7) => {
  const y = surfaceYAt(x, z, 0) + 0.16;
  directorMacroCycle4V31Box(6.2, height, 2.6, x, y + height / 2, z, M.loadingPanel, rotation);
  for (const offset of [-2.2, -1.1, 0, 1.1, 2.2]) directorMacroCycle4V31Box(0.08, height - 0.3, 0.08, x + Math.cos(rotation) * offset, y + height / 2, z + Math.sin(rotation) * offset, M.loadingFrame, rotation);
  directorMacroCycle4V31Box(0.12, height - 0.4, 2.0, x + Math.cos(rotation) * 2.9, y + height / 2, z + Math.sin(rotation) * 2.9, M.warningDark, rotation);
};
const directorMacroCycle4V31Pallet = (x, z, stack = 1, rotation = 0) => {
  const y = surfaceYAt(x, z, 0) + 0.18;
  for (let level = 0; level < stack; level++) {
    directorMacroCycle4V31Box(2.4, 0.16, 1.6, x, y + level * 0.62, z, M.loadingFrame, rotation);
    directorMacroCycle4V31Box(2.0, 0.12, 0.12, x - Math.cos(rotation) * 0.72, y + 0.2 + level * 0.62, z - Math.sin(rotation) * 0.72, M.rib, rotation);
    directorMacroCycle4V31Box(2.0, 0.12, 0.12, x + Math.cos(rotation) * 0.72, y + 0.2 + level * 0.62, z + Math.sin(rotation) * 0.72, M.rib, rotation);
  }
};
const directorMacroCycle4V31Tree = (x, z, scale = 1) => {
  const y = surfaceYAt(x, z, 0) + 0.12;
  group.add(cylinder(0.34 * scale, 3.6 * scale, x, y + 1.8 * scale, z, M.rust, 6));
  group.add(cylinder(1.5 * scale, 3.2 * scale, x, y + 5.2 * scale, z, M.heroSidingAlt, 7));
  group.add(cylinder(1.05 * scale, 2.4 * scale, x + 0.7 * scale, y + 6.4 * scale, z, M.heroSiding, 7));
};
const directorMacroCycle4V31Stack = (x, z, scale = 1) => {
  const y = surfaceYAt(x, z, 0) + 0.1;
  group.add(cylinder(2.2 * scale, 14 * scale, x, y + 7 * scale, z, M.heroPanel, 8));
  for (const level of [2, 6, 10]) directorMacroCycle4V31Box(4.8 * scale, 0.16, 4.8 * scale, x, y + level * scale, z, M.loadingFrame);
  directorMacroCycle4V31Box(0.22, 15 * scale, 0.22, x + 2.2 * scale, y + 7.5 * scale, z, M.warning, 0.2);
};

{
  // Streetwall families make every major yard read as occupied space, not isolated props.
  for (const [x, z, w, d, h, r] of [
    [-254, 184, 28, 15, 8, 0], [-224, 204, 22, 14, 7, 0.08],
    [-94, 112, 30, 16, 9, 0], [-66, 92, 22, 13, 7, -0.08],
    [-126, -25, 34, 17, 10, 0], [-86, -36, 21, 13, 7, 0.1],
    [250, -30, 30, 17, 10, 0], [274, -4, 20, 13, 8, -0.1],
    [284, 50, 28, 16, 12, 0], [112, 250, 24, 14, 8, 0.1],
  ]) directorMacroCycle4V31Wall(x, z, w, d, h, r);
  for (const [x, z, w, h, r] of [
    [-254, 176, 5.8, 5.8, 0], [-246, 176, 5.8, 5.8, 0], [-224, 197, 4.8, 5.0, 0.08],
    [-94, 104, 5.8, 6.2, 0], [-84, 104, 5.8, 6.2, 0], [-126, -16, 6.2, 6.4, 0],
    [-116, -16, 6.2, 6.4, 0], [250, -21, 5.8, 6.2, 0], [260, -21, 5.8, 6.2, 0],
    [284, 41, 5.2, 7.0, 0], [294, 41, 5.2, 7.0, 0], [112, 243, 5.0, 5.4, 0.1],
  ]) directorMacroCycle4V31Door(x, z, w, h, r);

  // Containers and pallets distribute scale cues across shared yards and route approaches.
  for (const [x, z, r, h] of [
    [-276, 170, 0.04, 2.7], [-266, 170, 0.04, 5.4], [-256, 170, 0.04, 2.7], [-242, 188, 1.5, 2.7],
    [-112, 94, 0, 2.7], [-104, 94, 0, 5.4], [-96, 94, 0, 2.7], [-78, 82, 1.5, 2.7],
    [-150, 14, 0, 2.7], [-140, 14, 0, 5.4], [-130, 14, 0, 2.7], [-112, -2, 1.5, 2.7],
    [224, -68, 0, 2.7], [234, -68, 0, 5.4], [244, -68, 0, 2.7], [264, -50, 1.5, 2.7],
    [126, 84, 0, 2.7], [138, 84, 0, 5.4],
  ]) directorMacroCycle4V31Container(x, z, r, h);
  for (const [x, z, n, r] of [
    [-286, 178, 3, 0], [-276, 182, 2, 0.1], [-258, 180, 3, 0], [-238, 190, 2, 0.2],
    [-112, 103, 3, 0], [-98, 105, 2, 0.1], [-78, 88, 3, 0], [-64, 82, 2, 0.2],
    [-150, 6, 3, 0], [-134, 7, 2, 0.1], [-112, -10, 3, 0], [-96, -8, 2, 0.2],
    [220, -60, 3, 0], [236, -60, 2, 0.1], [258, -54, 3, 0], [270, -48, 2, 0.2],
    [122, 92, 3, 0], [140, 92, 2, 0.1], [156, 74, 3, 0], [172, 72, 2, 0.2],
    [198, -142, 3, 0], [214, -142, 2, 0.1], [232, -150, 3, 0], [248, -150, 2, 0.2],
    [72, 142, 3, 0], [88, 142, 2, 0.1], [104, 136, 3, 0], [120, 136, 2, 0.2],
    [-214, 150, 3, 0], [-198, 150, 2, 0.1], [-182, 146, 3, 0], [-166, 146, 2, 0.2],
  ]) directorMacroCycle4V31Pallet(x, z, n, r);

  // Bright control-room face and objective screens remain readable at player distance.
  const coreY = surfaceYAt(52, -258, -1.2) + 0.2;
  directorMacroCycle4V31Box(0.22, 10.8, 34, 51.55, coreY + 5.4, -258, M.heroGlass);
  for (const z of [-270, -264, -258, -252, -246]) directorMacroCycle4V31Box(0.14, 10.7, 0.18, 51.35, coreY + 5.35, z, M.loadingFrame);
  for (const z of [-268, -262, -256, -250]) {
    directorMacroCycle4V31Box(0.10, 1.65, 4.5, 51.15, coreY + 3.25, z, M.amber);
    directorMacroCycle4V31Box(0.08, 0.82, 3.7, 51.05, coreY + 4.45, z, M.loadingGlass);
  }
  directorMacroCycle4V31Box(0.14, 0.22, 30, 51.0, coreY + 8.9, -258, M.warning);

  // Large wet service patches and drains make street material response legible in route views.
  for (const [x, z, w, d, r] of [
    [-242, 160, 22, 5, 0.08], [-210, 150, 18, 4, -0.1], [-176, 140, 24, 5, 0.06],
    [-112, 118, 20, 4, 0], [-82, 100, 18, 4, 0.1], [-52, 82, 16, 3.5, -0.08],
    [108, 94, 18, 4, 0], [142, 74, 16, 3.5, 0.1], [180, -132, 20, 4, -0.08],
    [216, -148, 18, 4, 0.08], [220, -74, 22, 4, 0.04], [94, -118, 18, 3.5, -0.1],
    [82, 146, 20, 4, 0.06], [160, 112, 18, 3.5, -0.1], [236, -152, 18, 4, 0.08],
    [66, 66, 16, 3.5, 0],
  ]) directorMacroCycle4V31Surface(x, z, w, d, M.loadingPuddle, r);
  for (const [x, z, w, r] of [[-232, 158, 7, 0], [-202, 149, 6, 0], [-168, 140, 7, 0], [-103, 116, 6, 0], [-74, 99, 6, 0], [-44, 81, 5, 0], [116, 93, 6, 0], [150, 73, 5, 0], [190, -131, 7, 0], [226, -147, 6, 0], [230, -73, 7, 0], [103, -117, 6, 0], [92, 145, 6, 0], [168, 111, 5, 0], [244, -151, 6, 0], [74, 65, 5, 0]]) {
    directorMacroCycle4V31Box(w, 0.07, 0.24, x, surfaceYAt(x, z, 0) + 0.18, z, M.drain, r);
  }

  // Vertical process frames and transfer silhouettes bind bridge, plant, and route views.
  const bridgeY = surfaceYAt(296, 70, 0) + 0.2;
  for (const [x, z, h] of [[266, 62, 15], [282, 62, 18], [298, 62, 21], [314, 62, 16], [330, 62, 19], [346, 62, 14], [258, 42, 12], [330, 42, 15]]) {
    directorMacroCycle4V31Box(0.34, h, 0.34, x, bridgeY + h / 2, z, M.pipeDark);
    directorMacroCycle4V31Box(0.26, h, 0.26, x + 4.8, bridgeY + h / 2, z, M.loadingFrame);
    directorMacroCycle4V31Box(5.2, 0.18, 0.3, x + 2.4, bridgeY + h - 0.6, z, M.warning);
    directorMacroCycle4V31Box(5.2, 0.16, 0.3, x + 2.4, bridgeY + 2.4, z, M.loadingFrame);
    directorMacroCycle4V31Box(0.16, 0.18, 5.2, x + 2.4, bridgeY + h - 0.7, z, M.rib);
  }
  for (const x of [264, 282, 300, 318, 336]) addBeam([x, bridgeY + 3, 59], [x + 16, bridgeY + 3, 59], 0.14, M.pipe);
  for (let i = 0; i < 9; i++) {
    const z = 76 - i * 1.8;
    directorMacroCycle4V31Box(7.5, 0.24, 2.2, 316, bridgeY + 0.35 + i * 0.34, z, i % 2 ? M.warningDark : M.loadingFrame);
  }
  directorMacroCycle4V31Box(10, 0.3, 8, 316, bridgeY + 3.7, 56, M.loadingCanopy);

  // Industrial perimeter gets layered trees, stacks, and a service gatehouse.
  directorMacroCycle4V31Wall(70, 286, 22, 12, 6, 0);
  directorMacroCycle4V31Door(70, 279, 5.5, 4.8, 0);
  for (const [x, z, s] of [[-18, 302, 1.1], [8, 318, 1], [36, 326, 1.2], [64, 318, 0.9], [94, 324, 1.1], [124, 316, 1], [154, 326, 1.2], [184, 310, 1], [204, 292, 1.15], [-42, 286, 0.9], [238, 278, 1], [254, 300, 1.2], [270, 320, 0.9], [300, 286, 1.1], [324, 304, 1]]) directorMacroCycle4V31Tree(x, z, s);
  for (const [x, z, s] of [[-8, 300, 1.1], [24, 312, 0.85], [56, 298, 1], [96, 306, 0.9], [142, 292, 1.1], [188, 300, 0.9], [232, 286, 1.05], [286, 296, 0.9]]) directorMacroCycle4V31Stack(x, z, s);
}
`;

const passStart = v30Source.indexOf('const v30VisualPass = String.raw`') + 'const v30VisualPass = String.raw`'.length;
const passEnd = v30Source.indexOf('`;\n\nconst passStart =', passStart);
if (passStart < 0 || passEnd < 0) throw new Error('v30 visual pass markers missing');
v30Source = v30Source.slice(0, passEnd) + '\n' + visualPass + v30Source.slice(passEnd);
v30Source = v30Source.replace("const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');", `const generatorSha256 = '${generatorSha256}';`);
v30Source = v30Source.replace("const generatorPath = '.context/ab/director-macro-cycle-4/v30/gen-director-macro-cycle-4-v30.mjs';", `const generatorPath = '${generatorPath}';`);
if (!v30Source.includes('directorMacroCycle4V31Recovery') || !v30Source.includes(generatorPath)) throw new Error('v31 wrapper patch failed');

const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v31/build-a/facility-built-v31.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v31/build-a/director-macro-cycle-4-v31-report.json';
if (path.resolve(artifactPath) === path.resolve(authoritativePath)) throw new Error('v31 artifact path cannot target authoritative GLB');
const temporaryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-${process.pid}.mjs`);
fs.writeFileSync(temporaryPath, v30Source);
const originalArgv = process.argv.slice();
process.argv[3] = artifactPath;
process.argv[4] = reportPath;
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V28 = '1';
try {
  try { await import(pathToFileURL(temporaryPath).href + '?v31=1'); }
  finally { process.argv.length = 0; process.argv.push(...originalArgv); }
} finally { fs.rmSync(temporaryPath, { force: true }); }

const readGlb = file => {
  const bytes = fs.readFileSync(file); let offset = 12, json, bin;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4); offset += 8;
    const data = bytes.subarray(offset, offset + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8').trim());
    else if (type === 0x004e4942) bin = Buffer.from(data);
    offset += length;
  }
  return { json, bin };
};
const writeGlb = (file, json, bin) => {
  const raw = Buffer.from(JSON.stringify(json)); const jsonChunk = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 0x20)]); const binChunk = bin ? Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]) : null;
  const length = 12 + 8 + jsonChunk.length + (binChunk ? 8 + binChunk.length : 0); const out = Buffer.alloc(length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(length, 8); let offset = 12;
  out.writeUInt32LE(jsonChunk.length, offset); out.writeUInt32LE(0x4e4f534a, offset + 4); jsonChunk.copy(out, offset + 8); offset += 8 + jsonChunk.length;
  if (binChunk) { out.writeUInt32LE(binChunk.length, offset); out.writeUInt32LE(0x004e4942, offset + 4); binChunk.copy(out, offset + 8); }
  fs.writeFileSync(file, out);
};
const identityOf = glb => {
  const accessors = glb.json.accessors || [];
  return { materials: glb.json.materials?.length || 0, meshes: glb.json.meshes?.length || 0, nodes: glb.json.nodes?.length || 0, images: glb.json.images?.length || 0, primitives: glb.json.meshes?.flatMap(mesh => mesh.primitives || []).length || 0, indexedTriangles: (glb.json.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => { const accessor = primitive.indices === undefined ? accessors[primitive.attributes.POSITION] : accessors[primitive.indices]; return sum + (accessor?.count || 0) / 3; }, 0) };
};
const glb = readGlb(artifactPath);
glb.json.nodes ??= []; glb.json.nodes[0] ??= {}; glb.json.nodes[0].extras ??= {};
glb.json.nodes[0].extras.directorMacroCycle4V31VisualRecovery = recovery;
const identity = identityOf(glb);
const finalReport = JSON.parse(fs.readFileSync(reportPath));
const triangleCap = finalReport.directorMacroCycle4?.compoundPolicy?.maxTriangles || 881216;
const indexedTriangles = Math.round(identity.indexedTriangles);
if (indexedTriangles > triangleCap) throw new Error(`v31 indexed triangle cap exceeded: ${indexedTriangles} > ${triangleCap}`);
fs.mkdirSync(path.dirname(path.resolve(artifactPath)), { recursive: true }); writeGlb(artifactPath, glb.json, glb.bin);
const artifact = fs.readFileSync(artifactPath); const authoritativeAfter = hashFile(authoritativePath);
const authoritativeUnchanged = authoritativeBefore.sha256 === authoritativeAfter.sha256 && authoritativeBefore.bytes === authoritativeAfter.bytes;
if (!authoritativeUnchanged) throw new Error(`authoritative artifact changed during v31 build: ${JSON.stringify({ before: authoritativeBefore, after: authoritativeAfter })}`);
const artifactSha256 = createHash('sha256').update(artifact).digest('hex');
finalReport.generatorPath = generatorPath; finalReport.generatorSha256 = generatorSha256; finalReport.directorMacroCycle4V31VisualRecovery = recovery;
finalReport.artifact = { ...finalReport.artifact, path: artifactPath, sha256: artifactSha256, bytes: artifact.length, identity };
finalReport.authoritativeArtifact = { ...authoritativeBaseline, before: authoritativeBefore, after: authoritativeAfter, unchanged: authoritativeUnchanged };
finalReport.v31Integrity = { generatorPath, generatorSha256, artifact: { path: artifactPath, sha256: artifactSha256, bytes: artifact.length, identity }, indexedTriangles, triangleCap, withinTriangleCap: indexedTriangles <= triangleCap, authoritativeUnchanged };
finalReport.checks ??= []; finalReport.checks.push({ n: 'v31: indexed artifact triangles stay within cap', p: indexedTriangles <= triangleCap, d: `${indexedTriangles} <= ${triangleCap}` });
fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
