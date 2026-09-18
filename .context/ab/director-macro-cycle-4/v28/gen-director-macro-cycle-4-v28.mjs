import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const basePath = fileURLToPath(new URL('../v26/gen-director-macro-cycle-4-v26.mjs', import.meta.url));
const v27Path = fileURLToPath(new URL('../v27/gen-director-macro-cycle-4-v27.mjs', import.meta.url));
const baseSource = fs.readFileSync(basePath, 'utf8');
const v27Source = fs.readFileSync(v27Path, 'utf8');
const markerFlags = "const directorMacroCycle4V26Only = process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 === '1';";
const markerMerge = '// -------- merge per material (KB C2b) --------';
const markerUserData = 'if (directorMacroCycle4V26Only) merged.userData.directorMacroCycle4V26VisualRecovery = directorMacroCycle4V26VisualRecovery;';
const markerReport = '  directorMacroCycle4V26VisualRecovery: directorMacroCycle4V26Only ? directorMacroCycle4V26VisualRecovery : null,';
const v27Start = v27Source.indexOf('const visualPass = String.raw`') + 'const visualPass = String.raw`'.length;
const v27End = v27Source.indexOf('`;\n\nlet patched = baseSource;', v27Start);
if (v27Start < 0 || v27End < 0) throw new Error('v27 visual pass markers missing');
const v27VisualPass = v27Source.slice(v27Start, v27End);

const v28VisualPass = String.raw`
// -------- v28 visible streetwall and operational composition pass --------
const directorMacroCycle4V28Feature = (id, type, zone, center, evidenceViews) => ({
  id, owner: id, type, zone, center: [...center], sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds], contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...evidenceViews], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
  clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 },
});
const directorMacroCycle4V28VisualRecovery = {
  schemaVersion: 1,
  strategy: 'visible-streetwall-and-operational-composition-v28',
  owner: 'director-macro-cycle-4-v28',
  sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds],
  contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...directorMacroCycle4V27VisualRecovery.evidenceViews],
  features: [
    directorMacroCycle4V28Feature('v28-warehouse-loading-frontage', 'loading-frontage', 'zone_warehouse', [-184, 12], ['zone-warehouse', 'route-covered']),
    directorMacroCycle4V28Feature('v28-covered-route-canopy', 'covered-route-streetwall', 'zone_warehouse', [-80, 62], ['route-covered', 'cover-courtyard']),
    directorMacroCycle4V28Feature('v28-rear-service-wall', 'rear-service-wall', 'zone_warehouse', [-142, 119], ['route-rear-alley', 'zone-warehouse']),
    directorMacroCycle4V28Feature('v28-plant-pipe-transfer', 'elevated-process-transfer', 'zone_plant', [228, -76], ['zone-plant', 'route-south-retreat']),
    directorMacroCycle4V28Feature('v28-bridge-overwatch-deck', 'bridge-overwatch-deck', 'zone_bridge', [302, 82], ['zone-bridge', 'route-north-ring', 'vertical-connector']),
    directorMacroCycle4V28Feature('v28-objective-control-facade', 'objective-control-facade', 'zone_core', [34, -253], ['objective-core', 'zone-core']),
    directorMacroCycle4V28Feature('v28-vertical-stair-tower', 'vertical-stair-tower', 'zone_bridge', [316, 70], ['vertical-connector', 'zone-bridge']),
    directorMacroCycle4V28Feature('v28-spawn-gate-arch', 'spawn-gate-arch', 'zone_spawn', [-276, 196], ['zone-spawn', 'route-main-surface']),
    directorMacroCycle4V28Feature('v28-boundary-fence-streetwall', 'boundary-fence-streetwall', 'zone_boundary', [70, 306], ['zone-boundary', 'top']),
  ],
  stats: { facadeDoors: 8, canopySpans: 2, serviceWalls: 3, transferBeams: 12, bridgeDeckFrames: 16, objectiveScreens: 6, stairFrames: 12, gateFrames: 6, boundaryFrames: 10 },
};
const directorMacroCycle4V28FacadeDoor = (x, z, sy, width = 8, height = 4.2, toward = 1) => {
  const faceZ = z + toward * 0.16;
  group.add(box(width, height, 0.14, x, sy + height / 2, faceZ, M.loadingDoor));
  group.add(box(0.16, height + 0.26, 0.2, x - width / 2 - 0.12, sy + height / 2, faceZ + toward * 0.1, M.loadingFrame));
  group.add(box(0.16, height + 0.26, 0.2, x + width / 2 + 0.12, sy + height / 2, faceZ + toward * 0.1, M.loadingFrame));
  for (const y of [sy + 0.82, sy + 1.62, sy + 2.42, sy + 3.22]) group.add(box(width - 0.34, 0.08, 0.08, x, y, faceZ + toward * 0.14, M.loadingSlat));
};
const directorMacroCycle4V28WindowStrip = (x, z, sy, width, height, toward = 1) => {
  const faceZ = z + toward * 0.18;
  group.add(box(width, height, 0.1, x, sy, faceZ, M.heroGlass));
  for (let px = x - width / 2 + 3; px < x + width / 2; px += 6) group.add(box(0.14, height + 0.22, 0.14, px, sy, faceZ + toward * 0.1, M.loadingFrame));
  group.add(box(width + 0.2, 0.12, 0.16, x, sy - height / 2, faceZ + toward * 0.12, M.trim));
  group.add(box(width + 0.2, 0.12, 0.16, x, sy + height / 2, faceZ + toward * 0.12, M.trim));
};
const directorMacroCycle4V28Rail = (x1, y, z1, x2, z2, material = M.warning) => {
  group.add(addBeam([x1, y, z1], [x2, y, z2], 0.14, material));
  for (const t of [0, 0.5, 1]) group.add(box(0.14, 1.0, 0.14, x1 + (x2 - x1) * t, y - 0.5, z1 + (z2 - z1) * t, material));
};
const directorMacroCycle4V28LightRow = (x1, y, z1, x2, z2, count) => {
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    group.add(box(1.3, 0.1, 0.28, x1 + (x2 - x1) * t, y, z1 + (z2 - z1) * t, M.light));
  }
};
if (directorMacroCycle4V28Only) {
  const warehouseY = surfaceYAt(-184, 12, 0) + 0.06;
  for (const x of [-211, -184, -157]) directorMacroCycle4V28FacadeDoor(x, 11.25, warehouseY, 13, 4.5, 1);
  group.add(box(8.5, 2.6, 0.12, -184, warehouseY + 8.0, 11.5, M.sign));
  group.add(box(5.8, 0.12, 0.1, -184, warehouseY + 8.0, 11.7, M.warning));
  group.add(box(3.2, 0.2, 1.1, -145, warehouseY + 0.4, 18.2, M.concreteDark));

  const coveredY = surfaceYAt(-80, 62, 0) + 0.06;
  group.add(box(66, 0.42, 5.8, -79, coveredY + 5.8, 60, M.loadingCanopy));
  for (const [x, z] of [[-108, 74], [-82, 58], [-56, 42]]) {
    group.add(box(0.18, 5.8, 0.18, x, coveredY + 2.9, z, M.loadingFrame));
    group.add(box(1.3, 0.1, 0.28, x, coveredY + 5.45, z, M.light));
  }
  directorMacroCycle4V28Rail(-110, coveredY + 2.8, 74, -48, 38, M.pipeDark);
  for (const [x, z] of [[-86, 60], [-62, 47]]) group.add(box(2.6, 1.5, 1.6, x, coveredY + 0.8, z, M.panel[1]));

  const plantY = surfaceYAt(226, -76, 0) + 0.06;
  for (const [x, z] of [[184, -92], [224, -102]]) {
    group.add(box(4.6, 10.0, 4.6, x, plantY + 5.0, z, M.panel[1]));
    group.add(box(4.9, 0.16, 4.9, x, plantY + 10.1, z, M.rib));
  }
  directorMacroCycle4V28Rail(170, plantY + 9.0, -68, 280, -68, M.tunnelRust);
  for (const x of [174, 244]) {
    group.add(box(0.62, 12, 0.62, x, plantY + 6, -68, M.pipeDark));
    group.add(box(1.8, 0.16, 1.8, x, plantY + 0.1, -68, M.concreteDark));
  }

  const bridgeY = surfaceYAt(302, 82, 0) + 0.06;
  group.add(box(98, 0.5, 5.4, 302, bridgeY + 11.0, 78, M.concreteDark));
  group.add(box(98, 0.18, 0.18, 302, bridgeY + 12.2, 75.4, M.warning));
  group.add(box(98, 0.18, 0.18, 302, bridgeY + 12.2, 80.6, M.warning));
  for (const x of [262, 302, 340]) {
    group.add(box(0.38, 12.0, 0.38, x, bridgeY + 6.0, 78, M.pipeDark));
    group.add(box(0.5, 0.5, 6.0, x, bridgeY + 11.0, 78, M.loadingFrame));
  }
  directorMacroCycle4V28LightRow(258, bridgeY + 12.0, 75.4, 346, 75.4, 3);
  directorMacroCycle4V28Rail(258, bridgeY + 12.1, 75.4, 346, 75.4, M.warning);
  directorMacroCycle4V28Rail(258, bridgeY + 12.1, 80.6, 346, 80.6, M.warning);

  const objectiveY = surfaceYAt(48, -258, -1.2) + 0.06;
  group.add(box(0.18, 8.0, 28, 33.5, objectiveY + 4.0, -253.4, M.heroGlass));
  for (const z of [-264, -258, -252, -246]) group.add(box(0.18, 8.2, 0.18, 33.25, objectiveY + 4.0, z, M.loadingFrame));
  for (const z of [-262, -254]) {
    group.add(box(0.1, 1.4, 4.8, 33.18, objectiveY + 2.7, z, M.panel[1]));
    group.add(box(0.06, 0.72, 3.8, 33.10, objectiveY + 3.85, z, M.term));
  }
  group.add(box(0.08, 1.4, 5.8, 33.08, objectiveY + 5.8, -258, M.sign));
  group.add(box(0.05, 0.12, 4.6, 32.98, objectiveY + 5.8, -258, M.warning));

  const verticalY = surfaceYAt(316, 70, 0) + 0.06;
  group.add(box(18, 14, 0.18, 316, verticalY + 7, 62.5, M.heroSidingAlt));
  for (let step = 0; step < 5; step++) {
    group.add(box(5.6, 0.22, 1.1, 316, verticalY + 0.35 + step * 0.72, 74 - step * 1.4, M.concreteDark));
    group.add(box(0.16, 1.1, 0.16, 313.1, verticalY + 0.9 + step * 0.72, 74 - step * 1.4, M.warning));
    group.add(box(0.16, 1.1, 0.16, 318.9, verticalY + 0.9 + step * 0.72, 74 - step * 1.4, M.warning));
  }

  const spawnY = surfaceYAt(-276, 196, 0) + 0.06;
  for (const x of [-292, -260]) group.add(box(1.0, 6.0, 1.0, x, spawnY + 3, 196, M.loadingFrame));
  group.add(box(33, 0.42, 1.0, -276, spawnY + 6.0, 196, M.loadingCanopy));
  group.add(box(8.2, 2.6, 0.14, -276, spawnY + 4.2, 195.8, M.sign));
  group.add(box(6.0, 0.12, 0.1, -276, spawnY + 4.2, 196.0, M.warning));
  directorMacroCycle4V28LightRow(-290, spawnY + 6.2, 196, -262, 196, 3);

  const boundaryY = surfaceYAt(72, 305, 0) + 0.06;
  for (const x of [8, 42, 76, 110]) {
    group.add(box(0.22, 7.8, 0.22, x, boundaryY + 3.9, 306, M.loadingFrame));
    group.add(box(0.16, 0.16, 12, x, boundaryY + 7.2, 306, M.warning));
  }
  group.add(box(6.0, 3.0, 0.14, 72, boundaryY + 3.2, 305.8, M.sign));
  group.add(box(4.6, 0.12, 0.1, 72, boundaryY + 3.2, 306.0, M.warning));
}
`;

let patched = baseSource;
const wrapperGeneratorPath = path.relative(process.cwd(), fileURLToPath(import.meta.url));
const wrapperGeneratorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
patched = patched.replace(markerFlags, markerFlags + "\nconst directorMacroCycle4V27Only = process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 === '1';\nconst directorMacroCycle4V28Only = process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V28 === '1';");
patched = patched.replace(markerMerge, v27VisualPass + '\n' + v28VisualPass + '\n' + markerMerge);
patched = patched.replace(markerUserData, markerUserData + '\nif (directorMacroCycle4V27Only) merged.userData.directorMacroCycle4V27VisualRecovery = directorMacroCycle4V27VisualRecovery;\nif (directorMacroCycle4V28Only) merged.userData.directorMacroCycle4V28VisualRecovery = directorMacroCycle4V28VisualRecovery;');
patched = patched.replace(markerReport, markerReport + '\n  directorMacroCycle4V27VisualRecovery: directorMacroCycle4V27Only ? directorMacroCycle4V27VisualRecovery : null,\n  directorMacroCycle4V28VisualRecovery: directorMacroCycle4V28Only ? directorMacroCycle4V28VisualRecovery : null,');
patched = patched.replace('directorMacroCycle4V26Only },', 'directorMacroCycle4V26Only, directorMacroCycle4V27Only, directorMacroCycle4V28Only },');
patched = patched.replace(
  "const generatorSha256 = createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');",
  `const generatorSha256 = '${wrapperGeneratorSha256}';`,
);
patched = patched.replace('  generatorSha256,\n', `  generatorSha256,\n  generatorPath: '${wrapperGeneratorPath}',\n`);
if (patched === baseSource || !patched.includes('visible-streetwall-and-operational-composition-v28')) throw new Error('v28 generator patch markers did not match');

const temporaryPath = path.join(os.tmpdir(), 'director-macro-cycle-4-v28-' + process.pid + '.mjs');
fs.writeFileSync(temporaryPath, patched);
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V28 = '1';
try {
  await import(pathToFileURL(temporaryPath).href + '?v28=1');
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
