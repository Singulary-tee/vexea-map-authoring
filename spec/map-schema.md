# Map Spec Schema (editor I/O contract) — v0.1

The map is a DATA document. The editor authors it; simulation validates it; the game
consumes it via this contract. All positions are meters, Y-up, right-handed.

Top-level:
```json
{
  "format": "vexea-map/0.1",
  "id": "string",
  "name": "string",
  "seed": 0,                       // deterministic generation seed
  "bounds": {"min":[x,z],"max":[x,z]},
  "layers": { ... }                // see below
}
```

## Layers (paint order = draw order in editor)
- `terrain`   — heightfield: `{"size":N,"cell":m,"heights":[[...]],"materialZones":[[zoneId...]]}`
- `structures`— boxes/walls: `{"type","pos":[x,y,z],"size":[w,h,d],"rotY","matId","occluder":bool}`
- `cover`     — low props affecting sim cover graph: `{"pos","radius","height","kind"}`
- `routes`    — named polylines (AI/lane): `{"id","points":[[x,z]...],"width"}`
- `spawns`    — `{"team","pos":[x,y,z],"facing":deg}`
- `props`     — decoration instanced sets: `{"kind","count","seed","place":"scatterOnTerrain","constraints":{...}}`
- `zones`     — objectives: `{"id","kind","pos","radius","priority"}`

## Validation gates (sim, all must pass before section is "clean")
1. Traversability graph connected for every spawn→zone pair.
2. Sightline stats per route (no unbroken sightline > 60m on any lane).
3. Cover density: every 10m of route within 6m of ≥2 cover records.
4. Spawn safety: no spawn inside enemy sightline at t=0.
5. Draw budget: total draw calls est. ≤ 15 (after instancing/merging).
6. Determinism: same seed → byte-identical export.

Editor renders each layer with distinct color-coding + toggles; sim overlays draw
traversability grid, sightlines, cover heat on demand.
