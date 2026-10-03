# STANDING METHODOLOGY — READ THIS FIRST (pointer record; context will not retain it)

> NEXT SESSION: read this file + authoring/schemas/*.md + the representation plan before touching anything.

## The pipeline (mandatory, from the reference plan)
Reference image → Reference-Constrained Spatial State Plan → Execution Plan → Checklist → Build → Verification → Serve.
No building before the execution plan is complete. No building before the checklist is complete.

## Hard rules (learned across this thread; violations were each called out by the user)
1. OWNERSHIP: everything visible in the scene is mine. Buildings, windows, pillars, walls,
   ground — no "predates", no "canonical is exempt", no preserved layer. If it fails
   scrutiny: remove it, rebuild it through the bench, verify, re-integrate.
2. SCHEMA FIRST: every object family gets a written schema (identity, parts+spline
   vocabulary, materials/PBR, placement interface with anchor+snap, default-deny
   interactions with explicit allowlist, variants with parameterized wear, implicit
   assumptions enumerated, nuke list, verification checklist). The user reviews schemas
   BEFORE geometry. Schema = authoring/schemas/<name>.schema.md.
   Template: authoring/schemas/streetlamp.schema.md (rev 2) + warehouse-family.schema.md.
3. DECISIONS IN CODE: gates, not notes. Low-poly refusal, connectivity, flush contact,
   allowlist intersections — all build-failing checks with counterfactual proofs.
4. ANTI-LOW-POLY IS SHAPE: spline/lathe/sweep vocabulary (boxes banned), ring segments
   ≥ 32, bevels ≥ 4mm, tapers, cross-section curvature. See tools/authoring/parts.mjs.
5. DEFAULT-DENY: nothing may intersect an object unless its schema allowlists it
   (e.g. ground.contact@base-contact). Full-3D check, not footprints.
6. PLACEMENT IS THE EDITOR'S JOB: snap-ground ops take at:[x,z]; y and azimuth computed
   by the editor. The LLM cannot float objects (place_object op).
7. NO RUSHING: do fewer things right. If platform signals winding down, SAY SO and stop —
   never compress delivery. A rushed delivery is a delivery of nothing.
8. NO IMPLICIT THINKING: enumerate everything; if it isn't written in a plan/schema, it
   does not exist. The user reviews theses and methodology, not spelling — do not bring
   intermediate checkpoints for approval (that was called "asking the teacher to check
   spelling"). Thesis-level questions only.
9. CRITIC LOOP: fire an adversarial review subagent on surveys and scene captures. Fix
   its findings mechanically (they map to gates), not cosmetically.
10. VERIFICATION MEASURES GEOMETRY, NOT CLAIMS: screenshots are evidence, never permission.
    Connectivity/counterfactual proofs are recorded in the schema checklist.

## Current asset state (as of 2026-10-03, rev 128)
- Pipeline machinery: tools/authoring/{lib,ops,walls,parts,quality-schema}.mjs + cli.mjs;
  snap-ground placement; opening registry (walls.json) with real hole cutting; facade
  feature registry (facade-features.json, 278 features); canonical-views.json (20 views).
- Schema-proven objects (authored, in scene): obj_light_yard_cobra (streetlamp), dockbollardnew,
  brickstarwind (pallet+drums), midnightradiosea (forklift v4), poolwaveprint (puddle),
  barriercoast (jersey), fencesilent (fence+barbed), drumshelfjet (drum cluster),
  cargobracegold (B2 sign). 26 instances. Suites: basics 12/12, failure 33/33.
- KNOWN GAP (user-confirmed): the BUILDINGS are still legacy generator output — pasted
  window bands (97), ribs/dock doors/vents as code, no B2 facade. THE BUILDING LAYER IS
  NOT YET SCHEMA'D. Windows/pillars/walls ARE objects under the ownership rule.
- Scene vs reference (zone warehouse tile): ground identity (tan sand vs wet asphalt),
  lighting (no overcast/contact shadows in canonical path), composition density, dock
  face rhythm — all called out by adversarial critic round 3 (2/10 resemblance).
- Round-3 critic's ordered fix list: ground identity → forklift readable silhouette →
  drum material unification+texture → black-slab family material → overcast light+contact
  shadows+composition clusters.

## What was explicitly forbidden by the user
- Treating canonical/pinned files as an exemption from ownership.
- Hand-tuned one-off coordinate fixes presented as "fixes" (band-aids) — structural fixes only.
- Bringing intermediate object-level results for approval (spelling-check behavior).
- Declaring anything done from textual claims or green gates without geometry evidence.
- "I froze X" / scope excuses. Everything is my responsibility.

## CRITIC ROUND 6 VERDICT (2026-10-03, final): DO NOT SERVE
- B2 facade: bay is a see-through hole (sky visible), not a dark recess — the bay
  interior box exists in the doc but renders behind the opening plane; must be rebuilt
  so the interior is visible from the canonical camera (dark box aligned to the bay
  opening, not floating behind it).
- White apron quad in-scene: the apron's wet-asphalt material renders WHITE in the
  canonical path — material key mismatch or texture load failure at scene scale.
  The inspector path renders it dark; the scene path does not. Split-brain NOT fully
  closed for the apron materials.
- Puddle white halos persist in-scene (object-board renders are dark) — same class:
  scene-side material resolution for puddle sub-parts.
- B2 glyphs, personnel door leaves, bollards, dumpsters, guard rail, conifers: present
  in scene-state but NOT VISIBLE in the canonical capture — either out of frame, behind
  the facade, or culled. Verify placement frames vs camera frustum before next capture.
- Honest status: NOT SERVED. Suites green (12/12, 33/33, blockout ALL PASS) prove the
  pipeline; the pixel evidence says the visual target is not met.
- NEXT SESSION WORK ORDER (from critic rounds 4-6): (1) verify scene-side material
  resolution for apron/puddles in the GLB, (2) confirm glyph/door/bollard visibility
  from the canonical camera, (3) bay interior depth fix, (4) overcast lighting + contact
  shadows in the canonical path, (5) forklift silhouette pass, (6) ground material.

## CRITIC ROUND 7 VERDICT (2026-10-03): DO NOT SERVE — 3 PASS / 6 FAIL
PASSES: bollards (in frame, correct), pallets (read correctly), drums (recognizable).
FAILS: bay not dark at canonical distance (sky visible through opening), apron light gray
not dark (hot specular), B2 sign absent from all faces, warehouse reads as two masses,
puddles on sand not on apron, forklift at wrong position (half-cropped, not at bay).
SCORE: 3/10 resemblance. Key insight: the two load-bearing anchors (deep dark bay + wet
dark apron) are the two that still fail. Everything else is improving.

### Round 8 work order (from round 7, ordered by impact):
1. BAY SCALE: the bay opening is door-sized (~5m) but the reference has ~60% facade
   width as bay (approx 15m of 24m). Enlarge bay to ~15m wide x 5.5m high.
2. BAY DARKNESS: the interior surfaces ARE in the doc but render bright at canonical
   distance — the camera sees PAST them because the bay is too shallow (8m deep vs
   the facade height 11.4m; the camera at z=34 is 19m away, so it sees through).
   Fix: deeper bay (16m+) OR add a dark back wall closer to the facade.
3. APRON: flatten to flat dark (0x23272c) — done but renders light gray in the
   canonical path. Verify the GLB material actually carries the color (not the
   photoAsphalt texture that exports as white).
4. B2 SIGN: verify glyph visibility from the canonical camera — they may be too small
   or facing the wrong way. Enlarge if needed.
5. GROUND: replace the tan/sand ground segments with dark asphalt (the whole yard
   base, not just the apron). This is a ground-segment material change, not a prop.
6. FORKLIFT: move to (-152,26) — currently at (-137,26) which is right of frame.
7. VERIFICATION FIXES: bay-interior-check.png and yard-forklift.png were misframed —
   the check cameras need to point at the actual bay/forklift positions.
