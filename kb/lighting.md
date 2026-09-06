# G — Lighting
category: G_lighting

---

## G1 — Lighting for Spatial Readability
concept: Lighting as Spatial Communication Tool
definition: Lighting that communicates spatial hierarchy, depth, surface orientation, and object separation — beyond physical accuracy.

principles:
  1. Key light establishes direction and time of day. One dominant source.
  2. Fill light prevents black shadows without eliminating depth.
     Ratio key:fill = 3:1 to 8:1 for dramatic scenes; 1.5:1 for interiors.
  3. Rim/backlight separates objects from background. Critical for spatial depth.
  4. Ambient captures environmental bounce. Color should match environment (blue sky → blue ambient).
  5. Emissive lighting from props (screens, lights, lava) grounds objects in the scene.

hierarchy_rule:
  Hero objects: within key light cone, sharp shadow on ground.
  Support objects: partial light, soft shadow or no shadow.
  Background fill: ambient only; no shadow casters (cost vs benefit).

spatial_depth_techniques:
  - Fog: increases perceived depth. Objects further away read as lighter/hazier.
  - Shadow: establishes height above surface. Floating objects have no shadow = reads as wrong.
  - Specular highlight: communicates surface normal orientation.
  - Rim light intensity gradient: objects closer to camera = stronger rim → natural depth.
  - Color temperature shift: warm foreground, cool background (atmospheric perspective).

common_mistakes:
  - Three.AmbientLight too bright (washes out depth, no shadows visible)
  - No fill light (unlit sides pure black, reads as cut-out)
  - All objects casting shadows including distant background (unnecessary cost)
  - DirectionalLight shadow.camera frustum too large (shadow map resolution wasted)
confidence: HIGH

---

## G2 — Shadow Strategies
concept: Shadow Map Configuration and Cost Management

types:
  BasicShadowMap: hard edges. Cheapest.
  PCFShadowMap: soft edges via Percentage Closer Filtering. Default.
  PCFSoftShadowMap: softer; slight extra cost. Recommended for most scenes.
  VSMShadowMap: Variance Shadow Maps. Good for large soft shadows. Artifacts in some cases.

cost_formula: shadow_map_cost ≈ shadow_casters × shadow_map_resolution² × shadow_lights

optimization_rules:
  - castShadow = true: hero + nearby support objects ONLY
  - castShadow = false: background, scatter fill, distant objects
  - shadow.mapSize: 2048 desktop; 1024 mid-range; 512 mobile
  - shadow.camera: fit TIGHTLY to visible scene extent (default is too large → wasted texels)
  - shadow.bias: tune to eliminate shadow acne without excessive peter-panning (~0.001–0.005)
  - One shadow-casting light maximum on mobile

shadow_camera_setup: |
  sun.shadow.camera.left   = -30;
  sun.shadow.camera.right  =  30;
  sun.shadow.camera.top    =  30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 80;
  // Tighter frustum = better resolution for the same mapSize

cascade_shadow_maps: Not natively in Three.js. Can implement manually with multiple shadow cameras.
  Use for large scenes: near cascade at high res, far cascade at low res.

contact_shadows:
  Fake soft shadow under objects using a blurred plane (THREE.ContactShadows addon).
  Cost: very low. Perceptual benefit: high for individual objects with no real shadow.
confidence: HIGH

---

## G3 — IBL / Reflection Probes
concept: Image-Based Lighting
definition: Lighting an object using a pre-filtered environment cubemap for diffuse (irradiance) and specular (radiance) contributions.
problem_solved: Physically plausible indirect lighting without expensive path tracing.
three_js_setup: |
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envMap = pmremGenerator.fromScene(new THREE.RoomEnvironment()).texture;
  scene.environment = envMap;  // applies to all MeshStandardMaterial
  // OR: scene.background = envMap (also sets sky)
reflection_probes:
  what: Local cubemap captures of environment placed at strategic points.
  use: Reflective floors, metal surfaces, glass.
  three_js: THREE.CubeCamera + CubeRenderTarget
  cost: One render pass per probe update per frame (expensive if dynamic).
  strategy: Bake probes at load time for static scenes. Update per-frame only for key reflective surfaces.
common_mistakes:
  - Using scene.environment without a PMREMGenerator (raw HDR without filtering)
  - Updating CubeCamera every frame for non-moving scenes (wasteful)
  - No environment map at all (materials look flat, no specular from environment)
confidence: HIGH

---

## G4 — Lighting by Scene Family
  interior_residential: Warm point lights (3000K) from fixtures + fill. No sun.
  interior_office: Cool overhead (5000–6500K) + window directional. Soft AO.
  dusk_outdoor: Warm directional (2700K, low angle) + cool fill + ambient.
  overcast_outdoor: Single diffuse overhead (6500K). No hard shadows. High ambient.
  night_outdoor: Cool moon directional (6500K, low intensity) + ambient. Artificial point lights for props.
  cave/dungeon: Minimal ambient. Torch point lights. Strong shadow contrast.
  sci_fi_interior: Cool blue/cyan emissives. Accent strips. Low ambient.
  underwater: Caustic projected texture. Blue-shifted ambient. FogExp2 dense.
confidence: HIGH
