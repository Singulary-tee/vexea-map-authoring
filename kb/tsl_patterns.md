# TSL (Three Shading Language) Patterns & Anti-Patterns

## What is TSL?
TSL is Three.js's node-based shading language. Instead of writing GLSL strings,
you compose shader logic from JavaScript node functions that compile to WGSL (WebGPU)
or GLSL (WebGL fallback) at runtime.

## Core Import Pattern
```javascript
import {
  MeshStandardNodeMaterial,
  color, float, vec2, vec3, vec4,
  positionLocal, positionWorld, normalLocal, normalWorld,
  uv, time, sin, cos, abs, max, min, clamp, mix, step, smoothstep,
  mx_noise_float, mx_noise_vec3,
  uniform, attribute, varying,
  If, Loop, Break, Continue, Return,
  Fn, ShaderNode
} from 'three/tsl';
```

## Material Setup
```javascript
const mat = new MeshStandardNodeMaterial();
mat.colorNode    = color(0x2a2a2a);
mat.roughnessNode = float(0.95);
mat.metalnessNode = float(0.0);
// Surface micro-variation via noise
mat.colorNode = color(0x2a2a2a).mul(
  mx_noise_float(positionLocal.mul(8.0)).remapClamp(0.95, 1.05)
);
```

## Procedural Surface Variation (Road)
```javascript
// Subtle asphalt grain — amplitude ≤ 0.02
const grain = mx_noise_float(positionLocal.mul(12.0)).mul(0.015).add(0.985);
mat.colorNode = color(0x2a2a2a).mul(grain);
mat.roughnessNode = float(0.92).add(mx_noise_float(positionLocal.mul(6.0)).mul(0.06));
```

## Procedural Surface Variation (Terrain)
```javascript
// Larger scale variation — amplitude ≤ 0.05
const terrainNoise = mx_noise_float(positionLocal.xz.mul(0.8)).mul(0.04).add(0.96);
mat.colorNode = color(0x2d3a1e).mul(terrainNoise);
```

## Rock Material (Organic)
```javascript
const rockNoise = mx_noise_float(positionLocal.mul(3.0));
mat.colorNode = mix(color(0x3a3530), color(0x5a5550), rockNoise);
mat.roughnessNode = float(0.85).add(rockNoise.mul(0.1));
mat.metalnessNode = float(0.05);
```

## Steel / Guardrail
```javascript
mat.colorNode     = color(0x8899aa);
mat.roughnessNode = float(0.35).add(mx_noise_float(positionLocal.mul(20.0)).mul(0.1));
mat.metalnessNode = float(0.75);
```

## Time-based Animation (water shimmer, etc.)
```javascript
import { time } from 'three/tsl';
mat.colorNode = color(0x1a3a5c).add(
  vec3(0, 0.05, 0.1).mul(sin(positionLocal.x.mul(2.0).add(time)))
);
```

## Uniform Inputs
```javascript
const uColor = uniform(new THREE.Color(0xff0000));
mat.colorNode = uColor;
// Update at runtime:
uColor.value.set(0x00ff00);
```

## Custom Fn Node
```javascript
const myShader = Fn(([pos]) => {
  const n = mx_noise_float(pos.mul(5.0));
  return color(0x2a2a2a).mul(n.remapClamp(0.9, 1.1));
});
mat.colorNode = myShader(positionLocal);
```

## Anti-Patterns (NEVER DO)
- ❌ `new THREE.MeshStandardMaterial()` — use `MeshStandardNodeMaterial`
- ❌ `mat.color = new THREE.Color(...)` — use `mat.colorNode = color(...)`
- ❌ Raw GLSL strings in node materials
- ❌ `onBeforeCompile` with WebGPURenderer
- ❌ `ShaderMaterial` with WebGPURenderer (use `NodeMaterial` instead)
- ❌ Forgetting to import from `'three/tsl'` (not `'three'`)

## WebGPURenderer Init Pattern
```javascript
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

const renderer = new WebGPURenderer({ antialias: true });
await renderer.init();  // REQUIRED — WebGPU is async
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);
```

## Render Loop with WebGPU
```javascript
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
// Note: use setAnimationLoop, NOT requestAnimationFrame, for WebGPU
```
