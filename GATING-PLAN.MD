VEXEA Industrial Campus — Map-Wide Visual Recovery Plan

Date: 2026-09-15

0. Governing Principle: Global Progress Is the Only Progress

The objective is not to produce more geometry, more reports, more screenshots, or a more attractive individual area.

The objective is to transform the entire 768×768 campus into the requested industrial environment.

The agent must therefore operate under a persistent recovery loop:

OBSERVE → SCORE GLOBAL STATE → SELECT HIGHEST-PRIORITY FAILURE → WORK → RE-OBSERVE → VERIFY GLOBAL CHANGE → CONTINUE OR CHANGE STRATEGY

This loop governs every phase below.

An iteration counts as progress only when the required global state measurably improves.

The following do not constitute progress by themselves:

- adding geometry;
- adding assets;
- increasing local density;
- improving one screenshot;
- satisfying a critic;
- producing reports;
- passing structural validators;
- successful export;
- successful collision;
- generating source records;
- generating evidence;
- completing a task;
- spending time;
- making a technically cleaner implementation.

Those things matter only insofar as they produce a required change in the actual campus.

0.1 The existing map is not the authority

Nothing is grandfathered because it already exists.

The current blockout, generated geometry, schema, façade systems, procedural systems, materials, placements, and previous decisions are provisional.

If an existing system prevents the visual target from being reached, replace it.

Do not preserve an implementation merely because replacing it is inconvenient.

0.2 The agent must maintain a global recovery state

Maintain a persistent state containing at minimum:

- eight zone states;
- fourteen route states;
- terrain state;
- macro composition state;
- industrial massing state;
- asset-family state;
- material state;
- lighting state;
- placement/contact state;
- coverage state;
- performance state;
- evidence state.

Each requirement must be explicitly "PASS", "FAIL", or "BLOCKED".

Every failed requirement must have:

- the failure;
- its scope;
- its evidence;
- its current priority;
- the current strategy being used to resolve it;
- the number of unsuccessful iterations against it.

The state is authoritative for workflow progression.

The agent may not replace a failed global requirement with a more convenient local task merely because that local task is easier.

---

1. Correct Target

The deliverable is an open, believable industrial campus at player scale.

It is not:

- a decorated room;
- a hero building;
- a low-poly blockout with extra strips;
- a natural canyon;
- a collection of disconnected industrial props.

The whole 768×768 facility must read as occupied and intentionally built.

The entire current map is globally low-poly and provisional:

- terrain;
- roads;
- façades;
- windows;
- pipes;
- covers;
- props;
- vehicles;
- vegetation;
- materials;
- lighting;
- placement

all require replacement or rework where necessary.

Required characteristics:

- factory buildings and warehouse blocks with distinct silhouettes;
- wet asphalt and concrete streets;
- sidewalks, curbs, joints, drains, puddles, stains, and service aprons;
- pipe racks, tanks, cable trays, substations, loading bays, stairs, catwalks, fences, lights, cabinets, signs, and maintenance clutter;
- sourced industrial vehicles, machinery, trees, and facility-edge vegetation;
- connected open yards, service alleys, bridge routes, covered routes, and below-grade corridors;
- real level changes and grounded transitions without turning the setting into a natural-landform map.

The map must feel dense because of meaningful spatial relationships and high-quality assets, not because of overlapping decorative planes.

The gameplay blockout is a contract for:

- routes;
- objectives;
- covers;
- clearances;
- zones;
- traversal;
- combat space.

It is not permission to preserve sparse, flat, or visibly low-poly scenery.

---

2. Reference Rules

Positive visual references

- "references/inspiration/17e96510-a0e6-11f1-bf60-039a9cb896aa.webp"
  
  - industrial frontage;
  - corrugated cladding;
  - real windows;
  - loading doors;
  - exposed services;
  - chain-link;
  - cabinets;
  - sidewalks;
  - wet asphalt;
  - drains;
  - practical lights;
  - vehicles;
  - vegetation.

- "references/inspiration/Screenshot_20260825_013725_Chrome.png"
  
  - processing yard;
  - substantial masses;
  - tanks;
  - pipe frames;
  - stairs;
  - handrails;
  - catwalks;
  - layered elevations;
  - service access.

- "references/inspiration/Screenshot_20260825_013737_Chrome.png"
  
  - below-grade corridor;
  - concrete enclosure;
  - arched transitions;
  - bracketed pipes;
  - sloped floor;
  - gates;
  - grime;
  - practical lighting.

Negative and review references

- "references/inspiration/c1a6e8f0-9d28-11f1-bbff-e7b68824b7d1.jpg"
  
  - reject city-street composition;
  - reject car lineup;
  - reject generic façades;
  - reject blown-out sky treatment.

- "references/inspiration/ee7a4d00-a272-11f1-aed2-f34a50f7002b.png"
  
  - rejected current-map baseline only;
  - does not authorize flat ground;
  - does not authorize blank façades;
  - does not authorize placeholder vehicles;
  - does not authorize empty aprons.

- "references/inspiration/Screenshot_20260828_051138_X.png"
  
  - critic/review comparison reference only;
  - not an environment asset;
  - not a lighting target.

- "01-sun-gap.webp"
  
  - rejected canyon/desert reference;
  - do not restore its strata, scrub, warm palette, terrain, or composition.

The industrial facility references govern the setting.

The rejected canyon reference does not define the campus terrain.

Reference interpretation must distinguish between:

- setting reference;
- architectural reference;
- material reference;
- terrain/ground reference;
- lighting reference;
- composition reference;
- rejection/reference-control material.

Do not promote a feature from one reference category into a global design premise without evidence that the reference is intended to govern that category.

Every significant change must identify:

- the positive reference informing it;
- the campus location being changed;
- the requirement it advances.

This is traceability, not progress evidence.

---

3. Source Register

Before editing, read and record the SHA-256 and extracted decisions for every source below.

Record:

- source path;
- hash;
- decisions extracted;
- phase consuming the source;
- conflicts with other sources.

If sources conflict, record the conflict and resolve it according to authority.

Do not silently select the easier interpretation.

3.1 Authoring prompt and skill pack

- "vexea-blockout-stage-prompt (2).md"
- "vexea-map-authoring (1).zip"
  - "SKILL.md"
  - "references/vexea-contract-and-ledger.md"
  - "references/industrial-grammar-and-architecture.md"
  - "references/pve-space-and-cover.md"
  - "references/scale-contact-overlap.md"
  - "references/camera-composition-and-critic.md"
  - "references/performance-and-delivery.md"
  - "scripts/validate-vexea-authoring-plan.py"
  - "scripts/validate-vexea-scene-gates.py"
  - "scripts/run-vexea-authoring-gates.sh"

Citing only the ZIP filename is insufficient. Internal paths must be cited.

3.2 Repository contracts and workflow documents

- "README.md"
- "HANDOFF-map-authoring.md"
- "HANDOFF-LUNA.md"
- "docs/runbook.md"
- "spec/map-schema.md"
- "spec/calibration.md"
- "spec/style-profile.md"
- "grammar/slice-cw-grammar.json"
- "assets/pbr/README.md"

3.3 Three.js, geometry, lighting, ground, and decision KB

- "kb/all_decision_rules.md"
- "kb/geometry_techniques.md"
- "kb/instancing.md"
- "kb/lighting.md"
- "kb/ground_rules.md"
- "kb/spatial_research.md"
- "kb/tsl_patterns.md"

Do not revive natural canyon dressing from prior research.

3.4 Blockout and generated evidence

Treat these as source material and measurement contracts, not visual authority:

- "blockout/blockout-full-v1.json"
- "blockout/blockout-v2.json"
- "blockout/blockout-v3.json"
- "blockout/blockout-map-full.json"
- "blockout/blockout-campus-coarse.json"
- "blockout/blockout-slice-cw.json"
- "grammar/slice-cw-grammar.json"

Generated evidence includes:

- "out/build-report.json"
- "out/geometry-audit.json"
- "out/collision-manifest.json"
- "out/semantic-export.json"
- "out/runtime-map-bundle.json"
- "out/traversal-report.json"
- "out/combat-space-matrix.json"
- "out/cover-bindings.json"
- "out/pve-reports.md"
- "out/verticality-report.json"
- "out/slice-contract.json"
- "out/perf-report.json"
- "SHA256SUMS"

A green structural report cannot overrule a failed full-campus visual state.

3.5 Required trace fields

Every zone, route, family, placement, asset, material, camera, and evidence record must carry:

- "sourceRefs";
- "referenceIds";
- "contractIds";
- "owner" or stable ID;
- "evidenceViews";
- placement/support/contact status where applicable.

No source-read log → no authoring.

No owner → no placement.

No evidence → no promotion.

Traceability does not count as visual progress.

---

4. Mandatory Recovery Controller

This section overrides the ordinary freedom of the production workflow.

The agent must continuously execute the following loop:

Step 1 — Observe globally

Inspect the entire campus before deciding what to work on.

Required global observations include:

- top-down map;
- all eight zones;
- all fourteen routes;
- representative player-eye views;
- terrain;
- macro silhouettes;
- density;
- major asset families;
- materials;
- lighting;
- connectivity;
- level changes.

The current work area is never sufficient evidence of global progress.

Step 2 — Recompute failures

Update the global recovery state.

Identify every requirement that remains "FAIL".

Do not rely on memory of what was previously failing.

Step 3 — Select the highest-priority unresolved failure

Priority is:

1. campus-wide macro failures;
2. zone-wide failures;
3. route/connectivity failures;
4. major asset-family failures;
5. material/lighting failures;
6. placement/contact failures;
7. local detail.

A lower-priority task is blocked while a higher-priority failure remains materially unresolved.

Step 4 — Work continuously

Execute a coherent batch of changes against the selected failure.

Do not stop after one primitive, one material, one prop, or one colour change.

A work cycle must be substantial enough to produce a meaningful observable change.

The agent is expected to continue autonomously through ordinary work.

Do not ask the user whether to perform the next trivial step.

Do not return control to the user after each individual change.

Step 5 — Re-observe globally

After the work batch, inspect the campus again.

The inspection must include the relevant global coverage, not merely the modified object.

Step 6 — Determine actual progress

Compare the new global state with the previous global state.

Ask:

- Did a required failure actually move toward PASS?
- Did another requirement regress?
- Did only one local screenshot improve?
- Did the campus-wide condition improve?
- Did coverage increase?
- Did the selected failure materially decrease?

Only observable requirement-state changes count.

Step 7 — Continue or change strategy

If the selected requirement improved materially:

continue.

If the selected requirement did not materially improve:

the current strategy has failed. Change the implementation approach before performing another equivalent batch.

Do not compensate for failed strategy with more repetitions.

Do not rename the work.

Do not increase screenshot quality.

Do not produce more documentation.

Do not ask the critic to bless the same approach again.

Step 8 — Plateau escalation

Maintain an iteration counter for each failed requirement and strategy.

A local improvement does not reset the global plateau state.

If repeated iterations produce only local improvements while the governing requirement remains FAIL, escalate.

Escalation means:

1. change the construction method;
2. change the asset strategy;
3. replace the relevant existing system;
4. widen the work scope;
5. abandon the current approach if necessary.

The agent must not continue an approach indefinitely because it can produce incremental improvements.

Step 9 — Coverage rotation

Do not repeatedly refine the same area while other required areas remain unseen or failing.

Rotate inspection across:

- all eight zones;
- all major route transitions;
- top-down composition;
- broad campus context;
- player-eye views.

A zone cannot monopolize production merely because it provides easy visual wins.

Step 10 — Phase advancement

A phase advances only when its complete acceptance state changes to PASS.

It may not advance because:

- the agent completed its assigned tasks;
- a critic approved a screenshot;
- a report is green;
- a local area looks better;
- enough assets were created;
- enough time has passed.

Phase advancement is state-based, not task-count-based.

---

5. Anti-Reward-Hacking Rules

The critic is an observer, not the authority over project progress.

The critic may identify:

- defects;
- strengths;
- local improvements;
- regressions;
- reference mismatches;
- coverage failures.

The critic may not promote local improvement into global completion.

A critic review is invalid when:

- it examines only one building;
- it examines only one frontage;
- it repeatedly uses the same camera;
- it ignores failing zones;
- it ignores terrain;
- it ignores route connectivity;
- it evaluates only material detail;
- it evaluates only the current work area.

A local critic pass must be recorded as:

"LOCAL PASS — DOES NOT ADVANCE CAMPUS GATE"

The global controller determines whether the project state advanced.

Hero-area protection

No single building, corridor, frontage, or screenshot may become the project's progress proxy.

If one area improves while the rest of the campus remains materially deficient, the project remains FAIL.

Repeated refinement of the same area while higher-priority global failures remain is prohibited.

---

6. Hard Sequencing Rule: Open Map Before Interiors

Interior/detail work is frozen until the exterior campus passes the map-wide macro gate.

Do not polish:

- one loading hall;
- one corridor;
- one interior;
- one façade;

while other zones remain sparse, flat, or visibly provisional.

The first objective is to make:

- eight zones;
- fourteen routes;
- open yards;
- silhouettes;
- service streets;
- boundary transitions

read as one facility.

A local façade or interior improvement cannot count as progress while the full-campus packet fails.

---

7. Phase A — Map-Wide Audit

Create a fixed audit packet before changing geometry:

1. top-down composition with zones/routes labeled;
2. one broad context capture for each of eight zones;
3. player-eye captures at:
   - spawn/gate;
   - warehouse/service yard;
   - plant yard;
   - bridge/overwatch;
   - core approach;
   - tunnel portal;
4. placement registry for visible:
   - buildings;
   - vehicles;
   - trees;
   - prop clusters;
   - façade modules;
   - lights;
5. overlap/floating/penetration/route-obstruction/scale report;
6. material assignment report listing actual maps on dominant surfaces;
7. camera metadata:
   - position;
   - look direction;
   - zone;
   - route;
   - source revision;
   - unique coverage ID.

Reusing the same scene under a new filename is not coverage.

The audit establishes the initial global state.

It does not count as progress.

---

8. Phase B — Macro Campus Recovery

Fix the largest failures before small detail.

Terrain and ground

Replace dependence on the monolithic slab with:

- segmented streets;
- yards;
- pads;
- thresholds;
- drains;
- curbs;
- service edges;
- ramps;
- graded transitions.

Establish real industrial level variation through:

- raised pads;
- ramps;
- stairs;
- bridge decks;
- retaining construction;
- tunnel mouths;
- graded roads.

Do not use:

- random noise;
- decorative rock walls;
- canyon strata;
- natural-landform dressing

as substitutes for designed industrial terrain.

Campus massing

Establish:

- anchor buildings;
- secondary sheds;
- plant equipment;
- pipe corridors;
- fenced utilities;
- loading courts;
- vegetation pockets;
- vehicle/machinery staging.

Every zone requires distinct silhouette and operational identity.

No copied façade strip.

No empty slab.

Open yards

Every intentional open yard must have an operational explanation through appropriate combinations of:

- markings;
- drains;
- barriers;
- pallets;
- equipment;
- lights;
- fences;
- staging;
- service access.

Gameplay preservation

Preserve:

- route width;
- capsule clearance;
- drone clearance;
- objectives;
- cover;
- alternate paths.

Phase B passes only when the full campus reads as an industrial facility from:

- top-down;
- broad context;
- every fixed player-eye route view.

---

9. Phase C — Replace Globally Low-Poly Construction

At visible player distance, no required environment component may read as a coarse primitive kit.

This includes:

- terrain;
- roads;
- buildings;
- façades;
- windows;
- pipes;
- covers;
- props;
- vehicles;
- trees;
- lights.

Rebuild families with:

- modeled bevels;
- joins;
- thickness;
- frames;
- brackets;
- hardware;
- believable glass;
- silhouette variation.

Use sourced:

- vehicles;
- machinery;
- trees;
- vegetation

with:

- provenance;
- dimensions;
- material assignments;
- collision policy;
- LODs.

Place:

- pickups;
- forklifts;
- service trucks;
- tanks;
- pallets;
- bins;
- cable reels;
- utilities

where campus operation explains their presence.

Use:

- instancing;
- batching;
- occlusion;
- useful LOD.

LOD may not turn player or medium-distance views back into blockout geometry.

Seeded randomness may vary a family.

It may not decide:

- composition;
- density;
- scale;
- sightline quality;
- operational placement.

Phase C fails if any required campus view still reads low-poly.

---

10. Phase D — Material and Lighting Recovery

No material is accepted because a texture file exists.

Dominant surfaces require verified:

- base color/albedo;
- tangent-space normal;
- roughness;
- metalness;
- AO, separate or documented packed ARM channels;
- modeled relief or height/parallax where scale requires it.

Required material families include:

- wet asphalt;
- dry asphalt;
- concrete;
- painted corrugated steel;
- galvanized/painted utility metal;
- rusted metal;
- glass;
- rubber;
- gravel/soil;
- tunnel concrete.

Close views must show:

- aggregate;
- panel relief;
- puddle response;
- edge wear;
- contact darkening;
- believable roughness variation.

Synthetic noise pasted across everything is not a material pass.

Lighting

Author and verify:

- neutral overcast/environment base;
- directional key;
- readable contact shadows;
- cast shadows;
- practical warm fixtures;
- building lights;
- street lights;
- service corridor lights;
- tunnel threshold lighting;
- controlled exposure;
- ambient/contact response.

Reject:

- default-white illumination;
- blank wash;
- fog used to conceal geometry;
- lighting that prevents material evaluation.

Produce a material/lighting board from multiple campus locations.

---

11. Phase E — Placement, Collision, Performance

Create one canonical placement registry for generated and sourced objects.

Before export:

- test objects against buildings;
- roads;
- routes;
- covers;
- clearance volumes;
- ground;
- combat lanes;
- drains;
- doors;
- stairs;
- service access;
- sightlines.

Reject:

- floating;
- sunk;
- penetrating;
- duplicated;
- implausibly scaled;
- z-fighting;
- unsupported façade modules;
- obstructive props.

Verify:

- shadows;
- grounding;
- contact response

at actual placement.

Measure:

- draw calls;
- triangles;
- texture memory;
- visible LOD behavior;
- full-campus runtime behavior.

Performance optimization must use:

- hierarchy;
- instancing;
- visibility;
- LOD;
- batching;
- paging

rather than deleting required fidelity.

---

12. Phase F — Full-Campus Adversarial Review

The critic receives the complete campus packet:

- all eight unique zone captures;
- all six route-transition captures;
- top-down view;
- broad context views;
- material/lighting board;
- placement/overlap report;
- before/after images;
- camera metadata;
- changed-file summary;
- current global recovery state.

The critic must evaluate the campus as a whole.

It must explicitly identify:

- highest-level remaining failure;
- failed zones;
- failed routes;
- macro terrain failures;
- density failures;
- low-poly areas;
- missing asset families;
- material failures;
- lighting failures;
- regressions;
- evidence gaps.

A local correction may be praised, but it cannot become a campus pass.

Any failed required zone blocks acceptance.

---

13. Global Progress Ledger

After every substantial work cycle, update:

GLOBAL RECOVERY STATE

Campus macro composition: PASS / FAIL
Terrain and level variation: PASS / FAIL
Zone 1: PASS / FAIL
Zone 2: PASS / FAIL
Zone 3: PASS / FAIL
Zone 4: PASS / FAIL
Zone 5: PASS / FAIL
Zone 6: PASS / FAIL
Zone 7: PASS / FAIL
Zone 8: PASS / FAIL

Route network: PASS / FAIL
Open-yard density: PASS / FAIL
Industrial massing: PASS / FAIL
Asset families: PASS / FAIL
Materials: PASS / FAIL
Lighting: PASS / FAIL
Placement/contact: PASS / FAIL
Campus coverage: PASS / FAIL
Performance: PASS / FAIL

CURRENT HIGHEST-PRIORITY FAILURE:
...

CURRENT STRATEGY:
...

ITERATIONS AGAINST CURRENT STRATEGY:
...

GLOBAL STATE CHANGE SINCE LAST CYCLE:
...

REGRESSIONS:
...

NEXT REQUIRED ACTION:
...

The next action must follow from this state.

The agent may not select a more convenient task simply because it is easier.

---

14. Plateau and Strategy-Failure Protocol

A plateau occurs when substantial work has occurred without meaningful improvement in the governing global requirement.

When a plateau occurs:

1. stop repeating the current method;
2. identify why the current method cannot satisfy the requirement;
3. select a different production method;
4. apply it at sufficient scale to test whether it changes the global state;
5. re-observe the whole campus;
6. retain the new method only if the global state improves.

If the new method also fails, escalate again.

The agent must not continue making increasingly polished versions of an approach whose governing requirement remains FAIL.

Local improvement does not reset plateau detection

Example:

Campus terrain: FAIL
Campus density: FAIL
Zone 2 frontage: improved
Zone 2 screenshot: improved

Result:
GLOBAL PROGRESS = FAIL

The improved screenshot is recorded but does not reset the macro recovery requirement.

---

15. Regression Control

A successful iteration must not merely improve one requirement while destroying another.

After every substantial work cycle, check:

- route preservation;
- clearance;
- gameplay space;
- terrain continuity;
- zone identity;
- asset placement;
- performance;
- visual quality.

If an iteration introduces a major regression:

1. record the regression;
2. correct it;
3. reassess the strategy;
4. do not count the iteration as successful merely because another area improved.

---

16. Definition of Done

The agent may request user review only when all required global visual gates pass.

The complete map must:

- visibly read as a dense, intentional industrial campus;
- read correctly from top-down;
- read correctly from broad context views;
- read correctly at player scale;
- contain distinct industrial massing in every zone;
- have meaningful connected routes;
- contain believable terrain and level transitions;
- have operationally explained open yards;
- contain sourced vehicles, trees, machinery, and appropriate clutter;
- have complete material response at player scale;
- have readable lighting, contact, and shadows;
- contain no required area that reads as a flat slab, sparse blockout, or coarse primitive kit;
- have clean placement, overlap, clearance, grounding, and scale;
- have full-campus evidence with unique coverage;
- meet performance requirements without restoring blockout-quality LODs.

Only after the full visual gate passes may:

- deterministic validators;
- traversal/PvE checks;
- export checks;
- runtime integration;
- mobile checks

be treated as final completion gates.

Technical validity never overrides visual failure.

User acceptance remains final.

---

17. Stop Conditions

Stop adding detail and return to the highest failing phase if:

- the map remains sparse or flat;
- one hero building carries the visual result;
- any required area still reads low-poly or primitive;
- terrain remains visually unchanged despite local dressing;
- materials remain flat, tiled, or unconvincing;
- lighting remains missing or washed out;
- windows, panels, props, or terrain overlap or float;
- routes remain empty or unexplained;
- the critic packet omits zones;
- cameras repeat;
- local refinement is occurring while higher-level failures remain;
- technical validation is being used to defend a visibly bad result;
- repeated iterations produce only local improvement;
- the current strategy is not changing the global recovery state.

When any of these occur, do not polish the failure. Return to the appropriate higher-level recovery loop.

---

18. Autonomous Execution Rule

The agent is expected to execute the recovery process continuously.

Do not ask the user whether to perform the next ordinary production step.

Do not stop after:

- one colour change;
- one prop;
- one material;
- one building detail;
- one screenshot;
- one validation result;
- one small correction.

Continue through coherent work cycles.

"/goal" checkpoints are for meaningful milestones and state reports, not permission requests.

The agent should return control to the user only when:

1. the full-campus visual gate is satisfied and the result is ready for user acceptance; or
2. a genuine external blocker exists that cannot be resolved through further autonomous work.

A failure of the current strategy is not an external blocker.

Change strategy and continue.

---

19. Final Governing Rule

Never confuse activity with progress.

The agent's job is not to demonstrate that it has been working.

Its job is to continuously reduce the distance between the actual campus and the requested campus.

If the global visual state is not improving, the current approach is wrong.

If the current approach is wrong, change it.

If a local improvement does not improve the global state, it does not authorize further local refinement.

If the map is not done, continue working.

The loop ends when the campus passes the global visual gate—not when the agent runs out of tasks it can conveniently perform.
