# O — Decision Rules: IF/THEN Technique Selection
category: O_decision_rules
These rules are the executable intelligence layer. They convert scene properties
into concrete technique choices without requiring model judgment.

---

## GEOMETRY DECISIONS

IF object_count >= 20 AND archetype_identical
  → USE InstancedMesh
  → REASON: single draw call; geometry stored once
  → NOT: individual Mesh objects in a loop

IF object_count >= 20 AND archetype_similar_but_not_identical
  → USE InstancedMesh WITH per-instance scale/rotation variation via LCG seed
  → NOT: unique geometry per object

IF scene_is_fully_static AND object_count < 20 AND objects_share_material
  → USE BufferGeometryUtils.mergeGeometries()
  → REASON: reduces draw calls without instancing overhead
  → COST: loses per-object frustum culling (acceptable for background objects)

IF organic_shape (rock, terrain_bump, cave_wall, tree_crown)
  → USE IcosahedronGeometry (detail 1-2) + per-vertex displacement via LCG seed
  → NOT: BoxGeometry, SphereGeometry (smooth silhouette reads as artificial)

IF curved_continuous_element (beam, pipe, cable, road_edge, handrail)
  → USE TubeGeometry along CatmullRomCurve3 or LineCurve3
  → NOT: series of BoxGeometry segments (visible seams, incorrect normals)

IF topology == LINEAR AND structure == swept_cross_section
  → USE CatmullRomCurve3 + computeFrenetFrames + manual BufferGeometry sweep
  → REASON: correct orientation at any curve point; banking support

IF topology != LINEAR
  → DO NOT use spline sweep as primary structure
  → USE topology-appropriate primitive (room shell, heightfield, radial tier, etc.)

---

## MATERIAL DECISIONS

IF renderer == WebGPURenderer
  → ALWAYS USE MeshStandardNodeMaterial (or other NodeMaterial subclass)
  → NEVER USE MeshStandardMaterial, MeshLambertMaterial, ShaderMaterial
  → REASON: legacy materials may fall back to WebGL path; lose WebGPU benefits

IF surface_is_uniform_color AND importance == background
  → USE flat color NodeMaterial with subtle mx_noise_float micro-variation
  → amplitude <= 0.02 for roads/concrete, <= 0.05 for terrain/rock
  → NOT: no variation (reads as plastic/artificial)

IF surface_is_metal
  → SET roughness 0.2-0.5, metalness 0.7-0.9
  → ADD specular highlight region

IF surface_is_rough_stone_concrete_asphalt
  → SET roughness 0.85-0.98, metalness 0.0
  → ADD mx_noise_float micro-variation on roughness channel too

IF same_material_used_on_100+ instances
  → USE shared material reference (do NOT create new material per instance)
  → REASON: each unique material = potential extra draw group

---

## PERFORMANCE DECISIONS

IF estimated_draw_calls > 200
  → FIRST: identify non-instanced repeat objects → apply instancing
  → SECOND: merge static background geometry per material
  → THIRD: increase fog density to hide and cull distant objects

IF shadow_caster_count > 50
  → SET castShadow = false for all objects tagged importance in [background, fill]
  → KEEP castShadow = true only for hero + support importance objects

IF scene_has_transparent_objects AND fill_rate_concern
  → CHECK: can effect be achieved without transparency? (opaque + reflection probe?)
  → IF not: sort transparent objects back-to-front; minimize overdraw layers

IF target_includes_mobile
  → shadow_map_max = 1024
  → instance_count_multiplier = 0.5 at MEDIUM quality tier
  → post_processing = disabled at LOW quality tier
  → fog_type = linear (cheaper than exp2) at LOW quality tier

IF object_appears_at_multiple_distances AND triangle_count > 2000
  → APPLY LOD: define 2-3 levels at 0m, 20-40m, 80-120m distance thresholds
  → ADD hysteresis: switch-in distance = 0.85 × switch-out distance

IF scene_is_large AND scatter_fill_count > 500
  → SPLIT InstancedMesh into spatial tiles of ~100m²
  → REASON: per-tile frustum culling prevents entire scatter field from being live

---

## SPATIAL / PLANNING DECISIONS

IF scene_description mentions topology clues:
  "road" / "highway" / "path" / "corridor" → LINEAR
  "room" / "house" / "apartment" / "floor plan" → ROOM_ADJACENCY
  "warehouse" / "hangar" / "hall" → LARGE_VOLUME_GRID
  "cave" / "dungeon" / "tunnel" → IRREGULAR_VOLUME_GRAPH
  "forest" / "park" / "field" → OPEN_SCATTER
  "stadium" / "arena" / "amphitheatre" → RADIAL_HIERARCHICAL
  "harbour" / "dock" / "beach" / "coastline" → BOUNDARY_INTERFACE or BOUNDARY_GRADIENT
  "canyon" / "valley" / "mountain" → TERRAIN_TOPOLOGY or TERRAIN_VERTICAL
  "plaza" / "courtyard" / "square" → SURFACE_NEGATIVE_SPACE
  "combat" / "arena" / "game level" → TRAVERSAL_SIGHTLINE_COVER
  → CLASSIFY topology BEFORE choosing any construction technique

IF topology == ROOM_ADJACENCY
  → BUILD adjacency graph FIRST (which rooms connect to which via what connector)
  → THEN build room-shell geometry per node
  → NEVER: build geometry first and hope rooms connect

IF topology == RADIAL_HIERARCHICAL
  → DEFINE radial center FIRST (center of field/stage)
  → BUILD tiers as concentric swept rings around radial axis
  → VERIFY: sightlines from tier seats to field center not obstructed

IF topology == BOUNDARY_INTERFACE
  → DEFINE waterline Y value FIRST as hard constraint
  → ALL land geometry: Y > waterline
  → ALL water geometry: Y <= waterline
  → Shore transition: smoothstep blend in material within 2-5m of waterline

IF scatter_fill (trees, rocks, gravel, crowd)
  → USE blue-noise Poisson disk sampling (NOT uniform grid, NOT pure random)
  → VARY: scale ±25%, Y-rotation random, color ±10% HSL
  → AVOID: placing at exactly equal intervals (reads as mechanically procedural)

IF object_is_hero AND camera_default_position_not_yet_set
  → POSITION camera such that hero object is in center-left or center-right of frame
  → SET camera target = hero object centroid
  → ENSURE at least one near object (foreground) between camera and hero

---

## LIGHTING DECISIONS

IF scene_atmosphere == interior
  → USE: warm overhead lights (PointLight or RectAreaLight per fixture)
  → ADD: ambient 0.4-0.8 intensity (approximates bounced light)
  → ADD: fill directional at 0.2-0.4 intensity from below (bounced floor light)
  → DO NOT: use sun/directional light as primary (no direct sun indoors)

IF scene_atmosphere in [dusk, dawn]
  → sun_color: 0xff9966 to 0xff6633 (warm orange-red, low angle)
  → fill_color: 0x334466 (cool blue, opposite direction)
  → ambient_intensity: 1.5-2.5 (bright enough to see shadows)
  → fog: FogExp2 density 0.015-0.022, color matching sky

IF scene_atmosphere == night
  → ambient_intensity: 0.5-1.0 (mostly dark)
  → moon: DirectionalLight 0x334466, intensity 0.2-0.4
  → artificial_lights: PointLight per lamp, warm 0xffeecc, distance 12-20m, decay 2
  → fog: FogExp2 density 0.015-0.025

IF scene_atmosphere == overcast
  → sun_intensity: 0.3-0.6 (soft, diffuse)
  → sun_color: 0xccccdd (cool white)
  → ambient: 0x9999aa, intensity 2.5-3.5
  → shadow_mapSize: may reduce to 1024 (soft shadows less critical)

IF scene has WATER (harbour, beach, river)
  → ADD: SSR or reflection probe on water surface
  → ADD: subtle displacement animation on water mesh (sin-based vertex offset)
  → water_roughness: 0.05-0.2 (low = reflective)

## Confidence: HIGH across geometry/material/performance; MEDIUM for some spatial heuristics
## Sources: Three.js docs, GPU Gems, SIGGRAPH, Inigo Quilez, WebGPU spec
