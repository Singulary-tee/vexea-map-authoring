// Collapse function: construction.parts (spline params) -> mesh group. Deterministic.
// Shared by the generator overlay (node) and the object inspector (browser).
// Vocabulary: lathe (revolved spline profile), sweep (tube along Catmull-Rom spline),
// extrude (2D spline shape + bevel). Boxes are not in the vocabulary by schema.
import {
  Vector2, Vector3, LatheGeometry, TubeGeometry, ExtrudeGeometry,
  CatmullRomCurve3, Shape, Mesh, Group,
} from 'three';

export const RING_SEGMENTS = 32;
export const TUBULAR_SEGMENTS = 24;

const v2 = a => a.map(p => new Vector2(p[0], p[1]));
const v3 = a => a.map(p => new Vector3(p[0], p[1], p[2]));

function latheGeometry(profile, segments = RING_SEGMENTS) {
  if (profile.length < 4) throw new Error('lathe profile needs >= 4 points (spline rule)');
  return new LatheGeometry(v2(profile), segments);
}

function sweepGeometry(path, { radius, tubular = TUBULAR_SEGMENTS, radial = RING_SEGMENTS }) {
  if (path.length < 3) throw new Error('sweep path needs >= 3 points (spline rule)');
  const curve = new CatmullRomCurve3(v3(path));
  return new TubeGeometry(curve, tubular, radius, radial, false);
}

function extrudeGeometry(shape2d, { depth, bevel = 0.006 }) {
  if (shape2d.length < 4) throw new Error('extrude shape needs >= 4 points (spline rule)');
  const shape = new Shape(v2(shape2d));
  return new ExtrudeGeometry(shape, {
    depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24,
  });
}

// teardrop head cross-section (8 control points, schema §2 part 8)
const TEARDROP = [
  [0.42, 0.02], [0.30, 0.105], [0, 0.14], [-0.30, 0.105],
  [-0.42, 0.02], [-0.36, -0.035], [0, -0.055], [0.36, -0.035],
];

// returns { meshes: [{geometry, position, rotationEuler}], triEstimate }
export function buildPartDef(part) {
  const kind = part.kind;
  switch (kind) {
    case 'lathe': {
      const geo = latheGeometry(part.profile, part.segments ?? RING_SEGMENTS);
      return { geometry: geo, triEstimate: (part.profile.length - 1) * (part.segments ?? RING_SEGMENTS) * 2 };
    }
    case 'sweep': {
      const geo = sweepGeometry(part.path, { radius: part.radius, tubular: part.tubular ?? TUBULAR_SEGMENTS, radial: part.radial ?? RING_SEGMENTS });
      return { geometry: geo, triEstimate: (part.tubular ?? TUBULAR_SEGMENTS) * (part.radial ?? RING_SEGMENTS) * 2 };
    }
    case 'extrude': {
      const shape2d = part.shape ?? TEARDROP;
      const geo = extrudeGeometry(shape2d, { depth: part.depth, bevel: part.bevel ?? 0.006 });
      return { geometry: geo, triEstimate: shape2d.length * 24 };
    }
    case 'disc': {
      const geo = latheGeometry([[0, 0], [part.size[0] / 2, 0], [part.size[0] / 2, part.size[1]], [0, part.size[1]]], part.segments ?? RING_SEGMENTS);
      return { geometry: geo, triEstimate: 2 * (part.segments ?? RING_SEGMENTS) };
    }
    case 'cylinder': {
      const geo = latheGeometry([[0, 0], [part.size[0] / 2, 0], [(part.topR ?? part.size[0] / 2), part.size[1]], [0, part.size[1]]], part.segments ?? RING_SEGMENTS);
      return { geometry: geo, triEstimate: 2 * (part.segments ?? RING_SEGMENTS) };
    }
    default:
      throw new Error(`part kind "${kind}" not in vocabulary (boxes are banned by schema)`);
  }
}

const eulerY = rot => rot;

// build the full group; mats: {name: Material}; variant: {modifier, params}
export function buildObject(construction, mats, variant = { id: 'clean' }, hooks = {}) {
  const group = new Group();
  const broken = variant?.modifier === 'damage';
  const weather = variant?.modifier === 'weathering' ? (variant.params?.wear ?? 0.4) : 0;
  let tris = 0;
  for (const part of construction.parts) {
    if (broken && part.damageDrop) continue;
    if (!broken && part.damageOnly) continue;
    const def = buildPartDef(part);
    tris += def.triEstimate;
    const mat = mats[part.mat] ?? mats.default;
    const mesh = new Mesh(def.geometry, typeof mat === 'function' ? mat() : mat);
    mesh.position.set(part.pos?.[0] ?? 0, part.pos?.[1] ?? 0, part.pos?.[2] ?? 0);
    if (part.rotY) mesh.rotation.y = eulerY(part.rotY);
    if (part.rotZ) mesh.rotation.z = part.rotZ;
    if (part.rotX) mesh.rotation.x = part.rotX;
    if (broken && part.damageRotate && (variant.params?.level ?? 1) >= 2) {
      // rotate about the part's own base so limbs tilt, not orbit
      const pivot = new THREE.Group();
      pivot.position.copy(mesh.position);
      mesh.position.set(0, 0, 0);
      pivot.add(mesh);
      pivot.rotation.set(part.damageRotate * 0.3, part.damageRotate, part.damageRotate * 0.25);
      group.add(pivot);
      hooks.part?.(part, mesh);
      continue;
    }
    if (weather) {
      const m = mesh.material;
      if (m.color) m.color.multiplyScalar(1 - weather * 0.4);
      if ('roughness' in m) m.roughness = Math.min(1, (m.roughness ?? 0.6) + weather * 0.3);
    }
    group.add(mesh);
    hooks.part?.(part, mesh);
  }
  return { group, tris };
}

// silhouette rule (schema §2): project vertices to 3 ortho views, rasterize, measure
// longest straight boundary run; vertical runs inside the pole column are the allowed
// exception. Returns per-view max run in meters.
export function silhouetteRuns(group, { cell = 0.1, limit = 0.6, poleHalfWidth = 0.18, exempt = {} } = {}) {
  const pts = [];
  const v = new Vector3(), e = new (import('three').Euler || Object)(); // euler via group child rotation
  group.traverse(m => {
    if (!m.isMesh) return;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (m.rotation) v.applyEuler(m.rotation);
      pts.push([v.x + m.position.x, v.y + m.position.y, v.z + m.position.z]);
    }
  });
  const views = { top: [0, 2], front: [0, 1], side: [2, 1] };
  const out = {};
  for (const [name, [a, b]] of Object.entries(views)) {
    const occ = new Set();
    for (const p of pts) occ.add(`${Math.round(p[a] / cell)}:${Math.round(p[b] / cell)}`);
    const boundary = [...occ].filter(k => {
      const [x, y] = k.split(':').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (!occ.has(`${x + dx}:${y + dy}`)) return true;
      return false;
    });
    const bset = new Set(boundary);
    let maxRun = 0, maxInfo = null, violation = null;
    for (const key of boundary) {
      const [x, y] = key.split(':').map(Number);
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        if (bset.has(`${x - dx}:${y - dy}`)) continue;
        let n = 0, cx = x, cy = y;
        while (bset.has(`${cx}:${cy}`)) { n++; cx += dx; cy += dy; }
        if (n > maxRun) {
          maxRun = n; maxInfo = [x * cell, y * cell, cx * cell, cy * cell];
          const vertical = dx === 0 && dy === 1;
          const inPole = vertical && Math.abs(x * cell) <= poleHalfWidth;
          // schema-declared intrinsic runs: arm/head bands (schema §2 silhouette rule rev 2.1)
          const yLo = Math.min(y, cy) * cell, yHi = Math.max(y, cy) * cell;
          const inHeadBand = (exempt.headBand && dy === 0 && yHi >= exempt.headBand[0] && yLo <= exempt.headBand[1]);
          const inArmRow = exempt.armRow !== undefined && name === 'top' && dy === 0 && Math.abs(y * cell - exempt.armRow) <= (exempt.armRowHalfWidth ?? 0.25);
          const inBaseBand = exempt.baseBand && dy === 0 && yHi <= exempt.baseBand[1] && yLo >= exempt.baseBand[0];
          const inArmEnv = exempt.armEnvelope && (() => {
            const [x0, x1] = exempt.armEnvelope.x, [y0, y1] = exempt.armEnvelope.y;
            const ax = name === 'side' ? Math.min(x, y) : x, ay = name === 'side' ? Math.max(x, y) : y;
            void ax; // side view: a=z — the arm is at z~0; envelope test on b=y + a range
            return x * cell >= x0 - 1e-9 && cx * cell <= x1 + 1e-9 && ay * cell >= y0 && ay * cell <= y1;
          })();
          if (n * cell > limit && !inPole && !inHeadBand && !inArmRow && !inBaseBand && !inArmEnv) violation = { view: name, meters: +(n * cell).toFixed(2), at: maxInfo };
        }
      }
    }
    out[name] = { maxRunM: +(maxRun * cell).toFixed(2), violation };
  }
  return out;
}

// part-chain connectivity (schema §7): every part must reach the anchor part through
// pairwise contact (AABB overlap with tolerance); floating parts = schema violation
export function connectivityReport(builtParts, { anchor = 0, tol = 0.01 } = {}) {
  const boxes = builtParts.map(b => b.aabb);
  return null;
}
// simpler public API: given [{name, min, max}] world AABBs, return disconnected part names
export function findDisconnected(parts, { anchorName = null, tol = 0.02 } = {}) {
  const list = parts.map(p => ({ name: p.name, min: p.min, max: p.max }));
  if (!list.length) return [];
  // seed by INDEX: the anchor is identified by name but BFS walks indices
  const anchorIdx = anchorName && list.findIndex(x => x.name === anchorName);
  const touched = new Set([anchorIdx >= 0 ? anchorIdx : 0]);
  let changed = true;
  const touch = (a, b) => a.min[0] <= b.max[0] + tol && b.min[0] <= a.max[0] + tol &&
    a.min[1] <= b.max[1] + tol && b.min[1] <= a.max[1] + tol &&
    a.min[2] <= b.max[2] + tol && b.min[2] <= a.max[2] + tol;
  while (changed) {
    changed = false;
    for (let i = 0; i < list.length; i++) {
      if (!touched.has(i)) continue;
      for (let j = 0; j < list.length; j++) {
        if (touched.has(j)) continue;
        if (touch(list[i], list[j])) { touched.add(j); changed = true; }
      }
    }
  }
  return list.map((p, i) => ({ name: p.name, connected: touched.has(i) })).filter(x => !x.connected && x.name !== (anchorName || list[0].name));
}
