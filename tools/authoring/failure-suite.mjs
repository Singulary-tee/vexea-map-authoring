#!/usr/bin/env node
// Negative-space verification: every failure class in the assignment brief
// (§16) is deliberately attempted; the substrate must reject or detect it.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const scratch = '.context/ab/authoring-failure-suite';
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(`${scratch}/objects`, { recursive: true });
fs.cpSync('authoring/objects', `${scratch}/objects`, { recursive: true });

for (const f of ['authoring/walls.json', 'authoring/facade-features.json']) {
  if (fs.existsSync(f)) fs.copyFileSync(f, `${scratch}/${f.split('/')[1]}`);
}
// suite starts from a clean opening slate (walls + features retained)
const scratchRegPath = `${scratch}/walls.json`;
if (fs.existsSync(scratchRegPath)) {
  const r0 = JSON.parse(fs.readFileSync(scratchRegPath, 'utf8'));
  r0.openings = [];
  fs.writeFileSync(scratchRegPath, JSON.stringify(r0, null, 2));
}

const env = {
  ...process.env,
  VEXEA_AUTHORING_STATE: `${scratch}/state.json`,
  VEXEA_AUTHORING_OBJECTS: `${scratch}/objects`,
  VEXEA_AUTHORING_WALLS: `${scratch}/walls.json`,
  VEXEA_AUTHORING_FEATURES: `${scratch}/facade-features.json`,
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

// seed: fresh state + a movable pod (mutation tests) + a window opening (registry tests)
call('init');
const podSeed = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-176, 0, 124] });
check('seed: pod integrates on ground', podSeed.ok, JSON.stringify(podSeed.error || {}).slice(0, 160));
const win = { objectId: 'obj_window_industrial_window_centered_large' }; // opening-type: the only path is install_opening
const seedWin = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: 'wall-bld-maintenance-n', t: 0.4, sill: 4 });
check('seed: window installs as opening in derived wall', seedWin.ok, JSON.stringify(seedWin.error || {}).slice(0, 200));
const rawIntegrate = call('integrate_object', { object_id: 'obj_window_industrial_window_centered_large', pos: [-176, 4, 59.08], rotY: 0 });
check('opening-type object cannot bypass the wall registry', code(rawIntegrate) === 'not_opening_type', code(rawIntegrate));
const winId = podSeed.ok ? podSeed.instance.id : null;

// 1. an opening outside its wall extent / on an unknown wall is rejected
const open = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: 'wall-bld-maintenance-n', t: 0.4, sill: 4 });
check('overlapping opening rejected', code(open) === 'contract_violation' && issueCodes(open).includes('openings_overlap'), JSON.stringify(open.error || {}).slice(0, 160));
const offwall = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: 'wall-nonexistent-s', t: 0.5, sill: 3 });
check('opening on unknown wall rejected', code(offwall) === 'wall_unknown', code(offwall));

// 2. an opening clamped at the wall edge still cannot overflow (clampOpeningT)
const edge = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: 'wall-bld-gatehouse-w', t: 0.999, sill: 3 });
check('edge opening clamped, not overflowing', edge.ok === true || code(edge) === 'contract_violation', JSON.stringify(edge.error || edge.summary || {}).slice(0, 160));

// 3. a door floats away from its building -> move off-host rolls back
const floated = call('move_object', { instance_id: winId, pos: [-300, 0, -300] });
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
const realMove = call('move_object', { instance_id: winId, pos: [-169, 0, 124] });
check('seed: real move to -169 succeeds', realMove.ok, code(realMove));
const mm = call('move_object', { instance_id: winId, pos: [-169.001, 0, 124] });
check('1mm PoseEditor-class move reported as no_effect', code(mm) === 'no_effect', code(mm));

// 8. a mutation destroys unrelated objects -> overlap with a second instance is caught
const pod = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-184, 0, 124] });
check('seed: second pod integrates on ground', pod.ok, JSON.stringify(pod.error || {}).slice(0, 160));
const pod2 = call('integrate_object', { object_id: 'obj_prop_service_pod', pos: [-182.5, 0, 124] });
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
const loop1 = call('move_object', { instance_id: winId, pos: [-169, 0, 124] });
const loop2 = call('move_object', { instance_id: winId, pos: [-169, 0, 124] });
check('repair loop no-effect detected (1st)', code(loop1) === 'no_effect', code(loop1));
check('repair loop no-effect detected (2nd)', code(loop2) === 'no_effect' && loop2.error.prior_no_effect_ops >= 1, JSON.stringify(loop2.error || {}).slice(0, 160));

// 13. idempotent replay: same op id + same input returns cached result; changed input conflicts
const op1 = call('move_object', { instance_id: winId, pos: [-168, 0, 124], operation_id: 'suite-op-1' });
const op2 = call('move_object', { instance_id: winId, pos: [-168, 0, 124], operation_id: 'suite-op-1' });
check('idempotent replay returns cached result', op2.replayed === true && op1.revision === op2.revision, JSON.stringify(op2).slice(0, 160));
const op3 = call('move_object', { instance_id: winId, pos: [-167, 0, 124], operation_id: 'suite-op-1' });
check('same op id with different input conflicts', code(op3) === 'operation_conflict', code(op3));

// ===== machinery grafts: walls-as-data openings + anti-low-poly quality gate =====
// 18. quality gate: a 1-part streetlight is not forwardable
fs.writeFileSync(`${scratch}/objects/obj_lowlight.json`, JSON.stringify({
  format: 'vexea-object/0.1', id: 'obj_lowlight', type: 'prop', name: 'streetlight placeholder', status: 'draft', revision: 1,
  construction: { size: [0.3, 8, 0.3], origin: 'center-bottom', parts: [{ kind: 'box', size: [0.3, 8, 0.3], offset: [0, 0, 0], mat: 'steel-dark' }] },
  variants: [{ id: 'clean' }], contract: { host: { categories: ['ground-surface-type'], mode: 'surface' }, overlap: 'disallow' }, references: [], evidence: [],
}));
const lowlight = call('author_object', { object_id: 'obj_lowlight', expected_status: 'authored' });
check('low-poly streetlight not forwardable', code(lowlight) === 'object_below_quality', JSON.stringify(lowlight.error || {}).slice(0, 200));

// 19. facade-feature collision: opening over a recorded ribbed sheet / band / light is rejected
// (bld-gatehouse south is a dressed frontage; features file must exist from an overlay build)
const feat = JSON.parse(fs.readFileSync('authoring/facade-features.json', 'utf8'));
check('facade features registry present', feat.features.length > 100, String(feat.features.length));
const featHits = feat.features.filter(f => f.buildingId === 'bld-gatehouse' && f.side === 's' && f.kind === 'ribbed-sheet');
const regFile = JSON.parse(fs.readFileSync(`${scratch}/walls.json`, 'utf8'));
const ghWall = regFile.walls.find(w => w.buildingId === 'bld-gatehouse' && w.side === 's');
if (featHits.length && ghWall) {
  const f0 = featHits[0];
  const tHit = ((f0.a + f0.c) / 2 - ghWall.lo) / (ghWall.hi - ghWall.lo);
  const blocked = call('install_opening', { object_id: 'obj_window_industrial_window_centered_large', wall_id: ghWall.id, t: tHit, sill: 4 });
  check('opening over facade feature rejected', code(blocked) === 'contract_violation' && issueCodes(blocked).includes('opening_hits_feature'), JSON.stringify(blocked.error || blocked.summary || {}).slice(0, 200));
} else {
  check('opening over facade feature rejected', false, 'no gatehouse ribbed-sheet features recorded');
}

// 20. opening-bound instance refuses raw move_object; move_opening revalidates
const opInstId = seedWin.ok ? seedWin.instance.id : null;
if (opInstId) {
  const mo = call('move_object', { instance_id: opInstId, pos: [0, 0, 0] });
  check('move_object refused for opening-bound instance', code(mo) === 'not_opening', code(mo));
  const mv = call('move_opening', { instance_id: opInstId, t: 0.9 });
  check('move_opening revalidates against wall + siblings', mv.ok === true || code(mv) === 'contract_violation', JSON.stringify(mv.error || mv.summary || {}).slice(0, 160));
  const rmv = call('remove_instance', { instance_id: opInstId });
  check('remove_instance drops the opening with the instance', rmv.ok === true && Boolean(rmv.openingRemoved), JSON.stringify(rmv.error || {}).slice(0, 160));
}

console.log(`\nFAILURE SUITE: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
