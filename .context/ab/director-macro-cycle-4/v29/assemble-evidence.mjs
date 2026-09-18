import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const dir = join(root, '.context/ab/director-macro-cycle-4/v29/build-a');
const survey = join(dir, 'survey');
const source = join(root, 'blockout/blockout-full-v1.json');
const generator = join(root, '.context/ab/director-macro-cycle-4/v29/gen-director-macro-cycle-4-v29.mjs');
const artifact = join(dir, 'facility-built-v29.glb');
const reportPath = join(dir, 'director-macro-cycle-4-v29-report.json');
const auditPath = join(dir, 'audit-v29.json');
const reference = join(root, '.hoplite/attachments/art_upload_cc637941124a451fb2d465383074988c/file_000000006cc881f4b3d7a548874225ce.png');
const authoritativeArtifactSha256 = '1015ab60aa94d195567c052fd3b2178c4c160dba37e3dd8283aabd0790b466db';
const triangleCap = 881216;
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const rel = path => relative(root, path);
const sourceSha256 = hash(source);
const generatorSha256 = hash(generator);
const artifactSha256 = hash(artifact);
const referenceSha256 = hash(reference);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const report = JSON.parse(readFileSync(reportPath));
const audit = JSON.parse(readFileSync(auditPath));

if (report.sourceSha256 !== sourceSha256 || report.generatorSha256 !== generatorSha256) throw new Error('v29 report identity mismatch');
if (audit.status !== 'PASS') throw new Error('v29 structural audit is not PASS');
if (report.artifact.sha256 !== artifactSha256 || report.artifact.identity.indexedTriangles > triangleCap) throw new Error('v29 artifact identity mismatch');

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
  top: [['degraded', 'connected industrial families', 'Connected footprint reads, but broad low slabs still dominate campus composition.'], ['degraded', 'layered industrial silhouettes', 'Some tanks and pipe runs register, but perimeter skyline remains flat and sparse.'], ['absent', 'campus-wide operational yards', 'Vehicles, staging, wet aprons, and distributed maintenance activity do not read from above.']],
  orbit: [['degraded', 'connected industrial massing', 'Facility families read as one footprint, but most outboard volumes remain low-information.'], ['degraded', 'processing hierarchy and layered elevations', 'Plant tank and pipe silhouettes exist, yet warehouse, bridge, and core hierarchy stays weak.'], ['absent', 'perimeter vegetation and service clutter', 'No convincing layered terrain edge, vegetation band, or distributed yard clutter reads.']],
  xray: [['degraded', 'macro hierarchy', 'Footprint and route hierarchy remain legible, but added operations do not change sparse top-level reading.'], ['present', 'below-grade route coverage', 'Continuous below-grade corridor, lighting, and parallel utility runs read clearly.'], ['absent', 'terrain and perimeter context', 'X-ray provides no readable terrain transition, fence context, or vegetation layer.']],
  'zone-spawn': [['degraded', 'arrival frontage and canopy', 'Pipe canopy and frontage frame arrival space, but building entry and loading identity remain weak.'], ['absent', 'spawn loading activity', 'No clearly readable truck, forklift, pallet stack, loading door, or active shared-yard relationship.'], ['absent', 'wet apron, drains, and maintenance clutter', 'Concrete apron remains dry and clean at player scale despite isolated added yard records.']],
  'zone-courtyard': [['present', 'pipe frames and raised utility relationship', 'Pipe racks, handrails, and elevated service structure read in the courtyard.'], ['degraded', 'shared operational yard', 'Canopy and service edge read, but staging, vehicles, and loading interactions remain limited.'], ['absent', 'wet marked surface and clutter', 'No convincing puddles, drains, grime, pallets, bins, or active yard mess reads.']],
  'zone-warehouse': [['present', 'large warehouse family and canopy', 'Warehouse mass and long canopy establish a stronger frontage than earlier candidates.'], ['degraded', 'loading frontage', 'Canopy and lane stripe exist, but doors, dock equipment, and cargo activity remain unclear.'], ['absent', 'warehouse operations and vehicle scale', 'No readable forklift, truck, pallet field, or service clutter anchors the warehouse.']],
  'zone-plant': [['present', 'plant vessels and pipe racks', 'Large vessel, pipe rack, and stacked industrial facade establish plant identity.'], ['degraded', 'stairs, catwalks, and service access', 'Raised structure reads, but access details and maintenance contact remain visually thin.'], ['absent', 'active process yard', 'No clearly readable vehicle, pallet, sign, wet ground, or service staging connects plant assets to yard.']],
  'zone-bridge': [['degraded', 'bridge route and utility span', 'Utility lines frame the zone, but bridge deck and cross-zone relationship are difficult to read.'], ['degraded', 'layered silhouettes', 'Mostly blank wall and low horizon suppress the supplied reference hierarchy.'], ['absent', 'bridge operations and access hardware', 'No clear deck activity, stairs, barriers, vehicles, or maintenance clutter reads.']],
  'zone-tunnels': [['present', 'enclosed utility corridor', 'Parallel pipes, arched enclosure, lights, and centered route produce the strongest reference match.'], ['degraded', 'portal transition and grime response', 'Corridor is legible, but portal context, gates, and weathered threshold are not visible here.'], ['absent', 'operational tunnel approach', 'No readable barrier, sign, vehicle, or service staging anchors the tunnel opening.']],
  'zone-core': [['present', 'large core building family', 'Tall facade, windows, perimeter rail, and practical lights establish a substantial core mass.'], ['degraded', 'control-room objective identity', 'Windows and lights exist, but no readable control-room screens, consoles, or objective marker appears.'], ['absent', 'active approach and security layer', 'Approach lacks convincing barriers, signs, operators, equipment, and wet service detail.']],
  'zone-boundary': [['present', 'chain-link boundary and utility edge', 'Fence line and parallel utility run create a readable boundary condition.'], ['degraded', 'boundary street and layered edge', 'Road and pipe edge read, but fence hardware, terrain, and silhouette layers remain sparse.'], ['absent', 'vegetation and perimeter maintenance clutter', 'No visible planted edge, bins, signs, gates, or maintenance activity.']],
  'route-main-surface': [['present', 'marked industrial street and utility frontage', 'Street alignment, yellow lane marking, curbs, and overhead pipe run read clearly.'], ['degraded', 'wet asphalt and drainage response', 'Surface variation is visible, but puddle, drain, grime, and concrete response remain weak.'], ['absent', 'traffic and service activity', 'No convincing vehicle, pallet, sign, or active frontage interrupts the empty route.']],
  'route-covered': [['present', 'covered service route', 'Roofed service run, utility pipes, lights, and route cover read.'], ['degraded', 'wet marked service surface', 'Marking and cover exist, but dark floor remains visually dry and low-detail.'], ['absent', 'covered-route operations', 'No vehicle, bin, pallet, sign, barrier, or maintenance contact reads in the passage.']],
  'route-rear-alley': [['present', 'rear service alley and curb transition', 'Curved road, curb, facade edges, and lamp posts establish an alley route.'], ['degraded', 'rear facade service detail', 'Building frontage remains broad and sparse, with limited doors, stairs, or utility contact.'], ['absent', 'alley clutter and wet maintenance state', 'No bins, pallets, vehicles, signs, puddles, or drains establish service use.']],
  'route-north-ring': [['degraded', 'north ring route', 'Route and building corner read, but framing gives little sense of ring continuity or operations.'], ['degraded', 'industrial frontage and layered background', 'Facade and distant utility line remain shallow against empty sky and pavement.'], ['absent', 'north-ring staging and wet response', 'No vehicle, loading activity, fence detail, vegetation, drain, or clutter reads.']],
  'route-south-retreat': [['present', 'retreat route and service canopy', 'Street, canopy, facade, and gate-like service edge read as a connected route.'], ['degraded', 'material and terrain transition', 'Colored apron and utility edge exist, but weathering and layered terrain remain weak.'], ['absent', 'south service operations', 'No vehicle, pallet, sign, barrier, or wet maintenance detail anchors the route.']],
  'route-flank-backdoor': [['present', 'flank service door and access edge', 'Door, small light, canopy edge, and facade service access are visible.'], ['degraded', 'backdoor material response', 'Corrugated surfaces and threshold exist, but scale cues and practical hardware are thin.'], ['absent', 'backdoor clutter and safety package', 'No stairs, sign package, bins, barriers, vehicles, or wet threshold activity reads.']],
  'objective-core': [['degraded', 'objective building mass', 'Large dark core mass frames the objective approach, but its form is mostly blank.'], ['absent', 'control room and objective identity', 'No readable glazed control room, screens, consoles, objective marker, or sign package appears.'], ['absent', 'lit operational approach', 'Approach remains dark and empty without barriers, equipment, guards, or service activity.']],
  'cover-courtyard': [['present', 'covered courtyard and route cover', 'Canopy, road markings, concrete blocks, and enclosure create usable cover geometry.'], ['degraded', 'yard staging and service access', 'Cover relationship reads, but pallet, vehicle, drain, and maintenance details remain limited.'], ['absent', 'wet active courtyard', 'No strong puddle, grime, forklift, sign, bin, or loading interaction reads.']],
  'tunnel-portal': [['present', 'utility tunnel interior', 'Tunnel enclosure, repeated lighting, parallel pipes, and route vanishing point read.'], ['degraded', 'portal and terrain transition', 'Framing begins inside corridor, so portal gate, sign, and terrain context remain weak.'], ['absent', 'wet portal approach activity', 'No barrier, vehicle, service staging, or maintenance clutter anchors the threshold.']],
  'vertical-connector': [['degraded', 'vertical connector relationship', 'Raised utility structure and access edge are visible, but stair and deck route are not clearly framed.'], ['degraded', 'bridge landing and handrail detail', 'Support posts and facade contact read, yet vertical circulation remains visually ambiguous.'], ['absent', 'connector operations and safety package', 'No clear stair flight, landing sign, barrier, vehicle, or maintenance clutter reads.']],
};

const logPaths = ['survey-capture-a.log', 'survey-capture-b.log', 'survey-capture-c.log'].map(name => join(dir, name));
const logs = logPaths.map(path => readFileSync(path, 'utf8')).join('\n');
const captures = new Map();
for (const match of logs.matchAll(/captured ([^ ]+) via readPixels sample=([^ ]+) clear=([^ ]+) contextLost=(\w+) calls=(\d+) triangles=(\d+)/g)) {
  captures.set(match[1], { method: 'readPixels', sample: match[2].split(',').map(Number), clear: match[3].split(',').map(Number), contextLost: match[4] === 'true', calls: Number(match[5]), triangles: Number(match[6]) });
}
const passHashes = [...logs.matchAll(/SURVEY PASS: \d+\/21 views; artifact ([0-9a-f]{64})/g)].map(match => match[1]);
if (views.some(view => !captures.has(view[0])) || captures.size !== 21) throw new Error('v29 capture logs do not cover all 21 views');
if (passHashes.length !== 3 || passHashes.some(value => value !== artifactSha256)) throw new Error('v29 capture artifact binding mismatch');
if (views.some(([id]) => captures.get(id).contextLost || captures.get(id).method !== 'readPixels')) throw new Error('v29 capture integrity failure');

const analysisPath = join(dir, 'survey-png-analysis.json');
const canonicalPaths = views.map(([id]) => join(survey, `canonical-${id}.png`));
execFileSync(process.execPath, [join(root, 'tools/analyze-survey-png.mjs'), '--expected-width', '1400', '--expected-height', '900', '--output', analysisPath, ...canonicalPaths], { encoding: 'utf8' });
const analysis = JSON.parse(readFileSync(analysisPath));
if (analysis.status !== 'PASS' || analysis.images.length !== 21 || analysis.images.some(image => image.status !== 'PASS')) throw new Error('v29 PNG analysis failed');
const imageByName = new Map(analysis.images.map(image => [image.path.split('/').pop(), image]));

const records = views.map(([id, zone, route, requirement, camera]) => {
  const path = join(survey, `canonical-${id}.png`);
  const image = imageByName.get(path.split('/').pop());
  if (!image || image.image.width !== 1400 || image.image.height !== 900) throw new Error(`missing PNG analysis for ${id}`);
  return { id, path: rel(path), zone: zone || null, route: route || null, requirement: requirement || null, camera, bytes: statSync(path).size, sha256: hash(path), width: image.image.width, height: image.image.height, capture: captures.get(id) };
});
const common = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceCommit, sourceSha256, generatorSha256, artifact: { path: rel(artifact), sha256: artifactSha256, bytes: statSync(artifact).size } };

writeFileSync(join(dir, 'survey-manifest.json'), JSON.stringify({ ...common, renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas', viewport: { width: 1400, height: 900 }, captureMode: 'pixels', views: records.map(({ id, path, zone, route, requirement, camera }) => ({ id, path, zone, route, requirement, camera })), captureIntegrity: { expectedViews: 21, capturedViews: records.length, allContextLostFalse: true, allDimensions1400x900: true, allReadPixels: true, artifactBinding: passHashes.every(value => value === artifactSha256) } }, null, 2) + '\n');
writeFileSync(join(dir, 'survey-capture-integrity.json'), JSON.stringify({ ...common, renderer: 'standalone Playwright Chromium SwiftShader; direct WebGL canvas', viewport: { width: 1400, height: 900 }, status: 'PASS', views: records.map(({ id, path, bytes, sha256, width, height, capture }) => ({ id, path, bytes, sha256, width, height, ...capture })) }, null, 2) + '\n');

const { chromium } = createRequire(import.meta.url)('playwright');
const ids = views.map(([id]) => id);
const fileUri = path => `file://${resolve(path)}`;
const label = id => id.replaceAll('-', ' ');
const boardHtml = join(survey, 'v29-board.html');
const boardMarkup = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#0c1317;color:#f4f7f8;font:600 18px Arial,sans-serif}body{padding:8px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.tile{background:#172126;min-width:0}.label{height:30px;padding:5px 8px;background:#121a1f;text-transform:lowercase;letter-spacing:.3px}.shot{display:block;width:100%;aspect-ratio:14/9;object-fit:cover}.board{display:grid;grid-template-columns:1400px 1400px;gap:0;align-items:start;background:#0c1317}.panel{min-width:0;padding:8px}.panel>h1{height:42px;margin:0;padding:8px 12px;background:#111b20;font-size:22px;letter-spacing:.8px}.panel>img{display:block;width:100%;height:auto;background:#9eb5c9}.candidate .grid{grid-template-columns:repeat(4,1fr)}</style><div id="root"></div><script>
const ids=${JSON.stringify(ids)};const survey=${JSON.stringify(fileUri(survey))};const reference=${JSON.stringify(fileUri(reference))};const root=document.querySelector('#root');const text=id=>id.replaceAll('-', ' ');const grid=()=>{const el=document.createElement('div');el.className='grid';for(const id of ids){const tile=document.createElement('div');tile.className='tile';tile.innerHTML='<div class="label">'+text(id)+'</div><img class="shot" src="'+survey+'/canonical-'+id+'.png">';el.append(tile)}return el};const mode=new URLSearchParams(location.search).get('mode');if(mode==='contact'){root.append(grid())}else{const board=document.createElement('div');board.className='board';const left=document.createElement('section');left.className='panel';left.innerHTML='<h1>SUPPLIED REFERENCE BOARD · MANY SMALL VIEWS</h1><img src="'+reference+'">';const right=document.createElement('section');right.className='panel candidate';right.innerHTML='<h1>V29 CANDIDATE · FRESH SURVEY</h1>';right.append(grid());board.append(left,right);root.append(board)}</script>`;
writeFileSync(boardHtml, boardMarkup);
mkdirSync(survey, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${fileUri(boardHtml)}?mode=contact`);
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
  await page.screenshot({ path: join(survey, 'candidate-contact-sheet.png'), fullPage: true });
  await page.setViewportSize({ width: 2800, height: 900 });
  await page.goto(`${fileUri(boardHtml)}?mode=compare`);
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
  await page.screenshot({ path: join(survey, 'v29-reference-comparison.png'), fullPage: true });
} finally {
  await browser.close();
}

const reviewViews = views.map(([id, zone, route, requirement, camera, governingReferences]) => ({
  id,
  family: id.startsWith('zone-') ? 'zones' : id.startsWith('route-') ? 'routes' : ['top', 'orbit', 'xray'].includes(id) ? 'global' : 'requirements',
  capturePath: rel(join(survey, `canonical-${id}.png`)),
  governingReferences: governingReferences.map(ref => refMap.get(ref)),
  properties: findings[id].map(([status, property, observation]) => ({ property, status, observation })),
  status: 'FAIL',
}));
const allProperties = reviewViews.flatMap(view => view.properties);
const count = status => allProperties.filter(property => property.status === status).length;
const comparisonBoard = join(survey, 'v29-reference-comparison.png');
const contactSheet = join(survey, 'candidate-contact-sheet.png');
const review = {
  ...common,
  method: 'Fresh exact-artifact-bound 1400x900 standalone Chromium SwiftShader readPixels captures reviewed beside supplied many-small-views reference board; technical PASS fields were not used as visual evidence.',
  referenceRegister: refs,
  presentation: { comparisonBoardPath: rel(comparisonBoard), candidateContactSheetPath: rel(contactSheet), comparisonBoardSha256: hash(comparisonBoard), candidateContactSheetSha256: hash(contactSheet), referenceShownDirectlyBesideCandidate: true },
  summary: { status: 'FAIL', checkedViews: 21, failingViews: 21, propertiesChecked: allProperties.length, present: count('present'), degraded: count('degraded'), absent: count('absent'), requiredViewsChecked: 4, requiredViewsFailing: 4, zonesChecked: 8, zonesFailing: 8, routesChecked: 6, routesFailing: 6 },
  highestLevelRemainingFailure: 'Campus still reads as a sparse constructed blockout with localized facility families, not a consistently operational industrial campus at supplied reference density.',
  failureClasses: { macroTerrain: 'FAIL', density: 'FAIL', industrialMassing: 'DEGRADED', assetFamilies: 'FAIL', materials: 'DEGRADED', lighting: 'DEGRADED', operationalYards: 'FAIL', requiredViews: 'FAIL' },
  evidenceGaps: ['No visual approval.', 'No explicit user map approval.', 'Historical authoritative artifact identity discrepancy remains unresolved.', 'Reference board remains attachment-bound; it is shown directly beside candidate in comparison evidence but not copied into repository source.'],
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  views: reviewViews,
};
writeFileSync(join(dir, 'v29-reference-anchored-visual-review.json'), JSON.stringify(review, null, 2) + '\n');

const evidence = {
  schemaVersion: 1,
  generatedAt: common.generatedAt,
  status: 'BLOCKED',
  candidate: 'v29',
  build: 'build-a',
  artifact: { ...common.artifact, triangles: report.artifact.identity.indexedTriangles, triangleCap, sourcePath: 'blockout/blockout-full-v1.json', sourceSha256, generatorPath: rel(generator), generatorSha256 },
  technical: { sourceValidation: 'PASS', traversal: 'PASS', collisionManifest: 'PASS', semanticExport: 'PASS', runtimeBundle: 'PASS', geometryAudit: 'PASS', v29StructuralAudit: 'PASS', independentAudit: 'PASS', adversarialIndependentAudit: 'PASS', sourceAdaptations: ['72 m in-plant incline represented as six 12 m runs with five landings; source unchanged.', 'Eight intentional route/building passages are numeric fail-closed adaptations; unadapted audit remains distinct.'] },
  survey: { manifestPath: rel(join(dir, 'survey-manifest.json')), integrityPath: rel(join(dir, 'survey-capture-integrity.json')), analysisPath: rel(analysisPath), status: 'PASS', views: 21, contextLost: false, allPngsPass: true, directReadPixels: true },
  visualReview: { path: rel(join(dir, 'v29-reference-anchored-visual-review.json')), status: 'FAIL', visualApproval: 'FAIL', userApproval: 'PENDING' },
  identity: { authoritativeArtifactSha256, candidateIsAuthoritative: false, historicalIdentityDiscrepancy: 'UNRESOLVED' },
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
  failClosed: ['Candidate is not authoritative.', 'Visual approval is FAIL.', 'User map approval is PENDING.', 'Historical authoritative artifact identity is unresolved.', 'Independent audit PASS includes explicit source-bound adaptations; it is not a clean unadapted source audit.'],
};
writeFileSync(join(dir, 'v29-evidence-manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit, sourceSha256, generatorSha256, artifactSha256, referenceSha256, views: records.length, pngStatus: analysis.status, visualStatus: review.summary.status, present: count('present'), degraded: count('degraded'), absent: count('absent') }, null, 2));
