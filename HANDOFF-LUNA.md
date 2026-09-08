# MAP-AUTHORING HANDOFF — campus audit pass (2026-09-07)

Branch: `hoplite/pella-7e824284/finish-campus-audit`
Repository: `Singulary-tee/vexea-map-authoring`
Base: merged map `main` at `7af376ae5035256520aa2bc2135d8b89349044c3`
Published authoring checkpoint: `eae611cea09f17052ac430811e11c340da059380` on `hoplite/pella-7e824284/finish-campus-audit`.

## Current authored state

- `blockout/blockout-full-v1.json` is the source of truth: 93 segments, 14 routes, 8 zones, 22 cover segments, 9 interior plans, and the below-grade tunnel route.
- `editor/blockout-full.glb` and `editor/facility-built.glb` are regenerated from that source.
- The built generator now has corrected wall-axis door cuts, projected door frames, oriented curbs/fences, normalized stairs and blocking walls, walkable tunnel shells, side-offset covered-route utility supports, objective-room doorway geometry, industrial facade ribs/windows, freight stacks, tanks/substation dressing, and a loading-dock lip.
- `editor/blockout-viewer.html` reviews built geometry with the blockout reference hidden by default, daylight tone mapping, and a pulled-back objective camera. The reference layer remains toggleable.
- `tools/audit-built-map.mjs` writes `out/geometry-audit.json`; the current run is 13/13: no structural footprint interpenetration, grounded structures, projected entrances, clear covered lanes, aligned tunnel portals, explicit tunnel depth, dock anchor, zero open source questions, traceable decisions, controlled terrain variation, terrain pads, and a nontrivial built GLB.
- `tools/gen-runtime-bundle.mjs` writes `out/runtime-map-bundle.json`; its 6/6 contract checks bind the GLB, collision manifest, semantic export, canonical coordinate frame, terrain grading, and source hash for the eventual game loader.
- `blockout-full-v1.json` now records the decisions in `resolvedDecisions` and has an empty `openQuestions` list. Primitive vehicle/machinery stand-ins are the authorized authoring policy; there is no sourced-GLB blocker.

## Deterministic verification (2026-09-07)

- Full validation, all four traversal paths including the tunnel alternate, combat/PvE reports, collision export, semantic export, slice contract, SVG, full geometry, build geometry, geometry audit, runtime bundle, and editor checks all passed.
- The runtime contract is explicit: collision AABBs are `[minX, minZ, maxX, minY, maxY, maxZ]`; tunnel floor is `Y=-13.7`; wheeled routes and inclines are allowed; stairs are denied; route grading is limited to `1:12`.
- Current sizes: source `45,719` bytes; `facility-built.glb` `4,568,620` bytes; `blockout-full.glb` `413,520` bytes; collision `31,401` bytes; semantic `16,419` bytes; geometry audit `1,716` bytes; runtime bundle `4,285` bytes.
- SHA-256: source `d4698d2e2e6859b31c906b380cfbf0bf300843346dee2c8ff71fe3a50e1b6e4d`; facility GLB `a4a8e20f032f4c1b05cb846c9669358068651a672afad8ff75fd9b61bcd50809`; collision `0d1952b53590b08bc14f6f534919df844274c821e696514ae10c2049b91539a0`; semantic `730698caede1bb64d82be25c5588b8b5491c9d8bda264fe9db7cabe9b0f55577`; runtime bundle `cc568ac058b364d631d47858d2a73f7f12459a4f62e64babd2461d64096d2fb1`.
- The built report contains 32 material families and 43,215 pre-merge triangles; the SwiftShader diagnostic reports 32 merged draw items and 27,097 triangles. It is not a target-hardware measurement.
- With the default 30-second screenshot limit, the latest bounded capture wrote 4/5 player stops (`spawn`, `gate-square`, `pressure-yard`, `checkpoint`) before `core-door` timed out, and 2/5 interior frames (`core-objective`, `security-hall`) before `loading-hall` and `tunnel` timed out and the outer bound stopped before `maintenance`. A 1-second probe wrote 0/5 for both sets and confirmed the stall is inside SwiftShader `page.screenshot()`. Capture tools now continue per location, bound browser shutdown, and return a nonzero partial-evidence result. These frames are diagnostic only and do not prove complete player-eye or interior verification.

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
node tools/verify-viewer.mjs
node tools/capture_player.mjs
node tools/capture_interior.mjs
node tools/capture_slice.mjs
```

Serve from repository root on port 3000. The managed Preview run script is `python3 -m http.server 3000`. Agent-browser cannot create WebGL in this Modal sandbox; Playwright capture and `verify-viewer.mjs` use SwiftShader flags and are the valid render evidence path here.

## Honest remaining work

1. The authored campus is still not consumed by `vexea-international`; the actual game needs a GLB loader, Rapier static colliders from `out/collision-manifest.json`, semantic zone/spawn/objective/kill-zone/camera/drone integration, and runtime traversal checks.
2. Industrial dressing is improved but remains procedural authoring geometry, not a final production art pass with authored Polyhaven textures/HDRI, decals, vegetation, vehicles, or machinery.
3. Software-GL performance is only a diagnostic: the latest measurements are roughly 2–4 fps; real hardware performance is not verified.
4. No in-engine playtest has yet proven spawn-to-objective movement, kill-zone closure, or drone deployment.
5. Existing deterministic validators describe authored relationships; they do not prove collision behavior or final visual quality in the game runtime.

Do not call this a finished/playable map until the game integration and real runtime playtest are complete.
