# LUNA TAKEOVER — handoff (2026-09-07, branch `luna-takeover`)

Branch: `luna-takeover` (derived from `hoplite/pella-7e824284`, all prior work included).
Repo: `Singulary-tee/vexea-map-authoring`. Project truth: `vexea-international` (sibling checkout in this
sandbox workspace: `/tmp/hoplite/workspace/repo-repo_1309608607` — ARCHITECTURE.md, GAMEPLAY.md,
GAMEMODE_CONFIG.md).

## Corrections to prior agent behavior (authoritative for this takeover)
- **No blockers exist.** Anything previously labeled a blocker is a work item with a sanctioned approach:
  - Vehicles/machinery: use **primitives (cubes/cylinders) as stand-in GLBs** — no sourced-asset dependency.
  - HDRI / PBR environment & materials: **Polyhaven is available** for HDRI/PBR sourcing.
- **Do not stop between iterations.** One run chains everything until the map is delivered.
- **Don't advertise next steps in replies.** Do the work, report after.

## Current state (honest)
Spatial foundation + constructed geometry EXIST inside this authoring repo ONLY:
- `blockout/blockout-full-v1.json` — 92 segments, 14 routes, 8 zones, 21 covers, interiors[], tunnelInterior.
- `editor/facility-built.glb` + `editor/blockout-full.glb` (deterministic generators).
- `editor/blockout-viewer.html` — TOP ORTHO / ORBIT / X-RAY / BLOCKOUT LAYER / player+interior+slice cams.
- Reports (all green by their own rules): validator 22 gates, traversal 4 paths + interior continuity,
  combat-space matrix (11 spaces), cover-bindings, verticality, clearance registry, slice contract,
  collision manifest (58 AABBs), semantic export, per-material merge (28 draw items, 16.2k tris).
- Evidence PNGs in `artifacts/` (player-eye, interiors, slice, top/xray/orbit).

## What is NOT done (the real gap list, no grading of order — all required)
1. **Game integration (the map is not playable anywhere).** Nothing in vexea-international consumes this map.
   Needed: loader for facility-built.glb / collision-manifest.json / semantic-export.json -> in-engine spawn,
   objective hold (floor 2 of bld-core-ops-hall), camera network (5 destructibles), drone deployment anchors
   (5 units), Rapier static colliders from the manifest.
2. **Geometry quality — user report: "full of overlap and bad placement and low poly appearance."** Audit
   beyond AABB gates: visual interpenetration of constructed elements (blockout ghost layer sits at 35% over
   built geometry — a likely overlap source; construction seams; stair/wall junctions; cover vs barricade),
   placement judged at player-eye, and poly/finish raise. This is a real defect report, not a gate complaint.
3. **Finish/grammar stage.** Industrial grammar + dressing + PBR families (Polyhaven PBR) so the map reads
   like the references (references/inspiration/*; metrics: mass 0.42-0.85, sky <0.06). Facades, weathering,
   material families, signage, containers, plant infrastructure.
4. **Resolve recorded source ambiguities** (blockout `openQuestions`): zone_bridge connector semantics, west
   tunnel arm, roof-opening host, fence line, tunnel depth, world-frame conflict (768-vs-920).
5. **Real-hardware performance measurement** (software-GL numbers only today).
6. **In-engine playtest** — walk spawn->objective, verify kill-zone closures, drone spawn paths.

## Reproduction (one-script chain, all deterministic)
```
npm i && npx playwright install chromium
node tools/blockout-validate-full.mjs            # 22 gates
node tools/blockout-traverse-full.mjs            # 4 paths + interiors
node tools/gen-combat-space.mjs && node tools/gen-pve-reports.mjs
node tools/gen-collision-manifest.mjs && node tools/gen-semantic-export.mjs
node tools/gen-blockout-svg-full.mjs && node tools/gen-full-geometry.mjs && node tools/gen-build-map.mjs
node tools/verify-viewer.mjs                     # 9-step interaction chain
node tools/capture_viewer.mjs http://127.0.0.1:3000/editor/blockout-viewer.html out/shot.png
```
Serve from repo ROOT on 3000 (importmap needs /node_modules). WebGL here: playwright chromium with
`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader --in-process-gpu --no-sandbox`
(agent-browser chrome cannot create a WebGL context in this sandbox).

## Key files
- Data: `blockout/blockout-full-v1.json` (single source of truth; generators read it)
- Builder: `tools/gen-build-map.mjs` (built campus GLB)
- Viewer: `editor/blockout-viewer.html`
- Runbook: `docs/runbook.md` (flags, loops, traps incl. signed idSeed -> `>>> 0`)
- Handoff history: `HANDOFF-map-authoring.md`
