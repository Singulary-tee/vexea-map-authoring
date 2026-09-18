#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const artifactPath = process.argv[3] || '.context/ab/director-macro-cycle-4/v29/build-a/facility-built-v29.glb';
const reportPath = process.argv[4] || '.context/ab/director-macro-cycle-4/v29/build-a/director-macro-cycle-4-v29-report.json';
const outPath = process.argv[5] || '.context/ab/director-macro-cycle-4/v29/build-a/audit-v29.json';
const authoritativePath = process.argv[6] || 'editor/facility-built.glb';
const generatorPath = process.argv[7] || '.context/ab/director-macro-cycle-4/v29/gen-director-macro-cycle-4-v29.mjs';
const baseOut = `${outPath}.base`;
const baseAuditPath = fileURLToPath(new URL('../v28/audit-v28.mjs', import.meta.url));
const child = spawnSync(process.execPath, [baseAuditPath, sourcePath, artifactPath, reportPath, baseOut, authoritativePath, generatorPath], { encoding: 'utf8' });
process.stdout.write(child.stdout || '');
process.stderr.write(child.stderr || '');
const base = JSON.parse(fs.readFileSync(baseOut, 'utf8'));
fs.rmSync(baseOut, { force: true });
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const bytes = fs.readFileSync(artifactPath);
let offset = 12;
let document;
while (offset < bytes.length) {
  const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
  offset += 8;
  if (type === 0x4e4f534a) document = JSON.parse(bytes.toString('utf8', offset, offset + length));
  offset += length;
}
const candidate = report.directorMacroCycle4V29VisualRecovery;
const exported = document?.nodes?.[0]?.extras?.directorMacroCycle4V29VisualRecovery;
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const expectedStats = { vehicles: 4, palletStacks: 12, puddles: 18, drains: 8, objectiveScreens: 6, fencePosts: 8, bridgeFrames: 12, serviceSigns: 10 };
check('v29-export-match', JSON.stringify(candidate) === JSON.stringify(exported));
check('v29-schema', candidate?.schemaVersion === 1 && candidate?.strategy === 'operational-density-wet-response-and-readable-objective-v29' && candidate?.owner === 'director-macro-cycle-4-v29');
check('v29-stats', JSON.stringify(candidate?.stats) === JSON.stringify(expectedStats), JSON.stringify(candidate?.stats));
check('v29-feature-identities', candidate?.features?.length === 7 && new Set(candidate.features.map(feature => feature.id)).size === 7 && candidate.features.every(feature => feature.owner === feature.id));
check('v29-feature-trace-fields', candidate?.features?.every(feature => feature.type && feature.zone && feature.sourceRefs?.length >= 6 && feature.referenceIds?.includes('user-supplied-industrial-campus-board') && feature.contractIds?.includes('source-canonical') && feature.evidenceViews?.length >= 2));
check('v29-feature-status-fields', candidate?.features?.every(feature => feature.placementStatus === 'PASS' && feature.supportStatus === 'PASS' && feature.contactStatus === 'PASS' && feature.clearance?.pad === 'PASS'));
check('v29-centers-finite', candidate?.features?.every(feature => feature.center?.length === 2 && feature.center.every(Number.isFinite)));
check('v29-triangle-cap', report?.artifact?.identity?.indexedTriangles <= 881216, String(report?.artifact?.identity?.indexedTriangles));
const failed = [...base.checks, ...checks].filter(item => !item.pass);
const result = { ...base, schemaVersion: 1, status: failed.length ? 'FAIL_CLOSED' : 'PASS', summary: { checks: base.checks.length + checks.length, passed: base.checks.length + checks.length - failed.length, failed: failed.length }, checks: [...base.checks, ...checks] };
fs.mkdirSync(dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.details ? ` -> ${item.details}` : ''}`);
console.log(`DIRECTOR MACRO CYCLE 4 V29 AUDIT: ${result.summary.passed}/${result.summary.checks} checks passed; ${result.status}`);
if (child.status !== 0 || failed.length) process.exitCode = 1;
