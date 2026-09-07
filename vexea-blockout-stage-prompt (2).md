# Stage: Full-Map Blockout (orthographic, tagged, segment-only)

You are re-entering the workflow at the spatial-foundation stage, at full-map
scope. This is not a restart. Every ledger entry, hash, calibration fixture,
reference extraction, and prior report from the last ~70 hours remains valid
and is not discarded. What changes now is composition discipline: you have
not yet had a single scene where every element is deliberate, tagged, and
traceable to a reason. That is what this stage produces.

## Constraints for this stage

- **Orthographic view only** while blocking out. No perspective composition,
  no lighting/atmosphere pass, no camera work — that is a later stage.
- **No GLBs. No procedural complex geometry.** Every element is a primitive
  block standing in for a category, not a finished object. If you are placing
  detail — wheel width, facade material, stair tread profile, pipe routing —
  you are not doing this stage. Stop and return to blockout.
- **Segment-only, world-space, full campus.** No flat ground plane. The
  ground itself is a set of segments, not a default plane with objects on
  top of it.
- **Consistent snap grid.** Pick one grid size before placing the first
  segment and hold it for the entire pass. Every segment's position and
  major dimension snaps to it. A blockout built at inconsistent scale
  invalidates the calibration/contact/overlap gates that run on top of it
  later — this is a prerequisite for those gates, not a stylistic choice.

## What qualifies as a segment (and what does not)

A segment exists only if it is **gameplay-relevant**: it constrains or
enables movement, sightline, entry, or tactical decision-making for players
or drones. Test every block against this before placing it:

- Does this block or channel movement (floor, wall, stair, incline, rock
  face acting as a boundary)?
- Does this define an enterable or non-enterable volume (building, warehouse,
  tunnel, bridge)?
- Does this create or close a sightline (blocking segment, overpass/overhead
  cover segment, facade)?
- Does this admit or deny a specific traversal type (door/entrance for
  players, hole/broken-area for quadcopters, tunnel requiring X-ray/interior
  visibility)?
- Is this a **cover segment** — placed deliberately to interrupt a specific
  drone approach lane or player route, not merely incidental mass? If yes,
  tag it with what it interrupts and what breaks tactically if it is removed.
  If a block only happens to have collision but wasn't placed for a tactical
  reason (streetlight, pipe run, decorative rock, tree), it is not a segment.

  Every cover segment additionally requires two properties beyond placement,
  since "provides cover" alone is not checkable:
  - **Threat elevation**: does this protect against ground-level attackers,
    elevated/airborne attackers (drones), or both? A waist-height block
    stops nothing against an airborne approach angle — state which
    elevation this segment is actually rated against.
  - **Depth and directionality**: shallow cover exposes the user on
    sidestep/lean; deep cover holds. Free-standing cover exposes on all
    sides and invites circling; directional cover blocks one approach and
    leaves a flank open — state which, and which flank if directional.
  A block tagged "cover" without both properties stated is an assumption,
  not a placement, and does not pass this stage.

If a block fails every test above, it does not belong in blockout, full stop
— not even as a placeholder. Decorative density is authored later, in the
procedural-grammar and dressing stages, not here.

If a zone's segment boundaries cannot be derived from `ARCHITECTURE.md`,
`GAMEPLAY.md`, or the existing ledger, do not invent a plausible layout to
fill the gap. Flag it as an open question against the specific missing
source and move to the next zone. A segment placed from a plausible guess
looks identical to one placed from truth and will not be caught by any
gate downstream — this is the one failure mode the gates cannot detect,
so it has to be caught here, at the point of authorship.

## Required tag per segment

Every segment gets, at minimum:

- **Stable ID** (per the existing plan-schema convention)
- **Category**: floor / wall-blocking / stair / incline / roll-down /
  building-enterable / warehouse-enterable / facade-non-enterable / tower /
  bridge / tunnel-passage (X-ray flag if interior visibility is required) /
  hole-drone-entry / entrance-player / cover / overhead-cover (UAV-bomb-line
  closure) / mountain-boundary / waterbody-boundary / spawn / kill-zone /
  ground-surface-type
- **Name** describing what it is, in plain terms (e.g. "north warehouse,
  2 floors" not "seg_014")
- **Dimensions**, taken from the calibration fixture — every entrance,
  stair, doorway, and hole height must be checked against the 1.8 m player
  capsule and against every other segment that connects to it. A 2 m entry
  feeding into 3 m stair rise is a contradiction; resolve it before moving
  on, not after.
- **Connectivity**: what this segment connects to, and via which other
  segment (route, tunnel, bridge, stair)
- **Ground-surface classification** where applicable: dirt, asphalt,
  concrete, or mixed
- **Color-coding** by category for the orthographic view, plus X-ray/
  wireframe toggling for anything with interior traversal (tunnels,
  multi-floor interiors)

## Discipline

Nothing haphazard. Every segment is a deliberate decision, not a filled gap.
Do not let two adjacent, connected segments contradict each other in scale —
check every junction (entrance-to-stair, floor-to-floor, tunnel-to-surface)
against the fixture before calling a segment done.

Keep iterating on the full-map blockout — not a single slice — until every
segment is placed, tagged, named, dimensioned, and connected, and no
junction fails the scale-contradiction check.

## Traversal check (required before this stage is called done)

Structural correctness (tagged, dimensioned, non-contradictory junctions)
is necessary but not sufficient. A blockout's actual purpose is to be
walked and evaluated, not just assembled — a layout can pass every
structural check and still fail to play correctly. Before declaring the
blockout complete:

- Walk every spawn-to-objective route as the 1.8 m player capsule and
  confirm it is physically traversable end to end, with no segment gap,
  no unreachable connector, and no stair/incline the capsule cannot climb.
- For every cover segment, confirm from its stated threat elevation and
  directionality that it actually interrupts the drone lane or route it
  was placed against — not just that it exists near that lane.
- For every kill-zone and deployment closure, confirm the segments that
  are supposed to enforce it actually do, geometrically, not just by name.

Record this as a traversal report alongside the segment tags. A route that
fails this check sends the responsible segment back to authoring — do not
patch it by moving the objective or spawn point to match the broken route.

## Persistent reference layer

The blockout is not a scratch pass to be deleted once detailing begins. It
is a permanent, hideable layer that every later stage (procedural grammar,
GLB placement, dressing) is built on top of and checked against. Keep it
intact in the scene hierarchy rather than replacing or overwriting it —
this is what makes it possible to revert or re-diff against original
intent later, and it is the reason none of the last ~70 hours needs to be
treated as at risk going forward.

## Deliverable

An orbit-controllable URL showing the complete tagged, color-coded,
orthographic-capable blockout of the full map, plus the traversal report.
No time limit is set on this stage. Report progress at check-ins; do not
compress or rush the pass to hit an assumed deadline.
