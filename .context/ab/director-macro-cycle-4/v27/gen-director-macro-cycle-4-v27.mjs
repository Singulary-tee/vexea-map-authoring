import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const basePath = fileURLToPath(new URL('../v26/gen-director-macro-cycle-4-v26.mjs', import.meta.url));
const baseSource = fs.readFileSync(basePath, 'utf8');
const markerFlags = "const directorMacroCycle4V26Only = process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 === '1';";
const markerMerge = '// -------- merge per material (KB C2b) --------';
const markerUserData = 'if (directorMacroCycle4V26Only) merged.userData.directorMacroCycle4V26VisualRecovery = directorMacroCycle4V26VisualRecovery;';
const markerReport = '  directorMacroCycle4V26VisualRecovery: directorMacroCycle4V26Only ? directorMacroCycle4V26VisualRecovery : null,';

const visualPass = String.raw`
// -------- v27 camera-facing industrial frontage pass --------
const directorMacroCycle4V27Feature = (id, type, zone, center, evidenceViews) => ({
  id, owner: id, type, zone, center: [...center], sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds], contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...evidenceViews], placementStatus: 'PASS', supportStatus: 'PASS', contactStatus: 'PASS',
  clearance: { pad: 'PASS', minimumBuildingMargin: 2.2, minimumRouteMargin: 2.2, minimumAirLaneMargin: 2.2, minimumGameplayMargin: 2.2 },
});
const directorMacroCycle4V27Views = {
  global: ['top', 'orbit'],
  spawn: ['zone-spawn', 'zone-boundary', 'route-main-surface'],
  courtyard: ['zone-courtyard', 'route-main-surface', 'route-rear-alley', 'route-covered', 'cover-courtyard'],
  warehouse: ['zone-warehouse', 'route-covered', 'route-rear-alley'],
  plant: ['zone-plant', 'route-north-ring', 'route-south-retreat'],
  bridge: ['zone-bridge', 'vertical-connector', 'zone-plant'],
  core: ['zone-core', 'objective-core', 'route-flank-backdoor'],
  tunnels: ['zone-tunnels', 'tunnel-portal'],
  boundary: ['zone-boundary', 'zone-spawn'],
};
const directorMacroCycle4V27VisualRecovery = {
  schemaVersion: 1,
  strategy: 'camera-facing-operational-composition-v27',
  owner: 'director-macro-cycle-4-v27',
  sourceRefs: [...directorMacroCycle4V26SourceRefs],
  referenceIds: [...directorMacroCycle4V26ReferenceIds],
  contractIds: [...directorMacroCycle4V26ContractIds],
  evidenceViews: [...directorMacroCycle4V26VisualRecovery.evidenceViews],
  features: [
    directorMacroCycle4V27Feature('v27-spawn-frontage', 'loading-frontage', 'zone_spawn', [-296, 163], directorMacroCycle4V27Views.spawn),
    directorMacroCycle4V27Feature('v27-loading-yard', 'shared-operational-yard', 'zone_courtyard', [-66, 103], directorMacroCycle4V27Views.courtyard),
    directorMacroCycle4V27Feature('v27-maintenance-frontage', 'service-frontage', 'zone_warehouse', [-184, 12], directorMacroCycle4V27Views.warehouse),
    directorMacroCycle4V27Feature('v27-process-frontage', 'process-yard', 'zone_plant', [226, -76], directorMacroCycle4V27Views.plant),
    directorMacroCycle4V27Feature('v27-transfer-bridge', 'elevated-pipe-transfer', 'zone_bridge', [302, 82], directorMacroCycle4V27Views.bridge),
    directorMacroCycle4V27Feature('v27-core-frontage', 'control-room-frontage', 'zone_core', [48, -231], directorMacroCycle4V27Views.core),
    directorMacroCycle4V27Feature('v27-objective-room', 'objective-control-room', 'zone_core', [48, -258], ['objective-core', 'zone-core']),
    directorMacroCycle4V27Feature('v27-tunnel-portal', 'serviced-tunnel-portal', 'zone_tunnels', [48, -201], directorMacroCycle4V27Views.tunnels),
    directorMacroCycle4V27Feature('v27-boundary-gate', 'fenced-boundary-yard', 'zone_boundary', [72, 305], directorMacroCycle4V27Views.boundary),
    directorMacroCycle4V27Feature('v27-covered-service-run', 'covered-service-run', 'zone_warehouse', [-70, 54], ['route-covered', 'cover-courtyard', 'zone-warehouse']),
    directorMacroCycle4V27Feature('v27-north-ring-operations', 'route-side-operations', 'zone_bridge', [132, 86], ['route-north-ring', 'zone-bridge']),
    directorMacroCycle4V27Feature('v27-south-retreat-operations', 'route-side-operations', 'zone_plant', [188, -145], ['route-south-retreat', 'zone-plant']),
    directorMacroCycle4V27Feature('v27-flank-service-door', 'service-door', 'zone_core', [148, -240], ['route-flank-backdoor', 'zone-core']),
    directorMacroCycle4V27Feature('v27-perimeter-silhouette', 'facility-edge-vegetation', 'zone_boundary', [150, 330], directorMacroCycle4V27Views.global),
  ],
  stats: { frontageWalls: 4, loadingDoors: 12, wetOperationalSurfaces: 13, pipeTransferSpans: 8, processVessels: 8, vehicles: 12, fences: 11, trees: 24, controlRoomScreens: 9 },
};
const directorMacroCycle4V27Road = (x, z, width, depth, rotation, seed) => {
  const y = roadTopYAt(x, z, surfaceYAt(x, z, 0));
  group.add(flatPolygon(x, z, width, depth, M.loadingWet, rotation, y + 0.052, seed, 9));
  group.add(flatPolygon(x + width * 0.1, z - depth * 0.08, width * 0.52, depth * 0.42, M.loadingPuddle, rotation - 0.07, y + 0.066, seed + 13, 7));
  const dx = Math.cos(rotation) * width * 0.39, dz = Math.sin(rotation) * width * 0.39;
  for (const side of [-1, 1]) group.add(flatSegment([x - dx, y + 0.08, z - dz + side * depth * 0.27], [x + dx, y + 0.08, z + dz + side * depth * 0.27], 0.16, side < 0 ? M.line : M.lineWhite, 0.01));
  drainGrate(x, z + depth * 0.42, Math.max(4, width * 0.48), rotation + Math.PI / 2, y);
};
const directorMacroCycle4V27Dock = (start, end, wallZ, sy, towardCamera) => {
  const width = end - start, center = (start + end) / 2, faceZ = wallZ + towardCamera * 0.12;
  group.add(box(width, 7.2, 0.22, center, sy + 3.6, faceZ, M.heroSiding));
  for (let i = 0; i < 4; i++) {
    const x = start + width * (i + 0.5) / 4;
    group.add(box(width / 4 - 1.05, 3.95, 0.18, x, sy + 2.35, faceZ + towardCamera * 0.16, M.loadingDoor));
    group.add(box(width / 4 - 0.72, 0.18, 0.3, x, sy + 4.45, faceZ + towardCamera * 0.2, M.loadingFrame));
    for (const y of [1.15, 1.85, 2.55, 3.25]) group.add(box(width / 4 - 1.25, 0.08, 0.08, x, sy + y, faceZ + towardCamera * 0.23, M.loadingSlat));
    group.add(box(0.12, 4.4, 0.25, start + width * i / 4 + 0.38, sy + 2.35, faceZ + towardCamera * 0.22, M.loadingFrame));
  }
  group.add(box(width + 2.2, 0.24, 3.6, center, sy + 5.25, wallZ + towardCamera * 1.65, M.loadingCanopy));
  for (const x of [start + 0.8, center, end - 0.8]) {
    group.add(box(0.18, 5.1, 0.18, x, sy + 2.55, wallZ + towardCamera * 3.0, M.loadingFrame));
    group.add(box(1.7, 0.12, 0.34, x, sy + 5.0, wallZ + towardCamera * 2.9, M.light));
  }
};
const directorMacroCycle4V27Canopy = (ax, az, bx, bz, sy, height, width) => {
  const frame = segmentFrame(ax, az, bx, bz), midX = (ax + bx) / 2, midZ = (az + bz) / 2;
  group.add(orientedBox(frame.len + 1.4, 0.24, width, midX, sy + height, midZ, bx - ax, 0, bz - az, M.loadingCanopy));
  for (const t of [0, 0.5, 1]) {
    const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
    for (const side of [-1, 1]) {
      const [sx, sz] = offsetPoint(px, pz, frame, side * (width / 2 - 0.25));
      group.add(box(0.18, height, 0.18, sx, sy + height / 2, sz, M.loadingFrame));
    }
    group.add(orientedBox(1.7, 0.12, 0.34, px, sy + height - 0.3, pz, frame.nx, 0, frame.nz, M.light));
  }
  for (const level of [height - 0.72, height - 1.28]) {
    const [aX, aZ] = offsetPoint(ax, az, frame, -width * 0.32), [bX, bZ] = offsetPoint(bx, bz, frame, -width * 0.32);
    group.add(addBeam([aX, sy + level, aZ], [bX, sy + level, bZ], 0.12, M.pipe));
  }
};
const directorMacroCycle4V27WindowBand = (start, end, wallZ, sy, towardCamera, y, height = 1.55) => {
  const width = end - start, center = (start + end) / 2, faceZ = wallZ + towardCamera * 0.14;
  group.add(box(width, height, 0.12, center, y, faceZ, M.loadingGlass));
  for (let x = start; x <= end + 0.01; x += 7) group.add(box(0.14, height + 0.22, 0.16, x, y, faceZ + towardCamera * 0.09, M.loadingFrame));
  group.add(box(width + 0.2, 0.12, 0.18, center, y - height / 2, faceZ + towardCamera * 0.1, M.trim));
  group.add(box(width + 0.2, 0.12, 0.18, center, y + height / 2, faceZ + towardCamera * 0.1, M.trim));
};
const directorMacroCycle4V27Bollards = (x, z, sy, count, spacing, rotation = 0) => {
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spacing;
    const px = x + Math.cos(rotation) * offset, pz = z + Math.sin(rotation) * offset;
    group.add(cylinder(0.12, 1.0, px, sy + 0.5, pz, M.warning, 8));
    group.add(cylinder(0.2, 0.12, px, sy + 0.06, pz, M.concreteDark, 8));
  }
};
const directorMacroCycle4V27ControlRoom = (x, z, sy) => {
  const faceZ = z + 0.18;
  group.add(box(60, 7.6, 0.16, x, sy + 4.0, faceZ, M.heroPanel));
  directorMacroCycle4V27WindowBand(x - 27, x + 27, z, sy, 1, sy + 5.0, 2.7);
  for (const px of [x - 22, x - 11, x, x + 11, x + 22]) {
    group.add(box(0.18, 7.8, 0.2, px, sy + 4.0, faceZ + 0.18, M.loadingFrame));
    group.add(box(3.8, 0.18, 0.22, px, sy + 1.35, faceZ + 0.22, M.concreteDark));
    group.add(box(3.1, 0.75, 0.12, px, sy + 2.15, faceZ + 0.28, M.light));
  }
  group.add(box(8.2, 0.2, 2.8, x, sy + 7.8, z - 0.2, M.roof));
  group.add(box(5.8, 0.7, 0.12, x, sy + 3.4, faceZ + 0.28, M.sign));
  group.add(box(4.4, 0.08, 0.1, x, sy + 3.4, faceZ + 0.36, M.warning));
};
const directorMacroCycle4V27ObjectiveRoom = (x, z, sy) => {
  const faceZ = z + 0.2;
  group.add(box(28, 7.8, 0.18, x, sy + 4.0, faceZ, M.heroGlass));
  for (const px of [x - 12, x - 6, x, x + 6, x + 12]) group.add(box(0.18, 8.0, 0.22, px, sy + 4.0, faceZ + 0.16, M.loadingFrame));
  for (const px of [x - 9, x, x + 9]) {
    group.add(box(4.8, 0.55, 1.25, px, sy + 1.25, z + 1.95, M.panel[1]));
    group.add(box(3.7, 1.0, 0.08, px, sy + 2.1, z + 1.38, M.light));
    group.add(box(0.7, 0.42, 0.06, px - 1.15, sy + 2.1, z + 1.32, M.term));
    group.add(box(0.7, 0.42, 0.06, px + 1.15, sy + 2.1, z + 1.32, M.red));
  }
  group.add(cylinder(0.75, 2.8, x, sy + 2.1, z + 1.15, M.term, 12));
  group.add(cylinder(1.05, 0.12, x, sy + 0.68, z + 1.15, M.metal, 12));
  group.add(box(27.5, 0.22, 2.2, x, sy + 7.9, z, M.roof));
};
const directorMacroCycle4V27AddDumpsters = (x, z, sy, rotation = 0) => {
  for (const offset of [-3.0, 3.0]) {
    const px = x + Math.cos(rotation) * offset, pz = z + Math.sin(rotation) * offset;
    group.add(box(3.8, 1.7, 2.0, px, sy + 0.9, pz, M.panel[1], rotation));
    group.add(box(3.35, 0.12, 1.6, px, sy + 1.78, pz, M.rib, rotation));
    group.add(box(0.12, 1.9, 0.12, px - Math.cos(rotation) * 1.5, sy + 0.95, pz - Math.sin(rotation) * 1.5, M.warning, rotation));
  }
};
if (directorMacroCycle4V27Only) {
  const spawnY = surfaceYAt(-296, 163, 0) + 0.06;
  directorMacroCycle4V27Road(-274, 196, 52, 13, 0.02, 2701);
  pipeRack(-322, 198, -248, 198, spawnY, 6.2, 4.4);
  cargoTruck(-282, 193, 0, 0.68); forklift(-252, 193, 0, 0.58, spawnY); palletStack(-308, 202, spawnY, 2.0, 1.3, 2);
  chainLinkFence(-338, 190, -248, 190, spawnY, 2.7);

  const loadingY = surfaceYAt(-66, 103, 0) + 0.06;
  directorMacroCycle4V27Road(-66, 111, 62, 12, 0.02, 2702);
  directorMacroCycle4V27Dock(-99, -33, 90.3, loadingY, 1);
  directorMacroCycle4V27Canopy(-98, 101, -34, 101, loadingY, 6.0, 5.6);
  pipeRack(-96, 96, -36, 96, loadingY, 7.4, 5.5);
  cargoTruck(-53, 103, 0, 0.68); forklift(-87, 104, 0, 0.62, loadingY); palletStack(-42, 113, loadingY, 2.1, 1.3, 3);
  directorMacroCycle4V27AddDumpsters(-78, 116, loadingY, 0.08); chainLinkFence(-97, 119, -35, 119, loadingY, 2.5);

  const warehouseY = surfaceYAt(-184, 12, 0) + 0.06;
  directorMacroCycle4V27Road(-184, 27, 68, 11, 0.02, 2703);
  directorMacroCycle4V27Dock(-222, -146, 11.25, warehouseY, 1);
  directorMacroCycle4V27Canopy(-222, 24, -146, 24, warehouseY, 5.8, 5.1);
  pipeRack(-218, 18, -150, 18, warehouseY, 6.6, 4.5);
  cargoTruck(-198, 29, 0, 0.68); forklift(-165, 29, Math.PI, 0.58, warehouseY); palletStack(-153, 18, warehouseY, 2.0, 1.2, 2);
  directorMacroCycle4V27AddDumpsters(-213, 32, warehouseY, 0);

  const plantY = surfaceYAt(226, -76, 0) + 0.06;
  directorMacroCycle4V27Road(224, -82, 64, 16, 0.08, 2704);
  directorMacroCycle4V27WindowBand(170, 260, -63, plantY, -1, plantY + 7.0, 2.2);
  for (const [px, pz, radius, height] of [[201, -84, 2.6, 11], [226, -88, 3.4, 14], [252, -83, 2.2, 9]]) processVessel(px, pz, plantY, radius, height, M.heroPanel);
  pipeRack(194, -76, 263, -76, plantY, 9.0, 5.8); pipeRack(198, -92, 260, -92, plantY, 5.8, 4.6);
  directorMacroCycle2Stairs(217, -67, plantY, 2.8, 7.0, 0.32, 0); serviceStack(264, -80, plantY, 12, 0.24);
  cargoTruck(240, -93, 0, 0.64); forklift(207, -70, 0, 0.56, plantY); chainLinkFence(190, -97, 266, -97, plantY, 2.8);

  const bridgeY = surfaceYAt(302, 82, 0) + 0.06;
  directorMacroCycle4V27Road(299, 99, 62, 14, 0.04, 2705);
  pipeRack(256, 81, 350, 81, bridgeY + 8.2, 6.2, 6.2);
  pipeRack(260, 89, 348, 89, bridgeY, 10.5, 5.2);
  for (const px of [264, 294, 326, 348]) {
    group.add(box(0.72, 10.6, 0.72, px, bridgeY + 5.3, 81, M.pipeDark));
    group.add(box(1.5, 0.18, 1.5, px, bridgeY + 0.1, 81, M.concrete[1]));
  }
  processVessel(333, 98, bridgeY, 2.8, 8.0, M.siding[1]); cargoTruck(287, 99, 0, 0.62); forklift(319, 100, 0, 0.55, bridgeY);
  chainLinkFence(273, 106, 348, 106, bridgeY, 2.5); directorMacroCycle4V27Bollards(300, 106, bridgeY, 6, 5.0);
  for (const [y, material] of [[bridgeY + 11.4, M.pipeDark], [bridgeY + 12.1, M.tunnelRust], [bridgeY + 12.8, M.pipe]]) {
    group.add(addBeam([252, y, 101], [350, y, 101], 0.22, material));
  }

  const coreY = surfaceYAt(48, -231, -1.2) + 0.06;
  directorMacroCycle4V27Road(48, -219, 72, 12, 0, 2706);
  directorMacroCycle4V27ControlRoom(48, -231.0, coreY);
  directorMacroCycle4V27Bollards(32, -229.2, coreY, 5, 3.6);
  serviceCabinet(78, -228, coreY, 1.5, 2.0); directorMacroCycle4V27AddDumpsters(70, -219, coreY, 0);

  const objectiveY = surfaceYAt(48, -258, -1.2) + 0.06;
  directorMacroCycle4V27ObjectiveRoom(48, -253.4, objectiveY);
  group.add(flatPolygon(48, -250, 23, 7, M.loadingWet, 0, objectiveY + 0.08, 2707, 8));
  for (const x of [34, 48, 62]) directorMacroCycle4V27Bollards(x, -251.5, objectiveY, 1, 1);

  const tunnelY = -11.85;
  group.add(flatPolygon(92, -198, 82, 5.0, M.puddle, 0, tunnelY + 0.12, 2708, 8));
  for (const x of [64, 82, 100, 118, 136, 154]) {
    group.add(box(1.5, 0.12, 0.28, x, tunnelY + 3.25, -201, M.light));
    group.add(box(0.16, 0.42, 0.16, x, tunnelY + 3.0, -201, M.lampHousing));
  }
  group.add(flatSegment([50, tunnelY + 0.15, -199.1], [168, tunnelY + 0.15, -199.1], 0.14, M.line, 0.01));

  const boundaryY = surfaceYAt(72, 305, 0) + 0.06;
  directorMacroCycle4V27Road(65, 303, 132, 11, 0, 2709);
  chainLinkFence(-12, 306, 168, 306, boundaryY, 3.2);
  for (const x of [2, 48, 94, 140]) {
    group.add(box(0.22, 7.5, 0.22, x, boundaryY + 3.75, 306, M.loadingFrame));
    group.add(box(1.8, 0.14, 0.4, x, boundaryY + 7.1, 306, M.light));
  }
  group.add(box(5.4, 2.0, 0.16, 72, boundaryY + 2.8, 305.7, M.sign)); group.add(box(4.0, 0.12, 0.08, 72, boundaryY + 2.8, 305.8, M.warning));
  cargoTruck(112, 296, 0, 0.65); directorMacroCycle4V27Bollards(62, 295, boundaryY, 5, 5.0);

  directorMacroCycle4V27Road(-202, 153, 58, 9, 0.02, 2710);
  pipeRack(-232, 164, -172, 164, surfaceYAt(-202, 153, 0) + 0.06, 6.4, 4.6); cargoTruck(-220, 146, 0, 0.62); forklift(-183, 146, 0, 0.52);

  const coveredY = surfaceYAt(-70, 54, 0) + 0.06;
  directorMacroCycle4V27Road(-70, 54, 74, 9, -0.58, 2711); directorMacroCycle4V27Canopy(-102, 69, -38, 29, coveredY, 5.8, 6.0);
  directorMacroCycle4V27AddDumpsters(-80, 50, coveredY, -0.58); palletStack(-49, 35, coveredY, 2.0, 1.2, 3); forklift(-91, 61, -0.58, 0.55, coveredY);

  const rearY = surfaceYAt(-145, 118, 0) + 0.06;
  directorMacroCycle4V27Road(-145, 118, 82, 8, -0.12, 2712);
  directorMacroCycle4V27AddDumpsters(-158, 107, rearY, -0.12); palletStack(-121, 123, rearY, 2.0, 1.2, 2); serviceCabinet(-112, 113, rearY, 1.4, 1.8);

  const northY = surfaceYAt(132, 86, 0) + 0.06;
  directorMacroCycle4V27Road(132, 86, 66, 8, -0.54, 2713); pipeRack(112, 73, 174, 73, northY, 8.0, 4.8);
  processVessel(151, 82, northY, 2.1, 7.2, M.siding[1]); cargoTruck(126, 93, -0.54, 0.58); chainLinkFence(106, 96, 176, 96, northY, 2.5);

  const southY = surfaceYAt(188, -145, 0) + 0.06;
  directorMacroCycle4V27Road(188, -145, 92, 9, -0.3, 2714);
  processVessel(211, -145, southY, 2.4, 9.0, M.heroPanel); cargoTruck(172, -151, -0.3, 0.6); forklift(224, -156, -0.3, 0.52, southY);

  const flankY = surfaceYAt(148, -240, -1.2) + 0.06;
  directorMacroCycle4V27Road(148, -232, 20, 25, 0, 2715); directorMacroCycle4V27Dock(137, 159, -245.5, flankY, 1);
  serviceCabinet(160, -239, flankY, 1.4, 2.0); directorMacroCycle4V27Bollards(148, -232, flankY, 4, 4.0);

  const verticalY = surfaceYAt(316, 70, 0) + 0.06;
  pipeRack(274, 66, 346, 66, verticalY + 6.4, 5.8, 5.4); directorMacroCycle2Stairs(316, 80, verticalY, 3.2, 13, 0.42, 0);
  chainLinkFence(300, 88, 346, 88, verticalY, 2.5); processVessel(338, 96, verticalY, 2.1, 7.4, M.siding[1]);

  const coverY = surfaceYAt(-66, 12, 0) + 0.06;
  directorMacroCycle4V27Road(-66, 13, 52, 9, 0, 2716); directorMacroCycle4V27Canopy(-88, 7, -42, 7, coverY, 5.4, 5.6);
  directorMacroCycle4V27AddDumpsters(-70, 18, coverY, 0); forklift(-52, 12, 0, 0.56, coverY); palletStack(-84, 19, coverY, 2.0, 1.2, 3);

  for (const [x, z, scale] of [
    [-370, 146, 0.85], [-370, 220, 0.72], [-350, 340, 0.9], [-210, 350, 0.84], [-40, 350, 0.8], [150, 350, 0.84],
    [330, 330, 0.88], [375, 180, 0.82], [375, -80, 0.74], [250, -290, 0.82], [55, -330, 0.78], [-190, -320, 0.82],
  ]) directorMacroCycle2Tree(x, z, surfaceYAt(x, z, 0), scale);
}
`;

let patched = baseSource;
const wrapperGeneratorPath = path.relative(process.cwd(), fileURLToPath(import.meta.url));
const wrapperGeneratorSha256 = createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex');
patched = patched.replace(markerFlags, markerFlags + "\nconst directorMacroCycle4V27Only = process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 === '1';");
patched = patched.replace(markerMerge, visualPass + '\n' + markerMerge);
patched = patched.replace(markerUserData, markerUserData + '\nif (directorMacroCycle4V27Only) merged.userData.directorMacroCycle4V27VisualRecovery = directorMacroCycle4V27VisualRecovery;');
patched = patched.replace(markerReport, markerReport + '\n  directorMacroCycle4V27VisualRecovery: directorMacroCycle4V27Only ? directorMacroCycle4V27VisualRecovery : null,');
patched = patched.replace('directorMacroCycle4V26Only },', 'directorMacroCycle4V26Only, directorMacroCycle4V27Only },');
patched = patched.replace(
  "const generatorSha256 = createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');",
  `const generatorSha256 = '${wrapperGeneratorSha256}';`,
);
patched = patched.replace('  generatorSha256,\n', `  generatorSha256,\n  generatorPath: '${wrapperGeneratorPath}',\n`);
if (patched === baseSource || !patched.includes('camera-facing-operational-composition-v27')) throw new Error('v27 generator patch markers did not match');

const temporaryPath = path.join(os.tmpdir(), 'director-macro-cycle-4-v27-' + process.pid + '.mjs');
fs.writeFileSync(temporaryPath, patched);
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V26 = '1';
process.env.BUILD_DIRECTOR_MACRO_CYCLE_4_V27 = '1';
try {
  await import(pathToFileURL(temporaryPath).href + '?v27=1');
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
