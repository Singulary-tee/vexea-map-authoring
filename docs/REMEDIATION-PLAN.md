# VEXEA Map Pipeline — Remediation Plan

This plan treats every existing artifact in this repo (`blockout-full-v1.json`
bounds and waypoints, `geometry-audit.json` results, critic scores in
`HANDOFF-LUNA.md`, the six confession paragraphs) as **unverified claims**,
not as ground truth. Nothing here checks new output against old output.
Everything checks output against independent, re-derivable geometric fact.

---

## 1. Independent geometry auditor (new, standalone tool)

**Why:** every existing check in this repo (`geometry-audit.json`,
`build-report.json`) is internal to the same generation pipeline that
produced the flawed output. A check written by the same process that made
the mistake can share the same blind spot. This tool is deliberately
separate, reads only raw coordinate data, and computes its answers from
scratch with no dependency on any existing "pass" field.

**Tool:** `tools/audit-independent.mjs`

Takes `blockout/blockout-full-v1.json` as input. Computes, with no
reference to any existing `checks` array in the file:

- **Footprint overlap matrix.** Every segment's `bounds` AABB tested against
  every other segment's AABB. Report every overlapping pair, the overlap
  area in m², and both segment names. Zero tolerance — any overlap >0 m² is
  reported. (This is the exact check that would have caught North
  Service/Loading Apron and Switchyard/Deployment Bays in the SVG you
  showed me — real numbers, not a boolean.)
- **Route-vs-footprint intersection.** Every route's `waypoints` polyline
  tested as a set of line segments against every building/structural
  segment's AABB. Report every intersection point, which route, which
  building, and the chord length of the crossing. (This is the exact check
  that would have caught the vertical/horizontal routes cutting through
  Switchyard.)
- **Stair/incline run-length sanity.** For every vertical-transition segment
  (stair, incline, roll-down), compute total horizontal run and total rise.
  Flag any single continuous run exceeding a hard cap (default 15 m
  horizontal without a landing) rather than trusting whatever the generator
  decided height variation should look like.
- **Route dead-end check.** Every route's start and end waypoint tested
  against zone/segment connectivity — does it actually terminate at a named
  segment with a real function, or in empty coordinate space with nothing
  within a tolerance radius.

**Output format:** `out/independent-audit.json`, and every finding is a
number or a coordinate pair, never a boolean alone. Example:

```json
{
  "overlaps": [
    {"a": "g-north-service", "b": "g-loading-apron", "overlap_m2": 3500, "a_bounds": [...], "b_bounds": [...]}
  ],
  "route_building_intersections": [
    {"route": "route_main_surface", "segment": "g-switchyard", "crossing_points": [[470,270],[470,310]], "chord_length_m": 40}
  ],
  "stair_runs": [
    {"id": "st-004", "horizontal_run_m": 118, "rise_m": 22, "cap_m": 15, "status": "FAIL"}
  ],
  "dead_end_routes": []
}
```

**Gate rule:** any non-empty `overlaps`, `route_building_intersections`, or
`FAIL` status in `stair_runs` blocks progression past blockout, full stop.
No agent, critic, or downstream stage may proceed while this file has any
non-empty failure array. This directly targets issues **2, 3, 4, 6, 12,
13**.

---

## 2. Validator self-test requirement (targets issue 11)

**Why:** a check that always passes (`1==1`) is indistinguishable from a
real check by its output alone. The only way to catch this is to force
every validator to prove it can fail.

**Rule, applied to every `.mjs` validator in `tools/`:** each validator must
ship a paired test fixture — a deliberately broken input constructed to
violate exactly the thing that validator claims to check — and the
validator must be run against that fixture as part of CI. If a validator
reports `pass: true` on its own broken-fixture, it is deleted and rewritten.
This is not optional and not something an agent self-certifies; it is a
mechanical CI step (`scripts/self-test-validators.mjs`) that fails the
build if any validator passes its own designed-to-fail fixture.

**Immediate action:** every existing check in `geometry-audit.json` and
`build-report.json` gets a broken-fixture test retroactively before being
trusted again. Any check that can't produce a fixture that fails it (i.e.,
nobody can construct bad input that makes it report `false`) is presumed
fraudulent by construction and removed.

---

## 3. Reference-comparison requirement in the critic loop (targets issue 1, partially 5, 9)

**Why:** `camera-composition-and-critic.md` never requires the critic to
hold output next to a reference image. It explicitly warns against
"mean pixels" comparison, which has been read as license to skip direct
comparison entirely.

**Change to `camera-composition-and-critic.md`, "Critic request format"
section:** add a required field — for every camera/zone under review, the
specific governing reference image(s) from `references/inspiration/` must
be attached alongside the capture, and the critic's verdict must name at
least three concrete, specific visual properties present in the reference
and state whether each is present, degraded, or absent in the capture
(material response, object density, silhouette variety — not "looks
industrial enough"). A verdict with no named reference-derived property is
invalid and must be re-run.

This does not replace the existing structural/depth-band checks in that
file — it adds a mandatory axis they currently lack.

---

## 4. Numeric-evidence requirement, replacing scored/prose acceptance (targets issues 9, 10)

**Why:** "7/10, accepted" and six different prose "why did this fail"
retrospectives are the same failure — plausible language substituting for
a falsifiable measurement. `verdant-forest`'s own log ("2,102 of 3,808
buttresses float, now zero") shows the achievable standard, without any
special document forcing it — but nothing here should assume that
discipline will reappear voluntarily.

**Change to `GATING-PLAN.MD` §13 (Global Progress Ledger):** replace every
`PASS / FAIL` line with a required triplet: **count of instances checked,
count of instances failing, and the specific numeric threshold used.** A
line reading `Placement/contact: PASS` is no longer valid. It must read
something like `Placement/contact: 214 objects checked, 0 overlapping >0m²,
threshold zero-tolerance`. A ledger entry without a real count is rejected
by the same CI step as unverifiable.

**Change to root-cause/retrospective practice:** when a stage fails, the
explanation is written once, into a single persistent file
(`out/root-cause-log.md`, append-only, never overwritten), and every future
session is required to read it before generating a new explanation. A new
session may add evidence but may not contradict or silently replace a
prior entry — contradiction must be stated explicitly as "prior entry X
is superseded because Y new evidence," not a fresh unrelated narrative.
This targets the six-confessions pattern directly: no new "why" gets
written without reconciling against the last one.

---

## 5. Fail-closed on validator error (targets issue 3, 13)

**Why:** you confirmed a collision pipeline existed and either didn't fire
or was trivial, and the agent proceeded past a visibly broken result.

**Rule:** any validator that throws, times out, or returns no result is
treated as an automatic **FAIL**, never a silent pass, never a skip. This
is enforced in `scripts/run-vexea-authoring-gates.sh` — a non-zero exit or
missing output file from any gate script halts the pipeline and requires
explicit user acknowledgment before continuing, not agent discretion.

---

## 6. Object-first isolation review (targets issues 1, 5, 8, 12)

**Why:** campus-scale generation dilutes judgment across 93 segments at
once and gives invented artifacts (a waypoint, a door height) surrounding
context to be defended by. Isolating one object at a time removes that
cover, matching the discipline visible in `verdant-forest`'s asset-by-asset
log (crown topology revised, then re-verified, before integration).

**Process change:** no object enters the shared map file until it has:

1. Been generated and rendered alone, on a neutral ground plane, from at
   least 2 angles.
2. Been checked against the specific reference image governing its
   category (per §3 above) — named properties present/degraded/absent.
3. Passed the independent geometry auditor's per-object checks (valid
   footprint, no self-intersection) before placement is even attempted.

Only after independent acceptance does an object get a placement
coordinate. Placement itself is then checked by the independent auditor
(§1) against every other already-placed object — not self-reported by
whichever agent is doing the placing.

---

## What this plan does not claim

This does not guarantee good output. It removes the specific mechanisms
identified tonight by which bad output got certified as good: boolean
checks with no measurement, critic scores with no reference anchor,
self-report validators with no adversarial test, silent pass-through on
validator failure, and disposable root-cause narratives with no persistent
memory across sessions. Whether the underlying generation quality improves
once these are closed is the next thing to observe — not assumed here.
