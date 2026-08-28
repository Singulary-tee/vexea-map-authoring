# VEXEA Map Style Profile (derived from Notion inspiration set — 2026-08-28)

Source: Notion "VEXEA Map Inspiration" page (images removed by user; this is derived from
the earlier ingestion + user's doctrine). Target = VEXEA FACILITY AREA (LLM Center), an
industrial compound — NOT desert, NOT a single building, NOT a canyon.

## What the map IS
A game-playable industrial facility AREA (the "one of the webp was a great target" — it is
an area, not a building). Facility 01 — LLM Center: 768×768 world, 6 zones + bridge
(Spawn→Courtyard→Warehouse→Plant, Bridge, Tunnels under, Core at Plant far end). PvE drone
combat, 1.8 m player capsule, two factions (Vibe Co / Slop Inc). Enemy = VEXEA drone army
directed by a rogue LLM commander.

## Quality targets (ingested refs, as QUALITY direction — not 1:1 match targets)
- `01-sun-gap.webp` / `17e96510…webp`: the "great target" — an AREA reference for atmosphere/
  light/color grading (warm raking light, deep cumulative shadow, readable depth bands). NOT a
  desert layout — take its lighting/color/quality, not its terrain shape.
- `c1a6e8f0…jpg` golden-hour city street: the "capable quality" shot — material realism,
  PBR contact, exposure gradient between lit and shadow.
- Chrome bunker pair + X shot: industrial framing, hard edges, tarmac/concrete/utility surface
  language.
- `ee7a4d00…png` current-map baseline: the GAP to close (flat tarmac, low-poly olive warehouse,
  white planes, flat overcast sky).
User note: last image's cars and sky are NOT acceptable; the rest is great.

## Palette & light (facility, grounded — barred words: neon/scifi/tactical/futuristic/cyberpunk/mecha)
- Ground: weathered concrete + asphalt (cracked, stained, jointed), not pure gray; subtle
  tarmac roadways, concrete pads, curbs, drainage.
- Architecture: industrial massing — pressed-metal / concrete walls, warehouse cladding ribs,
  loading bays, pipe racks, cable trays, service yards. Slight weathering/wear at bases + edges.
- Accent: safety orange/yellow on service elements (valves, rails, glazing frames) — restrained.
- Light: overcast-neutral base with directional warm raking key; strong but flat real shadows;
  readable value difference between lit and shadow. No fog to hide defects.
- Atmosphere: thin haze on distance only (no fog walls), clean air near combat.

## Performance doctrine (binding, from Notion page)
Quality via smarter implementation: cached small textures, occlusion + frustum culling,
GLB optimization, budget-aware PBR, LOD, instancing, batching, merging, baking.
Never "lower quality" as the lever for FPS.

## Constraints
- Procedural-first for dimension-critical runs (roads, sidewalks, pipe racks, fences, service
  bands) + parameterized family modules. Sourced GLBs only when appropriate (vehicles, complex
  machinery) — provenance+scale+LOD; never procedural tire internals.
- Manus GLB/PBR/HDRI = browseable catalog, not authoritative (user dislikes their PBR/HDRI).
- Ground is SEGMENTED (not one plane). Real-depth masses before detail. No visible primitive
  placeholder standing in for buildings/roads/utilities at promotion.
