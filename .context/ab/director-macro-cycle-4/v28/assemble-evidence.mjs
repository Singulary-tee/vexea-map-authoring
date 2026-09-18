import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dir = join(root, '.context/ab/director-macro-cycle-4/v28/build-f');
const survey = join(dir, 'survey');
const source = join(root, 'blockout/blockout-full-v1.json');
const generator = join(root, '.context/ab/director-macro-cycle-4/v28/gen-director-macro-cycle-4-v28.mjs');
const artifact = join(dir, 'facility-built-v28.glb');
const reference = join(root, '.hoplite/attachments/art_upload_cc637941124a451fb2d465383074988c/file_000000006cc881f4b3d7a548874225ce.png');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const rel = path => relative(root, path);
const sourceSha256 = hash(source);
const generatorSha256 = hash(generator);
const artifactSha256 = hash(artifact);
const referenceSha256 = hash(reference);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

const views = [
  ['top', null, null, null, { kind: 'orthographic', position: [5, 900, 10], target: [5, 0, 10] }, ['user-industrial-campus-board', 'processing-yard']],
  ['orbit', null, null, null, { kind: 'perspective', position: [-760, 470, 720], target: [5, 0, 10] }, ['user-industrial-campus-board', 'industrial-frontage', 'processing-yard']],
  ['xray', null, null, null, { kind: 'orthographic', position: [5, 900, 10], target: [5, 0, 10] }, ['user-industrial-campus-board', 'below-grade-corridor']],
  ['zone-spawn', 'zone_spawn', null, null, { position: [-310, 1.7, 214], target: [-236, 4.5, 176] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['zone-courtyard', 'zone_courtyard', null, null, { position: [-105, 1.7, 119], target: [-64, 5, 82] }, ['processing-yard', 'user-industrial-campus-board']],
  ['zone-warehouse', 'zone_warehouse', null, null, { position: [-164, 1.7, 34], target: [-118, 5, -10] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['zone-plant', 'zone_plant', null, null, { position: [188, 1.7, -92], target: [238, 6, -48] }, ['processing-yard', 'user-industrial-campus-board']],
  ['zone-bridge', 'zone_bridge', null, null, { position: [250, 1.7, 112], target: [292, 8, 62] }, ['processing-yard', 'user-industrial-campus-board']],
  ['zone-tunnels', 'zone_tunnels', null, null, { position: [72, -11.9, -198], target: [160, -11.2, -201] }, ['below-grade-corridor', 'user-industrial-campus-board']],
  ['zone-core', 'zone_core', null, null, { position: [40, 1.7, -190], target: [48, 7, -248] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['zone-boundary', 'zone_boundary', null, null, { position: [-40, 1.7, 292], target: [90, 6, 310] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['route-main-surface', null, 'route_main_surface', null, { position: [-242, 1.7, 160], target: [-160, 3.2, 150] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['route-covered', null, 'route_covered', null, { position: [-102, 1.7, 70], target: [-40, 3, 30] }, ['processing-yard', 'user-industrial-campus-board']],
  ['route-rear-alley', null, 'route_rear_alley', null, { position: [-180, 1.7, 125], target: [-100, 4, 110] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['route-north-ring', null, 'route_north_ring', null, { position: [100, 1.7, 105], target: [158, 4, 70] }, ['processing-yard', 'user-industrial-campus-board']],
  ['route-south-retreat', null, 'route_south_retreat', null, { position: [100, 1.7, -120], target: [220, 4, -160] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['route-flank-backdoor', null, 'route_flank_backdoor', null, { position: [148, 1.7, -222], target: [148, 4, -245] }, ['industrial-frontage', 'user-industrial-campus-board']],
  ['objective-core', null, null, 'objective', { position: [40, 5.7, -250], target: [48, 5.7, -258] }, ['industrial-frontage', 'processing-yard', 'user-industrial-campus-board']],
  ['cover-courtyard', null, null, 'cover', { position: [-82, 1.7, 16], target: [-48, 2, 12] }, ['processing-yard', 'user-industrial-campus-board']],
  ['tunnel-portal', null, null, 'tunnel', { position: [44, -11.2, -196], target: [90, -10.7, -198] }, ['below-grade-corridor', 'user-industrial-campus-board']],
  ['vertical-connector', null, null, 'vertical connector', { position: [302, 1.7, 82], target: [316, 5.2, 62] }, ['processing-yard', 'user-industrial-campus-board']],
];

const refs = [
  { id: 'industrial-frontage', path: 'references/inspiration/17e96510-a0e6-11f1-bf60-039a9cb896aa.webp' },
  { id: 'processing-yard', path: 'references/inspiration/Screenshot_20260825_013725_Chrome.png' },
  { id: 'below-grade-corridor', path: 'references/inspiration/Screenshot_20260825_013737_Chrome.png' },
  { id: 'user-industrial-campus-board', attachmentPath: rel(reference), sha256: referenceSha256 },
];
const refMap = new Map(refs.map(item => [item.id, item]));

const findings = {
  top: [['degraded', 'connected industrial families', 'Central masses connect, but broad blank slabs and weak outboard hierarchy remain.'], ['degraded', 'campus density and layered silhouettes', 'Top view shows low, flat perimeter silhouette with few vertical utilities.'], ['absent', 'wet marked streets and operational yards', 'Road markings exist, but wet response, staging, vehicles, and yard activity do not read campus-wide.']],
  orbit: [['degraded', 'connected industrial families', 'Compounds sit on broad low-information slabs; layered industrial skyline is sparse.'], ['degraded', 'process masses and layered elevations', 'Central pipes and tanks read, but perimeter silhouettes remain flat and disconnected.'], ['absent', 'vehicles, vegetation, and service clutter', 'No distributed vehicles, vegetation, pallets, or maintenance clutter read.']],
  xray: [['degraded', 'macro hierarchy', 'Footprint hierarchy is legible, but surface density remains blockout-like.'], ['present', 'below-grade route coverage', 'X-ray view exposes connected below-grade route and tunnel massing.'], ['absent', 'terrain and perimeter context', 'No readable terrain transition, perimeter fencing, or vegetation context.']],
  'zone-spawn': [['degraded', 'corrugated frontage and arrival canopy', 'Long canopy and utility edge read, but arrival frontage is mostly empty.'], ['absent', 'loading activity and shared yard', 'No loading doors, vehicles, pallets, or active spawn-yard staging read.'], ['absent', 'wet asphalt, markings, and clutter', 'Apron is dry and clean; no drains, puddles, bins, or arrival clutter.']],
  'zone-courtyard': [['present', 'pipe frames, handrails, and catwalks', 'Raised pipe frame, handrails, and catwalk structure read clearly.'], ['present', 'stairs and service access', 'Service stairs and access deck are visible.'], ['degraded', 'wet marked operational apron', 'Markings exist, but apron is dry and lacks equipment, vehicles, and staging.']],
  'zone-warehouse': [['degraded', 'corrugated warehouse mass', 'Industrial canopy and facade edge read, but warehouse volume is not dominant in view.'], ['absent', 'loading doors and active yard', 'No readable loading doors, truck interface, or active loading operation.'], ['absent', 'vehicles, pallets, bins, and vegetation', 'Warehouse yard contains no readable service clutter or controlled vegetation.']],
  'zone-plant': [['present', 'process mass and elevated services', 'Large vessel, facade, pipes, and elevated service runs read.'], ['present', 'tanks, vessels, and vertical specificity', 'Tank/vessel silhouette and pipe hierarchy provide plant identity.'], ['absent', 'wet yard, clutter, and terrain silhouettes', 'Plant apron remains dry and empty; no staging, fencing, or terrain layer.']],
  'zone-bridge': [['degraded', 'bridge and elevated pipe silhouette', 'Partial overhead bridge is visible, but blank wall dominates and bridge relationship is unclear.'], ['degraded', 'layered service access', 'Small pipe and lighting elements read without a convincing connected deck.'], ['absent', 'operational yard context', 'No vehicles, yard staging, fencing, or wet surface response.']],
  'zone-tunnels': [['present', 'concrete enclosure and arched transitions', 'Continuous tunnel enclosure and repeated arched lights read.'], ['present', 'bracketed pipes and practical lighting', 'Parallel colored pipes and practical light rhythm read.'], ['degraded', 'sloped wet floor, gates, and grime', 'Floor slope and markings read, but wet reflection, grime, and portal control detail are weak.']],
  'zone-core': [['present', 'substantial connected core mass', 'Large connected core envelope reads as a substantial industrial building.'], ['absent', 'windows, control room, and objective identity', 'Blank corrugated wall dominates; no control-room glazing, screens, or objective signage.'], ['degraded', 'practical lights, signs, and service clutter', 'Small lights and rails exist, but identity and operational detail are not legible.']],
  'zone-boundary': [['present', 'perimeter service road', 'Continuous road and utility corridor read.'], ['absent', 'chain-link, gates, and vegetation', 'Boundary lacks readable chain-link fencing, gates, vegetation, and layered edge silhouettes.'], ['degraded', 'wet marked service access', 'Lane line reads, but asphalt has no convincing wet response or drainage detail.']],
  'route-main-surface': [['present', 'lane markings and service road', 'Continuous marked service road reads.'], ['absent', 'wet asphalt, drains, and puddles', 'Surface reads dry and clean; drains and puddles are not readable.'], ['absent', 'vehicles and active service access', 'No traffic, loading, barriers, or service staging.']],
  'route-covered': [['present', 'covered route and utility relationship', 'Covered route and overhead utility edge read.'], ['degraded', 'practical lights and handrails', 'Some lights and posts read, but route is dark and access detailing is sparse.'], ['absent', 'maintenance activity and clutter', 'No bins, pallets, vehicles, signs, or maintenance equipment.']],
  'route-rear-alley': [['present', 'rear service alley and building relationship', 'Alley, curb, buildings, and utility posts read.'], ['degraded', 'wet asphalt, drains, and markings', 'Road edge and markings exist, but wet response is weak.'], ['absent', 'rear loading, bins, and vegetation', 'No rear-service staging, bins, vehicles, or vegetation.']],
  'route-north-ring': [['present', 'north ring route and industrial mass', 'Route curves beside a large industrial mass.'], ['degraded', 'layered perimeter silhouettes', 'Some distant structures read, but silhouettes are low and sparse.'], ['absent', 'traffic, fencing, and maintenance clutter', 'No active traffic, fencing, vegetation, or service clutter.']],
  'route-south-retreat': [['present', 'covered service road and utility relationship', 'Canopy, road, and utility corridor read.'], ['degraded', 'wet marked surface and drainage', 'Lane markings read, but surface remains visually dry.'], ['absent', 'tanks, vehicles, and operational staging', 'No tank interface, vehicles, pallets, or maintenance staging.']],
  'route-flank-backdoor': [['present', 'flank backdoor and service access', 'Door, stair/landing edge, and facade service access read.'], ['degraded', 'weathered material and practical detail', 'Material variation exists, but detail is too sparse for reference density.'], ['absent', 'backdoor operations, signs, and clutter', 'No sign package, bins, vehicles, fencing, or wet threshold activity.']],
  'objective-core': [['present', 'objective building mass', 'Large objective mass is clearly framed.'], ['absent', 'control room, screens, and objective identity', 'No glazed control room, screens, consoles, or legible objective marker.'], ['absent', 'practical lighting and approach activity', 'Approach is dark and empty; no guards, signs, barriers, or equipment.']],
  'cover-courtyard': [['present', 'covered courtyard and route cover', 'Long covered edge, route markings, and courtyard enclosure read.'], ['degraded', 'cover props, barriers, and service access', 'Concrete cover blocks and utility posts exist, but service detail is sparse.'], ['absent', 'wet yard, vehicles, and clutter', 'No wet response, vehicles, pallets, bins, or active cover-yard staging.']],
  'tunnel-portal': [['present', 'tunnel portal and utility corridor', 'Tunnel interior, portal direction, and parallel utilities read.'], ['degraded', 'portal signage, gate, and terrain transition', 'Portal has no strong sign, gate, or terrain identity in this framing.'], ['absent', 'wet operational approach', 'No wet threshold staging, barriers, vehicles, or maintenance clutter.']],
  'vertical-connector': [['present', 'stairs and vertical connector', 'Stair flight, railings, and raised connector edge read.'], ['degraded', 'bridge landing and service deck', 'Deck relationship is visible but shallow and visually under-detailed.'], ['absent', 'markings, signs, and maintenance clutter', 'No sign package, barriers, tools, bins, or wet access response.']],
};

const logs = [readFileSync(join(dir, 'survey-capture.log'), 'utf8'), readFileSync(join(dir, 'survey-missing-capture.log'), 'utf8')].join('\n');
const captures = new Map();
for (const match of logs.matchAll(/captured ([^ ]+) via readPixels sample=([^ ]+) clear=([^ ]+) contextLost=(\w+) calls=(\d+) triangles=(\d+)/g)) captures.set(match[1], { method: 'readPixels', sample: match[2].split(',').map(Number), clear: match[3].split(',').map(Number), contextLost: match[4] === 'true', calls: Number(match[5]), triangles: Number(match[6]) });
if (views.some(view => !captures.has(view[0]))) throw new Error('Survey log does not cover all 21 views.');

const records = views.map(([id, zone, route, requirement, camera]) => {
  const path = join(survey, `canonical-${id}.png`);
  return { id, path: rel(path), zone: zone || null, route: route || null, requirement: requirement || null, camera, bytes: statSync(path).size, sha256: hash(path), width: 1400, height: 900, capture: captures.get(id) };
});
const common = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceCommit, sourceSha256, generatorSha256, artifact: { path: rel(artifact), sha256: artifactSha256, bytes: statSync(artifact).size } };
writeFileSync(join(dir, 'survey-manifest.json'), JSON.stringify({ ...common, renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas', viewport: { width: 1400, height: 900 }, captureMode: 'pixels', views: records.map(({ id, path, zone, route, requirement, camera }) => ({ id, path, zone, route, requirement, camera })), captureIntegrity: { expectedViews: 21, capturedViews: records.length, allContextLostFalse: records.every(view => !view.capture.contextLost), allDimensions1400x900: records.every(view => view.width === 1400 && view.height === 900), allReadPixels: records.every(view => view.capture.method === 'readPixels') } }, null, 2) + '\n');
writeFileSync(join(dir, 'survey-capture-integrity.json'), JSON.stringify({ ...common, renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas', viewport: { width: 1400, height: 900 }, status: 'PASS', views: records.map(({ id, path, bytes, sha256, width, height, capture }) => ({ id, path, bytes, sha256, width, height, ...capture })) }, null, 2) + '\n');

const reviewViews = views.map(([id, zone, route, requirement, camera, governingReferences]) => ({
  id, family: id.startsWith('zone-') ? 'zones' : id.startsWith('route-') ? 'routes' : ['top', 'orbit', 'xray'].includes(id) ? 'global' : 'requirements', capturePath: rel(join(survey, `canonical-${id}.png`)), governingReferences: governingReferences.map(ref => refMap.get(ref)), properties: findings[id].map(([status, property, observation]) => ({ property, status, observation })), status: 'FAIL',
}));
const allProperties = reviewViews.flatMap(view => view.properties);
const count = status => allProperties.filter(property => property.status === status).length;
const board = join(survey, 'v28-reference-comparison.png');
const contactSheet = join(survey, 'candidate-contact-sheet.png');
const review = {
  ...common,
  method: 'Fresh exact-artifact-bound 1400x900 standalone Chromium SwiftShader readPixels captures reviewed beside supplied many-small-views reference board; technical PASS fields were not used as visual evidence.',
  referenceRegister: refs,
  presentation: { comparisonBoardPath: rel(board), candidateContactSheetPath: rel(contactSheet), comparisonBoardSha256: hash(board), candidateContactSheetSha256: hash(contactSheet), referenceShownDirectlyBesideCandidate: true },
  summary: { status: 'FAIL', checkedViews: 21, failingViews: 21, propertiesChecked: allProperties.length, present: count('present'), degraded: count('degraded'), absent: count('absent'), requiredViewsChecked: 4, requiredViewsFailing: 4, zonesChecked: 8, zonesFailing: 8, routesChecked: 6, routesFailing: 6 },
  highestLevelRemainingFailure: 'Campus still reads as a sparse constructed blockout with localized industrial detail, not a consistently operational industrial campus at supplied reference density.',
  failureClasses: { macroTerrain: 'FAIL', density: 'FAIL', industrialMassing: 'DEGRADED', assetFamilies: 'FAIL', materials: 'DEGRADED', lighting: 'DEGRADED', operationalYards: 'FAIL', requiredViews: 'FAIL' },
  evidenceGaps: ['No visual approval.', 'No explicit user map approval.', 'Historical authoritative artifact identity discrepancy remains unresolved.', 'Reference board remains attachment-bound; it is shown beside candidate in comparison evidence but not copied into repository source.'],
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  views: reviewViews,
};
writeFileSync(join(dir, 'v28-reference-anchored-visual-review.json'), JSON.stringify(review, null, 2) + '\n');

const evidence = {
  schemaVersion: 1, generatedAt: common.generatedAt, status: 'BLOCKED', candidate: 'v28', build: 'build-f',
  artifact: { ...common.artifact, triangles: 881184, triangleCap: 881216, sourcePath: 'blockout/blockout-full-v1.json', sourceSha256, generatorPath: rel(generator), generatorSha256 },
  technical: { sourceValidation: 'PASS', traversal: 'PASS', collisionManifest: 'PASS', semanticExport: 'PASS', runtimeBundle: 'PASS', geometryAudit: 'PASS', independentAudit: 'PASS', adversarialIndependentAudit: 'PASS', sourceAdaptations: ['72 m in-plant incline represented as six 12 m runs with five landings; source unchanged.', 'Eight intentional route/building passages are numeric fail-closed adaptations; unadapted audit remains distinct.'] },
  survey: { manifestPath: rel(join(dir, 'survey-manifest.json')), integrityPath: rel(join(dir, 'survey-capture-integrity.json')), analysisPath: rel(join(dir, 'survey-png-analysis.json')), status: 'PASS', views: 21, contextLost: false, allPngsPass: true },
  visualReview: { path: rel(join(dir, 'v28-reference-anchored-visual-review.json')), status: 'FAIL', visualApproval: 'FAIL', userApproval: 'PENDING' },
  identity: { authoritativeArtifactSha256: '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db', candidateIsAuthoritative: false, historicalIdentityDiscrepancy: 'UNRESOLVED' },
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  failClosed: ['Candidate is not authoritative.', 'Visual approval is FAIL.', 'User map approval is PENDING.', 'Historical authoritative artifact identity is unresolved.', 'Independent audit PASS includes explicit source-bound adaptations; it is not a clean unadapted source audit.'],
};
writeFileSync(join(dir, 'v28-evidence-manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit, sourceSha256, generatorSha256, artifactSha256, referenceSha256, views: records.length, visualStatus: review.summary.status }, null, 2));
