// VEXEA authoring substrate — typed operations.
// Every mutation: schema-checked args -> expected_revision guard -> idempotent op-id replay
// -> deterministic derivation (snap + echo) -> post-op contract validation with rollback.
import fs from 'node:fs';
import { WALLS_PATH, ensureRegistry, openingIssues, openingPlacement, clampOpeningT, openingSpan, loadRegistry, saveRegistry } from './walls.mjs';
import { checkVariantSchema } from './quality-schema.mjs';
import {
  STATE_PATH, CANONICAL_PATH, statePathEnv, objectsDirEnv, checkObjectQuality, EPS, snap, nearly,
  loadState, saveState, canonicalBase, baseDrift, loadObject, listObjects, newObject,
  objectContentSha, sizeOf, footprintAABB, deriveHost, checkInstance, validateWorld, aabbOverlapArea,
  budget, rotYForNormal, nearestEdge, segBox, aabbContains, sha256, idSeed,
} from './lib.mjs';

const err = (code, message, extra = {}) => ({ ok: false, error: { code, message, ...extra } });
const ok = (data, extra = {}) => ({ ok: true, ...extra, ...data });

export function initState({ statePath = statePathEnv() } = {}) {
  const base = canonicalBase();
  const state = {
    format: 'vexea-authoring/state-0.1',
    base: { path: base.path, sha256: base.sha256 },
    revision: 0,
    instances: [],
    oplog: [],
    checkpoints: {},
    undoStack: [],
  };
  saveState(state, statePath);
  return ok({ revision: state.revision }, { summary: `Working state initialized against ${base.path} (${base.sha256.slice(0, 12)}); canonical file untouched.` });
}

function requireState(statePath) {
  const state = loadState(statePath);
  if (!state) throw Object.assign(new Error('No working state; run: node tools/authoring/cli.mjs init'), { code: 'no_state' });
  return state;
}

function objectsById() {
  return new Map(listObjects().map(o => [o.id, o]));
}

function segments() {
  return canonicalBase().segments;
}

function opIdKey(op, args) {
  return `${op.id}:${sha256(JSON.stringify({ ...args, expected_revision: undefined, operation_id: undefined }))}`;
}

// replay guard: same op id + same input -> cached result; same id + different input -> conflict
function replayCheck(state, op, args) {
  if (!args.operation_id) return null;
  const prior = state.oplog.find(e => e.operation_id === args.operation_id && e.op === op);
  if (!prior) return null;
  const key = opIdKey({ id: op }, args);
  if (prior.inputKey !== key) {
    return { conflict: true, result: err('operation_conflict', `operation_id ${args.operation_id} was already used for ${op} with different input.`, { prior_revision: prior.revision }) };
  }
  return { conflict: false, result: { ...prior.result, replayed: true, note: `operation_id ${args.operation_id} already applied at revision ${prior.revision}; returning cached result.` } };
}

function recordOp(state, op, args, result, { changed, statePath }) {
  const entry = { op, operation_id: args.operation_id || null, revision: state.revision, inputKey: opIdKey({ id: op }, args), result: compactResult(result), changed };
  state.oplog.push(entry);
  saveState(state, statePath);
}

const compactResult = r => {
  const copy = { ...r };
  delete copy.note;
  const text = JSON.stringify(copy);
  return text.length > 4000 ? { ok: copy.ok, summary: copy.summary, truncated: true } : copy;
};

function guardMutation(state, args) {
  if (!Number.isInteger(args.expected_revision)) {
    return err('missing_revision', `expected_revision (integer) is required; current revision is ${state.revision}. Inspect state first, then mutate.`);
  }
  if (args.expected_revision !== state.revision) {
    return err('version_conflict', `Expected revision ${args.expected_revision}; current revision is ${state.revision}. Re-inspect before mutating.`);
  }
  return null;
}

function snapshotInstances(state) {
  return JSON.parse(JSON.stringify(state.instances));
}

function pushUndo(state) {
  state.undoStack.push({ revision: state.revision, instances: snapshotInstances(state) });
  if (state.undoStack.length > 50) state.undoStack.shift();
}

// post-mutation contract validation; on violation, roll the instance back and fail loud
function validateAfterMutation(state, statePath, targetInstId = null) {
  const objects = objectsById();
  const segs = segments();
  const issues = validateWorld(state, segs, objects);
  const relevant = targetInstId ? issues.filter(i => i.refs?.includes(targetInstId)) : issues.filter(i => i.severity === 'error');
  if (relevant.length) {
    return { issues: relevant, rolledBack: true };
  }
  void statePath;
  return { issues: [], rolledBack: false };
}

function deriveEcho(inst, object, segs) {
  const { host, box } = deriveHost(segs, inst, object);
  return {
    id: inst.id,
    pos: inst.pos, rotY: inst.rotY, size: sizeOf(inst, object),
    footprint: box,
    host: host ? { id: host.id, category: host.category, surfaceY: host.surfaceY ?? 0 } : null,
    objectSha: inst.objectSha,
  };
}

// ---------- operations ----------
export function createObject(args) {
  if (!args.type) return err('missing_args', 'create_object requires { type, name? }.');
  const obj = newObject({ type: args.type, name: args.name });
  if (loadObject(obj.id)) return err('object_exists', `Object ${obj.id} already exists.`);
  const dir = objectsDirEnv();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${obj.id}.json`, JSON.stringify(obj, null, 2) + '\n');
  return ok({ object: obj }, { summary: `Created draft object ${obj.id}; fill construction + contract, then author it before integration.` });
}

export function authorObject(args) {
  const obj = loadObject(args.object_id);
  if (!obj) return err('object_unknown', `Unknown object ${args.object_id}.`);
  if (args.expected_status !== 'authored') return err('missing_args', 'author_object requires { object_id, expected_status: "authored" }.');
  const problems = [];
  if (!obj.construction?.size || obj.construction.size.some(v => !(v > 0))) problems.push('construction.size missing or non-positive');
  if (!obj.construction?.parts?.length) problems.push('construction.parts empty — a primitive placeholder cannot be promoted');
  if (!obj.contract?.host?.categories?.length) problems.push('contract.host.categories missing');
  if (!obj.contract?.host?.mode) problems.push('contract.host.mode missing (attach-edge | surface)');
  if (problems.length) {
    return err('object_not_authorable', `Object ${obj.id} cannot be promoted to authored: ${problems.join('; ')}.`, { problems });
  }
  const quality = checkObjectQuality(obj);
  if (quality.length) {
    return err('object_below_quality', `Object ${obj.id} is not forwardable: ${quality.map(i => i.message).join(' ')}`, { issues: quality });
  }
  const schema = checkVariantSchema(obj);
  if (schema.length) {
    return err('variant_schema_violation', `Object ${obj.id} is not forwardable: ${schema.map(i => i.message).join(' ')}`, { issues: schema });
  }
  obj.status = 'authored';
  obj.revision += 1;
  fs.writeFileSync(`${objectsDirEnv()}/${obj.id}.json`, JSON.stringify(obj, null, 2) + '\n');
  return ok({ object: { id: obj.id, status: obj.status, revision: obj.revision } }, { summary: `Object ${obj.id} promoted to authored (revision ${obj.revision}); instances may now integrate against it.` });
}

export function integrateObject(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'integrate_object', args);
  if (replay) return replay.result;
  const object = loadObject(args.object_id);
  if (!object) return err('object_unknown', `Unknown object ${args.object_id}.`);
  if (object.status !== 'authored') return err('object_not_authored', `Object ${object.id} has status "${object.status}". Construct, inspect, and author it before integration.`);
  if (object.contract?.host?.mode === 'opening') {
    return err('not_opening_type', `${object.id} is an opening-type object; raw-coordinate integration is not representable. Use install_opening into a wall record.`);
  }
  for (const k of ['pos']) if (!Array.isArray(args[k]) || args[k].length !== 3) return err('missing_args', `integrate_object requires ${k}:[x,y,z] in meters.`);
  pushUndo(state);
  const segs = segments();
  const pos = [
    snap(args.pos[0], args.snapGrid ?? 1), args.pos[1], snap(args.pos[2], args.snapGrid ?? 1),
  ];
  const adjustments = [];
  if (!nearly(pos[0], args.pos[0]) || !nearly(pos[2], args.pos[2])) {
    adjustments.push(`pos snapped to 1m grid: [${args.pos}] -> [${pos[0]},${pos[1]},${pos[2]}]`);
  }
  const inst = {
    id: `inst-${String(state.instances.length + 1).padStart(4, '0')}-${(idSeed(object.id) >>> 0).toString(36).slice(0, 4)}`,
    objectId: object.id,
    objectSha: objectContentSha(object),
    objectRevision: object.revision,
    pos, rotY: args.rotY ?? 0, variant: args.variant || 'clean',
    status: 'integrated',
    hostId: null,
  };
  state.instances.push(inst);
  state.revision += 1;
  const check = checkInstance(state, segs, inst, object);
  inst.hostId = check.host?.id || null;
  const rollback = (errors) => {
    state.instances.pop(); state.revision -= 1;
    const res = err('contract_violation', `Integration rejected; placement rolled back. ${errors.map(i => i.message).join(' ')}`, { issues: errors });
    recordOp(state, 'integrate_object', args, res, { changed: false, statePath });
    return { ...res, rolledBack: true, derived: deriveEcho({ ...inst, pos: args.pos, rotY: inst.rotY }, object, segs) };
  };
  const errors = check.issues.filter(i => i.severity === 'error');
  if (errors.length) return rollback(errors);
  // world-level validation: the new instance must not damage or collide with existing state
  const worldErrors = validateWorld(state, segs, objectsById()).filter(i => i.severity === 'error' && i.refs?.includes(inst.id));
  if (worldErrors.length) return rollback(worldErrors);
  const res = ok({
    revision: state.revision, instance: deriveEcho(inst, object, segs),
    adjustments,
  }, { summary: `Integrated ${object.id} as ${inst.id} on host ${check.host.id} at [${pos}] rotY=${inst.rotY}. Run validate_world; then re-check visually.` });
  recordOp(state, 'integrate_object', args, res, { changed: true, statePath });
  return res;
}

// re-bind an instance to the current content of its object after re-inspection
// (object files evolve: variants, damage, evidence; the stale flag is the signal to rebind)
export function rebindInstance(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'rebind_instance', args);
  if (replay) return replay.result;
  const inst = findInstance(state, args.instance_id);
  if (!inst) return err('instance_unknown', `No instance matches ${args.instance_id}.`);
  const object = loadObject(inst.objectId);
  if (!object) return err('object_unknown', `Unknown object ${inst.objectId}.`);
  if (inst.objectSha === objectContentSha(object)) {
    return ok({ instance: inst.id, objectSha: inst.objectSha }, { summary: `Instance ${inst.id} already bound to current content of ${object.id}; nothing to do.` });
  }
  const segs = segments();
  const check = checkInstance(state, segs, inst, object);
  const errors = check.issues.filter(i => i.severity === 'error');
  if (errors.length) {
    return err('contract_violation', `Rebind rejected: the updated object no longer fits its placement. ${errors.map(i => i.message).join(' ')}`, { issues: errors, instance: inst.id });
  }
  pushUndo(state);
  inst.objectSha = objectContentSha(object);
  inst.objectRevision = object.revision;
  if (args.variant && (object.variants || []).some(v => v.id === args.variant)) inst.variant = args.variant;
  inst.hostId = check.host?.id || null;
  state.revision += 1;
  const res = ok({ revision: state.revision, instance: deriveEcho(inst, object, segs) },
    { summary: `Rebound ${inst.id} to current content of ${object.id} (object rev ${object.revision}); contract PASS.` });
  recordOp(state, 'rebind_instance', args, res, { changed: true, statePath });
  return res;
}

// remove an instance (guarded, undo-able); opening-bound removal also drops the opening
export function removeInstance(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'remove_instance', args);
  if (replay) return replay.result;
  const idx = state.instances.findIndex(i => i.id === args.instance_id);
  if (idx < 0) return err('instance_unknown', `No instance ${args.instance_id}.`);
  pushUndo(state);
  const [inst] = state.instances.splice(idx, 1);
  let openingRemoved = null;
  if (inst.openingId) {
    const reg = loadRegistry();
    if (reg) {
      const oi = reg.openings.findIndex(o => o.id === inst.openingId);
      if (oi >= 0) { openingRemoved = reg.openings.splice(oi, 1)[0].id; saveRegistry(reg); }
    }
  }
  state.revision += 1;
  const res = ok({ revision: state.revision, removed: inst.id, openingRemoved },
    { summary: `Removed instance ${inst.id}${openingRemoved ? ` and its opening ${openingRemoved}` : ''}; revision ${state.revision}.` });
  recordOp(state, 'remove_instance', args, res, { changed: true, statePath });
  return res;
}

// install an opening-type object INTO a wall record: the only path a window/door exists by
export function installOpening(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'install_opening', args);
  if (replay) return replay.result;
  const object = loadObject(args.object_id);
  if (!object) return err('object_unknown', `Unknown object ${args.object_id}.`);
  if (object.status !== 'authored') return err('object_not_authored', `Object ${object.id} has status "${object.status}".`);
  if (object.contract?.host?.mode !== 'opening') {
    return err('not_opening_type', `${object.id} is not an opening-type object (contract.host.mode = "${object.contract?.host?.mode}"). Use integrate_object for surface/attach-edge props.`);
  }
  const reg = ensureRegistry();
  const wall = reg.walls.find(w => w.id === args.wall_id);
  if (!wall) return err('wall_unknown', `Unknown wall ${args.wall_id}. Walls are derived; run walls_list to see ids.`);
  const width = object.construction.size[0];
  const height = object.construction.size[1];
  let t = Number.isFinite(args.t) ? args.t : null;
  if (t === null) return err('missing_args', 'install_opening requires t in [0..1] (center along the wall).');
  const clamped = clampOpeningT(wall, width, t);
  if (clamped === null) return err('opening_too_wide', `Opening width ${width}m does not fit wall ${wall.id} (length ${(wall.hi - wall.lo).toFixed(1)}m).`);
  const adjustments = [];
  if (Math.abs(clamped - t) > 1e-6) { adjustments.push(`t clamped ${t.toFixed(3)} -> ${clamped.toFixed(3)} to fit wall extent`); t = clamped; }
  const sill = args.sill ?? object.contract.host?.defaultSill ?? 1.0;
  const opening = {
    id: `op-${object.id}-${reg.openings.length + 1}`.replace(/obj_/g, ''),
    objectId: object.id, wallId: wall.id, buildingId: wall.buildingId, side: wall.side, kind: object.type,
    t: +t.toFixed(4), width, sill, height,
    objectSha: objectContentSha(object),
  };
  const issues = openingIssues(reg, opening);
  if (issues.length) {
    return err('contract_violation', `Opening rejected. ${issues.map(i => i.message).join(' ')}`, { issues });
  }
  pushUndo(state);
  reg.openings.push(opening);
  const place = openingPlacement(reg, opening);
  const inst = {
    id: `opinst-${String(state.instances.length + 1).padStart(4, '0')}-${(idSeed(object.id) >>> 0).toString(36).slice(0, 4)}`,
    objectId: object.id, objectSha: objectContentSha(object), objectRevision: object.revision,
    pos: place.pos, rotY: place.rotY, variant: args.variant || 'clean',
    status: 'integrated', hostId: wall.id, openingId: opening.id,
  };
  state.instances.push(inst);
  state.revision += 1;
  saveRegistry(reg);
  const res = ok({
    revision: state.revision, opening, instance: { ...deriveEcho(inst, object, segments()), wall: wall.id, openingId: opening.id },
    adjustments,
  }, { summary: `Installed ${object.id} as opening ${opening.id} in ${wall.id} at t=${opening.t} (sill ${sill}m); the wall will be cut at build time.` });
  recordOp(state, 'install_opening', args, res, { changed: true, statePath });
  return res;
}

// move an opening along its wall (t); full revalidation
export function moveOpening(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'move_opening', args);
  if (replay) return replay.result;
  const inst = findInstance(state, args.instance_id);
  if (!inst) return err('instance_unknown', `No instance matches ${args.instance_id}.`);
  if (!inst.openingId) return err('not_opening', `${inst.id} is not opening-bound; use move_object.`);
  if (!Number.isFinite(args.t)) return err('missing_args', 'move_opening requires t in [0..1].');
  const reg = ensureRegistry();
  const opening = reg.openings.find(o => o.id === inst.openingId);
  if (!opening) return err('opening_unknown', `Opening ${inst.openingId} missing from registry.`);
  const wall = reg.walls.find(w => w.id === opening.wallId);
  const clamped = clampOpeningT(wall, opening.width, args.t);
  if (clamped === null) return err('opening_too_wide', 'Opening does not fit at any position.');
  const before = opening.t;
  opening.t = +clamped.toFixed(4);
  const issues = openingIssues(reg, opening);
  if (issues.length) {
    opening.t = before;
    return err('contract_violation', `Move rejected. ${issues.map(i => i.message).join(' ')}`, { issues });
  }
  pushUndo(state);
  const place = openingPlacement(reg, opening);
  inst.pos = place.pos; inst.rotY = place.rotY;
  state.revision += 1;
  saveRegistry(reg);
  const res = ok({ revision: state.revision, opening: { id: opening.id, t: opening.t }, instance: deriveEcho(inst, loadObject(inst.objectId), segments()) },
    { summary: `Moved opening ${opening.id} t ${before.toFixed(3)} -> ${opening.t.toFixed(3)} on ${wall.id}; contract PASS.` });
  recordOp(state, 'move_opening', args, res, { changed: true, statePath });
  return res;
}

export function wallsList() {
  const reg = ensureRegistry();
  return budget(ok({
    walls: reg.walls.map(w => ({ id: w.id, buildingId: w.buildingId, side: w.side, extent: [w.lo, w.hi], at: w.at, thickness: w.thickness, height: w.height, openings: reg.openings.filter(o => o.wallId === w.id).length, doors: reg.doors.filter(d => d.buildingId === w.buildingId && d.side === w.side).length })),
    openings: reg.openings,
    featuresFile: fs.existsSync('authoring/facade-features.json') ? 'authoring/facade-features.json' : null,
  }, { summary: `${reg.walls.length} walls derived; ${reg.openings.length} openings authored.` }));
}

function findInstance(state, idOrPartial) {
  return state.instances.find(i => i.id === idOrPartial) ||
    state.instances.find(i => i.id.includes(idOrPartial)) ||
    state.instances.find(i => i.objectId.includes(idOrPartial));
}

function mutatePlacement(opName, apply, args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, opName, args);
  if (replay) return replay.result;
  const inst = findInstance(state, args.instance_id);
  if (!inst) return err('instance_unknown', `No instance matches ${args.instance_id}. Use inspect_region or list instances.`);
  if (inst.openingId) return err('not_opening', `${inst.id} is opening-bound; use move_opening (its position is derived from the wall record).`);
  const object = loadObject(inst.objectId);
  pushUndo(state);
  const before = deriveEcho(inst, object, segments());
  const applied = apply(inst, args) || {};
  if (applied.invalid) {
    state.undoStack.pop();
    return err('missing_args', applied.invalid);
  }
  // snap + echo (adjustments reported, never silent)
  const grid = args.snapGrid ?? 1;
  if (applied.snappedPos) {
    const snapped = [snap(applied.snappedPos[0], grid), applied.snappedPos[1], snap(applied.snappedPos[2], grid)];
    if (!nearly(snapped[0], inst.pos[0], 0.01) || !nearly(snapped[2], inst.pos[2], 0.01)) applied.adjustments.push(`pos snapped to ${grid}m grid`);
    inst.pos = snapped;
  }
  const after = deriveEcho(inst, object, segments());
  const moved = !nearly(before.pos[0], after.pos[0], 0.005) || !nearly(before.pos[1], after.pos[1], 0.005) || !nearly(before.pos[2], after.pos[2], 0.005) || before.rotY !== after.rotY || JSON.stringify(before.size) !== JSON.stringify(after.size);
  if (!moved) {
    state.undoStack.pop();
    // escalation: repeated no-effect mutations must be visible to the agent
    const recentSame = state.oplog.filter(e => e.op === opName && e.changed === false).length;
    const res = err('no_effect', `${opName} produced no geometric change (PoseEditor failure class). Resulting footprint equals the previous one.`, {
      instance: after, prior_no_effect_ops: recentSame,
      hint: recentSame >= 2 ? 'This is the 3rd consecutive ineffective mutation; stop and re-inspect the host geometry instead of retrying.' : undefined,
    });
    recordOp(state, opName, args, res, { changed: false, statePath });
    return res;
  }
  state.revision += 1;
  const v = validateAfterMutation(state, statePath, inst.id);
  if (v.rolledBack) {
    const pre = state.undoStack.pop();
    state.instances = pre.instances;
    state.undoStack.pop();
    state.revision -= 1;
    const res = err('contract_violation', `${opName} applied but the result violates the spatial contract; rolled back. ${v.issues.map(i => i.message).join(' ')}`, { issues: v.issues });
    recordOp(state, opName, args, res, { changed: false, statePath });
    return { ...res, rolledBack: true, attempted: after };
  }
  const res = ok({ revision: state.revision, before: pick(before), after: pick(after), adjustments: applied.adjustments },
    { summary: `${opName} ${inst.id}: ${summarize(before, after)}; contract PASS.` });
  recordOp(state, opName, args, res, { changed: true, statePath });
  return res;
}

const pick = e => ({ pos: e.pos, rotY: e.rotY, footprint: e.footprint, host: e.host?.id || null });
const describe = e => `at [${e.pos.map(n => +n.toFixed(2))}] rotY=${e.rotY} host=${e.host?.id || 'none'}`;
const summarize = (b, a) => `${describe(b)} -> ${describe(a)}`;

export function moveObject(args, opts) {
  return mutatePlacement('move_object', (inst, a) => {
    if (!Array.isArray(a.pos) || a.pos.length !== 3) return { invalid: 'move_object requires pos:[x,y,z] in meters.' };
    inst.pos = a.pos; return { snappedPos: a.pos, adjustments: [] };
  }, args, opts);
}

export function rotateObject(args, opts) {
  return mutatePlacement('rotate_object', (inst, a) => {
    if (!Number.isFinite(a.rotY)) return { invalid: 'rotate_object requires rotY in degrees (snapped to 90).' };
    inst.rotY = ((Math.round(a.rotY / 90) * 90) % 360 + 360) % 360;
    return { adjustments: [] };
  }, args, opts);
}

export function resizeObject(args, opts) {
  return mutatePlacement('resize_object', (inst, a) => {
    if (!Array.isArray(a.size) || a.size.length !== 3 || a.size.some(v => !(v > 0))) return { invalid: 'resize_object requires size:[w,h,d] in meters, all > 0.' };
    inst.size = a.size; return { adjustments: [] };
  }, args, opts);
}

// semantic relations — the system computes the raw transform
export const RELATIONS = ['flush-edge', 'center-on', 'behind-of', 'above', 'left-of', 'right-of'];

export function placeRelative(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const replay = replayCheck(state, 'place_relative', args);
  if (replay) return replay.result;
  const segs = segments();
  let target = null;
  if (args.target_segment) {
    const s = segs.find(x => x.id === args.target_segment);
    if (!s) return err('target_unknown', `No segment ${args.target_segment}.`);
    target = { box: segBox(s), surfaceY: s.surfaceY ?? 0, kind: 'segment', id: s.id };
  } else if (args.target_instance) {
    const t = findInstance(state, args.target_instance);
    if (!t) return err('target_unknown', `No instance ${args.target_instance}.`);
    const tobj = loadObject(t.objectId);
    target = { box: footprintAABB(t.pos, sizeOf(t, tobj), t.rotY), surfaceY: t.pos[1], kind: 'instance', id: t.id };
  } else return err('missing_args', 'place_relative requires target_segment or target_instance.');
  const inst = findInstance(state, args.instance_id);
  if (!inst) return err('instance_unknown', `No instance matches ${args.instance_id}.`);
  const object = loadObject(inst.objectId);
  const [w, , d] = sizeOf(inst, object);
  const tb = target.box;
  const grid = args.snapGrid ?? 1;
  const snapV = v => snap(v, grid);
  let pos = null, rotY = inst.rotY, why = '';
  const off = args.offset || [0, 0, 0];
  switch (args.relation) {
    case 'center-on': pos = [snapV((tb.minX + tb.maxX) / 2 + off[0]), target.surfaceY + off[1], snapV((tb.minZ + tb.maxZ) / 2 + off[2])]; why = 'center of target'; break;
    case 'behind-of': pos = [snapV((tb.minX + tb.maxX) / 2 + off[0]), target.surfaceY + off[1], snapV(tb.maxZ + d / 2 + Math.abs(off[2] || 0))]; why = 'south face + half depth'; break;
    case 'left-of': pos = [snapV(tb.minX - w / 2 - Math.abs(off[0] || 0)), target.surfaceY + off[1], snapV((tb.minZ + tb.maxZ) / 2 + off[2])]; why = 'west face - half width'; break;
    case 'right-of': pos = [snapV(tb.maxX + w / 2 + Math.abs(off[0] || 0)), target.surfaceY + off[1], snapV((tb.minZ + tb.maxZ) / 2 + off[2])]; why = 'east face + half width'; break;
    case 'above': pos = [snapV((tb.minX + tb.maxX) / 2 + off[0]), target.surfaceY + (args.clearanceM ?? 0) + off[1], snapV((tb.minZ + tb.maxZ) / 2 + off[2])]; why = `+${args.clearanceM ?? 0}m above target surface`; break;
    case 'flush-edge': {
      const ne = nearestEdge(tb, footprintAABB(inst.pos, sizeOf(inst, object), inst.rotY));
      const e = ne.edge;
      pos = flushEdgePos(tb, inst, object, target, grid);
      rotY = ((rotYForNormal(e.normal) % 360) + 360) % 360;
      why = `flush with ${e.axis === 'x' ? 'x' : 'z'}=${e.at} edge of ${target.id}`;
      break;
    }
    default: return err('bad_relation', `relation must be one of ${RELATIONS.join('|')}.`);
  }
  args = { ...args, pos, rotY };
  const res = mutatePlacement('place_relative', (i, a) => { i.pos = a.pos; i.rotY = a.rotY ?? i.rotY; return { snappedPos: a.pos, adjustments: [] }; }, args, { statePath });
  if (res.ok) res.computed = { pos, rotY, why };
  return res;
}

function flushEdgePos(tb, inst, object, target, grid) {
  const ne = nearestEdge(tb, footprintAABB(inst.pos, sizeOf(inst, object), inst.rotY));
  const e = ne.edge;
  const cur = footprintAABB(inst.pos, sizeOf(inst, object), inst.rotY);
  const c = [(cur.minX + cur.maxX) / 2, (cur.minZ + cur.maxZ) / 2];
  const span = e.axis === 'x' ? cur.maxX - cur.minX : cur.maxZ - cur.minZ;
  const along = e.axis === 'x' ? c[1] : c[0];
  if (e.axis === 'x') {
    const x = e.normal[0] > 0 ? e.at - span / 2 : e.at + span / 2;
    return [snap(x, grid) || x, target.surfaceY, snap(along, grid) || along];
  }
  const z = e.normal[1] > 0 ? e.at - span / 2 : e.at + span / 2;
  return [snap(along, grid) || along, target.surfaceY, snap(z, grid) || z];
}

function finishPlaceRelative(pos, rotY, why) {
  return ok({ computed: { pos, rotY, why } }, { summary: `place_relative computed ${why}: pos=[${pos}] rotY=${rotY}.` });
}

// ---------- inspection (bounded) ----------
export function inspectObject(args) {
  const obj = loadObject(args.object_id);
  if (!obj) return err('object_unknown', `Unknown object ${args.object_id}.`);
  const state = requireState();
  const segs = segments();
  const instances = state.instances.filter(i => i.objectId === obj.id).map(i => deriveEcho(i, obj, segs));
  const out = {
    object: { id: obj.id, type: obj.type, name: obj.name, status: obj.status, revision: obj.revision, construction: obj.construction, variants: obj.variants, contract: obj.contract },
    content_sha: objectContentSha(obj),
    instances, evidence: obj.evidence,
  };
  if (args.include_relationships) out.relationships = instances.map(i => relationshipsFor(i, segs));
  return budget(ok(out, { summary: `Object ${obj.id}: ${obj.status}, ${instances.length} instance(s).` }));
}

export function inspectRegion(args) {
  const bArr = Array.isArray(args.bounds) ? args.bounds : null;
  const { minX, minZ, maxX, maxZ } = bArr
    ? { minX: bArr[0], minZ: bArr[1], maxX: bArr[2], maxZ: bArr[3] }
    : (args.bounds || {});
  if (![minX, minZ, maxX, maxZ].every(Number.isFinite)) return err('missing_args', 'inspect_region requires bounds {minX,minZ,maxX,maxZ}.');
  const state = requireState();
  const segs = segments();
  const inBox = (b) => aabbOverlapArea(b, { minX, minZ, maxX, maxZ }) > 0;
  const limit = Math.min(args.limit ?? 20, 50);
  const cursor = args.cursor ?? 0;
  const hitSegs = segs.filter(s => inBox(segBox(s)));
  const hitInsts = state.instances.map(i => ({ i, o: loadObject(i.objectId) })).filter(({ i, o }) => inBox(footprintAABB(i.pos, sizeOf(i, o), i.rotY)));
  const page = (hitSegs.map(s => ({ kind: 'segment', id: s.id, category: s.category, bounds: s.bounds, surfaceY: s.surfaceY ?? 0, connectivity: s.connectivity }))
    .concat(hitInsts.map(({ i, o }) => ({ kind: 'instance', ...deriveEcho(i, o, segs) }))));
  const slice = page.slice(cursor, cursor + limit);
  return budget(ok({
    revision: state.revision, region: args.bounds,
    total_hits: page.length, cursor, next_cursor: cursor + slice.length < page.length ? cursor + slice.length : null,
    items: slice,
  }, { summary: `Region query: ${page.length} hits, returning ${slice.length} (page from ${cursor}).` }));
}

export function getRelationships(args) {
  const state = requireState();
  const inst = findInstance(state, args.instance_id);
  if (!inst) return err('instance_unknown', `No instance matches ${args.instance_id}.`);
  const object = loadObject(inst.objectId);
  return budget(ok(relationshipsFor(deriveEcho(inst, object, segments()), segments()), { summary: `Relationships for ${inst.id}.` }));
}

function relationshipsFor(echo, segs) {
  const box = echo.footprint;
  const near = segs
    .map(s => ({ id: s.id, category: s.category, connectivity: s.connectivity, overlap: aabbOverlapArea(segBox(s), box) }))
    .filter(x => x.overlap > 0 || (echo.host && x.id === echo.host.id))
    .slice(0, 10);
  return { instance: echo.id, host: echo.host, touching_segments: near };
}

export function validateWorldOp() {
  const state = requireState();
  const issues = validateWorld(state, segments(), objectsById());
  const byCode = {};
  for (const i of issues) byCode[i.code] = (byCode[i.code] || 0) + 1;
  return budget(ok({ revision: state.revision, issues, issue_counts: byCode },
    { summary: issues.length ? `${issues.length} issue(s): ${JSON.stringify(byCode)}` : `World valid at revision ${state.revision}.` }));
}

export function undo(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const prev = state.undoStack.pop();
  if (!prev) return err('undo_empty', 'Nothing to undo.');
  state.instances = prev.instances;
  state.revision += 1;
  saveState(state, statePath);
  return ok({ revision: state.revision, instances: state.instances.length }, { summary: `Undo applied: instances restored to revision ${prev.revision} snapshot; working revision is now ${state.revision}.` });
}

export function checkpoint(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  if (!args.name) return err('missing_args', 'checkpoint requires { name }.');
  state.checkpoints[args.name] = { revision: state.revision, instances: snapshotInstances(state) };
  saveState(state, statePath);
  return ok({ checkpoints: Object.keys(state.checkpoints) }, { summary: `Checkpoint "${args.name}" saved at revision ${state.revision}.` });
}

export function restore(args, { statePath = statePathEnv() } = {}) {
  const state = requireState(statePath);
  const guard = guardMutation(state, args);
  if (guard) return guard;
  const cp = state.checkpoints[args.name];
  if (!cp) return err('checkpoint_unknown', `No checkpoint "${args.name}". Known: ${Object.keys(state.checkpoints).join(', ') || 'none'}.`);
  pushUndo(state);
  state.instances = JSON.parse(JSON.stringify(cp.instances));
  state.revision += 1;
  saveState(state, statePath);
  return ok({ revision: state.revision }, { summary: `Restored checkpoint "${args.name}" (was revision ${cp.revision}); working revision now ${state.revision}.` });
}

export function diffSince(args) {
  const state = requireState();
  if (!Number.isInteger(args.revision)) return err('missing_args', 'diff_since requires { revision }.');
  const changed = state.oplog.filter(e => e.revision > args.revision).map(e => ({ op: e.op, revision: e.revision, changed: e.changed }));
  return ok({ since: args.revision, current: state.revision, changed }, { summary: `${changed.length} oplog entries since revision ${args.revision}.` });
}

export const CANONICAL = CANONICAL_PATH;
