# MAP AUTHORING — HANDOFF (agent handover snapshot)

Authoritative memory: `.memory/tasks/map-authoring-STATE.md` + `.memory/notes/map-authoring-runbook.md`.
Repo: `Singulary-tee/vexea-map-authoring`, main is the source of truth. Codespace: `supreme-space-train-7vr496j4wwxxfx5p7`.

## CURRENT CHECKPOINT (full-map blockout stage — 2026-09-07)
- **Full-map segmented blockout realized: `blockout/blockout-full-v1.json`** (92 segments, 14 routes, 8 zones,
  21 deliberate covers, 3 kill-zone closures, 2 roll-down doors, 2 channel walls; r2: enterable reduced to 9
  route/objective/chokepoint-backed buildings, overlaps removed, density raised toward reference metrics).
- **BUILD STAGE (next layer, blockout stays as reference): `tools/gen-build-map.mjs` -> `editor/facility-built.glb`**
  (deterministic, gitignored, 21 materials / 9.7k tris / 1MB). Promotes segments to construction:
  real wall frames with door openings cut + lintels, roof + parapet, floor bands, seeded roof machinery,
  window grids; segmented roads (ribbon + curb strips + seeded light poles); pipe racks along covered routes
  (supports every 6m); cover family grammar (low crate stack / mid jersey / full bunker); displaced-icosahedron
  rock masses; shoreline lip; fence posts+rails; portal rings; 1:12 incline step prism; real stair steps.
  Build gates (out/build-report.json): contact grounded, architecture depth (entrances bind to constructed
  buildings), no unexplained overlap — ALL PASS. Viewer now loads built map + blockout overlay toggle
  (`BLOCKOUT LAYER` button, 35% ghost) + `PLAYER CAM` walk-through along route_main_surface at 1.7m eye
  (window.__playerCamAt(t) for deterministic capture).
- Evidence: `artifacts/blockout-player-{spawn,gate-square,pressure-yard,checkpoint,core-door}.png` player-eye
  frames (mass 0.14-0.39, contrast 211-219, render gate green) + top/xray/orbit.
- **INTERIORS (building stage 2):** all 9 enterable buildings have floor construction — floor slabs per level,
  ceilings, partition walls (stalls/corridor/drive-through), stairwells, core objective room on floor 2
  (barrier ring + capsule doorway + emissive terminal + kill pad), lit tunnel walking surface (floor + ceiling
  strip + conduit), industrial ceiling light strips. Interior plans live in blockout-full-v1.json
  (`interiors[]`, keyed to building id — traceable). Build report grew to 9 gates (interior gates included)
  ALL PASS. Evidence: `artifacts/blockout-int-{core-objective,loading-hall,tunnel,security-hall,maintenance}.png`
  all render-gate green (mass 0.28-0.77). `tools/capture_interior.mjs` + viewer `__interiorCam(name)`.
- NEXT: slice grammar proof on the built map (loading hall <-> checkpoint court), then sourced-GLB placement
  for vehicles/machinery only (SKILL reuse table: procedural for roads/buildings/utilities, GLBs for
  complex machinery), then dressing/PBR per industrial-grammar reference. Geometry frame = blockout-v3 annotated target (b4fa5260);
  zone semantics = 7-zone contract; vertical gauges from blockout-v2; fixture = spec/calibration.md.
- Everything is 1m-snapped; every cover carries threatElevation + directionality + interrupts + heightClass;
  every tunnel carries X-ray + belowGradeY -14; every entrance checked vs the 1.8m capsule.
- Gates: `node tools/blockout-validate-full.mjs` (ALL PASS) + `node tools/blockout-traverse-full.mjs`
  (4 spawn->core paths PASS: surface, covered/logistics through loading+security halls, east flank via service
  wing/walkway, tunnel alternate via portal->ridge->walkway; 0 cover-placement warnings).
- Visual: `tools/gen-blockout-svg-full.mjs` -> `out/blockout-full-v1.svg` (color-coded, labeled, legend).
  3D: `tools/gen-full-geometry.mjs` -> `editor/blockout-full.glb` (regenerable, deterministic, gitignored) +
  `editor/blockout-viewer.html` (TOP ORTHO / ORBIT PERSP / X-RAY toggles). Serve repo ROOT, port 3000
  (`preview_start` in Hoplite runs `python3 -m http.server 3000`; runbook has manual recipe).
- Evidence: `artifacts/blockout-full-top.png`, `-xray.png`, `-orbit.png` (render gate green:
  mass 0.155/0.136/0.058, contrast 204, luma 16-220). Captured via playwright + software GL —
  see runbook for the exact flag set (agent-browser chrome has no WebGL here).
- Composition completed this pass (all traceable to sources; inferences flagged in openQuestions):
  perimeter (mountain N with ridgeline exit gap, reservoir water envelope E, fence W/S), 14 ground/yard
  segments covering every route waypoint, plant south service spur (closes killPlant — was decoratively
  floating), core service walkway (links annotated wing to core hall), maintenance/deployment service loop
  route (was unreachable), 3 canopies over covered-route legs, catwalk + descent stair, tunnel mouths at
  checkpoint court + east ridge, air lanes (pressure-yard strafe box, courtyard bomber line, spawn recon,
  roof re-entry).
- Open questions recorded IN the data (7 items): bridge connector semantics, tunnel west arm, roofOpening
  host discrepancy, fence line inference, dock lip, tunnel depth, old-vs-new world frame.
- NEXT: slice grammar on the full map (loading hall <-> checkpoint court), then GLB placement/dressing
  per SKILL stage order. The old `blockout-map-full` family and facility-v3 art path remain as-is;
  the ground-v2 render gate item (dark 0.009 < 0.01) is still open on the art path, untouched here.

---

## PRIOR CHECKPOINT (art-pass session, superseded as spatial target but still valid context)

## CURRENT CHECKPOINT (this handoff)
- Repo main @ **f6d7c03** (pushed, codespace synced `git reset --hard origin/main`). Working tree clean except
  untracked `editor/facility-v3.glb` and `out/cw-slice.glb` (GLB intentionally untracked but present/regenerable).
- **Gate on ground-v2 (f6d7c03): FAIL — `dark 0.009 < 0.01`** (mass 0.347, contrast 173, luma 12-185, sky 0.645).
  Prior art-pass final gate (`a2c4233`, flat ground): `mass 0.329 dark 0.026 contrast 173 luma 12-185` — PASS.
  Ground-v2 brightened the lit ground slightly, dropping dark-pixel fraction just under threshold.
  → THIS IS the OPEN item. It is not an art/lighting regression; it is the noise bake widening the lit-ground
  histogram.

## WHAT THIS SESSION DID
1. **TSL capability probe** (`editor/tsl-probe.html`). Verdict: THREE r184 TSL **compiles + runs headless** under
   `WebGPURenderer` with WebGL2 fallback (`backend webgl2-fallback`), BUT node-material lighting/SHADOW diverges
   from the tuned `WebGLRenderer` rig — probe ground rendered ~luma 5 (near-black) under the same sun that lights
   `MeshStandardMaterial` correctly. **Decision: keep the tuned WebGLRenderer scene; DO NOT adopt
   WebGPURenderer/NodeMaterial** (would discard the 7-iteration lighting tune). Use baked procedural textures for
   surface micro-variation. Probe kept as the capability record.
   - Probe lesson: `MeshStandardNodeMaterial` is on the **`three/webgpu`** namespace, NOT `three/tsl`.
   - Probe importmap entries already committed; `viewer.html` stays pure `three` (WebGL).
2. **Ground micro-variation pass** (`editor/viewer.html`): baked LCG-seeded seamless value-noise canvas textures
   (no image asset, deterministic, wrapping lattice → gate-stable + seamless).
   - **v1** (`e85bfe1`): mistake — noise around mean 1.0 via multiply map WITH NO headroom. Multiply maps bound
     texels ≤ 1.0 and `m*255` clamped everything >1.0 → 255, so the top half quantized to white → **0% visible
     delta** (diff vs baseline: mean|Δluma| 0.07, max 1.6). Correctly rejected.
   - **v2** (`f6d7c03`, current): headroom fix — encode noise around **mean 0.75 ± 0.05** (no clamp), divide
     material color by 0.75 so mean albedo stays exactly `0x5c594d`. Roughness map mean 0.9 ± 0.04 with
     material.roughness 1.0 → final span 0.86–0.94. CanvasTexture left **linear** (no sRGB tag) so multiplier
     mean stays exact. Determinism proven (two captures bit-identical MD5).
     Amp 0.05 uses the KB **terrain/rock** class (yard = compacted earth/asphalt, not finished concrete); KB road
     amps (≤0.02) reserved for route ribbons if they get ground treatment later.
   - v2 diff vs baseline: mean|Δluma| 5.47, p50 6.2, p90 12.4, p99 13.7, max 15.3, **51.6%** pixels ≥3 — visible.

## TSL-vs-texture decision (binding rationale)
WebGPU is NOT available headless here (`No available adapters`); WebGPURenderer silently falls back to WebGL2,
where node materials light wrong. So KB G13/G10 (WebGPURenderer + MeshStandardNodeMaterial) do not hold for the
headless render-gate path. Baked procedural textures satisfy KB O (micro-variation on uniform surfaces; G11
"no variation reads as plastic") within the tuned WebGL rig — documented, evidence-backed deviation, recorded in
## OPEN ITEM — ground-v2 gate (next agent's FIRST task)
Fix `dark 0.009 < 0.01` at f6d7c03 WITHOUT scaling exposure up (kills contrast fail-safe). Likely fixes, try in order:
1. Lower albedo amp 0.05 → 0.03 (terrain lower bound) — narrows the bright tail, keeps variation.
2. Nudge the shadow side per runbook: hemi 0.08 → 0.07, or ground `0x5c594d` → `0x58554a`. Do NOT raise sun.
3. Last resort: drop the albedo map, keep only the roughness map (roughness-mapped surfaceness still reads as
   ground; the albedo map is what moved `dark`).
Re-verify: `python3 tools/analyze_shot.py shot.png` → mass ≥0.05, dark ≥0.01, contrast ≥120, not-blank.

## REPRODUCE RECIPE (one codespace session)
```
cd /workspaces/vexea-map-authoring
git fetch origin && git reset --hard origin/main
rm -f node_modules && ln -sfn /workspaces/vexea-international/node_modules node_modules
( nohup python3 -m http.server 8124 >/tmp/srv.log 2>&1 & ); sleep 1
node tools/capture_viewer.mjs http://127.0.0.1:8124/editor/viewer.html /tmp/shot.png
kill %1
```
- Serve from repo ROOT; URL `/editor/viewer.html` (importmap needs `/node_modules/...`).
- three r184 at `/workspaces/vexea-international/node_modules`; use the symlink above.
- `/tmp` on codespace WIPED on restart — keep artifacts in the VM repo/artifacts or refetch. Codespace CANNOT push.
- GLB is generated (not committed): `node tools/gen-v3-geometry.mjs blockout/blockout-v3.json editor/facility-v3.glb`
  (needs symlink). Current GLB 743,644B, 14 nodes/12 meshes/12 materials; MD5-verified copy at
  `/home/Alte/vexea-authoring/artifacts/facility-v3-final.glb`.

## LIGHTING TUNING CURVE (r184, reuse)
Full IBL + sun washes shadows: cut fill ~50%/iter, keep sun. env 1.0→0.04, hemi 0.55→0.08, sun 2.6→3.4 @ y380
(raking), exposure 0.95→0.85, ground albedo 0x6d6a5e→0x5c594d. Sun-key dominant, IBL specular only.
PCFSoftShadowMap deprecated → PCFShadowMap. viewer `__ready` set AFTER GLB load (deterministic). Tune the SHADOW
side (fill down), never scale exposure up. Sun frustum tight (-700..700, far 1800) + bias -0.0005.

## ARTIFACTS (VM `/home/Alte/vexea-authoring/artifacts/`)
- `facility-v3-final.glb` (743,644B) — current GLB. `artpass-final-gate.png`, `artpass-v7-shot.png` (flat ground).
- Ground-pass renders are DETERMINISTIC + regenerable from f6d7c03 (recipe above). Fetch chunked with
  `base64 -w0 | head -c 39000` — ONE ssh per chunk, SEQUENTIALLY. Concurrent ssh bursts crash the codespace RPC
  and force a restart (wipes /tmp).

## NEXT STEPS (after ground-v2 gate green)
1. Save green shot → artifacts + Notion Mission Control (page `3cacb9a2-be0b-8145-a5ac-e546402b8ec6`).
2. Slice-level grammar proof (Courtyard↔Warehouse) for a Notion pitch once visually defensible.
3. Instancing (KB C2) only if dynamic props (doors/destructibles) need per-object identity — static merge already
   collapsed draw calls, so currently optional.
`noiseTexture`'s code comment.