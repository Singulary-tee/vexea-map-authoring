import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const base = join(root, '.context/ab/director-macro-cycle-4/v31');
const dir = join(base, 'build-a');
const surveyDir = join(dir, 'survey');
const sourcePath = join(root, 'blockout/blockout-full-v1.json');
const generatorPath = join(base, 'gen-director-macro-cycle-4-v31.mjs');
const artifactPath = join(dir, 'facility-built-v31.glb');
const referencePath = join(root, 'references/inspiration/user-supplied-industrial-campus-board.png');
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const rel = path => path.replace(`${root}/`, '');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceSha256 = sha256(sourcePath);
const generatorSha256 = sha256(generatorPath);
const artifactSha256 = sha256(artifactPath);
const artifactBytes = statSync(artifactPath).size;
const referenceSha256 = sha256(referencePath);

const views = [
  ['top', 'global', null, null, null, 'orthographic', [5, 900, 10], [5, 0, 10]],
  ['orbit', 'global', null, null, null, 'perspective', [-760, 470, 720], [5, 0, 10]],
  ['xray', 'global', null, null, null, 'orthographic', [5, 900, 10], [5, 0, 10]],
  ['zone-spawn', 'zone', 'zone_spawn', null, null, null, [-310, 1.7, 214], [-236, 4.5, 176]],
  ['zone-courtyard', 'zone', 'zone_courtyard', null, null, null, [-105, 1.7, 119], [-64, 5, 82]],
  ['zone-warehouse', 'zone', 'zone_warehouse', null, null, null, [-164, 1.7, 34], [-118, 5, -10]],
  ['zone-plant', 'zone', 'zone_plant', null, null, null, [188, 1.7, -92], [238, 6, -48]],
  ['zone-bridge', 'zone', 'zone_bridge', null, null, null, [250, 1.7, 112], [292, 8, 62]],
  ['zone-tunnels', 'zone', 'zone_tunnels', null, null, null, [72, -11.9, -198], [160, -11.2, -201]],
  ['zone-core', 'zone', 'zone_core', null, null, null, [40, 1.7, -190], [48, 7, -248]],
  ['zone-boundary', 'zone', 'zone_boundary', null, null, null, [-40, 1.7, 292], [90, 6, 310]],
  ['route-main-surface', 'route', null, 'route_main_surface', null, null, [-242, 1.7, 160], [-160, 3.2, 150]],
  ['route-covered', 'route', null, 'route_covered', null, null, [-102, 1.7, 70], [-40, 3, 30]],
  ['route-rear-alley', 'route', null, 'route_rear_alley', null, null, [-180, 1.7, 125], [-100, 4, 110]],
  ['route-north-ring', 'route', null, 'route_north_ring', null, null, [100, 1.7, 105], [158, 4, 70]],
  ['route-south-retreat', 'route', null, 'route_south_retreat', null, null, [100, 1.7, -120], [220, 4, -160]],
  ['route-flank-backdoor', 'route', null, 'route_flank_backdoor', null, null, [148, 1.7, -222], [148, 4, -245]],
  ['objective-core', 'required', null, null, 'objective', null, [40, 5.7, -250], [48, 5.7, -258]],
  ['cover-courtyard', 'required', null, null, 'cover', null, [-82, 1.7, 16], [-48, 2, 12]],
  ['tunnel-portal', 'required', null, null, 'tunnel', null, [44, -11.2, -196], [90, -10.7, -198]],
  ['vertical-connector', 'required', null, null, 'vertical connector', null, [302, 1.7, 82], [316, 5.2, 62]],
].map(([id, family, zone, route, requirement, kind, position, target]) => ({
  id, family, zone, route, requirement,
  camera: { ...(kind ? { kind } : {}), position, target },
  path: `.context/ab/director-macro-cycle-4/v31/build-a/survey/canonical-${id}.png`,
}));

const referenceRegister = {
  frontage: { id: 'industrial-frontage', path: 'references/inspiration/17e96510-a0e6-11f1-bf60-039a9cb896aa.webp' },
  processing: { id: 'processing-yard', path: 'references/inspiration/Screenshot_20260825_013725_Chrome.png' },
  corridor: { id: 'below-grade-corridor', path: 'references/inspiration/Screenshot_20260825_013737_Chrome.png' },
  user: { id: 'user-industrial-campus-board', attachmentPath: rel(referencePath), sha256: referenceSha256 },
};

writeFileSync(join(dir, 'survey-manifest.json'), JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit,
  sourceSha256,
  generatorSha256,
  artifact: { path: rel(artifactPath), sha256: artifactSha256, bytes: artifactBytes },
  renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas',
  views: views.map(({ id, path, zone, route, requirement, camera }) => ({ id, path, zone: zone || null, route: route || null, requirement: requirement || null, camera })),
}, null, 2) + '\n');

copyFileSync(join(dir, 'survey-capture-c-rebuilt.log'), join(dir, 'survey-capture-c.log'));
const captureLogs = ['a', 'b', 'c'].map(group => ({ group, path: join(dir, `survey-capture-${group}.log`), text: readFileSync(join(dir, `survey-capture-${group}.log`), 'utf8') }));
const captures = new Map();
for (const { group, path, text } of captureLogs) {
  const loggedArtifact = text.match(/artifact ([0-9a-f]{64})/)?.[1] || null;
  for (const match of text.matchAll(/captured (\S+) via (\S+) sample=([^ ]+) clear=([^ ]+) contextLost=(\S+) calls=(\d+) triangles=(\d+)/g)) {
    captures.set(match[1], {
      group,
      path: rel(path),
      loggedArtifact,
      method: match[2],
      sample: match[3].split(',').map(Number),
      clear: match[4].split(',').map(Number),
      contextLost: match[5] === 'true',
      calls: Number(match[6]),
      triangles: Number(match[7]),
    });
  }
}

const pngInfo = path => {
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: sha256(path), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const integrityViews = views.map(view => {
  const capture = captures.get(view.id);
  const image = pngInfo(join(root, view.path));
  return {
    id: view.id,
    path: view.path,
    ...image,
    method: capture?.method || null,
    sample: capture?.sample || null,
    clear: capture?.clear || null,
    contextLost: capture?.contextLost ?? null,
    calls: capture?.calls || null,
    triangles: capture?.triangles || null,
    captureGroup: capture?.group || null,
    captureLog: capture?.path || null,
    artifactBindingStatus: capture?.loggedArtifact === artifactSha256 ? 'PASS' : 'FAIL_CLOSED',
  };
});
const integrityPass = integrityViews.every(view => view.width === 1400 && view.height === 900 && view.method === 'readPixels' && view.contextLost === false && view.artifactBindingStatus === 'PASS');
writeFileSync(join(dir, 'survey-capture-integrity.json'), JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit,
  sourceSha256,
  generatorSha256,
  artifact: { path: rel(artifactPath), sha256: artifactSha256, bytes: artifactBytes },
  renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas',
  viewport: { width: 1400, height: 900 },
  status: integrityPass ? 'PASS' : 'FAIL_CLOSED',
  views: integrityViews,
}, null, 2) + '\n');

const observations = {
  top: [['connected industrial families', 'degraded', 'Campus footprint connects, but low slabs still dominate broad composition.'], ['layered industrial silhouettes', 'degraded', 'Process frames and tanks register, but perimeter skyline remains flat.'], ['campus-wide operational yards', 'absent', 'Vehicles, staging, wet aprons, and maintenance activity do not read from above.']],
  orbit: [['connected industrial massing', 'degraded', 'Distributed families read as one compound, but outboard volumes remain low-information.'], ['processing hierarchy and layered elevations', 'degraded', 'Tanks, pipe frames, and a taller core exist, but hierarchy stays weak.'], ['perimeter vegetation and service clutter', 'absent', 'No convincing vegetation band or distributed yard clutter reads at campus scale.']],
  xray: [['macro hierarchy', 'degraded', 'Routes and footprint are legible, but added operations do not resolve sparse top-level reading.'], ['below-grade route coverage', 'present', 'Continuous lit corridor and parallel utility runs read clearly.'], ['terrain and perimeter context', 'absent', 'No readable terrain transition, fence context, or vegetation layer appears.']],
  'zone-spawn': [['covered industrial frontage', 'degraded', 'Canopy and overhead utility frame create frontage, but wall families remain sparse.'], ['shared operational yard', 'absent', 'Spawn apron lacks loading vehicles, pallets, forklifts, and maintenance staging.'], ['wet marked street response', 'degraded', 'Road edge and marking exist, but puddle and grime response is weak.']],
  'zone-courtyard': [['pipe rack and access structure', 'present', 'Rack, stairs, rails, and covered service edge read as industrial access.'], ['operational yard density', 'degraded', 'Open yard remains mostly empty, with few meaningful contacts or props.'], ['material and wetness response', 'degraded', 'Concrete and dark pavement read, but reference wetness and grime are limited.']],
  'zone-warehouse': [['warehouse frontage', 'degraded', 'Large mass and canopy read, but façade is mostly blank and repetitive.'], ['loading identity', 'absent', 'No convincing dock doors, active loading, vehicle, or pallet relationship reads.'], ['corrugated and glass material variety', 'degraded', 'Pressed panels are visible, but windows and façade articulation remain limited.']],
  'zone-plant': [['tanks and process utilities', 'present', 'Two tall vessels and overhead pipes establish process identity.'], ['vertical service hierarchy', 'degraded', 'Utility posts and frames exist, but stairs, valves, and catwalk layers are thin.'], ['facility-edge vegetation and terrain', 'absent', 'Plant edge has no controlled vegetation band or layered terrain silhouette.']],
  'zone-bridge': [['bridge pipe transfer', 'present', 'Elevated pipe frame and yellow handrails establish a transfer crossing.'], ['layered industrial background', 'degraded', 'A few walls and frames layer, but the horizon remains mostly blank.'], ['shared yard activity', 'absent', 'No vehicles, containers, pallets, or maintenance contacts populate the yard.']],
  'zone-tunnels': [['below-grade corridor enclosure', 'present', 'Long enclosed corridor, practical lights, and parallel pipes read strongly.'], ['portal transition', 'degraded', 'Interior identity is clear, but exterior portal and terrain transition are not visible.'], ['surface grime and service detail', 'degraded', 'Dark walls and utilities read, but reference grime and service clutter are limited.']],
  'zone-core': [['tall core massing', 'present', 'Tall pressed-metal block creates a stronger campus anchor.'], ['objective control-room identity', 'absent', 'Objective view reads as a dark blank box, not a visible control room or screen bank.'], ['street-level operational contact', 'degraded', 'Fence, lights, and lane edge exist, but activity and loading relationships are sparse.']],
  'zone-boundary': [['perimeter streetwall', 'degraded', 'Long wall and process silhouettes create an edge, but boundary remains thin.'], ['fence and gate identity', 'absent', 'Chain-link, gate hardware, signs, and controlled edge do not read convincingly.'], ['vegetation and layered terrain', 'absent', 'No perimeter vegetation band or terrain transition is visible.']],
  'route-main-surface': [['marked service street', 'present', 'Lane marking, curb, light poles, and connected street frontage read.'], ['wet operational surface', 'degraded', 'Dark asphalt reads, but puddles, drains, and reflective wet response remain weak.'], ['loading and service activity', 'absent', 'No convincing vehicles, loading doors, pallets, or maintenance clutter appear.']],
  'route-covered': [['covered route utility frame', 'present', 'Roof, overhead pipes, posts, and practical lights define covered passage.'], ['player-scale service contact', 'degraded', 'Route is traversable, but bins, cabinets, vehicles, and work clutter are scarce.'], ['wet marked ground', 'degraded', 'Ground is dark and lane-marked, but reference puddle and grime layering is limited.']],
  'route-rear-alley': [['rear service alley', 'present', 'Curb, lane, light pole, and streetwall establish a connected alley.'], ['maintenance clutter', 'absent', 'No dumpsters, pallets, cabinets, signs, or service vehicles create rear-alley activity.'], ['layered edge silhouette', 'degraded', 'Buildings layer along the road, but background terrain and vegetation are absent.']],
  'route-north-ring': [['ring-road connection', 'present', 'Road, curb, building wall, and utility edge form a readable route segment.'], ['operational frontage', 'degraded', 'Some pipe and canopy elements appear, but loading relationships are weak.'], ['campus edge context', 'absent', 'No fence, vegetation, terrain, or layered perimeter silhouette reads.']],
  'route-south-retreat': [['retreat route cover', 'present', 'Covered edge, road marking, and connected building frontage read.'], ['yard activity and service access', 'absent', 'No vehicle, container, pallet, sign, or maintenance relationship populates route.'], ['wet material response', 'degraded', 'Asphalt and concrete separate, but wetness, drains, and grime are limited.']],
  'route-flank-backdoor': [['backdoor access', 'degraded', 'Door, small canopy, and step provide a service access cue.'], ['industrial façade specificity', 'absent', 'Blank corrugated wall lacks readable loading, cabinets, signs, or utility contacts.'], ['route context', 'degraded', 'Tight passage is navigable, but no wider yard or layered boundary context reads.']],
  'objective-core': [['objective visibility', 'absent', 'Camera sees a dark mass and canopy rather than a readable objective room.'], ['control-room reference properties', 'absent', 'No screen bank, glazing, consoles, or operational control identity is visible.'], ['security and service contact', 'degraded', 'Lights and fencing hint at access control, but signs and active equipment are absent.']],
  'cover-courtyard': [['cover relationship', 'present', 'Concrete cover blocks and lane markings provide playable courtyard cover.'], ['shared operational courtyard', 'absent', 'Courtyard lacks vehicles, pallets, containers, and maintenance activity.'], ['wet yard material response', 'degraded', 'Dark hardstand and markings read, but puddles, drains, and grime are weak.']],
  'tunnel-portal': [['below-grade utility corridor', 'present', 'Pipes, lights, enclosure, and long sightline match corridor intent.'], ['portal and terrain transition', 'absent', 'View contains interior tunnel only; no grounded portal or terrain transition reads.'], ['service grime and practical detail', 'degraded', 'Utility density is strong, but grime, gates, and service clutter are limited.']],
  'vertical-connector': [['vertical connector structure', 'present', 'Yellow rails, posts, and elevated frame establish a climbable connector cue.'], ['landings and layered elevation', 'degraded', 'Vertical frame reads, but landings and surrounding multi-level hierarchy are thin.'], ['industrial contact and safety signage', 'absent', 'No readable stair signage, cabinets, gates, or maintenance contacts appear.']],
};

const refsFor = id => {
  if (id === 'xray' || id === 'zone-tunnels' || id === 'tunnel-portal') return [referenceRegister.user, referenceRegister.corridor];
  if (id === 'zone-plant' || id === 'zone-bridge' || id === 'vertical-connector') return [referenceRegister.user, referenceRegister.processing];
  if (id === 'zone-warehouse' || id === 'route-covered' || id === 'route-main-surface' || id === 'cover-courtyard') return [referenceRegister.user, referenceRegister.frontage, referenceRegister.processing];
  return [referenceRegister.user, referenceRegister.frontage];
};
const reviewViews = views.map(view => ({
  id: view.id,
  family: view.family,
  capturePath: view.path,
  governingReferences: refsFor(view.id),
  properties: observations[view.id].map(([property, status, observation]) => ({ property, status, observation })),
  status: 'FAIL',
}));
const count = status => reviewViews.flatMap(view => view.properties).filter(property => property.status === status).length;
const visualReview = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit,
  sourceSha256,
  generatorSha256,
  artifact: { path: rel(artifactPath), sha256: artifactSha256, bytes: artifactBytes },
  method: 'Fresh exact-artifact-bound 1400x900 standalone Chromium SwiftShader readPixels captures reviewed beside supplied many-small-views reference board; technical PASS fields were not used as visual evidence.',
  referenceRegister: Object.values(referenceRegister),
  presentation: {
    comparisonBoardPath: rel(join(surveyDir, 'v31-reference-comparison.png')),
    candidateContactSheetPath: rel(join(surveyDir, 'candidate-contact-sheet.png')),
    comparisonBoardSha256: sha256(join(surveyDir, 'v31-reference-comparison.png')),
    candidateContactSheetSha256: sha256(join(surveyDir, 'candidate-contact-sheet.png')),
    referenceShownDirectlyBesideCandidate: true,
  },
  summary: {
    status: 'FAIL', checkedViews: reviewViews.length, failingViews: reviewViews.length,
    propertiesChecked: reviewViews.reduce((total, view) => total + view.properties.length, 0),
    present: count('present'), degraded: count('degraded'), absent: count('absent'),
    requiredViewsChecked: 4, requiredViewsFailing: 4, zonesChecked: 8, zonesFailing: 8, routesChecked: 6, routesFailing: 6,
  },
  highestLevelRemainingFailure: 'Campus still reads as a sparse constructed blockout with localized industrial families, not a consistently operational campus at supplied reference density.',
  failureClasses: { macroTerrain: 'FAIL', density: 'FAIL', industrialMassing: 'DEGRADED', assetFamilies: 'FAIL', materials: 'DEGRADED', lighting: 'DEGRADED', operationalYards: 'FAIL', requiredViews: 'FAIL' },
  evidenceGaps: ['No visual approval.', 'No explicit user map approval.', 'Historical authoritative artifact identity discrepancy remains unresolved.', 'Reference board remains attachment-bound; it is shown directly beside candidate in comparison evidence but not copied into repository source.'],
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  views: reviewViews,
};
writeFileSync(join(dir, 'v31-reference-anchored-visual-review.json'), JSON.stringify(visualReview, null, 2) + '\n');

const report = JSON.parse(readFileSync(join(dir, 'director-macro-cycle-4-v31-report.json'), 'utf8'));
const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'BLOCKED', candidate: 'v31', build: 'build-a',
  artifact: { path: rel(artifactPath), sha256: artifactSha256, bytes: artifactBytes, triangles: report.artifact.identity.indexedTriangles, triangleCap: 881216, sourcePath: rel(sourcePath), sourceSha256, generatorPath: rel(generatorPath), generatorSha256 },
  technical: { sourceValidation: 'PASS', traversal: 'PASS', collisionManifest: 'PASS', semanticExport: 'PASS', runtimeBundle: 'PASS', geometryAudit: 'PASS', v31StructuralAudit: 'PASS', independentAudit: 'PASS_WITH_ADAPTATIONS', adversarialIndependentAudit: 'PASS_WITH_ADAPTATIONS', sourceAdaptations: ['72 m in-plant incline represented as six 12 m runs with five landings; source unchanged.', 'Eight intentional route/building passages remain explicit numeric fail-closed adaptations; unadapted audit remains distinct.'] },
  survey: { manifestPath: rel(join(dir, 'survey-manifest.json')), integrityPath: rel(join(dir, 'survey-capture-integrity.json')), analysisPath: rel(join(dir, 'survey-png-analysis.json')), status: integrityPass ? 'PASS' : 'FAIL_CLOSED', views: views.length, contextLost: integrityPass ? false : 'FAIL_CLOSED', allPngsPass: JSON.parse(readFileSync(join(dir, 'survey-png-analysis.json'), 'utf8')).status === 'PASS', directReadPixels: integrityPass },
  presentation: visualReview.presentation,
  visualReview: { path: rel(join(dir, 'v31-reference-anchored-visual-review.json')), status: 'FAIL', visualApproval: 'FAIL', userApproval: 'PENDING' },
  identity: { authoritativeArtifactSha256: '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db', candidateIsAuthoritative: false, historicalIdentityDiscrepancy: 'UNRESOLVED' },
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  failClosed: ['Candidate is not authoritative.', 'Visual approval is FAIL.', 'User map approval is PENDING.', 'Historical authoritative artifact identity is unresolved.', 'Independent audit PASS includes explicit source-bound adaptations; it is not a clean unadapted source audit.'],
};
writeFileSync(join(dir, 'v31-evidence-manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit, sourceSha256, generatorSha256, artifactSha256, views: views.length, integrity: integrityPass ? 'PASS' : 'FAIL_CLOSED', visual: visualReview.summary, evidence: evidence.status }, null, 2));
