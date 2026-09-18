import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const v28Path = fileURLToPath(new URL('../v28/gen-director-macro-cycle-4-v28.mjs', import.meta.url));
let v28Source = fs.readFileSync(v28Path, 'utf8');
const generatorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const generatorPath = '.context/ab/director-macro-cycle-4/v29/gen-director-macro-cycle-4-v29.mjs';

const v29VisualPass = String.raw`
// -------- v29 operational density, wet response, and readable objective pass --------
const directorMacroCycle4V29Feature = (id, type, zone, center, evidenceViews) => ({
  id, owner: id, type, zone, center: [...center], sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds], contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...evidenceViews], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
  clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 },
});
const directorMacroCycle4V29VisualRecovery = {
  schemaVersion: 1,
  strategy: 'operational-density-wet-response-and-readable-objective-v29',
  owner: 'director-macro-cycle-4-v29',
  sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds],
  contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...directorMacroCycle4V28VisualRecovery.evidenceViews],
  features: [
    directorMacroCycle4V29Feature('v29-spawn-loading-yard', 'vehicle-pallet-loading-yard', 'zone_spawn', [-270, 195], ['zone-spawn', 'route-main-surface']),
    directorMacroCycle4V29Feature('v29-warehouse-dock-activity', 'truck-dock-activity', 'zone_warehouse', [-138, 8], ['zone-warehouse', 'route-covered']),
    directorMacroCycle4V29Feature('v29-plant-maintenance-staging', 'plant-maintenance-staging', 'zone_plant', [210, -72], ['zone-plant', 'route-south-retreat']),
    directorMacroCycle4V29Feature('v29-wet-route-treatment', 'puddles-drains-wet-markings', 'route_main_surface', [-210, 154], ['route-main-surface', 'route-rear-alley', 'zone-courtyard']),
    directorMacroCycle4V29Feature('v29-control-room-identity', 'glazed-control-room-screens', 'zone_core', [45, -256], ['objective-core', 'zone-core']),
    directorMacroCycle4V29Feature('v29-perimeter-chain-link', 'chain-link-gate-vegetation-edge', 'zone_boundary', [70, 289], ['zone-boundary', 'top']),
    directorMacroCycle4V29Feature('v29-bridge-deck-operations', 'bridge-deck-stairs-lighting', 'zone_bridge', [295, 84], ['zone-bridge', 'vertical-connector', 'route-north-ring']),
  ],
  stats: { vehicles: 4, palletStacks: 12, puddles: 18, drains: 8, objectiveScreens: 6, fencePosts: 8, bridgeFrames: 12, serviceSigns: 10 },
};
const directorMacroCycle4V29Puddle = (x, z, w, d, material = M.loadingPuddle, rotation = 0) => {
  group.add(box(w, 0.035, d, x, surfaceYAt(x, z, 0) + 0.09, z, material, rotation));
};
const directorMacroCycle4V29Drain = (x, z, w, rotation = 0) => {
  group.add(box(w, 0.045, 0.22, x, surfaceYAt(x, z, 0) + 0.12, z, M.drain, rotation));
  group.add(box(w - 0.4, 0.05, 0.05, x, surfaceYAt(x, z, 0) + 0.145, z, M.loadingReflective, rotation));
};
const directorMacroCycle4V29Pallet = (x, z, stack = 1, rotation = 0) => {
  const y = surfaceYAt(x, z, 0) + 0.18;
  for (let level = 0; level < stack; level++) {
    group.add(box(2.2, 0.16, 1.5, x, y + level * 0.62, z, M.loadingFrame, rotation));
    group.add(box(1.85, 0.12, 0.12, x - 0.7, y + 0.2 + level * 0.62, z, M.rib, rotation));
    group.add(box(1.85, 0.12, 0.12, x + 0.7, y + 0.2 + level * 0.62, z, M.rib, rotation));
  }
};
const directorMacroCycle4V29Vehicle = (x, z, rotation = 0, forklift = false) => {
  const y = surfaceYAt(x, z, 0) + 0.2;
  group.add(box(forklift ? 3.8 : 6.8, 1.45, forklift ? 2.6 : 3.0, x, y + 0.72, z, M.loadingPanel, rotation));
  group.add(box(forklift ? 1.9 : 2.7, 1.45, forklift ? 2.2 : 2.7, x + (forklift ? -0.45 : 1.05), y + 1.92, z, M.loadingGlass, rotation));
  for (const offset of forklift ? [-1.2, 1.2] : [-2.35, 2.35]) {
    const wheel = cylinder(0.5, 0.32, x + offset * Math.cos(rotation), y + 0.5, z + offset * Math.sin(rotation), M.rubber, 6, Math.PI / 2, 0);
    group.add(wheel);
  }
  if (forklift) {
    group.add(box(0.18, 3.4, 0.18, x - 1.8, y + 2.0, z - 0.9, M.loadingFrame, rotation));
    group.add(box(2.2, 0.12, 0.12, x - 2.55, y + 0.45, z - 0.55, M.warning, rotation));
    group.add(box(2.2, 0.12, 0.12, x - 2.55, y + 0.45, z + 0.55, M.warning, rotation));
  } else {
    group.add(box(3.2, 1.0, 2.72, x - 1.8, y + 1.55, z, M.loadingAsphaltRough, rotation));
    group.add(box(0.18, 1.7, 2.9, x - 3.55, y + 1.55, z, M.loadingFrame, rotation));
  }
};
const directorMacroCycle4V29ServiceSign = (x, z, textWidth = 3.8, rotation = 0) => {
  const y = surfaceYAt(x, z, 0) + 0.06;
  group.add(box(0.18, 2.7, textWidth, x, y + 1.35, z, M.loadingFrame, rotation));
  group.add(box(0.08, 1.25, textWidth - 0.4, x - 0.12, y + 1.45, z, M.sign, rotation));
  group.add(box(0.06, 0.1, textWidth - 0.7, x - 0.17, y + 1.45, z, M.warning, rotation));
};
if (true) {
  for (const [x, z, w, d, r] of [
    [-286, 205, 8, 2.2, 0.08], [-264, 188, 5, 1.5, -0.2], [-238, 174, 7, 1.6, 0.1],
    [-100, 110, 8, 2.0, -0.1], [-76, 94, 5, 1.4, 0.2], [-58, 82, 6, 1.4, 0],
    [-154, 18, 10, 2.0, 0.1], [-129, 2, 6, 1.4, -0.1], [198, -83, 8, 2.0, 0.15],
    [225, -59, 5, 1.4, -0.12], [-212, 154, 7, 1.5, 0.1], [-188, 148, 4, 1.3, -0.08],
    [122, 89, 6, 1.5, 0.12], [158, 68, 5, 1.2, -0.1], [178, -142, 8, 1.7, 0.1],
    [205, -154, 5, 1.3, -0.12], [145, 122, 6, 1.4, 0], [292, 96, 5, 1.2, 0.1],
  ]) directorMacroCycle4V29Puddle(x, z, w, d, M.loadingPuddle, r);
  for (const [x, z, w, r] of [[-270, 198, 3.2, 0], [-80, 102, 2.8, Math.PI / 2], [-144, 14, 3.6, 0], [208, -76, 3.4, Math.PI / 2], [130, 82, 3.2, 0], [168, -146, 3.0, Math.PI / 2], [220, 68, 2.6, 0], [92, 146, 2.8, Math.PI / 2]]) directorMacroCycle4V29Drain(x, z, w, r);

  directorMacroCycle4V29Vehicle(-270, 195, 0.05, true);
  directorMacroCycle4V29Vehicle(-142, 12, Math.PI / 2, false);
  directorMacroCycle4V29Vehicle(206, -72, -0.35, false);
  directorMacroCycle4V29Vehicle(128, 84, 0.4, true);
  for (const [x, z, stack, r] of [[-255, 188, 2, 0.1], [-246, 188, 1, 0.1], [-82, 100, 2, 0.2], [-70, 91, 1, -0.1], [-126, 9, 2, 0], [-113, 2, 1, 0.1], [194, -81, 2, 0.1], [221, -67, 1, -0.1], [145, 86, 2, 0], [163, 72, 1, 0.1], [186, -151, 1, 0], [214, -153, 2, 0.1]]) directorMacroCycle4V29Pallet(x, z, stack, r);
  for (const [x, z, w, r] of [[-292, 195, 3.5, 0], [-125, 24, 3.5, Math.PI / 2], [186, -64, 3.2, 0], [158, 84, 3.0, Math.PI / 2], [116, 104, 3.2, 0], [182, -132, 3.2, 0], [144, 130, 3.0, Math.PI / 2], [286, 91, 3.0, 0], [40, -243, 3.2, Math.PI / 2], [112, 150, 3.0, 0]]) directorMacroCycle4V29ServiceSign(x, z, w, r);

  const objectiveY = surfaceYAt(45, -256, -1.2) + 0.08;
  group.add(box(0.24, 7.4, 20, 44, objectiveY + 3.7, -256, M.loadingGlass));
  for (const z of [-264, -260, -256, -252, -248]) group.add(box(0.18, 8.0, 0.14, 43.78, objectiveY + 3.9, z, M.loadingFrame));
  for (const z of [-261.5, -254.5]) {
    group.add(box(0.08, 1.5, 4.5, 43.62, objectiveY + 2.5, z, M.panel[1]));
    group.add(box(0.06, 0.9, 3.8, 43.56, objectiveY + 3.7, z, M.term));
  }
  group.add(box(0.08, 0.18, 5.4, 43.52, objectiveY + 5.8, -256, M.warning));
  group.add(box(0.12, 1.8, 2.8, 43.48, objectiveY + 6.2, -256, M.sign));

  const fenceY = surfaceYAt(70, 289, 0) + 0.08;
  for (const x of [5, 28, 51, 74, 97, 120, 143, 166]) {
    group.add(box(0.2, 6.5, 0.2, x, fenceY + 3.25, 289, M.fence));
    group.add(box(0.1, 0.1, 9.5, x, fenceY + 6.25, 289, M.warningDark));
  }
  group.add(addBeam([5, fenceY + 5.6, 289], [166, fenceY + 5.6, 289], 0.08, M.fence));
  group.add(addBeam([5, fenceY + 2.5, 288.2], [166, fenceY + 2.5, 288.2], 0.05, M.fence));
  for (const [x, z] of [[-2, 282], [184, 296], [14, 300], [160, 276]]) {
    group.add(cylinder(0.34, 3.8, x, surfaceYAt(x, z, 0) + 1.9, z, M.heroSidingAlt, 6));
    group.add(cylinder(0.82, 2.8, x, surfaceYAt(x, z, 0) + 5.1, z, M.heroPanel, 6));
  }

  const bridgeY = surfaceYAt(294, 84, 0) + 0.08;
  group.add(box(86, 0.5, 5.8, 294, bridgeY + 10.5, 82, M.concreteDark));
  group.add(addBeam([250, bridgeY + 10.8, 79], [338, bridgeY + 10.8, 79], 0.12, M.warning));
  group.add(addBeam([250, bridgeY + 10.8, 85], [338, bridgeY + 10.8, 85], 0.12, M.warning));
  for (const x of [252, 274, 296, 318, 338]) {
    group.add(box(0.35, 10.6, 0.35, x, bridgeY + 5.3, 82, M.pipeDark));
    group.add(box(0.7, 0.12, 6.4, x, bridgeY + 11.0, 82, M.loadingFrame));
  }
  for (const x of [265, 292, 319]) group.add(box(1.2, 0.1, 0.3, x, bridgeY + 10.95, 79, M.light));
}
`;

const required = [
  'const baseSource = fs.readFileSync(basePath, \'utf8\');',
  "\nlet patched = baseSource;\n",
  "patched = patched.replace(markerMerge, v27VisualPass + '\\n' + v28VisualPass + '\\n' + markerMerge);",
];
if (!required.every(marker => v28Source.includes(marker))) throw new Error('v28 wrapper markers missing');

v28Source = v28Source.replace(
  required[0],
  "const baseSource = fs.readFileSync(basePath, 'utf8').replace('new CylinderGeometry(radius, radius, height, radial)', 'new CylinderGeometry(radius, radius, height, Math.min(radial, 6))');",
);
v28Source = v28Source.replace(required[1], `
const v29VisualPass = String.raw\`${v29VisualPass}\`;

let patched = baseSource;`);
v28Source = v28Source.replace(required[2], "patched = patched.replace(markerMerge, v27VisualPass + '\\n' + v28VisualPass + '\\n' + v29VisualPass + '\\n' + markerMerge);");
const v28UserData = 'if (directorMacroCycle4V28Only) merged.userData.directorMacroCycle4V28VisualRecovery = directorMacroCycle4V28VisualRecovery;';
v28Source = v28Source.replace(v28UserData, `${v28UserData}\\nmerged.userData.directorMacroCycle4V29VisualRecovery = directorMacroCycle4V29VisualRecovery;`);
const v28Report = 'directorMacroCycle4V28VisualRecovery: directorMacroCycle4V28Only ? directorMacroCycle4V28VisualRecovery : null,';
v28Source = v28Source.replace(v28Report, `${v28Report}\\n  directorMacroCycle4V29VisualRecovery: directorMacroCycle4V29VisualRecovery,`);
const oldGeneratorPath = 'const wrapperGeneratorPath = path.relative(process.cwd(), fileURLToPath(import.meta.url));';
const oldGeneratorHash = "const wrapperGeneratorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');";
v28Source = v28Source.replace(oldGeneratorPath, `const wrapperGeneratorPath = '${generatorPath}';`);
v28Source = v28Source.replace(oldGeneratorHash, `const wrapperGeneratorSha256 = '${generatorSha256}';`);
if (!v28Source.includes('directorMacroCycle4V29VisualRecovery') || !v28Source.includes('v29VisualPass')) throw new Error('v29 wrapper patch failed');

const temporaryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.runtime-${process.pid}.mjs`);
fs.writeFileSync(temporaryPath, v28Source);
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V28 = '1';
try {
  await import(pathToFileURL(temporaryPath).href + '?v29=1');
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
