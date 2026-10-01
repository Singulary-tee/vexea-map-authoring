#!/usr/bin/env node
// Negative-space verification: every failure class in the assignment brief
// (§16) is deliberately attempted; the substrate must reject or detect it.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const scratch = '.context/ab/authoring-failure-suite';
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(`${scratch}/objects`, { recursive: true });
fs.cpSync('authoring/objects', `${scratch}/objects`, { recursive: true });

const env = {
  ...process.env,
  VEXEA_AUTHORING_STATE: `${scratch}/state.json`,
  VEXEA_AUTHORING_OBJECTS: `${scratch}/objects`,
};
let rev = null, pass = 0, fail = 0;
const call = (cmd, args = {}) => {
  const payload = args.expected_revision === undefined && rev !== null ? { ...args, expected_revision: rev } : args;
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
const code = r => r?.error?.code;
const issueCodes = r => (r?.issues || r?.error?.issues || []).map(i => i.code);

// seed: fresh state + one authored window integrated flush on the shed's south wall
call('init');
const win = call('integrate_object', { object_id: 'obj_window_industrial_window_centered_large', pos: [-176, 4, 59.08], rotY: 0 });
check('seed: window integrates flush on host', win.ok, JSON.stringify(win.error || '').slice(0, 160));
const winId = win.instance.id;

// 1. a window exists without a valid host -> integration rejected
const open = call('integrate_object', { object_id: 'obj_window_industrial_window_centered_large', pos: [60, 4, 59.08], rotY: 0 });
check('window without host rejected', code(open) === 'contract_violation' && issueCodes(open).includes('host_missing'), JSON.stringify(open.error || {}).slice(0, 160));

// 2. a window partially intersects a wall (offset so it spans past the host corner)
const corner = call('integrate_object', { object_id: 'obj_window_industrial_window_centered_large', pos: [-142, 4, 59.08], rotY: 0 });
check('window breaking host bounds rejected', code(corner) === 'contract_violation' && issueCodes(corner).includes('object_breaks_host'), JSON.stringify(open.error || {}).slice(0, 160));

// 3. a door floats away from its building -> move off-host rolls back
const floated = call('move_object', { instance_id: winId, pos: [40, 4, 40] });
check('door moved off building rolled back', code(floated) === 'contract_violation' && floated.rolledBack === true, JSON.stringify(floated.error || {}).slice(0, 160));

// 3b. orientation flipped (PoseEditor class) -> orientation_mismatch
// unit-level: a square wall object at 90 deg on a z-edge is flush + contained but mis-oriented
const { checkInstance } = await import('./lib.mjs');
const segsAll = JSON.parse(fs.readFileSync('blockout/blockout-full-v1.json', 'utf8')).segments;
const squareObj = { id: 'obj_unit_square', type: 'panel', construction: { size: [1, 1, 1] }, contract: { host: { categories: ['facade-non-enterable'], mode: 'attach-edge' }, flushTolerance: 0.35 } };
const sq = checkInstance(null, segsAll, { id: 'unit-sq', objectId: 'obj_unit_square', pos: [-176, 4, 59], rotY: 90 }, squareObj);
check('mis-oriented wall object detected', sq.issues.some(i => i.code === 'orientation_mismatch'), JSON.stringify(sq.issues).slice(0, 200));
const aligned = checkInstance(null, segsAll, { id: 'unit-sq2', objectId: 'obj_unit_square', pos: [-176, 4, 59], rotY: 0 }, squareObj);
check('aligned wall object has no orientation issue', !aligned.issues.some(i => i.code === 'orientation_mismatch'), JSON.stringify(aligned.issues).slice(0, 200));

// 4. a pipe terminates without a valid host/socket
const pipe = call('integrate_object', { object_id: 'obj_pipe_process_pipe_run', pos: [-176, 4, 100], rotY: 90 });
check('pipe end without socket rejected', code(pipe) === 'contract_violation' && issueCodes(pipe).includes('pipe_end_unhosted'), JSON.stringify(pipe.error || {}).slice(0, 200));

// 5. a prop occupies impossible geometry (inside the north mountain band)
const mountain = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-300, 2, -300], rotY: 0 });
check('prop inside mountain rejected', code(mountain) === 'contract_violation' && (issueCodes(mountain).includes('prop_invalid_placement') || issueCodes(mountain).includes('host_missing')), JSON.stringify(mountain.error || {}).slice(0, 200));

// 5b. prop below terrain
const below = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-176, -40, 124], rotY: 0 });
check('prop below terrain rejected', code(below) === 'contract_violation' && issueCodes(below).includes('prop_invalid_placement'), JSON.stringify(below.error || {}).slice(0, 200));

// 6. an object silently uses stale world state
const stale = call('move_object', { instance_id: winId, pos: [-169, 4, 59.08], expected_revision: 0 });
check('stale revision mutation rejected', code(stale) === 'version_conflict', code(stale));

// 7. an edit succeeds per the LLM but not per geometry: 1mm move is snapped/absorbed, not lied about
const realMove = call('move_object', { instance_id: winId, pos: [-169, 4, 59.08] });
check('seed: real move to -169 succeeds', realMove.ok, code(realMove));
const mm = call('move_object', { instance_id: winId, pos: [-169.001, 4, 59.08] });
check('1mm PoseEditor-class move reported as no_effect', code(mm) === 'no_effect', code(mm));

// 8. a mutation destroys unrelated objects -> overlap with a second instance is caught
const pod = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-176, 0, 124] });
check('seed: pod integrates on ground', pod.ok, JSON.stringify(pod.error || {}).slice(0, 160));
const pod2 = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-174.5, 0, 124] });
check('overlapping prop rejected', code(pod2) === 'contract_violation' && issueCodes(pod2).includes('instance_overlap'), JSON.stringify(pod2.error || {}).slice(0, 200));

// 9. an object bypasses its authoring pipeline
fs.writeFileSync(`${scratch}/objects/obj_window_sneaky.json`, JSON.stringify({ ...JSON.parse(fs.readFileSync(`${scratch}/objects/obj_window_industrial_window_centered_large.json`, 'utf8')), id: 'obj_window_sneaky', status: 'draft', construction: { size: [2.4, 1.8, 0.16], origin: 'center-bottom', parts: [] } }));
const sneaky = call('integrate_object', { object_id: 'obj_window_sneaky', pos: [-166, 4, 59.08] });
check('draft object cannot integrate', code(sneaky) === 'object_not_authored', code(sneaky));

// 10. an unfinished primitive is promoted as a finished authored asset
const bad = call('author_object', { object_id: 'obj_window_sneaky', expected_status: 'authored' });
check('empty construction cannot be authored', code(bad) === 'object_not_authorable', code(bad));

// 11. a visually inspected object differs from the object actually integrated
// (object content changes after integration -> instance flagged stale)
const podObj = JSON.parse(fs.readFileSync(`${scratch}/objects/obj_prop_service_pod.json`, 'utf8'));
podObj.construction.size = [3, 2.6, 2.5];
podObj.revision += 1;
fs.writeFileSync(`${scratch}/objects/obj_prop_service_pod.json`, JSON.stringify(podObj, null, 2));
const v = call('validate_world');
check('object edited after integration flagged stale', issueCodes(v).includes('instance_stale_object'), JSON.stringify(v.issues || []).slice(0, 200));

// 11b. rebind: object grew so large it no longer fits -> rebind rejected; unrelated instance rebinds fine
podObj.construction.size = [400, 200, 300];
fs.writeFileSync(`${scratch}/objects/obj_prop_service_pod.json`, JSON.stringify(podObj, null, 2));
const rbBad = call('rebind_instance', { instance_id: pod.instance.id });
check('rebind rejected when updated object no longer fits', code(rbBad) === 'contract_violation', JSON.stringify(rbBad.error || {}).slice(0, 160));
podObj.construction.size = [3, 2.6, 2.5];
podObj.revision += 1;
fs.writeFileSync(`${scratch}/objects/obj_prop_service_pod.json`, JSON.stringify(podObj, null, 2));
const rbOk = call('rebind_instance', { instance_id: pod.instance.id });
check('rebind accepted when updated object fits', rbOk.ok === true, JSON.stringify(rbOk.error || {}).slice(0, 160));
const rbIdem = call('rebind_instance', { instance_id: pod.instance.id });
check('rebind idempotent when already bound', rbIdem.ok === true && /already bound/.test(rbIdem.summary || ''), JSON.stringify(rbIdem).slice(0, 160));

// 12. a repair loop repeatedly applies the same ineffective mutation
call('checkpoint', { name: 'suite' });
const loop1 = call('move_object', { instance_id: winId, pos: [-169, 4, 59.08] });
const loop2 = call('move_object', { instance_id: winId, pos: [-169, 4, 59.08] });
check('repair loop no-effect detected (1st)', code(loop1) === 'no_effect', code(loop1));
check('repair loop no-effect detected (2nd)', code(loop2) === 'no_effect' && loop2.error.prior_no_effect_ops >= 1, JSON.stringify(loop2.error || {}).slice(0, 160));

// 13. idempotent replay: same op id + same input returns cached result; changed input conflicts
const op1 = call('move_object', { instance_id: winId, pos: [-168, 4, 59.08], operation_id: 'suite-op-1' });
const op2 = call('move_object', { instance_id: winId, pos: [-168, 4, 59.08], operation_id: 'suite-op-1' });
check('idempotent replay returns cached result', op2.replayed === true && op1.revision === op2.revision, JSON.stringify(op2).slice(0, 160));
const op3 = call('move_object', { instance_id: winId, pos: [-167, 4, 59.08], operation_id: 'suite-op-1' });
check('same op id with different input conflicts', code(op3) === 'operation_conflict', code(op3));

console.log(`\nFAILURE SUITE: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
