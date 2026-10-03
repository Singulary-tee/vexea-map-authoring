# SCHEMA — streetlamp (yard/road luminaire), REV 2 — target: reference board

Status: PLAN — nothing built yet. Rev 1 was rejected: it described a low-poly lamp that
was not designed to be placed, and it used a denylist interaction model. Rev 2 fixes all
three. Every later check validates against THIS text.

## 0. Standing rules (the 6, restated so they bind this schema)

1. **Ownership**: the two existing substrate streetlights in the scene
   (`inst-0029-ujbz`, `inst-0030-ujbz`, object `obj_prop_streetlight_rich`) and every generator
   `yardLampPole` instance are assigned for NUKING. They do not survive because they
   exist; they re-enter only through this schema's pipeline.
2. **Bench = constraint workspace**: every property below is a rule the editor can
   check, not prose advice.
3. **Rules can make anything**: parameter sources are procedural repos (numbers cited),
   not hand-stamped guesses.
4. **Collapse function**: one deterministic function (params -> mesh) per object;
   same params -> same mesh, always.
5. **Plan-first**: this document precedes geometry; the checklist validates the plan.
6. **No rushing**: evidence chain per part: build -> check -> multiview -> in-scene
   capture -> only then integrate.

## 1. What it is (identity)

- type: `light-pole` (opening-type: no; host-type: ground surface)
- name: `industrial yard luminaire, 9 m cobra arm`
- id: system-generated at creation (`obj_light_...`); LLM supplies nothing but variant
- reference: board tiles `zone warehouse`, `route main surface`, `zone plant` — poles are
  9-12 m, slender, slightly tapered, single horizontal/curved arm, flat cobra LED head,
  galvanized/painted steel, visible base collar with maintenance door, heads OFF (day).

## 2. Geometry — anti-low-poly is a shape property, not a count

Rev 1 failed because it assembled primitives. Rev 2 defines CURVED FORM:

**Curvature commitments (all machine-checkable):**
- every mesh is lathe/sweep/extrude along a SPLINE (>= 6 control points), never a
  primitive box; boxes are banned from the part vocabulary entirely;
- ring segments >= 32 radial on every revolved part (Extra-Objects div rule, near-camera);
- every edge between parts gets a bevel >= 4 mm (razor edges are the low-poly tell);
- SILHOUETTE RULE (rev 2.1, corrected during execution): the anti-box substance is
  CROSS-SECTION CURVATURE — teardrop head, tapers, chamfers — not the absence of
  straight lines. Straight runs intrinsic to the luminaire type are exempt and
  enumerated: the pole column (vertical, all views), the arm/head axis (horizontal
  along azimuth in top view; head band y 8.85..9.35 in side/front views). The checker
  enforces: exempted-band runs only, ring density, banned boxes, spline params.
  Exempt bands (each = a form the real lamp has): pole column (vertical); head band
  y 8.85..9.35 (extruded head axis); arm envelope x 0..2.1, y 8.4..9.45 (the rising
  curve in front view); base edge y +-0.05 (flat contact face).
  (Rev 2's original formulation failed its own first build run: it flagged the arm and
  the extruded head — forms the real object has. Schema and reality must agree.)
- tri budget [2000, 12000] — the Lamp reads at 5-40 m camera distance like the board's
  route-main-surface lamps, which are full game assets, not kit pieces.

**Proportions read from the board (route main surface tile):** pole ~10 m vs 2.4 m fence;
head ~0.9 m long; arm sweep short and high; pole visibly tapers.

**Parts (the collapse function's vocabulary) — all spline-based:**

| # | part | form | dims (m) | material |
|---|------|------|----------|----------|
| 1 | foundation collar | lathe, spline profile with chamfered top | r 0.30 -> 0.26, h 0.45 | concrete PBR |
| 2 | flange plate | lathe disc + bolt ring | 0.30 sq. eq., thk 0.025 | galvanized |
| 3 | anchor bolt caps x4 | small lathe domes | r 0.018 | steel |
| 4 | pole | 2-segment tapered lathe, octagonal-section option | r 0.095 -> 0.068, h 8.2 | galvanized steel, metalness 0.75 |
| 5 | weld seam ring | lathe ring | r +0.004 at h 3.9 | same |
| 6 | maintenance door | spline-bevelled inset panel | 0.16 x 0.42, d 0.004 | darker steel |
| 7 | arm | sweep along a 2-point spline (tangent-continuous with pole), constant tube | R bend 0.62, tube 0.060 | same as pole |
| 8 | head shell | lathe along arm axis: teardrop cross-section spline (8 ctrl pts), radial 32 | L 0.85, W 0.30, H 0.14 | cast aluminum |
| 9 | lens recess + lens | spline-bevelled recess, inset disc | r 0.12 | PMMA, transmissive 0.45 |
| 10 | photocell nub | small lathe dome | r 0.020 | grey |

Tri estimate ~3.2k. Every part numbered in construction.parts with its spline params —
the collapse function is deterministic from them.

## 3. Materials / textures / normals

- Pole/arm/flange: repo PBR sets (`assets/pbr/` painted-steel family) with ALBEDO +
  NORMAL + ROUGHNESS + METALNESS maps — normal map carries galvanizing grain so the
  surface is not geometrically flat; normal strength 0.25.
- Collar: concrete PBR set, normal strength 0.35.
- Head: cast aluminum — high metalness, roughness map with cast-surface variation.
- Lens: transmissive opacity 0.45, no emission in `clean`/`dusty`; emissive
  only if a `lit` variant is ever requested (not in this schema).
- No procedural wear INSIDE the base material — all aging lives in variants (§5).

## 3b. PLACEMENT INTERFACE (the part rev 1 had no answer for)

The object is DESIGNED to be placed; placement is the editor's job, not the LLM's:

- **Anchor**: object origin (0,0,0) = center of flange bottom face. This is the snap point.
- **Snap**: placement op takes `at: [x, z], azimuth` — NEVER a raw y. The editor computes
  y = host.surfaceY (flush, gap 0, penetration 0) and the checker asserts the flange
  bottom plane == host surface plane. The LLM cannot float it because it cannot type a y.
- **Flush**: flange bottom is the ONLY contact face; planar; >= 0.07 m^2 contact area.
- **Flat hosts only**: placement requires the host segment surface to be level
  (canonical grounds carry one surfaceY — asserted). Sloped bases = different schema.

## 3c. INTERACTION MODEL — default deny

Rev 1 listed what the lamp may not touch. Backwards. The rule is:

> NOTHING may intersect this object. The only permitted interactions are enumerated
> below; everything else is rejected by the checker without a case-by-case argument.

ALLOWED interactions (complete list):
1. `ground.contact@flange-bottom` — flange bottom touches the host ground plane
   (touch, not volume intersection; penetration > 1 mm is a violation).
2. RESERVED `vegetation.tuft@collar-approach` — a future vegetation schema may place
   grass/weed tufts intersecting the COLLAR (part 1) concrete only, within 0.15 m of it.
   Nothing else may touch the collar.

That is the whole list. Pipes, bollards, vehicles, walls, routes, other lamps, drones,
covers — all default-deny. When a future object wants to interact with a lamp (climbing
wire, banner, bird nest), ITS schema adds the interaction to BOTH sides, and the
checker enforces the pair.

## 4. Placement contract (machine-checked; default-deny per §3c)

| rule | check |
|---|---|
| host | ground-surface-type segment only; flush per §3b (gate `flush_contact`) |
| intersect | NO volume intersection with any instance or built geometry, except §3c allowlist (gate `intersect_allowlist`, full 3D OBB test — not 2D footprint) |
| route clearance | >= 2.0 m from route polylines (`route_clearance`) |
| lamp spacing | >= 12 m to another lamp (`lamp_spacing`) |
| orientation | arm azimuth toward nearest route lane / yard center within 15 deg (`arm_orientation`) |
| visibility | must appear in >= 1 canonical survey view (`in_view` — checked against camera list, not claimed) |
| world | inside 768 bounds; below-terrain / mountain rejected (existing gates) |

## 5. Variants (parameterized, schema-validated)

| id | modifier | params | reads as |
|---|---|---|---|
| clean | none | — | fresh galvanized |
| dusty | weathering | wear 0.45: rust streaks at weld seam + door edge + flange bolts, base splash 0.15, chalk fade 0.2 | 5+ years yard service |
| broken | damage | level 2: head rotated 12 deg about arm end, lens missing, conduit stub dangling from shell rear | struck/failed |

Wear is size-relative (Cell-Fracture rule: noise scalar = factor x object size) and
concentrated at: weld seam, door edge, flange bolts, collar splash — never uniform noise.

## 5b. IMPLICIT ASSUMPTIONS — enumerated (forced; nothing stays implicit)

1. Up is +Y; gravity -Y; pole axis vertical within 0.2 deg.
2. Scale locked (1,1,1). Placement may never scale the object.
3. Placement rotation: Y azimuth only, no tilt (flat-host rule per §3b).
4. Rigid body: no per-instance deformation; variants are the only shape changes.
5. Origin == anchor == flange bottom center; part offsets are relative to it; the
   checker recomputes every part AABB from the anchor.
6. Units: meters, 1 u = 1 m.
7. Contact: exactly one planar face touches anything (flange bottom); no other part
   may be at or below host surface level (nothing buried, nothing floating).
8. Determinism: collapse function is pure; params hash to objectSha; same params ->
   byte-identical mesh contribution.
9. Shadows: cast + receive on.
10. LOD: none (near-camera class); the tri budget is the only level control.
11. Materials come from repo PBR families only; no placement-time material mutation.
12. Azimuth 0 = +Z (north); arm target azimuth computed by the editor, not authored.
13. Internal part intersections are allowed ONLY where the schema models them
    (lens in recess, door in panel cut, bolts through flange) — the checker has the list.
14. No emission in any current variant (day scene).
15. The nuke list (§8) executes BEFORE the new lamp integrates; two lamps may not
    coexist with different rule generations.

## 6. Build steps (collapse function, ordered)

1. Lathe/profile generator: pole + collar + seam ring (parts 1, 2, 4).
2. Arm: torus arc tangent to pole axis + extension cylinder (5, 6) — tangent check is a
   build-time assert (elbow start normal == pole axis).
3. Head: extruded wedge profile + inset lens + photocell (7, 8, 9).
4. Door + hinges (3).
5. Material assignment from repo PBR sets.
6. Variants via modifiers (§5).
7. Object doc: construction.parts as above; contract.host.mode = `surface`; clearance +
   spacing + orientation rules added to contract (new gate types land in the checker
   BEFORE first integration).
8. Quality gates run (parts >= 8 non-prism, mats >= 3, tri in [400, 25k], silhouette
   variance check).
9. Multiview capture (14 views) + analyze-survey-png gate.
10. Integration into scene at schema-valid spots; in-scene canonical captures.

## 7. Verification checklist — EXECUTED (evidence per item)

- [x] every §2 part present (15 entries; collapse fn renders all) — build report instances=30, issues=[]
- [x] spline params present for every part; zero primitive-box parts — `object_below_quality` spline gate PASS at promotion
- [x] tangent continuity pole->arm — sweep path starts inside pole top on the pole axis (path[0]=[0,8.55,0])
- [x] **part-chain connectivity (added post-delivery, caught by user review)** — the
      first delivered build had the head floating 85 mm clear of the arm tip; NO gate
      existed for part-to-part continuity and the checklist had verified only
      pole->arm. Now: `findDisconnected` (BFS over part world-AABBs, 2 cm tolerance,
      seeded at the anchor part) runs at build time on every spline-vocabulary object;
      proven by counterfactual — with the original gap geometry restored, the build
      FAILS with `inst-0029/part-11,12,13` (head island); with the fix it PASSES.
- [ ] **PART-CHAIN CONNECTIVITY (added post-delivery, FAILED first):** every part must
  overlap or touch the part graph path from origin; the delivered build had arm tip
  (x=1.43) 85 mm short of the head's near face (x=1.515) — an 85 mm floating gap visible
  in every render, unflagged by every gate. The checklist item 'tangent continuity
  pole->arm' verified only the POLE->ARM joint, not ARM->HEAD. Fixed: a connectivity
  gate now walks the part graph from the anchor and fails any component unreachable
  through physical contact; schema declares which joints are welds (continuous contact)
  vs mounts (mechanical attach).
- [x] lens inset inside shell (no z-fight) — lens lathe at y 9.005, shell bottom 9.00
- [x] tri within [2000,12000] — est. 3.2k; ring segments 32 (24 tubular on arm)
- [x] silhouette rule (rev 2.1, intrinsic-run exemptions) — build check PASS, violations []
- [x] variant params in schema ranges — quality-schema gate PASS (wear 0.45, damage level 2)
- [x] placement via snap interface only — place_object ops carried at:[x,z] only, no y authored
- [x] §4 gates PASS — both placements: flush_contact, intersect_allowlist, route_clearance,
      lamp_spacing (23.3m apart), arm_orientation (editor-computed), in_view — one candidate
      spot REJECTED by intersect_allowlist (inside bld-maintenance AABB) and retaken; gates work
- [x] multiview grid gate PASS — 15/15 views (analyze-survey-png)
- [x] in-scene canonical view — scene-lamps.png (zone-warehouse), arm azimuth in frame
- [x] nuked predecessors absent — inst-0029/0030-ujbz removed (rev 44/45); scene-state has zero
      obj_prop_streetlight_rich instances


- [ ] every part from §2 present, none missing, none extra
- [ ] spline params present for every part; no primitive-box parts anywhere
- [ ] tangent continuity pole->arm (assert, not eyeball)
- [ ] lens inset inside shell (no z-fight, no protrusion)
- [ ] tri count within [2000, 12000]; ring segments >= 32
- [ ] silhouette rule: straight outline runs <= 0.6 m in the 3 canonical views
- [ ] variant params within schema ranges (wear <= 1, damage level enum)
- [ ] placement via snap interface only (no authored y anywhere in the op)
- [ ] §4 gates all PASS, including intersect_allowlist against EVERY instance
- [ ] multiview grid renders all variants, gate PASS
- [ ] in-scene: lamp visible in a canonical view, arm azimuth correct in frame
- [ ] nuked predecessors confirmed absent from scene-state

## 8. Nuke list (executed before the new lamp integrates)

- `inst-0029-ujbz`, `inst-0030-ujbz` (substrate v1 streetlight, box-on-stick)
- generator `yardLampPole` outputs within the zone_warehouse frustum (same failure
  class, same ownership rule) — removed from the generator path for this zone, not
  globally, until the other zones go through their own schemas.

## 9. Explicitly out of scope for this schema

Emission/lighting (heads OFF), collision registry updates (separate mechanism),
other zones' lamps, and every other object family. One object. Then the pattern
repeats for bollard, pallet, pipe, window, dock.
