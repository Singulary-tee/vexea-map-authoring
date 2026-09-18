#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v31/build-a/facility-built-v31.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v31/build-a/director-macro-cycle-4-v31-report.json';
const outPath = process.argv[5] || '.context/ab/director-macro-cycle-4/v31/build-a/audit-v31.json';
const authoritativePath = process.argv[6] || 'editor/facility-built.glb';
const generatorPath = process.argv[7] || '.context/ab/director-macro-cycle-4/v31/gen-director-macro-cycle-4-v31.mjs';
const baseOut = `${outPath}.base`;
const baseAuditPath = fileURLToPath(new URL('../v30/audit-v30.mjs', import.meta.url));
const child = spawnSync(process.execPath, [baseAuditPath, sourcePath, artifactPath, reportPath, baseOut, authoritativePath, generatorPath], { encoding: 'utf8' });
process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
const base = JSON.parse(fs.readFileSync(baseOut, 'utf8')); fs.rmSync(baseOut, { force: true });
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const artifact = fs.readFileSync(artifactPath);
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const generatorHash = createHash('sha256').update(fs.readFileSync(generatorPath)).digest('hex');
const artifactHash = createHash('sha256').update(artifact).digest('hex');
let offset = 12, document;
while (offset < artifact.length) {
  const length = artifact.readUInt32LE(offset), type = artifact.readUInt32LE(offset + 4); offset += 8;
  if (type === 0x4e4f534a) document = JSON.parse(artifact.toString('utf8', offset, offset + length));
  offset += length;
}
const accessors = document?.accessors || [];
const identity = {
  materials: document?.materials?.length || 0,
  meshes: document?.meshes?.length || 0,
  nodes: document?.nodes?.length || 0,
  images: document?.images?.length || 0,
  primitives: document?.meshes?.flatMap(mesh => mesh.primitives || []).length || 0,
  indexedTriangles: (document?.meshes || []).flatMap(mesh => mesh.primitives || []).reduce((sum, primitive) => {
    const accessor = primitive.indices === undefined ? accessors[primitive.attributes.POSITION] : accessors[primitive.indices];
    return sum + (accessor?.count || 0) / 3;
  }, 0),
};
const candidate = report.directorMacroCycle4V31VisualRecovery;
const exported = document?.nodes?.[0]?.extras?.directorMacroCycle4V31VisualRecovery;
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const expectedStats = { secondaryBuildings: 10, yardContainers: 18, palletStacks: 32, serviceVehicles: 12, perimeterTrees: 24, processTowers: 8, wetPatches: 32, catwalkFrames: 18 };
check('v31-export-match', JSON.stringify(candidate) === JSON.stringify(exported));
check('v31-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'campus-scale-streetwall-yard-density-and-layered-silhouettes-v31' && candidate?.owner === 'director-macro-cycle-4-v31');
check('v31-stats', JSON.stringify(candidate?.stats) === JSON.stringify(expectedStats), JSON.stringify(candidate?.stats));
check('v31-feature-identities', candidate?.features?.length === 6 && new Set(candidate.features.map(feature => feature.id)).size === 6 && candidate.features.every(feature => feature.owner === feature.id));
check('v31-feature-trace-fields', candidate?.features?.every(feature => feature.type && feature.zone && feature.sourceRefs?.length >= 3 && feature.referenceIds?.includes('user-supplied-industrial-campus-board') && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 2));
check('v31-feature-status-fields', candidate?.features?.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS' && feature.clearance?.pad === 'PASS'));
check('v31-centers-finite', candidate?.features?.every(feature => feature.center?.length === 2 && feature.center.every(Number.isFinite)));
check('v31-source-contract-counts', source.zones?.length === 8 && source.routes?.length === 14 && source.segments?.length === 93 && source.segments.filter(segment => segment.category === 'cover').length === 22);
check('v31-generator-binding', report.generatorPath === generatorPath && report.generatorSha256 === generatorHash, `${report.generatorPath || 'missing'} / ${report.generatorSha256 || 'missing'}`);
check('v31-artifact-binding', report.artifact?.path === artifactPath && report.artifact?.sha256 === artifactHash && report.artifact?.bytes === artifact.length);
check('v31-artifact-identity', JSON.stringify(report.artifact?.identity) === JSON.stringify(identity), JSON.stringify(identity));
check('v31-triangle-cap', identity.indexedTriangles <= 881216, `${identity.indexedTriangles} <= 881216`);
check('v31-authoritative-immutability', report.authoritativeArtifact?.unchanged === true && report.v31Integrity?.authoritativeUnchanged === true && report.authoritativeArtifact?.after?.sha256 === report.authoritativeArtifact?.sha256);
const failed = [...base.checks, ...checks].filter(item => !item.pass);
const result = { ...base, schemaVersion: 1, status: failed.length ? 'FAIL_CLOSED' : 'PASS', summary: { checks: base.checks.length + checks.length, passed: base.checks.length + checks.length - failed.length, failed: failed.length }, checks: [...base.checks, ...checks] };
fs.mkdirSync(dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`DIRECTOR MACRO CYCLE 4 V31 AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed; ${result.status}`);
if (child.status !== 0 || failed.length) process.exitCode = 1;
