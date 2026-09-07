#!/usr/bin/env node
// gen-slice-contract: write slice-contract.json + resolve source hashes. Slice = the covered
// route corridor: loading hall (zone_warehouse) <-> checkpoint court (zone_core), connector
// route_covered (passes loading hall interior + security hall interior + court).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);
const b = JSON.parse(readFileSync('blockout/blockout-full-v1.json', 'utf8'));
const contract = {
  id: 'slice-covered-corridor',
  name: 'Covered corridor: Loading Hall <-> Checkpoint Court',
  stage: 'building (post-blockout construction)',
  zones: ['zone_warehouse', 'zone_core'],
  connector: 'route_covered',
  spatialRoles: {
    insertion: 'bld-loading-hall (drive-through interior; bay gates + dock canopy)',
    readableRoute: 'route_covered under roof (loading hall interior -> covered legs -> security hall interior)',
    servicePressureSpace: 'g-yrd-hub exit + mix courts (bomber line)',
    heightRelationship: 's-sec-threshold (+1.5m stair) into bld-security-hall raised threshold',
    deliberateCover: 'cv-court-barr-1/2/3 + wl-court-w/e channel + cv-corridor-1 anchor',
    droneDeploymentKillZone: 'kz-court (killCourt r22 @ 48,-170; barricade line + walls + tunnel mouth)',
    surveillanceCue: 'camSurveillanceW (-100,-124), camSurveillanceE (190,-130), camSecurity (66,-150)',
    destinationBeat: 'tp-west tunnel mouth (X-ray interior) + core yard / core hall main door',
  },
  routeEndpoints: { start: 'e-loading-n-2 (rear lane bay gate)', end: 'e-core-n (core hall main door)' },
  objectiveRelationship: 'slice feeds the final approach: checkpoint court -> core yard -> e-core-n / flank wing',
  deploymentKillZones: ['kz-court', 'kz-core'],
  coverObligations: ['cv-court-barr-1', 'cv-court-barr-2', 'cv-court-barr-3', 'cv-corridor-1', 'wl-court-w', 'wl-court-e'],
  verticalObligations: ['stair_sec_threshold', 'stair_security', 'tunnel_below_grade'],
  playerCalibration: { capsuleH: 1.8, eyeH: 1.7, doorMin: [1, 2], stairRiseMax: 0.18, inclineMax: '1:12' },
  cameraSuite: [
    { id: 'slice-loading', name: 'loading hall interior (bay gates behind)' },
    { id: 'slice-corridor', name: 'covered legs between halls' },
    { id: 'slice-security', name: 'security hall threshold interior' },
    { id: 'slice-court', name: 'checkpoint court barricade line' },
  ],
  sourceHashes: {
    blockout: hash('blockout/blockout-full-v1.json'),
    calibration: hash('spec/calibration.md'),
    v3target: hash('blockout/blockout-v3.json'),
  },
  gateNote: 'slice evidence = player-eye captures at the 4 camera ids (tools/capture_slice.mjs) + combat-space records for the two spaces',
};
mkdirSync('out', { recursive: true });
writeFileSync('out/slice-contract.json', JSON.stringify(contract, null, 2));
console.log('slice contract written:', JSON.stringify(contract.sourceHashes));
