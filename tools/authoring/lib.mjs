// VEXEA authoring substrate — core library.
// Layers a revision-safe, contract-checked object/instance model on top of the
// canonical blockout JSON (which stays byte-identical: its sha256 is pinned by audits).
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const STATE_PATH = 'authoring/scene-state.json';
export const OBJECTS_DIR = 'authoring/objects';
export const CANONICAL_PATH = 'blockout/blockout-full-v1.json';
export const OUTPUT_LIMIT = 12000;
export const EPS = 1e-6;
export const WORLD_LIMIT = 768;

// test isolation: point the working doc and object workspace at scratch dirs
export const statePathEnv = () => process.env.VEXEA_AUTHORING_STATE || STATE_PATH;
export const wallsPathEnv = () => process.env.VEXEA_AUTHORING_WALLS || 'authoring/walls.json';
export const featuresPathEnv = () => process.env.VEXEA_AUTHORING_FEATURES || 'authoring/facade-features.json';
export const objectsDirEnv = () => process.env.VEXEA_AUTHORING_OBJECTS || OBJECTS_DIR;

const sha256 = v => createHash('sha256').update(v).digest('hex');
export { sha256 };

// ---------- geometry (meters, Y-up, AABB world axes; rotY snapped to 90 deg) ----------
export const snap = (v, grid) => Math.round(v / grid) * grid;
export const nearly = (a, b, e = EPS) => Math.abs(a - b) <= e;

export function footprintAABB(pos, size, rotY) {
  const q = ((Math.round(rotY / 90) * 90) % 360 + 360) % 360;
  const swapped = q === 90 || q === 270;
  const [w, , d] = size;
  const hw = (swapped ? d : w) / 2, hd = (swapped ? w : d) / 2;
  return { minX: pos[0] - hw, maxX: pos[0] + hw, minZ: pos[2] - hd, maxZ: pos[2] + hd };
}

export const aabbOverlapArea = (a, b) =>
  Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)) *
  Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));

export const aabbContains = (outer, inner, e = 0) =>
  inner.minX >= outer.minX - e && inner.maxX <= outer.maxX + e &&
  inner.minZ >= outer.minZ - e && inner.maxZ <= outer.maxZ + e;

// Edges of a host segment bounds: {axis:'x'|'z', at, min, max, normal:[dx,dz]}
export function hostEdges(segBox) {
  return [
    { axis: 'z', at: segBox.minZ, min: segBox.minX, max: segBox.maxX, normal: [0, -1] },
    { axis: 'z', at: segBox.maxZ, min: segBox.minX, max: segBox.maxX, normal: [0, 1] },
    { axis: 'x', at: segBox.minX, min: segBox.minZ, max: segBox.maxZ, normal: [-1, 0] },
    { axis: 'x', at: segBox.maxX, min: segBox.minZ, max: segBox.maxZ, normal: [1, 0] },
  ];
}

export function nearestEdge(segBox, box) {
  const c = [(box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2];
  let best = null;
  for (const e of hostEdges(segBox)) {
    // axis 'z' edges are lines z = at spanning x; axis 'x' edges are lines x = at spanning z
    const perp = e.axis === 'z' ? c[1] : c[0];
    const along = e.axis === 'z' ? c[0] : c[1];
    const dist = Math.abs(perp - e.at);
    const inside = along >= e.min && along <= e.max;
    const span = inside ? 0 : Math.min(Math.abs(along - e.min), Math.abs(along - e.max));
    if (!best || dist + span < best.score) best = { edge: e, dist, span, score: dist + span };
  }
  return best;
}

// rotY (deg) required so the object's depth axis faces `normal`
export function rotYForNormal(normal, baseRotY = 0) {
  const [nx, nz] = normal;
  if (nx === 1) return 90 + baseRotY;
  if (nx === -1) return -90 + baseRotY;
  if (nz === 1) return 180 + baseRotY;
  return 0 + baseRotY;
}

// ---------- state ----------
export function loadState(path = statePathEnv()) {
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export function saveState(state, path = statePathEnv()) {
  fs.writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
}

export function canonicalBase() {
  const bytes = fs.readFileSync(CANONICAL_PATH);
  const doc = JSON.parse(bytes);
  return { path: CANONICAL_PATH, sha256: sha256(bytes), segments: doc.segments, routes: doc.routes || [] };
}

export function baseDrift(state) {
  const current = canonicalBase();
  return state.base.sha256 === current.sha256 ? null : current.sha256;
}

export function loadObject(objectId, dir = objectsDirEnv()) {
  const p = `${dir}/${objectId}.json`;
  if (!fs.existsSync(p)) return null;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (doc.id !== objectId) throw Object.assign(new Error(`object file ${p} declares id "${doc.id}" — filename/identity mismatch; refusing to load`), { code: 'object_identity_mismatch' });
  return doc;
}

export function listObjects(dir = objectsDirEnv()) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
}

// stable system-generated object id (same hash family as the repo's idSeed)
export const idSeed = id => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export function newObject({ type, name, contract = null, construction = null }) {
  const slug = String(name || type).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  const id = `obj_${type}_${slug}`;
  return {
    format: 'vexea-object/0.1',
    id, type, name: name || type,
    status: 'draft',
    revision: 1,
    construction: construction || { size: null, origin: 'center-bottom', parts: [] },
    variants: [{ id: 'clean' }],
    contract: contract || {},
    references: [CANONICAL_PATH + '#segments', 'spec/calibration.md'],
    evidence: [],
  };
}

export const objectContentSha = obj => sha256(JSON.stringify({ construction: obj.construction, contract: obj.contract, variants: obj.variants, status: obj.status }));

// ---------- anti-low-poly quality gate (decisions in code, not notes) ----------
// A primitive placeholder must not be promotable: the editor refuses to forward it.
const TRI_EST = { box: 12, cylinder: 60, wedge: 8 };
export function estimateTriangles(construction) {
  let tri = 0;
  for (const part of construction?.parts || []) {
    const k = part.kind || 'box';
    if (k === 'lathe') tri += (part.profile.length - 1) * (part.segments ?? 32) * 2;
    else if (k === 'sweep') tri += (part.tubular ?? 24) * (part.radial ?? 32) * 2;
    else if (k === 'extrude') tri += (part.shape?.length ?? 8) * 24;
    else if (k === 'disc') tri += 2 * (part.segments ?? 32);
    else tri += TRI_EST[k] ?? 12;
  }
  return tri;
}

export function checkObjectQuality(object) {
  const issues = [];
  const push = (code, message) => issues.push({ severity: 'error', code, message, refs: [object.id] });
  const c = object.construction || {};
  const parts = c.parts || [];
  const size = c.size || [0, 0, 0];
  const maxDim = Math.max(...size);
  // schema-driven budgets override class defaults when the object doc declares them
  const q = object.contract?.quality || null;
  // fixtures that fill wall openings are thin inserts, not silhouettes
  const insertLike = ['window', 'door', 'pipe'].includes(object.type);
  const minParts = q?.minParts ?? (insertLike ? 3 : maxDim >= 2 ? 5 : 4);
  const minTris = q?.minTris ?? (insertLike ? 24 : maxDim >= 5 ? 72 : 40);
  const maxTris = q?.maxTris ?? (maxDim >= 5 ? 25000 : maxDim >= 2 ? 5000 : 2500);
  // spline-schema objects ban primitive boxes from the vocabulary entirely
  if (q?.splineVocabulary) {
    for (const p of parts) {
      if (p.kind === 'box') push('object_below_quality', `${object.id} part "${p.kind}" is a primitive box; spline schema bans box parts.`);
      if (p.kind === 'lathe' && (p.profile?.length ?? 0) < 4) push('object_below_quality', `${object.id} lathe part profile needs >= 4 points.`);
      if (p.kind === 'sweep' && (p.path?.length ?? 0) < 3) push('object_below_quality', `${object.id} sweep part path needs >= 3 points.`);
      if ((p.segments ?? 32) < 24 && p.kind !== 'box') push('object_below_quality', `${object.id} part ring segments < 24 (anti-low-poly ring rule).`);
    }
  }
  if (parts.length < minParts) {
    push('object_below_quality', `${object.id} has ${parts.length} part(s); ${object.type} requires >= ${minParts} to leave placeholder territory.`);
  }
  const mats = new Set(parts.map(p => p.mat));
  if (mats.size < 2) {
    push('object_below_quality', `${object.id} uses ${mats.size} material(s); >= 2 required (a single-surface prop reads as untextured blockout).`);
  }
  const tri = estimateTriangles(c);
  if (tri < minTris) {
    push('object_below_quality', `${object.id} estimated at ${tri} tris; >= ${minTris} required for a ${maxDim.toFixed(1)}m ${object.type}.`);
  }
  if (tri > maxTris) {
    push('object_over_budget', `${object.id} estimated at ${tri} tris; max ${maxTris} (MeshQA budget class).`);
  }
  // single rectangular prism silhouette: every part identical footprint at same center
  const shapeParts = parts.filter(p => p.kind === 'box' || p.size);
  const footprints = new Set(shapeParts.map(p => JSON.stringify((p.size || [1, 1, 1]).map(v => Math.round(v * 2) / 2))));
  const prismCheck = shapeParts.length ? shapeParts : parts;
  if (!insertLike && shapeParts.length > 0 && footprints.size === 1 && shapeParts.length === parts.length && maxDim >= 1) {
    push('object_below_quality', `${object.id} silhouette is a single rectangular prism; add differentiated parts (setbacks, caps, attachments).`);
  }
  return issues;
}

// ---------- host derivation ----------
export const BUILDING_CATS = ['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'];
const MOUNTAIN_CATS = ['mountain-boundary'];

export const segBox = s => ({ minX: s.bounds[0], minZ: s.bounds[1], maxX: s.bounds[2], maxZ: s.bounds[3] });
export const segSurfaceY = (s, fallback = 0) => Number.isFinite(s.surfaceY) ? s.surfaceY : fallback;

export function candidateHosts(segments, box, categories) {
  return segments.filter(s => categories.includes(s.category) && aabbOverlapArea(segBox(s), box) > 0);
}

// derive the host an instance currently sits on (geometry, not the recorded hostId)
export function deriveHost(segments, inst, object) {
  const box = footprintAABB(inst.pos, sizeOf(inst, object), inst.rotY);
  const cats = object?.contract?.host?.categories || BUILDING_CATS;
  const cands = candidateHosts(segments, box, cats);
  if (!cands.length) return { host: null, box };
  // prefer the host containing the footprint; else the largest overlap
  const containing = cands.filter(s => aabbContains(segBox(s), box, 0.05));
  const pick = (containing.length ? containing : cands)
    .sort((a, b) => aabbOverlapArea(segBox(b), box) - aabbOverlapArea(segBox(a), box))[0];
  return { host: pick, box };
}

export function sizeOf(inst, object) {
  if (inst.size) return inst.size;
  return object?.construction?.size || [1, 1, 1];
}

// ---------- contract evaluation ----------
export function checkInstance(state, segments, inst, object) {
  const issues = [];
  const push = (severity, code, message, refs) => issues.push({ severity, code, message, refs: refs || [inst.id] });
  const contract = object?.contract || {};
  const { host, box } = deriveHost(segments, inst, object);
  const hostCats = contract.host?.categories || BUILDING_CATS;

  if (!host) {
    push('error', 'host_missing', `Instance ${inst.id} (${object?.id}) overlaps no segment of ${hostCats.join('|')}.`);
    return { issues, host: null, box };
  }
  if (contract.host?.categories && !hostCats.includes(host.category)) {
    push('error', 'host_type_mismatch', `Instance ${inst.id} host ${host.id} is ${host.category}, contract requires ${hostCats.join('|')}.`, [inst.id, host.id]);
  }
  const sBox = segBox(host);
  const mode = contract.host?.mode || 'surface';
  const flushTol = contract.flushTolerance ?? 0.35;

  // how far the instance exits each side of the host: {w,e,n,s}
  const exits = {
    w: sBox.minX - box.minX,
    e: box.maxX - sBox.maxX,
    n: sBox.minZ - box.minZ,
    s: box.maxZ - sBox.maxZ,
  };
  const depth = sizeOf(inst, object)[2] ?? 1;
  const overhang = mode === 'attach-edge' ? depth / 2 + flushTol : 0;
  const exitVals = Object.values(exits).sort((a, b) => b - a);
  const allowed = exitVals[0] <= overhang + 0.05 && exitVals.slice(1).every(v => v <= 0.05);
  if (!allowed) {
    push('error', 'object_breaks_host', `Instance ${inst.id} footprint exits host ${host.id} bounds (host ${fmtBox(sBox)}, instance ${fmtBox(box)}).`, [inst.id, host.id]);
  } else if (mode === 'attach-edge') {
    const ne = nearestEdge(sBox, box);
    const gap = ne.edge.axis === 'x'
      ? Math.min(Math.abs(box.minX - ne.edge.at), Math.abs(box.maxX - ne.edge.at))
      : Math.min(Math.abs(box.minZ - ne.edge.at), Math.abs(box.maxZ - ne.edge.at));
    if (gap > flushTol) {
      push('error', 'not_flush', `Instance ${inst.id} is ${gap.toFixed(2)}m from nearest host edge of ${host.id}; attach-edge requires <= ${flushTol}m.`, [inst.id, host.id]);
    }
    const wantRot = ((rotYForNormal(ne.edge.normal) % 360) + 360) % 360;
    const gotRot = ((Math.round(inst.rotY) % 360) + 360) % 360;
    if (!nearly(gotRot, wantRot, 1) && !nearly(gotRot, (wantRot + 180) % 360, 1)) {
      push('error', 'orientation_mismatch', `Instance ${inst.id} rotY=${gotRot} is not aligned with host edge normal (want ${wantRot} or ${(wantRot + 180) % 360}).`, [inst.id, host.id]);
    }
  }

  // grounding: base must rest on host surface (pos carries sill offsets explicitly)
  if (mode !== 'attach-edge') {
    const sy = segSurfaceY(host);
    if (!nearly(inst.pos[1], sy, 0.51)) {
      push('error', 'not_grounded', `Instance ${inst.id} base y=${inst.pos[1]} does not rest on host ${host.id} surface y=${sy}.`, [inst.id, host.id]);
    }
  }

  // pipe termination: both ends must land inside a valid socket host
  if (object?.type === 'pipe') {
    // ends live on the footprint's long axis, which follows rotY
    const longAxisX = (box.maxX - box.minX) >= (box.maxZ - box.minZ);
    for (const end of [-1, 1]) {
      const endBox = longAxisX
        ? (end < 0 ? { ...box, maxX: Math.min(box.maxX, box.minX + 0.5) } : { ...box, minX: Math.max(box.minX, box.maxX - 0.5) })
        : (end < 0 ? { ...box, maxZ: Math.min(box.maxZ, box.minZ + 0.5) } : { ...box, minZ: Math.max(box.minZ, box.maxZ - 0.5) });
      const sockets = candidateHosts(segments, endBox, hostCats);
      if (!sockets.length) push('error', 'pipe_end_unhosted', `Instance ${inst.id} pipe end ${end < 0 ? 'A' : 'B'} terminates outside any ${hostCats.join('|')} socket.`, [inst.id]);
    }
  }

  // impossible geometry: below terrain, outside world bounds, inside mountains
  if (inst.pos[1] < -30) push('error', 'prop_invalid_placement', `Instance ${inst.id} base y=${inst.pos[1]} is below any terrain grade.`);
  if (Math.abs(inst.pos[0]) > WORLD_LIMIT || Math.abs(inst.pos[2]) > WORLD_LIMIT) {
    push('error', 'prop_invalid_placement', `Instance ${inst.id} is outside the 768x768 world bounds.`);
  }
  for (const m of segments.filter(s => MOUNTAIN_CATS.includes(s.category))) {
    if (aabbOverlapArea(segBox(m), box) > 0.01) {
      push('error', 'prop_invalid_placement', `Instance ${inst.id} intersects impossible geometry ${m.id}.`, [inst.id, m.id]);
    }
  }
  return { issues, host, box };
}

// point -> polyline distance (routes)
function pointRouteDistance(pt, routes) {
  let best = Infinity;
  for (const r of routes) {
    const w = r.waypoints || [];
    for (let i = 0; i < w.length - 1; i++) {
      const dx = w[i + 1][0] - w[i][0], dz = w[i + 1][1] - w[i][1];
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((pt[0] - w[i][0]) * dx + (pt[2] - w[i][1]) * dz) / len2));
      best = Math.min(best, Math.hypot(pt[0] - (w[i][0] + dx * t), pt[2] - (w[i][1] + dz * t)));
    }
  }
  return best;
}

function loadViews() {
  const p = 'authoring/canonical-views.json';
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')).views;
}

// snap-ground placement contract (schema-driven): flush, default-deny intersections,
// route clearance, lamp spacing, arm orientation, canonical-view visibility
export function checkPlacement(state, segments, inst, object, routes, views, objectsById) {
  const issues = [];
  const push = (code, message) => issues.push({ severity: 'error', code, message, refs: [inst.id] });
  const c = object.contract || {};
  if (c.placement?.mode !== 'snap-ground') return issues;
  const host = segments.find(s => s.category === 'ground-surface-type' && inst.pos[0] >= s.bounds[0] && inst.pos[0] <= s.bounds[2] && inst.pos[2] >= s.bounds[1] && inst.pos[2] <= s.bounds[3]);
  if (!host) { push('flush_contact', `${inst.id} anchor point is not on any ground segment.`); return issues; }
  const sy = segSurfaceY(host);
  if (Math.abs(inst.pos[1] - sy) > 0.001) push('flush_contact', `${inst.id} base y=${inst.pos[1]} != host ${host.id} surface y=${sy}; snap-ground requires flush (gap 0, penetration 0).`);
  // default-deny: every non-ground segment volume is a blocker; allowlist is schema text
  const box = footprintAABB(inst.pos, sizeOf(inst, object), inst.rotY);
  for (const s of segments) {
    if (s.category === 'ground-surface-type') continue;
    if (aabbOverlapArea(segBox(s), box) > 0.01) push('intersect_allowlist', `${inst.id} intersects ${s.id} (${s.category}); not in the schema allowlist.`);
  }
  // other instances (except the host contact): full footprint overlap is a violation
  for (const other of state.instances) {
    if (other.id === inst.id) continue;
    const oo = objectsById?.get(other.objectId);
    if (!oo) continue;
    const area = aabbOverlapArea(box, footprintAABB(other.pos, sizeOf(other, oo), other.rotY));
    if (area > 0.001) push('intersect_allowlist', `${inst.id} intersects instance ${other.id}; not in the schema allowlist.`);
  }
  // route clearance
  const rd = pointRouteDistance(inst.pos, routes || []);
  if (rd < (c.routeClearanceM ?? 2)) push('route_clearance', `${inst.id} is ${rd.toFixed(2)}m from a route; >= ${c.routeClearanceM ?? 2}m required.`);
  // lamp spacing
  if (c.lampSpacingM !== undefined) {
    for (const other of state.instances) {
      if (other.id === inst.id || other.objectId !== inst.objectId) continue;
      if (Math.hypot(other.pos[0] - inst.pos[0], other.pos[2] - inst.pos[2]) < c.lampSpacingM) {
        push('lamp_spacing', `${inst.id} is within ${c.lampSpacingM}m of another ${inst.objectId} (${other.id}).`);
      }
    }
  }
  // arm orientation: toward nearest route point (editor-computed; gate re-derives)
  if (routes?.length) {
    let best = null;
    for (const r of routes) for (const w of (r.waypoints || [])) {
      const d = Math.hypot(w[0] - inst.pos[0], w[1] - inst.pos[2]);
      if (!best || d < best.d) best = { d, w };
    }
    if (best) {
      const az = Math.atan2(best.w[0] - inst.pos[0], best.w[1] - inst.pos[2]);
      const diff = Math.abs(((inst.rotY - az) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (diff > Math.PI / 12) push('arm_orientation', `${inst.id} arm azimuth off by ${(diff * 180 / Math.PI).toFixed(1)} deg (max 15).`);
    }
  }
  // visibility: >= 1 canonical view
  if (views) {
    const seen = views.some(v => {
      const a = [inst.pos[0] - v.position[0], inst.pos[1] - v.position[1], inst.pos[2] - v.position[2]];
      const b = [v.target[0] - v.position[0], v.target[1] - v.position[1], v.target[2] - v.position[2]];
      const na = Math.hypot(...a), nb = Math.hypot(...b);
      if (na > 350) return false;
      const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb || 1);
      return Math.acos(Math.max(-1, Math.min(1, dot))) < (v.fov / 2) * Math.PI / 180 + 0.25;
    });
    if (!seen) push('not_in_view', `${inst.id} is not inside any canonical survey view frustum.`);
  }
  return issues;
}

export function validateWorld(state, segments, objectsById) {
  const issues = [];
  const drift = baseDrift(state);
  if (drift) issues.push({ severity: 'error', code: 'world_drift', message: `Canonical base changed (${state.base.sha256} -> ${drift}); refresh working state.`, refs: [CANONICAL_PATH] });
  let regCache = null;
  const reg = () => {
    if (regCache !== null) return regCache;
      const p = wallsPathEnv();
    regCache = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : false;
    return regCache;
  };
  for (const inst of state.instances) {
    const object = objectsById.get(inst.objectId);
    if (!object) { issues.push({ severity: 'error', code: 'object_unknown', message: `Instance ${inst.id} references unknown object ${inst.objectId}.`, refs: [inst.id] }); continue; }
    if (object.status !== 'authored') issues.push({ severity: 'error', code: 'object_not_authored', message: `Instance ${inst.id} holds object ${object.id} with status "${object.status}"; only authored objects may be integrated.`, refs: [inst.id, object.id] });
    if (process.env.DEBUG_STALE && inst.objectSha !== objectContentSha(object)) console.error('DBG-STALE', inst.id, inst.objectId, 'inst:', inst.objectSha?.slice(0,8), 'live:', objectContentSha(object).slice(0,8));
    if (inst.objectSha && inst.objectSha !== objectContentSha(object)) issues.push({ severity: 'error', code: 'instance_stale_object', message: `Instance ${inst.id} was integrated against an older revision of ${object.id}; re-inspect and re-integrate.`, refs: [inst.id, object.id] });
    if (object.contract?.placement?.mode === 'snap-ground') {
      issues.push(...checkPlacement(state, segments, inst, object, canonicalBase().routes, loadViews(), objectsById));
      continue;
    }
    if (inst.openingId) {
      // opening children validate through the wall registry (extent + siblings), not AABB hosts
      const r = reg();
      const opening = r && r.openings?.find(o => o.id === inst.openingId);
      if (!r || !opening) { issues.push({ severity: 'error', code: 'opening_unknown', message: `Instance ${inst.id} references missing opening ${inst.openingId}.`, refs: [inst.id] }); continue; }
      const wall = r.walls.find(w => w.id === opening.wallId);
      if (!wall) { issues.push({ severity: 'error', code: 'wall_unknown', message: `Opening ${opening.id} wall ${opening.wallId} missing.`, refs: [inst.id] }); continue; }
      const len = wall.hi - wall.lo, center = wall.lo + opening.t * len;
      const a = center - opening.width / 2, c = center + opening.width / 2;
      if (a < wall.lo + 0.04 || c > wall.hi - 0.04) issues.push({ severity: 'error', code: 'opening_overflow', message: `Opening ${opening.id} span [${a.toFixed(2)},${c.toFixed(2)}] exits wall ${wall.id}.`, refs: [inst.id, wall.id] });
      for (const sib of r.openings.filter(o => o.wallId === wall.id && o.id !== opening.id)) {
        const sl = wall.hi - wall.lo, sc = wall.lo + sib.t * sl;
        const sa2 = sc - sib.width / 2, sc2 = sc + sib.width / 2;
        if (a < sc2 - 0.04 && sa2 < c - 0.04) issues.push({ severity: 'error', code: 'openings_overlap', message: `Openings ${opening.id} and ${sib.id} overlap on ${wall.id}.`, refs: [inst.id, sib.id] });
      }
      continue;
    }
    issues.push(...checkInstance(state, segments, inst, object).issues);
  }
  // pairwise instance overlap (construction seams tolerate 5 m^2, matching generator gate tolerance)
  for (let i = 0; i < state.instances.length; i++) {
    for (let j = i + 1; j < state.instances.length; j++) {
      const a = state.instances[i], b = state.instances[j];
      const oa = objectsById.get(a.objectId), ob = objectsById.get(b.objectId);
      if (!oa || !ob) continue;
      const area = aabbOverlapArea(footprintAABB(a.pos, sizeOf(a, oa), a.rotY), footprintAABB(b.pos, sizeOf(b, ob), b.rotY));
      const disallow = (oa.contract?.overlap ?? 'disallow') === 'disallow' && (ob.contract?.overlap ?? 'disallow') === 'disallow';
      if (area > (disallow ? 0.5 : 5)) issues.push({ severity: 'error', code: 'instance_overlap', message: `Instances ${a.id} and ${b.id} overlap by ${area.toFixed(1)} m^2.`, refs: [a.id, b.id] });
    }
  }
  return issues;
}

const fmtBox = b => `[${b.minX.toFixed(1)},${b.minZ.toFixed(1)} .. ${b.maxX.toFixed(1)},${b.maxZ.toFixed(1)}]`;

// ---------- bounded output ----------
export function budget(result) {
  const text = JSON.stringify(result);
  if (text.length <= OUTPUT_LIMIT) return result;
  return { ok: false, error: { code: 'result_too_large', message: `Result exceeded the ${OUTPUT_LIMIT}-char output budget. Narrow the region, lower the limit, or request fewer fields.` } };
}
