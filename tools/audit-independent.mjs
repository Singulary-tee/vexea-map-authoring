#!/usr/bin/env node
// Independent coordinate audit. Reads source geometry only.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const outputPath = process.argv[3] || 'out/independent-audit.json';
const adaptationPath = process.argv[4] || process.env.INDEPENDENT_AUDIT_ADAPTATION || '';
const sourceBytes = readFileSync(sourcePath);
const source = JSON.parse(sourceBytes);
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
const adaptation = adaptationPath ? JSON.parse(readFileSync(adaptationPath)) : null;
const segments = Array.isArray(source.segments) ? source.segments : [];
const routes = Array.isArray(source.routes) ? source.routes : [];
const footprintCategories = new Set([
  'building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower', 'wall-blocking', 'bridge',
]);
const endpointCategories = new Set([
  ...footprintCategories, 'ground-surface-type', 'tunnel-passage', 'stair', 'incline', 'roll-down',
  'cover', 'overhead-cover', 'spawn',
]);
const bounds = segment => ({
  minX: Math.min(segment.bounds[0], segment.bounds[2]),
  minZ: Math.min(segment.bounds[1], segment.bounds[3]),
  maxX: Math.max(segment.bounds[0], segment.bounds[2]),
  maxZ: Math.max(segment.bounds[1], segment.bounds[3]),
});
const center = box => [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2];
const distanceToBox = (point, box) => {
  const x = Math.max(box.minX, Math.min(point[0], box.maxX));
  const z = Math.max(box.minZ, Math.min(point[1], box.maxZ));
  return Math.hypot(point[0] - x, point[1] - z);
};
const lineBoxInterval = (start, end, box) => {
  const delta = [end[0] - start[0], end[1] - start[1]];
  let enter = 0;
  let exit = 1;
  for (const [origin, change, min, max] of [
    [start[0], delta[0], box.minX, box.maxX],
    [start[1], delta[1], box.minZ, box.maxZ],
  ]) {
    if (Math.abs(change) < 1e-9) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let near = (min - origin) / change;
    let far = (max - origin) / change;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return null;
  }
  return [Math.max(0, enter), Math.min(1, exit)];
};
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const passageKey = finding => `${finding.route}:${finding.segment}:${finding.waypointIndex}`;
const adaptationSourceMatches = !adaptation || adaptation.baseSourceSha256 === sourceSha256;
const adaptedPassages = new Map((adaptation?.routePassages || []).map(passage => [`${passage.route}:${passage.segment}:${passage.waypointIndex}`, passage]));
const adaptedPassageKeys = new Set();
const adaptationErrors = [];
if (adaptation && !adaptationSourceMatches) adaptationErrors.push({
  type: 'source-hash',
  expected: adaptation.baseSourceSha256,
  actual: sourceSha256,
});

const footprints = segments
  .filter(segment => footprintCategories.has(segment.category) && Array.isArray(segment.bounds) && segment.bounds.length === 4)
  .map(segment => ({ ...segment, box: bounds(segment) }));
const overlaps = [];
for (let left = 0; left < footprints.length; left++) for (let right = left + 1; right < footprints.length; right++) {
  const a = footprints[left];
  const b = footprints[right];
  const overlapX = Math.min(a.box.maxX, b.box.maxX) - Math.max(a.box.minX, b.box.minX);
  const overlapZ = Math.min(a.box.maxZ, b.box.maxZ) - Math.max(a.box.minZ, b.box.minZ);
  if (overlapX > 0 && overlapZ > 0) overlaps.push({
    a: a.id,
    b: b.id,
    overlapM2: Number((overlapX * overlapZ).toFixed(3)),
    aBounds: [a.box.minX, a.box.minZ, a.box.maxX, a.box.maxZ],
    bBounds: [b.box.minX, b.box.minZ, b.box.maxX, b.box.maxZ],
  });
}

const routeBuildingIntersections = [];
const adaptedRouteBuildingIntersections = [];
for (const route of routes.filter(candidate => candidate.kind !== 'air')) {
  for (let index = 0; index < (route.waypoints?.length || 0) - 1; index++) {
    const start = route.waypoints[index];
    const end = route.waypoints[index + 1];
    const length = distance(start, end);
    for (const footprint of footprints) {
      const interval = lineBoxInterval(start, end, footprint.box);
      if (!interval || interval[1] - interval[0] <= 1e-6) continue;
      const finding = {
        route: route.id,
        segment: footprint.id,
        waypointIndex: index,
        crossingPoints: [
          [Number((start[0] + (end[0] - start[0]) * interval[0]).toFixed(3)), Number((start[1] + (end[1] - start[1]) * interval[0]).toFixed(3))],
          [Number((start[0] + (end[0] - start[0]) * interval[1]).toFixed(3)), Number((start[1] + (end[1] - start[1]) * interval[1]).toFixed(3))],
        ],
        chordLengthM: Number((length * (interval[1] - interval[0])).toFixed(3)),
      };
      const passage = adaptedPassages.get(passageKey(finding));
      const passagePoints = passage?.crossingPoints || [];
      const passageMatches = adaptationSourceMatches && passage?.status === 'ADAPTED'
        && passagePoints.length === 2
        && passagePoints.every((point, pointIndex) => pointDistance(point, finding.crossingPoints[pointIndex]) <= 0.02)
        && Math.abs(Number(passage.chordLengthM) - finding.chordLengthM) <= 0.02
        && typeof passage.mode === 'string' && passage.mode.length > 0;
      if (passageMatches) {
        adaptedPassageKeys.add(passageKey(finding));
        adaptedRouteBuildingIntersections.push({ ...finding, adaptation: { mode: passage.mode, reason: passage.reason || '' } });
      } else routeBuildingIntersections.push(finding);
    }
  }
}
for (const passage of adaptation?.routePassages || []) {
  const key = `${passage.route}:${passage.segment}:${passage.waypointIndex}`;
  if (!adaptedPassageKeys.has(key)) adaptationErrors.push({ type: 'route-passage', key, reason: 'adaptation does not match a measured crossing' });
}

const stairRuns = segments
  .filter(segment => ['stair', 'incline', 'roll-down'].includes(segment.category))
  .map(segment => {
    const gauge = segment.gauge || {};
    const horizontalRunM = segment.category === 'incline'
      ? Number(gauge.run ?? 0)
      : segment.category === 'stair'
        ? Number(gauge.run ?? ((gauge.steps || 0) * (gauge.tread || 0)))
        : 0;
    const riseM = segment.category === 'incline'
      ? Number(gauge.rise ?? segment.height ?? 0)
      : segment.category === 'stair'
        ? Number(gauge.totalRise ?? ((gauge.steps || 0) * (gauge.rise || 0)))
        : 0;
    const capM = 15;
    const verticalAdaptation = adaptation?.verticalTransitions?.find(candidate => candidate.segmentId === segment.id);
    const continuousRunsM = verticalAdaptation?.continuousRunsM?.map(Number) || [horizontalRunM];
    const runSumM = continuousRunsM.reduce((sum, run) => sum + run, 0);
    const adaptedRun = Boolean(verticalAdaptation)
      && adaptationSourceMatches
      && continuousRunsM.length > 0
      && continuousRunsM.every(run => Number.isFinite(run) && run > 0 && run <= capM)
      && Math.abs(runSumM - horizontalRunM) <= 0.02
      && Number.isInteger(verticalAdaptation.landingCount)
      && verticalAdaptation.landingCount === Math.max(0, continuousRunsM.length - 1);
    if (verticalAdaptation && !adaptedRun) adaptationErrors.push({ type: 'vertical-transition', segmentId: segment.id, reason: 'continuous run adaptation is invalid' });
    return {
      id: segment.id,
      category: segment.category,
      horizontalRunM,
      riseM,
      capM,
      continuousRunsM,
      maxContinuousRunM: Math.max(...continuousRunsM),
      status: horizontalRunM <= capM || adaptedRun ? 'PASS' : 'FAIL',
      adaptation: adaptedRun ? { landingCount: verticalAdaptation.landingCount, landingDepthM: verticalAdaptation.landingDepthM } : null,
    };
  });

const endpointToleranceM = 5;
const functionalSegments = segments
  .filter(segment => endpointCategories.has(segment.category) && Array.isArray(segment.bounds) && segment.bounds.length === 4)
  .map(segment => ({ ...segment, box: bounds(segment) }));
const endpointLinks = [];
for (const route of routes.filter(candidate => candidate.kind !== 'air')) {
  for (const [label, point] of [['start', route.waypoints?.[0]], ['end', route.waypoints?.at(-1)]]) {
    if (!point) {
      endpointLinks.push({ route: route.id, endpoint: label, point: null, connected: false, nearestSegment: null, nearestDistanceM: null });
      continue;
    }
    const nearest = functionalSegments
      .map(segment => ({ segment, distanceM: distanceToBox(point, segment.box) }))
      .sort((a, b) => a.distanceM - b.distanceM)[0];
    endpointLinks.push({
      route: route.id,
      endpoint: label,
      point,
      connected: Boolean(nearest && nearest.distanceM <= endpointToleranceM),
      nearestSegment: nearest?.segment.id || null,
      nearestDistanceM: nearest ? Number(nearest.distanceM.toFixed(3)) : null,
      nearestCenter: nearest ? center(nearest.segment.box) : null,
    });
  }
}
const deadEndRoutes = endpointLinks.filter(link => !link.connected);
const failedStairRuns = stairRuns.filter(run => run.status !== 'PASS');
const result = {
  schemaVersion: 1,
  status: overlaps.length || routeBuildingIntersections.length || failedStairRuns.length || deadEndRoutes.length || adaptationErrors.length ? 'FAIL_CLOSED' : 'PASS',
  source: { path: sourcePath, sha256: sourceSha256 },
  adaptation: adaptation ? { path: adaptationPath, baseSourceSha256: adaptation.baseSourceSha256, sha256: createHash('sha256').update(readFileSync(adaptationPath)).digest('hex') } : null,
  scope: {
    footprintCategories: [...footprintCategories],
    endpointCategories: [...endpointCategories],
    endpointToleranceM,
    continuousRunCapM: 15,
  },
  overlaps,
  routeBuildingIntersections,
  adaptedRouteBuildingIntersections,
  adaptationErrors,
  stairRuns,
  endpointLinks,
  deadEndRoutes,
  summary: {
    footprintCount: footprints.length,
    overlapCount: overlaps.length,
    routeCount: routes.length,
    routeBuildingIntersectionCount: routeBuildingIntersections.length,
    adaptedRouteBuildingIntersectionCount: adaptedRouteBuildingIntersections.length,
    verticalTransitionCount: stairRuns.length,
    failedVerticalTransitionCount: failedStairRuns.length,
    nonAirEndpointCount: endpointLinks.length,
    deadEndRouteCount: deadEndRoutes.length,
    adaptationErrorCount: adaptationErrors.length,
  },
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(`INDEPENDENT AUDIT: ${result.status}`);
console.log(`footprints=${footprints.length} overlaps=${overlaps.length}; routeIntersections=${routeBuildingIntersections.length} adapted=${adaptedRouteBuildingIntersections.length}; vertical=${stairRuns.length} failed=${failedStairRuns.length}; deadEnds=${deadEndRoutes.length}; adaptationErrors=${adaptationErrors.length}`);
if (result.status !== 'PASS') process.exitCode = 1;
