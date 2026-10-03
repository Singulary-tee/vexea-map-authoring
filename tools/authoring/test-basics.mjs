#!/usr/bin/env node
// Happy-path verification for the authoring substrate (scratch state only).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const scratch = '.context/ab/authoring-basics';
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(`${scratch}/objects`, { recursive: true });
fs.cpSync('authoring/objects', `${scratch}/objects`, { recursive: true });
for (const f of ['authoring/walls.json', 'authoring/facade-features.json']) {
  if (fs.existsSync(f)) fs.copyFileSync(f, `${scratch}/${f.split('/')[1]}`);
}
const scratchRegPath = `${scratch}/walls.json`;
if (fs.existsSync(scratchRegPath)) {
  const r0 = JSON.parse(fs.readFileSync(scratchRegPath, 'utf8'));
  r0.openings = [];
  fs.writeFileSync(scratchRegPath, JSON.stringify(r0, null, 2));
}
const env = { ...process.env, VEXEA_AUTHORING_STATE: `${scratch}/state.json`, VEXEA_AUTHORING_OBJECTS: `${scratch}/objects`, VEXEA_AUTHORING_WALLS: `${scratch}/walls.json`, VEXEA_AUTHORING_FEATURES: `${scratch}/facade-features.json` };
let rev = null, pass = 0, fail = 0;
const call = (cmd, args = {}) => {
  const payload = args.expected_revision === undefined && rev !== null && ['integrate_object', 'move_object', 'rotate_object', 'resize_object', 'place_relative', 'install_opening', 'move_opening', 'undo', 'restore'].includes(cmd) ? { ...args, expected_revision: rev } : args;
  let out;
  try {
    out = execFileSync('node', ['tools/authoring/cli.mjs', cmd, '--json', JSON.stringify(payload)], { env, encoding: 'utf8' });
  } catch (e) {
    out = e.stdout || '';
  }
  const res = JSON.parse(out);
  if (res.ok && typeof res.revision === 'number') rev = res.revision;
  return res;
};
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? '  ->  ' + detail : ''}`); }
};

check('init', call('init').ok);
const win = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: 'wall-bld-maintenance-n', t: 0.3, sill: 4 });
check('window installs as opening in wall record', win.ok && Boolean(win.instance.openingId), JSON.stringify(win.error || win.summary || {}).slice(0, 200));
const opId = win.instance?.id;
const pod = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-176, 0, 124] });
check('integrate pod on ground host', pod.ok && pod.instance.host.category === 'ground-surface-type', JSON.stringify(pod.error || pod.instance || {}).slice(0, 200));
const winId = pod.instance?.id;

const moved = call('move_object', { instance_id: winId, pos: [-170, 0, 124] });
check('move with before/after echo', moved.ok && moved.after.pos[0] === -170, JSON.stringify(moved.error || {}).slice(0, 200));

const rel = call('place_relative', { instance_id: winId, target_segment: 'g-yrd-rear', relation: 'center-on', offset: [4, 0, 0] });
check('place_relative computes deterministically', rel.ok && rel.computed && rel.computed.why.includes('center of target'), JSON.stringify(rel.computed || rel.error || {}).slice(0, 200));

const region = call('inspect_region', { bounds: [-250, 0, -100, 200], limit: 50 });
check('bounded region query finds instances', region.ok && region.items.filter(i => i.kind === 'instance').length >= 1 && region.items.some(i => i.kind === 'instance' && i.id === opId), JSON.stringify(region).slice(0, 160));

const rels = call('relationships', { instance_id: winId });
check('relationships expose host + touching segments', rels.ok && rels.host && rels.touching_segments.length >= 1);

const diff = call('diff_since', { revision: 0 });
check('diff_since returns changed ops', diff.ok && diff.changed.length >= 3, JSON.stringify(diff.changed || []).slice(0, 160));

const cp = call('checkpoint', { name: 'before-cleanup' });
check('checkpoint saved', cp.ok);
const rm = call('undo', {});
check('undo removes last mutation', rm.ok);
const rs = call('restore', { name: 'before-cleanup' });
check('restore checkpoint', rs.ok);

const val = call('validate_world');
check('world valid after full flow', val.ok && val.issues.length === 0, JSON.stringify(val.issues || []).slice(0, 200));

console.log(`\nBASICS: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
