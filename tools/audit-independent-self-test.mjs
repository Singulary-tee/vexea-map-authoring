#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const auditPath = fileURLToPath(new URL('./audit-independent.mjs', import.meta.url));
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'independent-audit-fixture-'));
const run = (input, output, adaptation = '') => spawnSync(process.execPath, [auditPath, input, output, adaptation], { encoding: 'utf8' });
try {
  const fixture = structuredClone(source);
  const footprints = fixture.segments.filter(segment => ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower', 'wall-blocking', 'bridge'].includes(segment.category));
  const first = footprints[0];
  const second = footprints[1];
  second.bounds = [first.bounds[0] + 1, first.bounds[1] + 1, first.bounds[2] - 1, first.bounds[3] - 1];
  const fixturePath = path.join(tempDir, 'overlap.json');
  const fixtureOutput = path.join(tempDir, 'overlap-audit.json');
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));
  const overlapRun = run(fixturePath, fixtureOutput);
  const overlapResult = JSON.parse(fs.readFileSync(fixtureOutput, 'utf8'));
  if (overlapRun.status === 0 || overlapResult.status !== 'FAIL_CLOSED' || overlapResult.overlaps.length === 0) {
    throw new Error('forced overlap fixture did not fail closed');
  }

  const adaptedPath = process.argv[3];
  if (adaptedPath) {
    const adaptedOutput = path.join(tempDir, 'adapted-audit.json');
    const adaptedRun = run(sourcePath, adaptedOutput, adaptedPath);
    const adaptedResult = JSON.parse(fs.readFileSync(adaptedOutput, 'utf8'));
    if (adaptedRun.status !== 0 || adaptedResult.status !== 'PASS' || adaptedResult.summary.adaptedRouteBuildingIntersectionCount !== 8) {
      throw new Error('explicit adaptation fixture did not pass with eight numeric adaptations');
    }
  }
  console.log('INDEPENDENT AUDIT SELF-TEST: PASS');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
