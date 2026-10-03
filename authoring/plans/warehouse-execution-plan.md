# EXECUTION PLAN — zone warehouse tile (FULL PARAMETERIZATION)
Reference: zoomed B2 warehouse tile. Pipeline: representation-plan -> THIS -> checklist ->
build -> verify -> serve. Internal working document; user sees only the final scene.
Reference frame: canonical map, meters, Y-up. zone-warehouse camera pos
[-164,1.7,34] tgt [-118,5,-10] fov 50; forward (0.72,0.05,-0.69), right (0.69,0,0.72).
Camera-frame coordinates (depth along forward, right along camera-right) are given for
every element so composition targets are verifiable mechanically.

## A. b2-warehouse (1 shell) — authored building-scale object
Placement (snap-ground): anchor = facade-bottom-left corner at (-172.8, 15.0), azimuth
90.0 deg (facade plane faces -z... verified: facade plane x-y at z=15.0, facing camera).
Footprint: 23.4 x 12.0 m (x -172.8..-149.4, z 15.0..27.0) on g-yrd-west (grade -0.60).
Scale (1,1,1). Total height 12.0 m + 0.5 parapet = 12.5.
Anchor y: -0.60 (editor-computed, flush). Facade-frame offsets below are along facade
width W=23.4 m from facade-left (x -172.8), height from grade.

### A.1 Structure parts (all spline vocabulary; boxes only where schema-exempt)
| part | form | position (facade x-offset, y, z) | dims |
|---|---|---|---|
| plinth | extrude, full width | (0..23.4, 0..0.6, front +0.04 proud) | 23.4 x 0.6 x 12.0 |
| facade wall | extrude panel array | full width, z = 15.0 plane, thickness 0.35 | 23.4 x 11.4 |
| side returns (2) | extrude | x=0 & x=23.4, depth 12.0 (z 15->27) | 12.0 long x 11.4 h, thk 0.35 |
| roof slab | extrude | (0..23.4, 11.4..11.9, z 15..27) | 23.4 x 0.5 x 12.0 |
| parapet | extrude | front edge, y 11.4..12.5, thk 0.25 | 23.4 x 1.1 x 0.25 |
| corrugated ribs | 78 lathe ribs | pitch 0.30 m starting x-offset 0.15, vertical, proud 0.025 | r 0.022, h 10.8 (y 0.6..11.4) |

### A.2 Openings (through-penetrations in the panel array; real holes)
| opening | count | facade x-offset (center) | sill | w x h | depth/thickness | state |
|---|---|---|---|---|---|---|
| dock bay | 1 | 14.2 (world x -158.6) | 0.0 | 5.0 x 4.5 | through 0.35 panel | OPEN — no leaf; interior box 8 m deep (z 15..23), floor slab, dark 0x15181c; lintel band y 4.5..5.3 full bay width +0.4 margins |
| personnel door | 1 | 5.2 (world -167.6) | 0.0 | 1.0 x 2.2 | recess 0.10 | CLOSED leaf, steel-dark, handle bar |
| personnel door | 1 | 18.6 (world -154.2) | 0.0 | 1.0 x 2.2 | recess 0.10 | CLOSED leaf |
### A.3 Surface features
| feature | count | position | dims | material |
|---|---|---|---|---|
| B2 glyphs ("B","2") | 2 | x-offset 4.0..6.4, base y 5.5 | 1.2 tall, stroke 0.16 | sign-white, proud 0.02 |
| downspout | 2 | x-offset 1.2 & 22.2, y 0.6..11.2 | r 0.09 | galvanized |
| wall stains | 8 | deterministic seed, y 0.6..8, width 0.3..0.9 | streaks | rust tint alpha |
| facade lamps | 2 | x-offset 9.0 & 17.0, y 6.0 | arm 0.5, head 0.4 | wall pack, galvanized |

## B. Apron (1) — wet ground identity
Placement: snap-ground at (-163.0, 21.0). Extent 34.0 x 18.0 m (x -180..-146, z 12..30),
thickness 0.02, on grade -0.60 (top -0.58). Material: wet-asphalt (photoAsphalt PBR,
roughness 0.15, metalness 0.35, repeat 3.2). Edge: no curb (asphalt apron flush to yard).
### B.1 markings (painted on apron, +0.002)
| marking | count | layout | dims |
|---|---|---|---|
| bay approach stripe pair | 2 | converging to bay center (-158.6, 12.8) from z 18 | 0.15 w, yellow, worn (alpha 0.6) |
| stop line | 1 | z=13.6 across bay width | 5.6 x 0.30 |
### B.2 drainage
| element | count | position | dims |
|---|---|---|---|
| channel grate | 1 | x -158.2..-150.2, z 13.2 | 8.0 x 0.4, flush, dark steel bar pattern |

## C. Props (exact counts/positions; all through existing schemas)
| object | count | world pos (x, z) | rotY (deg) | variant | frame (depth, right) |
|---|---|---|---|---|---|
| dockbollardnew | 3 | (-160.9, 13.5), (-158.6, 13.5), (-156.3, 13.5) | 0 | clean/dusty/clean | d 18.9..22.6, r 5.1..9.9 |
| midnightradiosea (forklift) | 1 | (-152.0, 26.0) | editor: face bay (-158.6, 15) | clean | d 14.2, r -2.5 |
| poolwaveprint (puddle) | 1 | (-168.0, 18.0) scale 1.0 | - | clean | d 8.9, r 13.9 |
| poolwaveprint | 1 | (-158.0, 21.5) scale 0.8 | - | clean | d 15.4, r 6.1 |
| poolwaveprint | 1 | (-148.5, 24.0) scale 1.15 | - | dusty | d 19.3, r -5.4 |
| poolwaveprint | 1 | (-163.0, 27.0) scale 0.7 | - | clean | d 11.6, r 8.9 |
| green-dumpster (new) | 2 | (-151.0, 32.0), (-148.6, 32.4) | 8, -4 | dusty, clean | d 13.4/13.9, r -9.0/-10.3 |
| guard-rail (new) | 1 run | posts x -146..-138 step 2.0, z 20.0 | - | dusty | d 13.6..19.4, r -6.5..-12.5 |
| conifer (new) | 6 | (-125,-48) (-121,-45) (-117,-47) (-113,-44) (-109,-46) (-105,-44) | 0 | clean | d 84..94, r 20..33 |

## D. Relationships (explicit)
Contact: warehouse plinth bottom <-> ground (flush, penetration 0); apron top <-> prop
bases (bollards/puddles/grate on apron at y -0.58; forklift wheels on apron); glyphs
<-> facade +0.02; downspouts <-> facade +0.03; grate <-> apron flush.
Separation: bollards <-> bay front plane >= 1.8 m (bay at z15, bollards z 13.5); forklift
<-> bollards >= 3.0 m (dist 11.4); dumpsters pair gap 0.3 m; new footprint <-> legacy
props: forklift/drum-cluster relocation (E).
Occlusion: facade (z15) occludes legacy maintenance wall (z11, h12) from canonical
camera — verified by projection (legacy wall depth 1.4..31 right 2..58; facade covers
depth 6.8..23.1 right 4.2..19.8); forklift occludes bay right jamb lower third.
Negative space: bay interior dark void (8 m deep) is built, not implied.

## E. Nuke / relocation
| instance | action | target |
|---|---|---|
| forklift inst-0023-l8jr (-175,22) | MOVE | (-152,26), azimuth editor-computed toward bay |
| drum cluster inst-0021/0022-wnjl | KEEP (outside footprint z<=27? at z30/22 — 0022 z30 outside, verify; move if footprint intersects) |
| legacy buildings | KEEP (occluded by facade from this camera; building-layer replacement = separate later pass, tracked) |
| legacy yard props outside footprint | KEEP |

## F. Tolerances
Positions +/-0.5 m; facade dims exact; bay 5.0x4.5 exact; glyph height 1.2 +/-0.05;
counts exact; rib pitch 0.30 +/-0.01; colors per material table; camera-frame right
offsets +/-1.5 m.

## G. Build order
1. green-dumpster schema+doc (connectivity+counterfactual) 2. guard-rail schema+doc
3. conifer schema+doc 4. b2-warehouse schema+doc (largest; bay hole counterfactual)
5. apron schema+doc 6. author all 7. relocations (E) 8. place all per tables
9. verification H 10. canonical capture 11. side-by-side + critic 12. iterate

## H. Verification (mechanical, geometry-based)
| req | method |
|---|---|
| facade fills left 2/3 at face-on | canonical capture pixel columns; facade right edge >= 55% frame width |
| bay 5.0x4.5 through-hole | see-through capture (interior camera -> sky/yard visible) |
| bay dark interior | capture shows interior box, not sky |
| 2 closed personnel doors | scene-state parts count = 2 leaves; visible in capture |
| 78 ribs +/-2 | count in doc; rib pitch measured in capture |
| B2 legible | capture: glyphs contrast >= 2:1 vs cladding |
| 3 bollards / 1 forklift / 4 puddles / 2 dumpsters / 6 conifers | scene-state counts |
| puddles DARK in scene | capture pixel luminance < ground luminance |
| shadows + wet ground | capture: cast shadows visible, apron reflectivity |
| nothing floats / illegal intersect | validate_world zero errors |
| connectivity | build gate + counterfactual on file |
| canonical untouched | blockout sha256 + audits pass |
| suites | 12/12 + 33/33 |
| final | side-by-side (reference | capture) -> adversarial critic -> verdict |
