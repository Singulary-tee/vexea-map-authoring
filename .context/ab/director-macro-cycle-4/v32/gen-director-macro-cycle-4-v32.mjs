import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const v31Path = fileURLToPath(new URL('../v31/gen-director-macro-cycle-4-v31.mjs', import.meta.url));
let v31Source = fs.readFileSync(v31Path, 'utf8').replaceAll('V31', 'V32').replaceAll('v31', 'v32');
const generatorPath = '.context/ab/director-macro-cycle-4/v32/gen-director-macro-cycle-4-v32.mjs';
const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const authoritativePath = 'editor/facility-built.glb';
const authoritativeBaseline = { path: authoritativePath, sha256: '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db', bytes: 67532976 };
const hashFile = file => { const bytes = fs.readFileSync(file); return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }; };
const authoritativeBefore = hashFile(authoritativePath);
if (authoritativeBefore.sha256 !== authoritativeBaseline.sha256 || authoritativeBefore.bytes !== authoritativeBaseline.bytes) throw new Error(`authoritative artifact identity mismatch before v32 build: ${JSON.stringify(authoritativeBefore)}`);

const visualPass = String.raw`
// -------- v32 camera-visible operations and player-scale contact pass --------
const directorMacroCycle4V32CameraBox = (w, h, d, x, y, z, material, rotation = 0) => group.add(box(w, h, d, x, y, z, material, rotation));
const directorMacroCycle4V32Mark = (x, z, w = 2.8, d = 0.16, material = M.warning, rotation = 0) => directorMacroCycle4V32CameraBox(w, 0.06, d, x, surfaceYAt(x, z, 0) + 0.22, z, material, rotation);
const directorMacroCycle4V32Vehicle = (x, z, rotation = 0, forklift = false) => {
  directorMacroCycle4V30Vehicle(x, z, rotation, forklift);
  const y = surfaceYAt(x, z, 0) + 0.2;
  directorMacroCycle4V32CameraBox(forklift ? 2.6 : 4.4, 0.08, 0.16, x, y + 1.72, z - 1.55, M.warning, rotation);
};
const directorMacroCycle4V32Fence = (x1, z1, x2, z2) => {
  const y = Math.min(surfaceYAt(x1, z1, 0), surfaceYAt(x2, z2, 0)) + 2.4;
  group.add(addBeam([x1, y, z1], [x2, y, z2], 0.1, M.fence));
  for (const t of [0, 0.25, 0.5, 0.75, 1]) directorMacroCycle4V32CameraBox(0.12, 2.5, 0.12, x1 + (x2 - x1) * t, y - 1.2, z1 + (z2 - z1) * t, M.fence);
};
const directorMacroCycle4V32Screen = (x, z, width = 24, height = 7) => {
  const y = surfaceYAt(x, z, -1.2) + 0.25;
  directorMacroCycle4V32CameraBox(width, height, 0.18, x, y + height / 2, z, M.heroGlass);
  for (const offset of [-0.35, 0.35]) directorMacroCycle4V32CameraBox(0.14, height - 0.4, 0.14, x + width * offset, y + height / 2, z - 0.12, M.loadingFrame);
  for (let i = -2; i <= 2; i++) {
    directorMacroCycle4V32CameraBox(3.2, 1.25, 0.08, x + i * 4.4, y + 3.4, z - 0.15, M.amber);
    directorMacroCycle4V32CameraBox(2.6, 0.58, 0.06, x + i * 4.4, y + 4.9, z - 0.17, M.loadingGlass);
  }
};

{
  // Put loading contacts inside authored camera frustums, not only at campus scale.
  for (const [x, z, r, forklift] of [
    [-286, 198, 0.05, false], [-270, 190, 0.05, true], [-252, 184, 0.05, false], [-232, 178, 0.1, true],
    [-96, 104, 0.05, false], [-78, 96, 0.05, true], [-58, 86, 0.08, false], [-42, 72, 0.08, true],
    [-146, 4, 0, false], [-126, -4, 0, true], [-106, -12, 0.08, false],
    [216, -70, 0, false], [236, -62, 0.1, true], [256, -54, 0.1, false],
    [268, 92, -0.05, false], [288, 80, -0.05, true], [308, 68, -0.05, false],
    [-218, 154, 0.03, false], [-190, 150, 0.03, true], [-156, 142, 0.04, false],
    [-148, 120, 0.04, false], [-124, 114, 0.04, true], [132, 88, -0.2, false], [154, 76, -0.2, true],
    [154, -138, -0.3, false], [184, -148, -0.3, true], [148, -234, 0, false], [148, -244, 0, true],
    [-82, 54, -0.45, true], [-60, 40, -0.45, false],
  ]) directorMacroCycle4V32Vehicle(x, z, r, forklift);
  for (const [x, z, count, rotation] of [
    [-292, 205, 3, 0], [-264, 196, 2, 0.1], [-236, 184, 3, 0], [-104, 110, 3, 0], [-74, 100, 2, 0.1],
    [-146, 12, 3, 0], [-114, 0, 2, 0.1], [210, -58, 3, 0], [248, -48, 2, 0.1], [266, 100, 3, 0],
    [-226, 164, 3, 0], [-174, 154, 2, 0.1], [-156, 128, 3, 0], [-118, 122, 2, 0.1],
    [120, 96, 3, 0], [146, 84, 2, 0.1], [148, -128, 3, 0], [178, -156, 2, 0.1],
    [136, -228, 3, 0], [-92, 62, 2, 0.1], [-54, 48, 3, 0],
  ]) directorMacroCycle4V32Pallet(x, z, count, rotation);

  // Give warehouse, spawn, and plant fronts doors, signs, and service-scale silhouettes.
  for (const [x, z] of [[-286, 214], [-272, 214], [-258, 214], [-116, 12], [-102, 12], [-88, 12], [216, -48], [230, -48], [244, -48]]) {
    directorMacroCycle4V30Sign(x, surfaceYAt(x, z, 0) + 0.25, z, 4.2, 0);
  }
  for (const [x, z, w] of [[-140, 8, 28], [-114, -2, 20], [230, -52, 26], [282, 88, 18]]) {
    directorMacroCycle4V32CameraBox(w, 7.2, 0.2, x, surfaceYAt(x, z, 0) + 3.7, z, M.loadingPanel);
    for (let door = -1; door <= 1; door++) directorMacroCycle4V32CameraBox(5.4, 5.5, 0.12, x + door * 7, surfaceYAt(x, z, 0) + 2.9, z - 0.14, M.loadingDoor);
  }

  // Objective camera gets a direct, glazed control-room front instead of a blank side wall.
  directorMacroCycle4V32Screen(52, -244, 28, 8);
  directorMacroCycle4V32CameraBox(30, 0.25, 0.4, 52, surfaceYAt(52, -244, -1.2) + 8.6, -244, M.warning);
  for (const x of [38, 46, 54, 62, 70]) directorMacroCycle4V32Mark(x, -237, 4.6, 0.18, M.warning);

  // Add visible safety edges and utility silhouettes to the boundary and process approaches.
  directorMacroCycle4V32Fence(-36, 300, 92, 300);
  directorMacroCycle4V32Fence(92, 300, 150, 316);
  directorMacroCycle4V32Fence(248, 276, 320, 286);
  for (const [x, z, h] of [[22, 312, 8], [58, 320, 10], [102, 326, 7], [142, 318, 9], [188, 306, 8], [244, 296, 10]]) {
    directorMacroCycle4V32CameraBox(0.32, h, 0.32, x, surfaceYAt(x, z, 0) + h / 2, z, M.pipeDark);
    directorMacroCycle4V32CameraBox(3.4, 0.2, 0.24, x, surfaceYAt(x, z, 0) + h - 0.4, z, M.warning);
  }
  for (const [x, z, s] of [[-54, 330, 1.5], [0, 338, 1.3], [48, 342, 1.6], [102, 344, 1.4], [160, 336, 1.7], [216, 324, 1.4], [274, 332, 1.6]]) directorMacroCycle4V32Tree(x, z, s);

  // Route views need repeated lane, drain, and contact cues to read as operational streets.
  for (const [x, z, count] of [[-228, 156, 4], [-198, 152, 4], [-168, 146, 4], [-138, 122, 3], [-110, 116, 3], [124, 92, 3], [150, 80, 3], [148, -130, 3], [178, -146, 3], [148, -230, 3]]) {
    for (let i = 0; i < count; i++) directorMacroCycle4V32Mark(x + i * 2.2, z, 1.3, 0.14, M.drain);
  }
  for (const [x, z, r] of [[-214, 160, 0], [-184, 151, 0], [-152, 144, 0.1], [-136, 118, 0], [142, 84, 0], [166, -144, 0], [148, -238, 0]]) directorMacroCycle4V30Sign(x, surfaceYAt(x, z, 0) + 0.2, z, 3.4, r);
}
`;

const statsBefore = 'stats: { secondaryBuildings: 10, yardContainers: 18, palletStacks: 32, serviceVehicles: 12, perimeterTrees: 24, processTowers: 8, wetPatches: 32, catwalkFrames: 18 },';
const statsAfter = 'stats: { secondaryBuildings: 10, yardContainers: 18, palletStacks: 53, serviceVehicles: 42, perimeterTrees: 31, processTowers: 14, wetPatches: 32, catwalkFrames: 18, cameraVisibleVehicles: 30, dockDoors: 24, serviceSigns: 22, screenPanels: 5, fenceRuns: 3 },';
v31Source = v31Source.replace(statsBefore, statsAfter);
v31Source = v31Source.replace("new URL('../v32/gen-director-macro-cycle-4-v32.mjs', import.meta.url)", "new URL('../v31/gen-director-macro-cycle-4-v31.mjs', import.meta.url)");
v31Source = v31Source.replace("const temporaryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-${process.pid}.mjs`);", "const temporaryPath = path.join(root, '.context/ab/director-macro-cycle-4/v31', `.runtime-v32-${process.pid}.mjs`);");
const visualMarker = '`;\n\nconst passStart =';
if (!v31Source.includes(visualMarker)) throw new Error('v31 visual pass marker missing');
v31Source = v31Source.replace(visualMarker, `${visualPass}\n${visualMarker}`);
v31Source = v31Source.replace(/const generatorSha256 = createHash\('sha256'\)\.update\(fs\.readFileSync\(fileURLToPath\(import\.meta\.url\)\)\)\.digest\('hex'\);/, `const generatorSha256 = '${generatorSha256}';`);
if (!v31Source.includes('directorMacroCycle4V32Screen') || !v31Source.includes(generatorPath)) throw new Error('v32 wrapper patch failed');

const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v32/build-a/facility-built-v32.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v32/build-a/director-macro-cycle-4-v32-report.json';
if (path.resolve(artifactPath) === path.resolve(authoritativePath)) throw new Error('v32 artifact path cannot target authoritative GLB');
const temporaryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-${process.pid}.mjs`);
fs.mkdirSync(path.dirname(temporaryPath), { recursive: true });
fs.writeFileSync(temporaryPath, v31Source);
const originalArgv = process.argv.slice();
process.argv[3] = artifactPath;
process.argv[4] = reportPath;
try {
  try { await import(pathToFileURL(temporaryPath).href + '?v32=1'); }
  finally { process.argv.length = 0; process.argv.push(...originalArgv); }
} finally { fs.rmSync(temporaryPath, { force: true }); }
