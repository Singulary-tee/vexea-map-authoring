# C2 — Instancing
concept: Instancing
category: C_geometry
---

## Definition
Rendering N copies of the same geometry with a single draw call by supplying
per-instance transform data (and optionally per-instance color/custom attributes)
in a buffer. GPU iterates instances internally; CPU overhead is O(1) not O(N).

## Problem Solved
N separate Mesh objects = N draw calls = CPU bottleneck above ~1000 objects even
with simple geometry. Instancing collapses N draw calls to 1 regardless of N.

## When to USE
- IF count >= 10 AND geometry is identical or near-identical → USE instancing
- Trees, grass, rocks, gravel, crowd, seats, bollards, fence posts, windows, tiles
- Any scatter fill where instance count > ~20

## When NOT to USE
- IF each instance requires a unique material or shader → instancing loses benefit
  (must split into material groups first)
- IF object count < 5–10 → overhead of InstancedMesh setup exceeds benefit
- IF instances need independent frustum culling per-object at fine granularity →
  consider GPU-driven culling (indirect rendering) instead
- IF objects need Bone/SkinnedMesh per instance → requires custom compute setup

## Three.js Pattern
```javascript
const geo = new THREE.IcosahedronGeometry(0.4, 1);
const mat = new THREE.MeshStandardNodeMaterial({ color: 0x556644 });
const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // if transforms change
const dummy = new THREE.Object3D();
for (let i = 0; i < COUNT; i++) {
  dummy.position.set(x[i], y[i], z[i]);
  dummy.rotation.y = r[i];
  dummy.scale.setScalar(s[i]);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
scene.add(mesh);
```

## Per-Instance Color
```javascript
const color = new THREE.Color();
const colors = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  color.setHSL(0.3 + r[i]*0.1, 0.6, 0.3 + r[i]*0.2);
  colors[i*3] = color.r; colors[i*3+1] = color.g; colors[i*3+2] = color.b;
}
mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
```

## Performance
- GPU: single draw call regardless of N; vertex shader runs N*verts times
- CPU: O(1) draw submission; O(N) matrix upload (amortized if static)
- Memory: geometry stored once; matrix buffer = N * 64 bytes
- Mobile: HIGH VALUE — mobile GPUs are particularly bottlenecked by draw calls

## Perceptual Benefit
- Enables 500–50,000 objects (trees, seats, rocks) that would be impossible otherwise
- Per-instance scale/rotation variation disguises repetition at near-zero extra cost

## Interaction with LOD
- THREE.LOD does NOT work directly with InstancedMesh
- For LOD + instancing: maintain separate InstancedMesh per LOD level;
  swap based on camera distance using custom distance check
- Alternative: use impostor billboards beyond a distance threshold

## Common Mistakes
- Creating individual Mesh objects in a loop instead of InstancedMesh
- Forgetting instanceMatrix.needsUpdate = true after modifying transforms
- Mixing materials within one InstancedMesh (split by material group first)
- Using InstancedMesh for count < 5 where setup cost dominates

## Related Concepts
- LOD (C3): reduces per-instance vertex count at distance
- Merging (C2b): alternative for static small counts that don't need per-instance transforms
- BufferGeometry (C1): underlies instanced geometry
- Blue-noise scatter (F3): optimal placement pattern for scattered instances

## Counterexample
"Instancing is always faster than individual meshes."
FALSE for N < ~5: InstancedMesh has setup overhead; below threshold, individual
drawcalls may be faster due to CPU-GPU synchronization costs.

## Confidence: HIGH
## Sources: Three.js InstancedMesh docs, r170+ examples, WebGPU indirect rendering specs
