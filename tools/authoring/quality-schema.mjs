// Asset-quality schema gate: data-driven variant modifiers and LOD chains.
// Complements checkObjectQuality (shape gate in lib.mjs): an object can pass the
// shape gate and still be unrenderable/unauthorable if its variants lie about
// parameters or its LOD chain is degenerate.

const MODIFIERS = new Set(['weathering', 'damage']);

export function checkVariantSchema(object) {
  const issues = [];
  const push = (code, message) => issues.push({ severity: 'error', code, message, refs: [object.id] });
  const variants = object.variants || [];
  const ids = variants.map(v => v.id);
  if (new Set(ids).size !== ids.length) {
    push('variant_schema_duplicate_ids', `${object.id} has duplicate variant ids.`);
  }
  for (const v of variants) {
    if (v.id === 'clean') continue;
    if (!MODIFIERS.has(v.modifier)) {
      push('variant_schema_unknown_modifier', `${object.id} variant "${v.id}" uses modifier "${v.modifier ?? 'none'}"; the overlay renderer supports weathering|damage only.`);
      continue;
    }
    if (v.modifier === 'weathering') {
      // master age factor: 0 pristine -> 1 abandoned; renderer maps wear to color darkening + roughness
      const wear = v.params?.wear;
      if (!(typeof wear === 'number' && wear > 0 && wear <= 1)) {
        push('variant_schema_weathering_wear', `${object.id} variant "${v.id}" params.wear must be a number in (0, 1]; got ${JSON.stringify(wear)}.`);
      }
    }
    if (v.modifier === 'damage') {
      const level = v.params?.level;
      if (!(Number.isInteger(level) && level >= 1 && level <= 2)) {
        push('variant_schema_damage_level', `${object.id} variant "${v.id}" params.level must be an integer in [1, 2]; got ${JSON.stringify(level)}.`);
      }
    }
  }
  issues.push(...checkLodChain(object));
  return issues;
}

// LOD contract (optional): MSFT_lod-style chain on the object itself. levels[0] is
// the authored mesh; lower levels must shed >= 30% of triangles each and screen
// coverage must strictly decrease within (0, 0.5].
export function checkLodChain(object) {
  const issues = [];
  const push = (code, message) => issues.push({ severity: 'error', code, message, refs: [object.id] });
  const lod = object.contract?.lod;
  if (!lod) return issues;
  const levels = lod.levels || [];
  if (levels.length < 2) {
    push('lod_chain_too_short', `${object.id} contract.lod needs >= 2 levels (authored mesh + at least one lower LOD).`);
    return issues;
  }
  for (let i = 1; i < levels.length; i++) {
    const hi = levels[i - 1], lo = levels[i];
    if (!(Number.isInteger(hi.tris) && Number.isInteger(lo.tris)) || lo.tris <= 0) {
      push('lod_chain_tris', `${object.id} lod levels[${i}] tris must be positive integers.`);
      continue;
    }
    if (lo.tris >= hi.tris || hi.tris / lo.tris < 1.3) {
      push('lod_chain_tri_ratio', `${object.id} lod level ${i} must shed >= 30% triangles (${hi.tris} -> ${lo.tris}).`);
    }
    const cov = lo.coverage;
    const prev = i === 1 ? levels[0].coverage ?? 0.5 : levels[i - 1].coverage;
    if (!(typeof cov === 'number' && cov > 0 && cov <= 0.5 && cov < prev)) {
      push('lod_chain_coverage', `${object.id} lod levels[${i}] coverage must strictly decrease and stay in (0, 0.5]; got ${JSON.stringify(cov)} after ${prev}.`);
    }
  }
  return issues;
}
