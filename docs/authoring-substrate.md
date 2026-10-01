# Authoring Substrate — Research Findings, Architecture, and Implementation

Date: 2026-10-01. Scope: make the environment substantially easier for an LLM to author
correctly by moving geometric reasoning, spatial relationships, validation, and
repeatable transformations into explicit mechanisms. The governing invariant:

> object identity → explicit state → typed/deterministic transformation → derived
> geometry → constraint validation → visual inspection → integration → world validation

The LLM makes semantic decisions; the system performs deterministic spatial computation
and verification. Everything below was verified against actual code, not READMEs.

---

## 1. Current-state findings

### What exists (verified in code)

- **Canonical structured map**: `blockout/blockout-full-v1.json` (`vexea-blockout/full-v1`) —
  93 segments with stable ids (`category`, `bounds` AABB, `surfaceY`, `zone`,
  `connectivity` refs), 14 routes, 9 interior plans, vertical gauges, kill zones,
  destructibles, terrain contract, `resolvedDecisions`/`openQuestions`. Its bytes are
  pinned: five audits (`audit-transfer-network.mjs`, `audit-campus-spine.mjs`,
  `audit-open-cell-network*.mjs`, `audit-operational-streetwall.mjs`,
  `audit-macro-campus-network-v3.mjs`) hard-check the source hash. **The canonical file
  must remain byte-identical** — this constraint shaped the substrate design (layering,
  not mutation).
- **Deterministic generation**: `tools/gen-build-map.mjs` (≈4.7k lines) — mulberry32 PRNG,
  `string-hash-31` stable-id seed, 1 m snap grid; builds the three.js scene →
  `editor/facility-built.glb`; emits gated `out/build-report.json` (contact grounding,
  entrance binding, interiors, overlap, transfer-network trace, per-profile triangle
  budgets). Feature families (transfer network, campus spine, streetwall, open-cell
  v1–v3) carry `sourceRefs / referenceIds / contractIds / evidenceViews` +
  `placementStatus / supportStatus / contactStatus` — an existing trace pattern the
  substrate follows.
- **Validation gates** (all PASS at baseline): `tools/blockout-validate-full.mjs`
  (~30 gates), `tools/blockout-traverse-full.mjs` (4 spawn→core paths), geometry audit,
  independent audit, collision manifest, semantic export, perf measurement.
- **Visual evidence pipeline**: playwright + swiftshader capture tools
  (`capture_viewer.mjs`, `capture_interior.mjs`, `capture_slice.mjs`), deterministic
  camera hooks (`__playerCamAt`, `__interiorCam`, `__sliceCamAt`), render gate via
  `tools/analyze-survey-png.mjs` (mass/contrast), SVG plan generators.
- **Recovery state**: `out/global-recovery-state.json` — PASS/FAIL/BLOCKED register with
  source hashes (currently `status: BLOCKED` from the visual-recovery campaign).

### What is actually usable by an LLM today

Editing means: modify the JSON **and/or** hand-edit generator code, regenerate the whole
67 MB GLB, re-run gates, re-capture. The maps are small enough to read whole (215 lines),
but there is no object-level API: nothing below segment granularity is individually
addressable, no bounded queries, no transaction safety, no per-object contracts. The
PoseEditor failure class (A → T → B computed mentally, snapped wrong, flipped, repeated)
has no countermeasure in the current substrate: a 1 m move is expressed as a raw edit
whose consequences must be mentally derived.

### What is merely data/viewer infrastructure

`editor/index.html` (136-line layer editor for the older `vexea-map/0.1` spec),
`editor/viewer.html`, `editor/blockout-viewer.html` — view-only for built GLBs.
`spec/map-schema.md` describes the v0.1 contract, not what the blockout actually uses.

### What is missing

1. Object-level identity below segments (windows, doors, pipes, props as addressable
   objects with construction state).
2. Typed spatial mutations with deterministic derivation (move/align/place-relative).
3. Machine-checkable placement contracts (hosting, flush, grounding, termination).
4. Revision-aware mutations (optimistic concurrency, idempotent op ids, undo/checkpoints,
   rollback on failed validation).
5. Bounded inspection (region queries, relationships, changed-state diffs, output budget).
6. Isolated object authoring + multiview object inspection + variants/damage.
7. Data-driven integration into built geometry (generator is fully hand-coded).

### Preserve unchanged / extend

- **Preserve**: canonical blockout JSON (hash-pinned), generator determinism profile,
  all existing gates, capture harness, viewers, recovery-state protocol.
- **Extend**: generator gains an opt-in, env-gated object-overlay stage (default OFF,
  proven byte-identical); the substrate layers on top of the canonical data instead of
  replacing it.

---

## 2. External mechanism findings

Sources inspected at code level (clones in `/tmp/ref-repos/`; nothing copied wholesale).

| Source | Mechanism | Where in code | Why it matters here | Graft | Decision |
|---|---|---|---|---|---|
| ArchMorph | Rooms-authoritative; walls **derived** and rebuilt after every op | `architecture.ts` `rebuildCanonicalTopology` (L1531) | Kills the desync class "wall no longer matches the room" | med | **Adapted as principle**: instances re-derive their host from geometry on every op (`lib.mjs deriveHost`), recorded `hostId` is never trusted |
| ArchMorph | Geometry-token canonical ids (`wall-…-cm…`) | `canonicalWallId` (L1492) | Identity without a registry; id mismatch means geometry changed | low | **Rejected** (ids stay persistent in state; canonical map already owns ids) |
| ArchMorph | Opening re-hosting by world position, nearest-fit, strict throw | `rebuildCanonicalTopology` (L1592–1620) | Openings survive host moves; no silent relocation | med | **Adapted**: host re-derivation + `host_lost`-class rejections instead of silent re-host |
| ArchMorph | Target-preserving move; alignment latching with echo | `move_room` (L2163), `alignVertices` (L1878) | Near-miss coordinates snap onto shared geometry and **report the correction** | low | **Adapted** as snap-and-echo (`adjustments[]` in every op result) |
| ArchMorph | Fail-loud asserts at operation time with actionable messages | `assert*` helpers (L1729–2030) | Invariant violations surface in the tool error, not as silent bad state | low | **Adopted** (`contract_violation` + `rolledBack` + issue list) |
| Alza | `checkModel → Issue[]` with codes + refs, 19 rules | `issues.ts` (L47–351) | Structured, greppable diagnostics the agent can act on mechanically | low | **Core graft**: `lib.mjs checkInstance/validateWorld`, coded issues |
| Alza | Parametric opening attachment (`t` fraction of wall) | `types.ts` Opening | Openings ride along when hosts change | low | **Rejected for now** (hosts are AABBs, not parametric walls); revisit if walls become edges |
| Alza | Repair loop as protocol text (`get_issues → fix → get_issues`) | `TRACING_PROTOCOL` (L29–37) | Agent-driven, stateless, re-runnable checker | low | **Adopted** (`validate_world` + op-embedded issues) |
| Alza | Clamp-with-feedback (`clampOpeningT` reports the clamp) | `issues.ts` (L37–43) | Write-time guardrail with explanatory feedback | low | **Adopted** (grid snap reported in `adjustments`) |
| Alza | Zero-issue seed regression in CI | `tests/issues.test.ts` | Any new rule that breaks the reference plan is caught | low | **Adopted** (`test-basics.mjs` world-valid end state) |
| Observatory | `expected_revision` optimistic concurrency | `webMcpRuntime.js ensureRevision` | Prevents mutations on stale scene assumptions | low | **Adopted** (`expected_revision` on every mutation; `version_conflict`) |
| Observatory | Idempotent op ids: replay cached result; changed input → conflict | `runTool`, `canonicalize` | Safe retries without cascading duplicate mutations | low | **Adopted** (oplog + `inputKey` hash; `operation_conflict`) |
| Observatory | Bounded reads: region filter, paging, hard output budget (12k chars) | `contextData`, `inRegion`, `paginate`, `compact` | Forces bounded observations; prevents context overload | low | **Adopted** (`inspect_region` cursor/limit, `budget()` with `result_too_large`) |
| Observatory | Clamp-and-report `adjustmentCount` | helpers | Honest feedback that inputs were corrected | low | **Adopted** (`adjustments[]`) |
| SceneActBench | Measure **resulting geometry**, never agent self-report | `metrics.py READ_VERTS_CODE`, sentinels | Answers "did the requested transformation actually happen?" | med | **Adapted**: every op result carries derived geometry (`before/after/footprint/host`); `no_effect` detection |
| SceneActBench | Anti-gaming: quality thresholds over presence | `score_reconstruction` COVER_TAU | Avoids metric gaming in verification | med | **Adopted** (render gate mass thresholds; `no_effect` requires real geometric change) |
| SceneActBench | Harness force-export with state restore | `run.py score_run` | Never lose a valid product on agent error | low | **Adopted in spirit**: generator overlay re-reads committed state; no session state to lose |
| EZ_Blender | Plan/execute separation; per-agent fault isolation | `core/executor.py`, `assemble_final_script` | Fault isolation; critic loop with early stop on no progress | med | **Adopted (partial)**: `no_effect` escalation hint breaks ineffective repair loops (PoseEditor class) |
| blender-mcp (both) | Two-tier serialization (light snapshot vs opt-in full) | `core/serializer.py` | Bounded reads by default | low | **Adopted** (`include_relationships` opt-in; region paging) |
| blender-mcp (both) | Full-dump scene reads; undo via `bpy.ops.ed.undo()` | `scene.list_objects`, `history.undo` | Anti-patterns | — | **Rejected** (documented; substrate does the opposite) |

### Failure mapping (mechanism → known failure)

| Known VEXEA failure | Countermeasure (code) |
|---|---|
| A → T → B computed mentally, tiny move, flipped result (PoseEditor) | `move_object` snap-echo + `no_effect` detection with escalation hint (ops.mjs) |
| Facade composition via improvised transforms (Godot workaround) | `place_relative`/`align` semantic relations compute the transform deterministically |
| Floating/detached geometry | host derivation + `not_grounded`/`host_missing` (lib.mjs) |
| Incorrect orientation | `orientation_mismatch` (rot snapped to 90°, checked against host edge normal) |
| Poor visual iteration | multiview object inspector + evidence recording (`capture-object-multiview.mjs`) |
| Cannot inspect spatial consequences | op results carry `before/after/footprint/host`; `inspect_region` bounded |
| Stale scene state | `expected_revision` guard + `world_drift` (canonical hash check) |
| Model claims success, geometry wrong | `integrate/move/rotate/resize` roll back on contract violation and say so; validation measures, never trusts |
| Mutation destroys unrelated objects | world-level validation on every mutation; overlap → rollback |
| Repair loop repeats ineffective mutation | `no_effect` + `prior_no_effect_ops` escalation |

---

## 3. Proposed architecture (implemented increment 1)

```
authoring/objects/*.json          object workspace: identity, construction, variants, CONTRACT, references, evidence
authoring/scene-state.json        working doc: base(hash-pinned canonical) + revision + instances + oplog + undo + checkpoints
tools/authoring/lib.mjs           geometry (AABB/edges/snap), host derivation, contract checks (Issue[]), budget
tools/authoring/ops.mjs           typed operations: guard → replay → derive → validate → commit/rollback
tools/authoring/cli.mjs           JSON-in/JSON-out CLI for the authoring LLM
tools/authoring/test-basics.mjs   happy-path suite (12 checks)
tools/authoring/failure-suite.mjs negative-space suite (21 checks, one per §16 failure class)
tools/capture-object-multiview.mjs visual-inspection primitive (playwright + swiftshader, render-gated)
editor/object-inspector.html      isolated multiview object renderer (?obj=&variant=&view=&dist=)
gen-build-map.mjs                 + env-gated object-overlay stage (BUILD_OBJECT_OVERLAY=1)
```

**Object lifecycle**: `create_object` (system-generated stable id, status `draft`) →
construct (parts in meters) → `inspect_object` + multiview capture → `author_object`
(promotion fails loud unless construction + contract complete) → `integrate_object`
(contract + world validation; rollback on violation; binds `objectSha`) →
`validate_world` / mutation loop / `undo` / `checkpoint` / `restore`.

**Contract model** (machine-checkable, on the object):
- `host.categories` — accepted canonical segment categories;
- `host.mode: attach-edge` — must be flush with a host edge (≤ `flushTolerance`) and
  rotY-aligned with that edge's normal (overhang up to half depth permitted: a mounted
  window legitimately straddles the wall face);
- `host.mode: surface` — footprint contained in host, base rests on host `surfaceY`;
- `termination: both-ends-in-socket` (pipes) — both ends must land in valid host sockets
  along the footprint's long axis;
- hard rules always on: world bounds, below-terrain, mountain (impossible geometry)
  intersection, pairwise instance overlap, `object_not_authored`, `instance_stale_object`
  (object content changed after integration), `world_drift` (canonical base changed).

**Division of labor**: the LLM chooses object, host, relation, variant; the substrate
snaps, derives hosts from geometry, computes footprints, checks contracts, re-validates
the world, and reports actual resulting geometry in every result.

---

## 4. Implementation plan (ordered) and status

1. **Substrate core** (`lib/ops/cli` + object workspace) — done. Verify: both suites.
2. **Negative-space suite** — done (21/21). Verify: `node tools/authoring/failure-suite.mjs`.
3. **Multiview inspection** — done (45/45 views pass the render gate; evidence recorded
   into object docs). Verify: `node tools/capture-object-multiview.mjs`.
4. **Generator overlay** — done, env-gated. Verify: default build byte-identical to
   pristine HEAD output (`83acc0658c85f79f…`); overlay build renders all instances and
   passes its two checks.
5. **Slice demo (one scene, end to end)** — done. Target: the reference survey's
   `zone warehouse` view. Authored through the substrate: 4 windows on the
   `bld-north-shed` south facade (clean/clean/dusty/broken) + 2 service pods grounded
   on `g-yrd-west`, with one deliberate failed attempt (window floated 2 m off the
   wall → `host_missing` rejection → corrected) and one operation-id conflict
   demonstration. `validate_world` → valid at revision 6; `BUILD_OBJECT_OVERLAY=1`
   renders 6 instances / 17 meshes, both overlay checks PASS. Surveys:
   `artifacts/survey-objects-final.png` (3×3 object/variant grid) and
   `artifacts/survey-scene-final.png` (reference tile + 6 rendered views),
   captured via `tools/capture-scene-survey.mjs` + `tools/compose-survey.mjs`.
6. **Target approach (zone warehouse)** — the canonical survey pose
   `[-164,1.7,34] -> [-118,5,-10]` (the camera behind the predecessor's `zone warehouse`
   reference tile) was captured before/after: committed GLB → +20 substrate instances
   (2 pipe runs, 3 bollards, 3 pallets, pole light, 3 stripes, pod) → +7 more (dock-face
   pipe + bollards on `bld-deployment-bays`, pallet row, lane stripes). Rejections during
   authoring were real catches: a stripe placed on `g-yrd-hub` (raised pad, y=0) instead
   of the yard (y=-0.6), an op-id reuse with changed input, a pod in the ambiguous
   west/hub overlap band. New objects: bollard, pallet stack, 9m light pole, marking
   stripe — all contracted, multiview-gated. Overlay materials upgraded to the repo's
   PBR texture sets (panel/concrete) so authored objects blend with the built map.
   New op `rebind_instance` closes the object-evolution loop (stale → re-inspect →
   re-bind; failure-suite covers reject/accept/idempotent, 24/24).
   Surveys: `artifacts/survey-target-approach.png` (reference vs before vs pass1 vs
   pass2, same camera), `artifacts/survey-objects-final.png`.
   Remaining gap to the reference is building-level (dock-door rhythm, signage,
   forklift) — forklift stays blocked by the sourced-GLB constraint; facade openings
   are the next substrate increment (opening registry on host walls).
7. **Next increments** (deliberately out of scope here):
   - parametric wall edges (Alza `t`-fraction hosting) if walls become first-class edges;
   - per-object damage/variant pipelines driven by the multiview evidence loop;
   - application of the substrate to the blocked visual-recovery requirements in
     `out/global-recovery-state.json`;
   - contextual inspection (object rendered installed in its host view).

## 5. Verification evidence

| Check | Result |
|---|---|
| `node tools/authoring/test-basics.mjs` | 12 pass / 0 fail |
| `node tools/authoring/failure-suite.mjs` (§16 failure classes) | 21 pass / 0 fail |
| `node tools/blockout-validate-full.mjs` | ALL GATES PASS (unchanged) |
| `node tools/blockout-traverse-full.mjs` | all paths PASS (unchanged) |
| default generator rebuild vs pristine HEAD generator | GLB sha identical → overlay change is byte-neutral |
| `analyze-survey-png` over `artifacts/objects` (45 views) | status PASS, mass 0.024–0.774 |
| `BUILD_OBJECT_OVERLAY=1` build | renders 2 instances / 6 meshes, overlay checks PASS |

Committed demo state: `authoring/scene-state.json` — window `obj_window_industrial_window_centered_large` flush on
`bld-north-shed` south wall, service pod `obj_prop_service_pod` grounded on `g-yrd-rear`;
`validate_world` → world valid at revision 2.
