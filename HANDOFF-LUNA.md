# MAP-AUTHORING HANDOFF — campus audit pass (2026-09-14)

Branch: `hoplite/pella-7e824284/finish-campus-audit`
Repository: `Singulary-tee/vexea-map-authoring`
Base: merged map `main` at `7af376ae5035256520aa2bc2135d8b89349044c3`
Authoring state: rebuilt working tree; runtime checkout is separate. This pass did not write to the runtime checkout.

## Current authored state

- `blockout/blockout-full-v1.json` remains the source of truth: 93 segments, 14 routes, 8 zones, 22 cover segments, 9 interior plans, and the below-grade tunnel route.
- The shared secondary-frontage kit in `tools/gen-build-map.mjs` now gives the gatehouse, north shed, yard utility, service tower, substation, plant annex, maintenance, deployment bays, core shelter/service wing/walkway, east storage rows, and tank farm deterministic corrugated panel fields, ribs, service runs, windows/vents, cabinets, wall lights, weathering, contact pads, stains, and drains. Door-aware spans preserve authored openings.
- Existing authored construction remains intact: wall-axis door cuts and frames, oriented curbs and fences, normalized stairs and blocking walls, walkable tunnel shells, covered-route utility supports, objective-room doorway geometry, freight stacks, tanks, substations, loading-dock lips, wet-road and puddle layers, hero facades, paired tunnel pipes, terrain variation, and interior/security/core dressing.
- The accepted processing correction remains: raised south process bays/window bands, ground service cabinets, a flush poured repair strip with visible joints and wet reflection, a maintained drain seam, the enlarged catch basin near `(250,-67)`, a raised two-segment 90-degree discharge elbow, rust brackets, and a restrained wet/grime run.
- The correction changes generated art only. `blockout/blockout-full-v1.json`, authored dimensions, routes, collision calibration, gameplay contracts, and runtime integration were not changed by the frontage pass.

## Current fingerprints

- Source: 45,719 bytes; SHA-256 `d4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d`.
- Generator: 227,513 bytes; SHA-256 `8ee1d27dccf65325e54d5973648d11982ad61b1bc0f51134a2082308a3b54385`.
- `editor/facility-built.glb`: 62,772,384 bytes; SHA-256 `216eae0ac539c3cecd0f448d6a611c5104a259d7c670b92a0f5aebf5b5d93e06`.
- `editor/blockout-full.glb`: 413,520 bytes; SHA-256 `b38d1a5df1816292336fd70dffa9db98ab5e6f8f8a040861ee133c896b9bd08d`.
- `editor/blockout-viewer.html`: 12,268 bytes; SHA-256 `9c0f3037f34c874c45b7a883f0e724ef71b1837f23f30513eb25fe335a7ae00c`.
- `out/build-report.json`: 1,400 bytes; SHA-256 `72a0e3b4fe14d8759935ac5852abfa0bd43eeee0a691e9fa393fd74f81655fd7`.
- `out/geometry-audit.json`: 2,196 bytes; SHA-256 `50d65367c694a9649aa0b6605450e4704dae6c065725fed62cec3b04e6719fc7`.
- `out/collision-manifest.json`: 31,401 bytes; SHA-256 `ddb5d03136207c5b6f1c3f63a4ce5531f245b49ec3d546259cabf7d3a031a153`.
- `out/semantic-export.json`: 16,845 bytes; SHA-256 `0d919b4ffddc8ddd9d6cf13344950a1f62fab55134a516c09af90c708426d697`.
- `out/runtime-map-bundle.json`: 4,287 bytes; SHA-256 `bffda017963d77c7f6549f32b42a9ce590c921203bd9238518569d27efdf4711`.
- `out/traversal-report.json`: 19,649 bytes; SHA-256 `6cec497fbafbfd52e22cc3ee5564b0c6c2c911d37eb40ef74ac1ca8a9c090c10`.
- `out/combat-space-matrix.json`: 11,058 bytes; SHA-256 `b2215158ba5f2f6e927d92bb7eccd6ee02c7aca837e2f9fa5bb9d1020d942971`.
- `out/cover-bindings.json`: 175 bytes; SHA-256 `de4279dbf72c9122d58a6ffab9acf419a103305853ecfe705cdefcb7c848881d`.
- The complete authored-output and evidence checksum list is in `SHA256SUMS`.

## Visual review status

Self-review covered the entire authored campus rather than repeating the processing alley. The fresh custom single-GLB harness sampled gate square, maintenance, deployment, plant annex, plant substation, bridge/tower, core secondary frontage, the boundary transition, and broad campus orbit. The rebuilt kit is visible at player scale through ribs, panel fields, windows/vents, service runs, cabinets, practical lights, contact bands, weathering, and drains. The accepted processing evidence remains preserved at `.hoplite/artifacts/review-processing-v23-grounded.png` and `.hoplite/artifacts/review-processing-v23-drain.png`.

Fresh evidence paths:

- `.hoplite/artifacts/rebuild-gate-square-front.png`
- `.hoplite/artifacts/rebuild-gate-square-angle.png`
- `.hoplite/artifacts/rebuild-maintenance-side.png`
- `.hoplite/artifacts/rebuild-deployment-side.png`
- `.hoplite/artifacts/rebuild-plant-annex.png`
- `.hoplite/artifacts/rebuild-plant-substation.png`
- `.hoplite/artifacts/rebuild-plant-substation-angle.png`
- `.hoplite/artifacts/rebuild-bridge-tower.png`
- `.hoplite/artifacts/rebuild-core-secondary-front.png`
- `.hoplite/artifacts/rebuild-core-secondary.png`
- `.hoplite/artifacts/rebuild-boundary-transition.png`
- `.hoplite/artifacts/rebuild-campus-orbit.png`

The first wide gate composition was too occluded for the pixel sanity heuristic; corrected front and angle gate captures passed. The broad orbit is context evidence, not a substitute for player-scale inspection. Several un-sampled interior and perimeter transitions remain confidence limits.

The independent critic verdict is **pass for this correction**: the shared kit materially closes the pre-correction campus-wide gap across gate, maintenance/deployment, annex/substation, bridge/tower, and core; no obvious mesh overlap or route obstruction was found, and doors, stairs, catwalks, fences, lamps, cabinets, and contact wear preserve scale. The critic still sees a procedural rhythm in repeated ribs/window bands/service runs and some broad, dark, sparse aprons compared with the accepted processing area. This does not justify another broad art edit now; targeted de-templating remains optional if later review identifies a specific issue.

Historical review decisions remain: v20 drainage evidence was accepted; v22 frontage evidence was rejected at 5.5/10 for a matte, uniform apron; v23 frontage evidence was accepted at 7/10 because the repair strip, wet response, seams, and drain path read at player scale. None of these, the current captures, or the independent pass is user acceptance.

## Deterministic verification

Passed after the final rebuild:

- Full-map validation: all gates pass; 93 segments, 14 routes, 8 zones, 22 covers; 0 warnings.
- Traversal: all authored paths pass; 0 bad covers, 0 open kills, 0 warnings.
- Combat/PVE generation: 11 combat spaces; all gates pass.
- Collision/semantic exports: 83 colliders, 32 walkable surfaces, 13 openings; 8 zones, 9 adjacencies, 5 drone anchors.
- Geometry audit: 17/17 checks pass, including tunnel alignment/depth, generated-helper clearance, source resolution, 1:12 grading, terrain pads/variation, and nontrivial built geometry.
- Runtime bundle: 6/6 checks pass.
- Editor HTML checks, generator syntax, and `git diff --check`: pass.

## Viewer and runtime limits

The standard `VERIFY_VIEWER_SKIP_SCREENSHOT=1 node tools/verify-viewer.mjs` run timed out while waiting 20 seconds for `window.__ready`; the browser reported `THREE.WebGLRenderer: Error creating WebGL context`, `BindToCurrentSequence failed`, and never reached readiness. `tools/capture_player.mjs` likewise failed its five screenshot waits. These are environmental SwiftShader/browser GPU failures, not authored validation failures. The sequential custom single-GLB harness rendered the rebuilt artifact and produced the fresh evidence above, but that is authored-view evidence only, not runtime or target-hardware proof.

Runtime/game integration is intentionally not performed. The separate runtime checkout already contains its own prior dirty work; this authoring pass did not write to it. Do not copy or load authored outputs into the game until explicit user visual approval.

## Reproduction

```sh
node tools/blockout-validate-full.mjs
node tools/blockout-traverse-full.mjs
node tools/gen-combat-space.mjs
node tools/gen-pve-reports.mjs
node tools/gen-collision-manifest.mjs
node tools/gen-semantic-export.mjs
node tools/gen-slice-contract.mjs
node tools/gen-blockout-svg-full.mjs
node tools/gen-full-geometry.mjs
node tools/gen-build-map.mjs
node tools/audit-built-map.mjs
node tools/gen-runtime-bundle.mjs
VERIFY_VIEWER_SKIP_SCREENSHOT=1 node tools/verify-viewer.mjs
node tools/check-editor-html.mjs
node --check tools/gen-build-map.mjs
git diff --check
```

The next gate is user visual review. Do not call the campus final or complete, and do not begin runtime/game integration, until the user explicitly accepts the authored result.
