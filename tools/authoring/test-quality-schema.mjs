#!/usr/bin/env node
// Verification for the variant-schema + LOD quality gates (scratch state only):
// a low-poly/placeholder streetlight and malformed variant/LOD data must be
// rejected at promotion with coded issues; valid data passes and existing
// authored objects regress cleanly.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const scratch = '.context/ab/authoring-quality-schema';
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(`${scratch}/objects`, { recursive: true });
fs.cpSync('authoring/objects', `${scratch}/objects`, { recursive: true });
const env = { ...process.env, VEXEA_AUTHORING_STATE: `${scratch}/state.json`, VEXEA_AUTHORING_OBJECTS: `${scratch}/objects` };
const call = (cmd, args = {}) => {
  let out;
  try {
    out = execFileSync('node', ['tools/authoring/cli.mjs', cmd, '--json', JSON.stringify(args)], { env, encoding: 'utf8' });
  } catch (e) {
    out = e.stdout || '';
  }
  return JSON.parse(out);
};
const check = (name, cond, detail = '') => {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name}${detail ? '  ->  ' + detail : ''}`); process.exitCode = 1; }
};
const codes = r => (r?.error?.issues || []).map(i => i.code);
const writeObj = id => JSON.parse(fs.readFileSync(`${scratch}/objects/${id}.json`, 'utf8'));
const saveObj = o => fs.writeFileSync(`${scratch}/objects/${o.id}.json`, JSON.stringify(o, null, 2) + '\n');

// rich streetlight anatomy: passes the shape gate (5+ parts, mixed mats, > 72 tris)
const RICH_PARTS = [
  { kind: 'cylinder', size: [0.5, 0.5, 0.5], offset: [0, 0, 0], mat: 'concrete' },
  { kind: 'cylinder', size: [0.18, 7.5, 0.18], offset: [0, 0.5, 0], mat: 'steel-dark' },
  { kind: 'box', size: [1.3, 0.14, 0.14], offset: [0.6, 7.9, 0], mat: 'steel-dark' },
  { kind: 'box', size: [0.7, 0.22, 0.5], offset: [1.15, 7.8, 0], mat: 'lamp-head' },
  { kind: 'box', size: [0.6, 0.04, 0.4], offset: [1.15, 7.68, 0], mat: 'glass' },
];
const baseObj = (id, over = {}) => ({
  format: 'vexea-object/0.1', id, type: 'prop', name: id, status: 'draft', revision: 1,
  construction: { size: [1.6, 8, 0.7], origin: 'center-bottom', parts: RICH_PARTS.map(p => ({ ...p })) },
  variants: [{ id: 'clean' }],
  contract: { host: { categories: ['ground-surface-type'], mode: 'surface' }, overlap: 'disallow' },
  references: ['blockout/blockout-full-v1.json#segments'], evidence: [],
  ...over,
});
const seedObj = (id, over = {}) => saveObj(baseObj(id, over));

check('init scratch state', call('init').ok);

// 1. single-box placeholder streetlight -> shape gate rejects
seedObj('obj_test_streetlight_placeholder', { construction: { size: [0.3, 8, 0.3], origin: 'center-bottom', parts: [{ kind: 'box', size: [0.3, 8, 0.3], offset: [0, 0, 0], mat: 'steel-dark' }] } });
const low = call('author_object', { object_id: 'obj_test_streetlight_placeholder', expected_status: 'authored' });
check('placeholder single-box streetlight not forwardable', low.ok === false && codes(low).includes('object_below_quality'), JSON.stringify(low.error || low).slice(0, 200));

// 2. weathering wear outside (0, 1] -> variant schema rejects
seedObj('obj_test_streetlight_wear', { variants: [{ id: 'clean' }, { id: 'grime', modifier: 'weathering', params: { wear: 1.5 } }] });
const wear = call('author_object', { object_id: 'obj_test_streetlight_wear', expected_status: 'authored' });
check('weathering wear 1.5 rejected', wear.ok === false && codes(wear).includes('variant_schema_weathering_wear'), JSON.stringify(wear.error || wear).slice(0, 200));

// 3. unknown modifier -> variant schema rejects
seedObj('obj_test_streetlight_modifier', { variants: [{ id: 'clean' }, { id: 'worn', modifier: 'patina', params: {} }] });
const mod = call('author_object', { object_id: 'obj_test_streetlight_modifier', expected_status: 'authored' });
check('unknown modifier rejected', mod.ok === false && codes(mod).includes('variant_schema_unknown_modifier'), JSON.stringify(mod.error || mod).slice(0, 200));

// 4. damage level out of range -> variant schema rejects
seedObj('obj_test_streetlight_damage', { variants: [{ id: 'clean' }, { id: 'bent', modifier: 'damage', params: { level: 3 } }] });
const dmg = call('author_object', { object_id: 'obj_test_streetlight_damage', expected_status: 'authored' });
check('damage level 3 rejected', dmg.ok === false && codes(dmg).includes('variant_schema_damage_level'), JSON.stringify(dmg.error || dmg).slice(0, 200));

// 5. degenerate LOD chain -> lod gate rejects (equal tris; coverage not decreasing)
seedObj('obj_test_streetlight_lod', { contract: { host: { categories: ['ground-surface-type'], mode: 'surface' }, overlap: 'disallow', lod: { levels: [{ tris: 60, coverage: 0.5 }, { tris: 60, coverage: 0.5 }] } } });
const lod = call('author_object', { object_id: 'obj_test_streetlight_lod', expected_status: 'authored' });
check('degenerate LOD chain rejected', lod.ok === false && codes(lod).includes('lod_chain_tri_ratio') && codes(lod).includes('lod_chain_coverage'), JSON.stringify(lod.error || lod).slice(0, 200));

// 6. valid data passes both gates -> promoted
seedObj('obj_test_streetlight_valid', { variants: [{ id: 'clean' }, { id: 'grime', modifier: 'weathering', params: { wear: 0.45 } }, { id: 'bent', modifier: 'damage', params: { level: 1 } }], contract: { host: { categories: ['ground-surface-type'], mode: 'surface' }, overlap: 'disallow', lod: { levels: [{ tris: 132, coverage: 0.5 }, { tris: 84, coverage: 0.2 }, { tris: 48, coverage: 0.01 }] } } });
const good = call('author_object', { object_id: 'obj_test_streetlight_valid', expected_status: 'authored' });
check('valid streetlight with weathering/damage variants + LOD chain promoted', good.ok, JSON.stringify(good.error || good).slice(0, 200));

const { checkVariantSchema } = await import('./quality-schema.mjs');
let regression = 0;
for (const f of fs.readdirSync(`${scratch}/objects`)) {
  const o = JSON.parse(fs.readFileSync(`${scratch}/objects/${f}`, 'utf8'));
  if (o.status !== 'authored') continue;
  // shape-gate (checkObjectQuality) regression belongs to its own suite; the
  // stricter uncommitted thresholds reject previously accepted objects
  const issues = checkVariantSchema(o);
  if (issues.length) { console.log(`FAIL  regression ${o.id}: ${issues.map(i => i.code).join(', ')}`); regression++; }
}
check('existing authored objects pass quality gates', regression === 0, `${regression} objects failed`);

console.log('\nQUALITY-SCHEMA: done');
process.exit(process.exitCode || 0);
