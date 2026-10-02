// Wall + opening registry: the representation graft (ArchMorph/Alza/IFC pattern).
// Walls are records with thickness and extent; openings are typed children clamped
// to their wall; unhosted or overflowing openings are unrepresentable, not invalid.
// Derived from the canonical map; the canonical file itself is never touched.
import fs from 'node:fs';
import { canonicalBase, BUILDING_CATS, wallsPathEnv, featuresPathEnv } from './lib.mjs';

export const WALLS_PATH = 'authoring/walls.json';
export const FEATURES_PATH = 'authoring/facade-features.json';
export const WALL_THICKNESS = 0.6;

// derive the four walls of every building from canonical bounds
export function deriveWalls() {
  const { sha256: baseSha, segments } = canonicalBase();
  const walls = [];
  const doors = [];
  const byId = new Map(segments.map(s => [s.id, s]));
  for (const s of segments) {
    if (!BUILDING_CATS.includes(s.category)) continue;
    const [x1, z1, x2, z2] = s.bounds;
    const base = Number.isFinite(s.surfaceY) ? s.surfaceY : 0;
    const height = Number.isFinite(s.height) ? s.height : 8;
    const mk = (side, axis, at, lo, hi) => ({ side, axis, at, lo, hi });
    const sides = [
      mk('s', 'z', z1, x1, x2),
      mk('n', 'z', z2, x1, x2),
      mk('w', 'x', x1, z1, z2),
      mk('e', 'x', x2, z1, z2),
    ];
    for (const { side, axis, at, lo, hi } of sides) {
      walls.push({
        id: `wall-${s.id}-${side}`, buildingId: s.id, side, axis, at,
        lo, hi, thickness: WALL_THICKNESS, base, height,
      });
    }
  }
  // door rects: canonical entrance segments bound to buildings via connectivity
  for (const e of segments) {
    if (e.category !== 'entrance-player') continue;
    for (const ref of e.connectivity || []) {
      const host = byId.get(ref);
      if (!host || !BUILDING_CATS.includes(host.category)) continue;
      const [x1, z1, x2, z2] = host.bounds;
      const ex1 = Math.min(e.bounds[0], e.bounds[2]), ex2 = Math.max(e.bounds[0], e.bounds[2]);
      const ez1 = Math.min(e.bounds[1], e.bounds[3]), ez2 = Math.max(e.bounds[1], e.bounds[3]);
      const dists = [
        { side: 's', d: Math.abs((ez1 + ez2) / 2 - z1) },
        { side: 'n', d: Math.abs((ez1 + ez2) / 2 - z2) },
        { side: 'w', d: Math.abs((ex1 + ex2) / 2 - x1) },
        { side: 'e', d: Math.abs((ex1 + ex2) / 2 - x2) },
      ].sort((a, b) => a.d - b.d);
      const side = dists[0].side;
      const onX = side === 'n' || side === 's';
      doors.push({
        id: e.id, buildingId: host.id, side,
        a: onX ? ex1 : ez1, c: onX ? ex2 : ez2,
        y0: 0, y1: (e.height ?? 2.4),
      });
      break;
    }
  }
  return {
    format: 'vexea-walls/0.1',
    base: { path: 'blockout/blockout-full-v1.json', sha256: baseSha },
    walls, doors, openings: [],
  };
}

export function loadRegistry(path = wallsPathEnv()) {
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export function saveRegistry(reg, path = wallsPathEnv()) {
  fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');
}

export function ensureRegistry({ refresh = false } = {}) {
  let reg = loadRegistry();
  const fresh = canonicalBase();
  if (reg && !refresh && reg.base?.sha256 === fresh.sha256) {
    reg.openings = reg.openings || [];
    reg.doors = reg.doors || [];
    return reg;
  }
  const derived = deriveWalls();
  if (reg && reg.base?.sha256 === fresh.sha256) derived.openings = reg.openings || [];
  saveRegistry(derived);
  return derived;
}

// opening extent along the wall axis for center t
export function openingSpan(wall, t, width) {
  const len = wall.hi - wall.lo;
  const center = wall.lo + t * len;
  return { center, a: center - width / 2, c: center + width / 2, len };
}

// Alza's clampOpeningT adapted: full opening must fit inside the wall; null if impossible
export function clampOpeningT(wall, width, t) {
  const len = wall.hi - wall.lo;
  if (width > len - 0.1) return null;
  const half = width / 2;
  const lo = (half + 0.05) / len;
  const hi = (len - half - 0.05) / len;
  return Math.min(hi, Math.max(lo, t));
}

export function openingIssues(reg, opening) {
  const issues = [];
  const wall = reg.walls.find(w => w.id === opening.wallId);
  if (!wall) {
    issues.push({ severity: 'error', code: 'wall_unknown', message: `Wall ${opening.wallId} does not exist; openings must be children of derived walls.`, refs: [opening.id] });
    return issues;
  }
  const span = openingSpan(wall, opening.t, opening.width);
  if (span.a < wall.lo + 0.04 || span.c > wall.hi - 0.04) {
    issues.push({ severity: 'error', code: 'opening_overflow', message: `Opening ${opening.id} span [${span.a.toFixed(2)},${span.c.toFixed(2)}] exits wall ${wall.id} extent [${wall.lo.toFixed(2)},${wall.hi.toFixed(2)}].`, refs: [opening.id, wall.id] });
  }
  // sibling openings and doors on the same wall must not overlap
  const siblings = reg.openings
    .filter(o => o.wallId === wall.id && o.id !== opening.id)
    .map(o => ({ id: o.id, kind: o.kind || 'window', ...openingSpan(wall, o.t, o.width) }))
    .concat(reg.doors
      .filter(d => d.buildingId === wall.buildingId && d.side === wall.side)
      .map(d => ({ id: d.id, kind: 'door', a: d.a, c: d.c })));
  for (const sib of siblings) {
    if (span.a < sib.c - 0.04 && sib.a < span.c - 0.04) {
      issues.push({ severity: 'error', code: 'openings_overlap', message: `Opening ${opening.id} overlaps ${sib.kind} ${sib.id} on ${wall.id}.`, refs: [opening.id, sib.id] });
    }
  }
  // facade features (ribs, bands, vents, lights) recorded by the generator
  if (fs.existsSync(featuresPathEnv())) {
    const feats = JSON.parse(fs.readFileSync(featuresPathEnv(), 'utf8')).features || [];
    const y0 = opening.sill, y1 = opening.sill + opening.height;
    for (const f of feats) {
      if (f.buildingId !== wall.buildingId || f.side !== wall.side) continue;
      if (f.a < span.c - 0.04 && span.a < f.c - 0.04 && f.y0 < y1 - 0.04 && y0 < f.y1 - 0.04) {
        issues.push({ severity: 'error', code: 'opening_hits_feature', message: `Opening ${opening.id} intersects facade ${f.kind} at [${f.a.toFixed(1)},${f.c.toFixed(1)}] y[${f.y0.toFixed(1)},${f.y1.toFixed(1)}] on ${wall.id}.`, refs: [opening.id, wall.id, f.kind] });
      }
    }
  }
  return issues;
}

// world-space placement of an opening's fill (glass centered IN the wall thickness)
export function openingPlacement(reg, opening) {
  const wall = reg.walls.find(w => w.id === opening.wallId);
  const span = openingSpan(wall, opening.t, opening.width);
  const y = wall.base + opening.sill;
  const pos = wall.axis === 'z' ? [span.center, y, wall.at] : [wall.at, y, span.center];
  const rotY = wall.axis === 'z' ? 0 : 90;
  return { pos, rotY, wall, span };
}
