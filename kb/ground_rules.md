# Spatial Scene Agent — Ground Rules
Extracted from 42 Three.js WebGPU examples + community patterns.

## ALWAYS DO

### Geometry
1. Use `CatmullRomCurve3` for any path/road spine — never straight segments
2. Compute Frenet frames (`curve.computeFrenetFrames(N, false)`) for swept geometry
3. Use `curve.getUtoTmapping(u)` for arc-length-correct prop placement
4. Call `geo.computeVertexNormals()` after ANY manual vertex position mutation
5. Use `IcosahedronGeometry(r, 1)` + per-vertex displacement for organic shapes
6. Round road edges: include a half-circle droop profile (r ≈ 0.15–0.25) in cross-section
7. Bank roads: compute curvature proxy, apply `bankAngle` per ring in swept geometry
8. Use `TubeGeometry` for continuous curved elements (beams, pipes, cables)
9. Use `BufferGeometryUtils.mergeGeometries()` for static repeated props

### Materials (TSL)
10. Always use `MeshStandardNodeMaterial` — never `MeshStandardMaterial`
11. Add micro-variation noise to all surfaces (amplitude ≤ 0.02 road, ≤ 0.05 terrain)
12. Import all TSL functions from `'three/tsl'`

### Renderer
13. Use `WebGPURenderer` — never `WebGLRenderer`
14. Call `await renderer.init()` before first render
15. Use `renderer.setAnimationLoop()` — not `requestAnimationFrame`
16. Set `ACESFilmicToneMapping` + exposure 0.85–1.0

### Lighting
17. Minimum 2 lights: warm directional + cool fill
18. Always add `FogExp2` — density 0.015–0.025
19. Enable `PCFSoftShadowMap`, shadow map 2048×2048
20. Add `receiveShadow` to terrain/road; `castShadow` to all props

### Props
21. Place props using arc-length `t` values + lateral offsets from spine
22. Use deterministic LCG RNG (seed-based) — never `Math.random()`
23. Vary prop scale ±30% using RNG for natural distribution
24. Rotate props randomly around Y axis for visual variety

### Output
25. Single self-contained `.html` file — no external assets beyond Three.js CDN
26. Include `OrbitControls` with damping
27. Handle `window.resize` — update camera aspect + renderer size

## NEVER DO

### Geometry
1. ❌ Place props at uniform `t` intervals — always arc-length correct
2. ❌ Skip `computeVertexNormals()` after vertex displacement
3. ❌ Use `BoxGeometry` for organic shapes (rocks, terrain bumps)
4. ❌ Hard-code world positions — derive from curve + offset

### Materials
5. ❌ Use `MeshStandardMaterial` with WebGPURenderer
6. ❌ Use image textures or external CDN assets (beyond Three.js)
7. ❌ Use `onBeforeCompile` — use TSL nodes instead
8. ❌ Use `ShaderMaterial` — use `NodeMaterial`

### Renderer
9. ❌ Use `requestAnimationFrame` directly — use `setAnimationLoop`
10. ❌ Skip `await renderer.init()` — WebGPU init is async
11. ❌ Use `WebGLRenderer` — always `WebGPURenderer`

### Scene
12. ❌ Generate a scene with only 1 light source
13. ❌ Generate a scene without fog
14. ❌ Use `Math.random()` — always seeded LCG RNG
15. ❌ Forget shadow setup on terrain/road meshes

## PERFORMANCE CHECKLIST
- [ ] Static props merged with `BufferGeometryUtils.mergeGeometries`
- [ ] Shadow map resolution ≤ 2048
- [ ] Fog density tuned to hide far-clip artifacts
- [ ] Vertex count per rock ≤ 80 triangles (IcosahedronGeometry detail 1)
- [ ] Road segments ≤ 120 (SEGS constant)
- [ ] No per-frame geometry rebuilds
