#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourcePath = 'blockout/blockout-full-v1.json';
const generatorPath = '.context/ab/director-macro-cycle-4/v25/gen-director-macro-cycle-4-v25.mjs';
const artifactPath = '.context/ab/director-macro-cycle-4/v25/build-f/facility-built-director-macro-cycle-4-v25.glb';
const boardPath = '.hoplite/attachments/art_upload_cc637941124a451fb2d465383074988c/file_000000006cc881f4b3d7a548874225ce.png';
const refs = {
  frontage: { id: 'industrial-frontage', path: 'references/inspiration/17e96510-a0e6-11f1-bf60-039a9cb896aa.webp' },
  process: { id: 'processing-yard', path: 'references/inspiration/Screenshot_20260825_013725_Chrome.png' },
  corridor: { id: 'below-grade-corridor', path: 'references/inspiration/Screenshot_20260825_013737_Chrome.png' },
  board: { id: 'user-industrial-campus-board', attachmentPath: boardPath, sha256: sha256(boardPath) },
};
const captures = {
  top: 'global/canonical-top.png', orbit: 'global/canonical-orbit.png', xray: 'global/canonical-xray.png',
  'zone-spawn': 'zones-a/canonical-zone-spawn.png', 'zone-courtyard': 'zones-a/canonical-zone-courtyard.png',
  'zone-warehouse': 'zones-a/canonical-zone-warehouse.png', 'zone-plant': 'zones-a/canonical-zone-plant.png',
  'zone-bridge': 'zones-b/canonical-zone-bridge.png', 'zone-tunnels': 'zones-b/canonical-zone-tunnels.png',
  'zone-core': 'zones-b/canonical-zone-core.png', 'zone-boundary': 'zones-b/canonical-zone-boundary.png',
  'route-main-surface': 'routes-a/canonical-route-main-surface.png', 'route-covered': 'routes-a/canonical-route-covered.png',
  'route-rear-alley': 'routes-a/canonical-route-rear-alley.png', 'route-north-ring': 'routes-b/canonical-route-north-ring.png',
  'route-south-retreat': 'routes-b/canonical-route-south-retreat.png', 'route-flank-backdoor': 'routes-b/canonical-route-flank-backdoor.png',
  'objective-core': 'requirements/canonical-objective-core.png', 'cover-courtyard': 'requirements/canonical-cover-courtyard.png',
  'tunnel-portal': 'requirements/canonical-tunnel-portal.png', 'vertical-connector': 'requirements/canonical-vertical-connector.png',
};
const family = id => id.startsWith('zone-') ? 'zones' : id.startsWith('route-') ? 'routes' : ['top', 'orbit', 'xray'].includes(id) ? 'global' : 'requirements';
const references = {
  top: ['board', 'process'], orbit: ['board', 'frontage', 'process'], xray: ['board', 'corridor'],
  'zone-spawn': ['frontage', 'board'], 'zone-courtyard': ['process', 'board'], 'zone-warehouse': ['frontage', 'board'], 'zone-plant': ['process', 'board'],
  'zone-bridge': ['process', 'board'], 'zone-tunnels': ['corridor', 'board'], 'zone-core': ['frontage', 'board'], 'zone-boundary': ['frontage', 'board'],
  'route-main-surface': ['frontage', 'board'], 'route-covered': ['process', 'board'], 'route-rear-alley': ['frontage', 'board'],
  'route-north-ring': ['process', 'board'], 'route-south-retreat': ['frontage', 'board'], 'route-flank-backdoor': ['frontage', 'board'],
  'objective-core': ['frontage', 'process', 'board'], 'cover-courtyard': ['process', 'board'], 'tunnel-portal': ['corridor', 'board'], 'vertical-connector': ['process', 'board'],
};
const properties = {
  top: [['connected industrial families', 'degraded', 'central clusters connect; perimeter remains empty'], ['campus density and layered silhouettes', 'degraded', 'outboard hierarchy is weak'], ['wet marked streets and operational yards', 'absent', 'campus-wide wet staging is not readable']],
  orbit: [['connected industrial families', 'degraded', 'compounds exist over broad low-information slabs'], ['process masses and layered elevations', 'degraded', 'center layers are stronger than perimeter silhouettes'], ['vehicles, vegetation, and service clutter', 'absent', 'distributed reference density is missing']],
  xray: [['macro hierarchy', 'degraded', 'connected footprints do not add surface density'], ['below-grade route coverage', 'present', 'tunnel and internal routes are legible'], ['terrain and perimeter context', 'absent', 'reference context is not represented']],
  'zone-spawn': [['corrugated frontage and windows', 'present', 'constructed facade family reads'], ['wet asphalt and drains', 'absent', 'apron reads dry'], ['vehicles, vegetation, and arrival clutter', 'absent', 'arrival activity is missing']],
  'zone-courtyard': [['pipe frames, handrails, and catwalks', 'present', 'dense process frontage reads'], ['stairs and service access', 'present', 'raised access is visible'], ['wet marked operational apron', 'degraded', 'markings exist; wet response and staging are weak']],
  'zone-warehouse': [['corrugated warehouse mass', 'present', 'large volume reads'], ['loading doors and active yard', 'degraded', 'yard edge exists; activity is not dominant'], ['vehicles, pallets, bins, and vegetation', 'absent', 'service clutter is missing']],
  'zone-plant': [['process mass and elevated services', 'present', 'plant facade, pipes, stairs read'], ['tanks and vessel specificity', 'degraded', 'props are not consistently readable'], ['wet yard, clutter, and terrain silhouettes', 'absent', 'reference context is missing']],
  'zone-bridge': [['bridge and elevated pipe silhouette', 'absent', 'close wall dominates capture'], ['layered service access', 'degraded', 'partial pipe strip only'], ['operational yard context', 'absent', 'yard and staging are not visible']],
  'zone-tunnels': [['concrete enclosure and arched transitions', 'present', 'tunnel geometry reads'], ['bracketed pipes and practical lighting', 'present', 'pipes and repeated lights read'], ['sloped wet floor, gates, and grime', 'degraded', 'floor reads; wet/gate detail is weak']],
  'zone-core': [['substantial connected core mass', 'present', 'large envelope reads'], ['windows, control room, and objective identity', 'absent', 'blank wall dominates'], ['practical lights, signs, and service clutter', 'degraded', 'small lights exist; detail is not legible']],
  'zone-boundary': [['perimeter service road', 'present', 'continuous route and sheltering mass read'], ['chain-link, gates, and vegetation', 'absent', 'boundary treatment is not legible'], ['wet marked service access', 'degraded', 'line exists; wet response is weak']],
  'route-main-surface': [['lane markings and service road', 'present', 'continuous marked road reads'], ['wet asphalt, drains, and puddles', 'absent', 'surface reads dry'], ['vehicles and active service access', 'absent', 'traffic and staging are missing']],
  'route-covered': [['covered route and utility relationship', 'present', 'cover and utility edge read'], ['practical lights and handrails', 'degraded', 'some detail exists; density is low'], ['wet loading/service clutter', 'absent', 'loading activity is missing']],
  'route-rear-alley': [['service alley and corrugated edge', 'present', 'constructed alley reads'], ['stairs, cabinets, and maintenance clutter', 'degraded', 'few service elements appear'], ['wet grime and controlled vegetation', 'absent', 'edge transition is missing']],
  'route-north-ring': [['marked route and industrial edge', 'present', 'ring transition reads'], ['layered process silhouettes', 'degraded', 'pipes exist; utility layers are sparse'], ['active yard and service staging', 'absent', 'loading and clutter are missing']],
  'route-south-retreat': [['connected route and building families', 'present', 'industrial framing reads'], ['wet marked apron and drains', 'degraded', 'linework exists; surface response is weak'], ['perimeter vegetation and terrain', 'absent', 'context is not visible']],
  'route-flank-backdoor': [['backdoor facade and service access', 'present', 'close service edge reads'], ['signs, cabinets, and stairs', 'degraded', 'small detail is limited'], ['wet grime and maintenance activity', 'absent', 'activity is missing']],
  'objective-core': [['substantial objective building', 'present', 'large envelope is visible'], ['control room, glazing, and objective identity', 'absent', 'capture is blank corrugated wall'], ['practical interior light and equipment', 'absent', 'no consoles, signs, or equipment']],
  'cover-courtyard': [['cover structures and layered yard edges', 'degraded', 'rails exist; open apron dominates'], ['marked wet service surface', 'degraded', 'line exists; surface is dry'], ['staged cover props, vehicles, and clutter', 'absent', 'operational staging is missing']],
  'tunnel-portal': [['concrete portal and arched transition', 'present', 'portal geometry reads'], ['pipes, gates, and practical lighting', 'degraded', 'pipes/lights read; gate detail is limited'], ['wet grime and terrain transition', 'absent', 'portal context is dry and sparse']],
  'vertical-connector': [['stairs, catwalks, and handrails', 'absent', 'facade and pipes dominate; connector is not visible'], ['layered elevation and service access', 'degraded', 'raised edge exists without complete connector'], ['practical lights and operational clutter', 'degraded', 'one light; no surrounding staging']],
};
const viewRecords = Object.entries(properties).map(([id, rows]) => ({
  id, family: family(id), capturePath: `.context/ab/director-macro-cycle-4/v25/validation/survey/${captures[id]}`,
  governingReferences: references[id].map(key => refs[key]),
  properties: rows.map(([property, status, observation]) => ({ property, status, observation })),
  status: rows.some(([, status]) => status !== 'present') ? 'FAIL' : 'PASS',
}));
const allProperties = viewRecords.flatMap(view => view.properties);
const count = status => allProperties.filter(property => property.status === status).length;
const output = '.context/ab/director-macro-cycle-4/v25/validation/survey/v25-reference-anchored-visual-review.json';
const review = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  artifact: { path: artifactPath, sha256: sha256(artifactPath), sourceSha256: sha256(sourcePath), generatorSha256: sha256(generatorPath) },
  method: 'Fresh artifact-bound 1400x900 SwiftShader readPixels captures reviewed against governing reference properties; build PASS fields were not used as visual evidence.',
  referenceRegister: Object.values(refs),
  summary: {
    status: 'FAIL', checkedViews: viewRecords.length, failingViews: viewRecords.filter(view => view.status === 'FAIL').length,
    propertiesChecked: allProperties.length, present: count('present'), degraded: count('degraded'), absent: count('absent'),
    requiredViewsChecked: 4, requiredViewsFailing: viewRecords.filter(view => ['objective-core', 'cover-courtyard', 'tunnel-portal', 'vertical-connector'].includes(view.id) && view.status === 'FAIL').length,
    zonesChecked: 8, zonesFailing: viewRecords.filter(view => view.family === 'zones' && view.status === 'FAIL').length,
    routesChecked: 6, routesFailing: viewRecords.filter(view => view.family === 'routes' && view.status === 'FAIL').length,
  },
  highestLevelRemainingFailure: 'Campus still reads as a constructed blockout with localized industrial detail, not a consistently operational industrial campus at reference density.',
  failureClasses: { macroTerrain: 'FAIL', density: 'FAIL', industrialMassing: 'DEGRADED', assetFamilies: 'FAIL', materials: 'DEGRADED', lighting: 'DEGRADED', operationalYards: 'FAIL', requiredViews: 'FAIL' },
  evidenceGaps: ['No visual approval.', 'No explicit user map approval.', 'Historical authoritative artifact identity discrepancy remains unresolved.', 'Reference board is attached by SHA and local attachment path; it is not copied into repository evidence.'],
  views: viewRecords,
  decision: { visualApproval: 'FAIL', userApproval: 'PENDING', promotion: 'BLOCKED', performanceWork: 'DEFERRED' },
};
writeFileSync(output, JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({ output, ...review.summary, decision: review.decision }, null, 2));
