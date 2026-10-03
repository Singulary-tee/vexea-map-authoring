# SCHEMAS — zone warehouse family set (rev 1, execution-ready)
Targets the `zone warehouse` board tile: B2 warehouse with open bay, forklift,
palletized cargo, bollards, puddles, fence line, lamps, drums, barrier.
All objects: spline vocabulary, default-deny interactions, anchor-snap placement,
connectivity + silhouette gates. Shared gates live in the checker; per-object rules here.

## W1 dock-bollard (yellow, filled, 1.1 m)
Form: lathe body r 0.16 h 1.05 with 8 pt spline profile (domed cap, belly taper);
base flange lathe r 0.20 thk 0.02; reflective band = embedded torus ring (yellow, thk 0.045).
Anchor = flange bottom. Interactions: ground.contact@base only. Spacing >= 2.5 m.
Variants: clean / dusty (chips at collar) / broken (bent 15 deg at 0.45 m).

## W2 pallet-load (pallet + cargo: 2 drums or crate stack)
Pallet: 7-stringer lathe deck 1.2x1.0x0.14; cargo: 2 drums (lathe r 0.28 h 0.88, rolling
hoops) OR 3 crate boxes (banned: boxes ARE allowed for cargo crates? NO — extrude with
chamfer, corrugated normal map). Load height <= 1.6. Variant: partial (one drum absent),
dusty (rust rings), broken (drums tipped: one drum rotZ 1.2, spill disc).
Placement: snap-ground; interactions: ground.contact only; may NOT touch walls (gap 0.5).

## W3 forklift (procedural, schema-defined; sourced-GLB blocker unchanged — procedural
per reuse table since vehicles GLBs are still absent)
Parts: chassis (extrude, rounded), overhead cage (4 posts + top frame, tube r 0.03),
counterweight (lathe wedge), mast (2 vertical rails + 2 hydraulic cylinders + carriage),
forks (2 tapered flat lathes L 1.05), 4 wheels (lathe tires + hub caps, r front 0.36),
seat + steering column + overhead guards, rear counterweight box, mirrors.
Approx 24 parts, tri target [8k, 30k]. Anchor = chassis underside center; wheels bottom
contact = the ONLY ground interaction. Variant: clean / dusty / broken (mast
stuck raised 25 deg, forks skew).

## W4 puddle (ground decal)
Flat lathe disc, r 0.8-2.2, h 0.006, irregular outline (12-pt spline, per-instance seed),
material: wet-asphalt dark, roughness 0.08, metalness 0.1, opacity 0.85 — sits ON grade
(+0.008). Interaction: ground.contact + NOTHING (vehicles/drives THROUGH is contact-
class "puddle-submersion@footprint", allowlisted for forklift + pallet only).

## W5 fence-run (perimeter/security, 8 m segment)
Posts lathe r 0.03 h 2.4 every 2.0 m; top rail r 0.025; mid rail; mesh = plane
1.8 h with M.fence-like wire normal pattern (grid, transparent 0.4). Barbed wire:
3 strands torus-thin along top, outboard arm 45 deg. Anchor = first post base.
Interactions: ground.contact@post-bases; vegetation.tuft@base-line allowed.

## W6 barrier-jersey (concrete traffic barrier, 2 m)
Lathe-extrude trapezoid profile (base 0.62, top 0.20, h 0.85) with chamfered top,
reflective strip inlay (white band y 0.75-0.95). Anchor = full base face.

## W7 drum-cluster (2-4 drums, banded)
Lathe drums r 0.29 h 0.88, 2 rolling hoops each, steel blue / rust variants; cluster of
2-3 touching (drum-drum contact is an ALLOWED interaction pair: drum.stack@drum.top).

## W8 sign-panel B2 (facade plate)
Plate 2.4 x 1.2 on 2 standoff posts, painted steel, "B2" block letterforms from box
segments (letters are intrinsically polygonal; exempt from spline rule by schema).
Face +Y from wall face; attach-edge on bld-north-shed south at y 4.2.

## Shared rules (all family schemas inherit §0 of streetlamp schema)
Default-deny interactions; anchor-origin; no authored y; snap placement; deterministic
collapse; parts >= 8 for near-camera classes (lamp/forklift), >= 4 for small props;
ring segments >= 32; every family: multiview gate + connectivity gate + counterfactual.

## Yard plan (zone-warehouse frustum)
6 pallet-loads along maintenance south + mid-yard; forklift center-yard heading yard;
4 bollards at shed corners; fence-run x3 along west edge; barrier pair at gate; drum
cluster x2; puddles x5 (near dock); lamps x2 (existing); B2 sign on shed face.

## Verification per object: quality gate + connectivity (counterfactual once per family)
## Nuke list: executed pre-placement (21 legacy + 2 legacy poles; rev 73-75)
