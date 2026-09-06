# C — Geometry Techniques
category: C_geometry

---

## C1 — BufferGeometry Fundamentals
concept: BufferGeometry
definition: Three.js geometry stored as typed arrays in GPU-ready format. All geometry should use BufferGeometry; legacy Geometry was removed in r125.
applicability: Every Three.js scene.
attributes:
  - position (Float32Array, 3 components)
  - normal (Float32Array, 3 components — required for lighting)
  - uv (Float32Array, 2 components — required for textures)
  - index (Uint16Array or Uint32Array — indexed geometry, ~50% vertex bandwidth reduction)
implementation_pattern: |
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  // OR: geo.computeVertexNormals() to auto-generate from positions+indices
indexed_vs_nonindexed:
  indexed: fewer vertex shader invocations, post-transform cache hits. ALWAYS prefer for closed meshes.
  nonindexed: simpler, required for flat-shaded geometry with per-face normals.
common_mistakes:
  - Forgetting computeVertexNormals() after manual position mutation
  - Using nonindexed when indexed would halve bandwidth
  - Float64 arrays (GPU doesn't natively support double precision)
confidence: HIGH

---

## C2 — Geometry Merging
concept: BufferGeometryUtils.mergeGeometries()
definition: Combines multiple BufferGeometry objects into a single geometry with a single draw call.
problem_solved: N static objects with same material = N draw calls → 1 draw call after merge.
when_to_use: Static background objects sharing a material (rocks, debris, floor tiles, kerb stones).
when_NOT_to_use:
  - Objects that move independently
  - Objects requiring per-object frustum culling (merged bounding box may be large → no culling benefit)
  - Objects with different materials (must split by material first)
  - Count < ~5 (overhead vs benefit)
vs_instancing:
  Merging: faster per-vertex if transforms vary; loses per-instance animation.
  Instancing: better for many identical objects; supports per-instance transform updates.
implementation_pattern: |
  import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
  // Apply world transforms BEFORE merging
  const geos = objects.map(o => {
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  scene.add(new THREE.Mesh(merged, sharedMaterial));
  objects.forEach(o => scene.remove(o));
performance: CPU merge cost is one-time. GPU renders as single draw call.
common_mistakes:
  - Merging without applying world transform first (geometry in wrong position)
  - Merging objects that will need to be individually updated later
confidence: HIGH

---

## C3 — LOD (Level of Detail)
concept: THREE.LOD — Distance-Based Geometry Simplification
definition: Swapping a mesh for progressively simpler versions as camera distance increases.
problem_solved: Distant objects waste GPU vertex processing at their full polygon count.
when_to_use: Objects appearing at varying distances with >2000 triangles at full detail.
when_NOT_to_use:
  - Tiny objects (< 10 screen pixels at all distances — already negligible cost)
  - Objects always at fixed distance (e.g. UI elements, skybox)
  - Very simple geometry where LOD overhead exceeds benefit
implementation_pattern: |
  const lod = new THREE.LOD();
  lod.addLevel(highDetailMesh,  0);   // 0–20m
  lod.addLevel(medDetailMesh,  20);   // 20–60m
  lod.addLevel(lowDetailMesh,  60);   // 60–150m
  lod.addLevel(impostorMesh,  150);   // 150m+
  lod.autoUpdate = true;
  scene.add(lod);
popping_mitigation:
  - Hysteresis: switch-in distance = 0.85× switch-out distance
  - Dithered transitions: alpha-clip blend between LOD levels over a small distance range
  - Screen-space size check: switch based on projected pixel size, not world distance
lod_with_instancing: THREE.LOD incompatible with InstancedMesh. Workaround: separate InstancedMesh per LOD level with manual distance check.
mobile: Reduce switch distances by 0.5–0.7× on mobile.
counterexample: A hero rock 2m from camera that never moves far — full detail always, LOD pointless.
confidence: HIGH

---

## C4 — Impostors / Billboards
concept: Camera-Facing Quad Replacing 3D Geometry
definition: A plane (or cross-hatch of planes) rendered facing the camera, displaying a pre-rendered or procedural image of the 3D object.
problem_solved: Distant trees, crowds, complex objects at low cost.
applicability: Trees beyond 80–150m, crowds beyond 40m, distant buildings.
types:
  Sprite billboard: single quad, always faces camera. Cheap. No parallax.
  Cross billboard: 2 quads at 90°. Better silhouette. Minimal cost increase.
  Octahedral impostor: 8 pre-rendered angles blended by view direction. High quality, moderate cost.
implementation_pattern: |
  // Simple billboard tree beyond LOD distance
  const planeGeo = new THREE.PlaneGeometry(4, 6);
  const mat = new THREE.MeshBasicMaterial({ map: treeTexture, alphaTest: 0.5, side: THREE.DoubleSide });
  const sprite = new THREE.Mesh(planeGeo, mat);
  sprite.onBeforeRender = (renderer, scene, camera) => {
    sprite.quaternion.copy(camera.quaternion); // always face camera
  };
performance: Fragment cost of one quad vs thousands of triangles. Major win at scale.
common_mistakes:
  - Using impostors too close to camera (low-resolution reads obvious)
  - Not sorting transparent impostors (z-fighting, haloing artifacts)
  - Using opaque impostors in front of transparent geometry
confidence: HIGH

---

## C5 — Virtual Geometry / Meshlets (Future / Advanced)
concept: Meshlet-Based GPU-Driven Geometry Culling
definition: Splitting mesh into small clusters (meshlets, ~128 triangles each), culling per-meshlet on GPU compute.
problem_solved: Per-object frustum culling is coarse. Meshlet culling is fine-grained — only visible clusters drawn.
applicability: Large complex meshes (terrain, buildings) on high-end WebGPU-capable hardware.
current_threejs_status: Not natively supported as of r165. Requires custom compute pipeline.
performance: Can reduce vertex work by 60–90% for complex occluded scenes.
mobile: Avoid — compute overhead typically exceeds benefit on tile-based GPUs.
confidence: MEDIUM (advancing rapidly with WebGPU adoption)

---

## C6 — Geometry Compression
concept: Meshopt + Draco + Quantization
definition: Compressing geometry data to reduce file size and upload bandwidth.
meshopt:
  what: Vertex buffer optimization + quantization + entropy coding. Faster decode than Draco.
  when: General-purpose geometry compression. Preferred for GLB/GLTF.
draco:
  what: Google's geometry compression. Better ratio for complex meshes. Slower decode.
  when: Large, complex mesh libraries where download size dominates.
quantization:
  what: Reducing float32 (4 bytes/component) to int16 or int8 (2 or 1 byte). 2–4× size reduction.
  when: Position data that doesn't need full float32 precision (usually fine for most props).
three_js:
  GLTFLoader with DRACOLoader: `loader.setDRACOLoader(new DRACOLoader())`
  MeshoptDecoder: `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`
performance: Decode cost is CPU, one-time. GPU benefits from smaller upload and better cache.
mobile: HIGH VALUE — bandwidth-constrained networks and unified memory.
confidence: HIGH
