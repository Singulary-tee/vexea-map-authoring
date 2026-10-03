# EXECUTION PLAN — zone warehouse tile (reference: zoomed B2 warehouse)
Source: user reference (zoomed `zone warehouse` tile) + Reference-Constrained Spatial
State Plan (authoring/plans/representation-plan.txt). Canonical camera: zone-warehouse
pos [-164,1.7,34] -> target [-118,5,-10], fov 50 (authoring/canonical-views.json).
Frame: meters, Y-up, canonical map frame. Camera forward (0.72,0.05,-0.69),
camera-right (0.69,0,0.72). All positions verified in-frame by projection math below.

## 0. Composition finding (drives everything)
The canonical pose is oblique to every legacy building; only x~[-152,-143] of the
maintenance north wall lies inside the frustum. The reference is a face-on corrugated
warehouse filling the left 2/3 of frame. Therefore the B2 warehouse is an AUTHORED
OBJECT (building-scale, through the bench), placed face-on to the canonical camera:
facade plane at z~15, centered x~-161, width 24 m, height 12 m (occludes the legacy
maintenance wall behind it, z=11, h=12 -> facade+parapet 12.5 m). Footprint
x[-173,-150] z[15,27] on g-yrd-west (grade -0.6). Default (overlay-off) build and the
pinned canonical file are untouched; five audits unaffected.

## 1. Component inventory (counts are targets, not ranges)
| # | component | count | target state |
|---|---|---|---|
| 1 | b2-warehouse shell | 1 | facade 24x12 m face-on at z=15, x-center -161.5; corrugated cladding (rib pitch 0.30 m, horizontal, gray-brown 0x6b655e); plinth 0.6 m proud 0.04; parapet 0.5 m; flat roof; two side returns 12 m deep; interior dark |
| 2 | dock bay (opening) | 1 | through-penetration in facade: 5.0 w x 4.5 h, sill 0, center offset -3.5 m right-of-facade-center (frame center-right); OPEN state: no leaf; dark interior box 8 m deep + interior floor slab; concrete lintel band above |
| 3 | personnel doors | 2 | 1.0 x 2.2 m, closed leaf fill, recess 0.10 m; at facade offsets -8.5 m and +5.5 m from center, sill 0 |
| 4 | B2 sign glyphs | 1 (2 glyphs) | white block glyphs 1.2 m tall on facade, center offset -6.0 m, base y 5.5; intrinsic-polygon exemption (sign schema) |
| 5 | bollards | 3 | dockbollardnew schema; at bay apron z=13.5: x -158.6, -156.4, -154.2 (spacing 2.2 m); yellow, clean/dusty mix |
| 6 | forklift | 1 | midnightradiosea v4; at (-152, 26) on grade, azimuth facing the bay (editor-computed with explicit target); forks down, parked |
| 7 | puddles | 4 | poolwaveprint schema; flat, dark, on apron: (-168,18) r1.6, (-158,21) r1.3, (-148,24) r1.8, (-163,27) r1.2 |
| 8 | apron surface | 1 | wet-asphalt slab x[-180,-146] z[12,30], thk 0.02, on grade -0.6, dark reflective; sits ON yard ground (contact) |
| 9 | drainage grate | 1 | linear channel z=13.2, x[-158,-150], w 0.4, flush with apron, dark steel |
| 10 | dumpsters | 2 | green container schema (new): at (-151,32) and (-148.5,32.5), 1.8x1.4x1.2, lid closed |
| 11 | guard rail | 1 | 8 m yellow rail run: posts at x -146..-138 z=20, rail y 1.0 (right mid-ground) |
| 12 | conifers | 6 | background right: x[-128,-106] z[-52,-44], h 8-12 m, dark green |
| 13 | legacy maintenance wall | occluded | stays in scene (canonical); hidden behind new facade from this camera; its 3 registry windows remain (harmless, occluded) |

## 2. Relationships
Host/contact: warehouse shell -> ground contact via plinth bottom plane (flush, snap-ground);
apron -> yard ground (on-grade, thk 0.02 above); puddles -> apron (+0.002 above);
bollards -> apron; grate -> apron flush; sign glyphs -> facade face (+0.02 proud);
lintel/door leaves -> facade plane (recess 0.10 inside).
Separation: bollards <-> bay opening plane >= 1.8 m; forklift <-> bollards >= 3 m;
building footprint <-> legacy yard props (relocated, see nuke list); dumpster pair gap 0.3 m.
Occlusion: facade occludes legacy maintenance wall from canonical camera; forklift
foreground-right partially occludes bay's right jamb (reference-true).

## 3. Openings/penetrations
Dock bay: real through-hole in the facade panel array (panel subdivision like wallBoxes),
5.0 x 4.5, lintel above 4.5..5.3, jambs full depth 0.35 (facade panel thickness).
Personnel doors: through-hole + closed leaf inset 0.10.
No other penetrations. Negative space: the bay's dark interior IS represented (interior
box + floor), not skipped.

## 4. Materials
Cladding: corrugated rib geometry + painted-steel PBR set (repo), normal 0.35, gray-brown.
Plinth/parapet caps: concrete PBR. Bay interior: dark 0x15181c flat. Door leaves:
steel-dark. B2 glyphs: sign-white. Apron: wet-asphalt (photoAsphalt PBR, rough 0.15).
Dumpsters: green 0x2e5c38, ribbed. Rail: safety-yellow.

## 5. Nuke / relocation list (executed before final capture)
- forklift inst (currently (-175,22)) -> MOVE to (-152,26) [inside new footprint]
- drum cluster near (-174,30) -> verify vs footprint z<=27; move if inside
- legacy poles/lamps at (-134,-30),(-186,-40): outside footprint, keep (out of frame left)
- nothing else; legacy buildings stay (ownership: they are canonical, occluded here;
  full building-layer replacement is a later tile-scale pass, NOT silently skipped)

## 6. Build order (dependencies)
1. b2-warehouse schema -> object doc -> connectivity gate + counterfactual (drop bay
   panel, expect FAIL naming the bay island) -> author -> place via snap-ground
2. Bay + door fills, lintel, B2 glyphs (parts of the same object doc)
3. Apron slab + grate + puddles (apron schema)
4. Relocate forklift/drum cluster; verify clearances
5. Bollards x3 (existing schema)
6. Dumpsters x2 + guard rail (new schemas)
7. Conifers x6 (new schema)
8. Verification pass (section 7) -> canonical capture -> side-by-side vs reference ->
   adversarial critic -> iterate

## 7. Checklist (requirement -> element -> verification)
| requirement | element | verification |
|---|---|---|
| warehouse face-on, fills left 2/3 | b2-warehouse placement | projection: facade center frame-right offset ~ -10..-14 at depth ~19; canonical capture vs reference |
| corrugated cladding | rib parts 0.30 pitch | rib count = 80 +/- 2 on facade; visible in capture |
| bay 5.0x4.5 open | facade panel array hole | cut present (see-through capture from inside); no leaf |
| bay interior dark | interior box + floor | capture shows dark interior |
| 2 personnel doors, closed | leaf fills | count in doc = 2; visible |
| B2 glyphs 1.2 m white | glyph parts | capture: legible at camera |
| 3 bollards at bay | dockbollardnew x3 | scene-state count = 3; in-view gate |
| forklift right-foreground | midnightradiosea | frame-right offset +2.5 at depth 14; capture |
| 4 puddles on apron | poolwaveprint x4 | count = 4; dark in capture (not white) |
| apron dark wet | apron slab | capture: ground reads dark/wet left 2/3 |
| drainage grate | grate part | visible at bay apron |
| 2 dumpsters right edge | green-dumpster x2 | count = 2; in-frame |
| guard rail right | rail run | posts x -146..-138; visible |
| 6 conifers background | conifer x6 | count = 6; skyline strip |
| all parts connected | connectivity gate | build FAILS on floating part (counterfactual on file) |
| nothing floats/intersects illegally | default-deny gates | validate_world zero errors |
| canonical file untouched | sha check | blockout sha256 unchanged; audits pass |
| suites | regression | basics 12/12, failure 33/33 |
| final proof | serve gate | side-by-side (reference | capture) + critic verdict |

## 8. Tolerances
Positions: +/- 0.5 m unless stated. Facade width/height: exact per doc. Bay: exact.
Glyph height: 1.2 +/- 0.05. Counts: exact. Colors: as section 4.
