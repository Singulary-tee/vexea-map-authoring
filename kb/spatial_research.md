# Spatial Scene Research References

## Procedural Road Generation
### Key Techniques
- **Frenet-Serret frames**: Stable swept geometry along 3D curves. Avoids gimbal lock.
  Reference: Frenet–Serret formulas (differential geometry)
- **Arc-length parameterisation**: `getUtoTmapping(u)` converts uniform [0,1] to
  arc-length-correct parameter. Critical for uniform prop spacing.
- **Road banking**: Lateral bank angle derived from curve curvature κ = |T'|/|r'|.
  Typical road bank: 2–8° (0.035–0.14 rad). Mountain roads: up to 10°.
- **Cross-section sweeping**: Define 2D profile, sweep along spine using
  binormal (lateral) and normal (up) vectors from Frenet frame.

### Road Cross-Section Profile
```
     ←── ROAD_W ──→
  ___________________
 /                   \   ← rounded edge (r = 0.18)
|   road surface      |
 \___________________/
     ↑ bank angle applied per ring
```

## Terrain Synthesis
### Techniques Used
- **Fractional Brownian Motion (fBm)**: Sum of octaves of Perlin/Simplex noise.
  H = 0.5–0.8 for natural terrain. Amplitude halves each octave.
- **Domain warping**: Warp noise input coordinates with another noise function.
  Creates river valleys, ridgelines. Inigo Quilez technique.
- **Erosion simulation**: Hydraulic erosion for realism (expensive — skip for real-time).
- **LCG deterministic RNG**: `s = (s * 1664525 + 1013904223) & 0xffffffff`
  Knuth's constants. Fast, stable, no external dependency.

### Terrain-Road Integration
- Sample terrain height at road spine points
- Blend road surface into terrain within 2–3m of road edge
- Use smoothstep for blend falloff

## Rock Placement & Variation
### Icosahedron Displacement
- Base: `IcosahedronGeometry(r, 1)` — 80 triangles, sufficient for rocks ≤ 1m
- Displacement: per-vertex radial scale 0.7–1.3× using LCG RNG
- Flatten bottom: clamp Y displacement for rocks sitting on ground
- Normal recompute: mandatory after displacement

### Scatter Distribution
- Poisson disk sampling for natural spacing (no clustering, no regularity)
- Simple approximation: arc-length t + lateral offset + RNG jitter
- Scale variation: 0.15–0.7m for shoulder rocks, 0.5–2m for hillside boulders

## Guardrail Engineering Reference
### W-Beam Guardrail (standard highway)
- Post spacing: 1.9m (6.25 ft) standard
- Post height above ground: 0.71m (28 in)
- Beam height: 0.55m above ground (centre)
- Post: W6×9 steel (approx 150mm × 150mm)
- Beam: W-profile, 3mm steel, 312mm wide

### Simplified 3D Representation
- Posts: `CylinderGeometry(0.04, 0.05, 0.75, 6)` — hexagonal cross-section
- Beam: `TubeGeometry` along offset curve, radius 0.04
- Material: steel, roughness 0.35, metalness 0.75

## Drainage Infrastructure
### Culvert / Drainage Pipe
- Standard sizes: 300mm, 450mm, 600mm diameter
- Typical slope: 1–3% grade
- Headwall: concrete retaining structure at pipe exit
- End treatment: mitered end section or projecting pipe

### 3D Representation
- Pipe: `TubeGeometry(LineCurve3, 8, r, 12, false)`
- End cap ring: `TorusGeometry(r, 0.03, 8, 24)`
- Headwall: `BoxGeometry` or `ExtrudeGeometry` from trapezoidal profile

## Atmospheric Conditions
### Dusk Lighting
- Sun angle: 5–15° above horizon
- Sun colour: 0xff9966 (warm orange-red)
- Sky colour: 0x0d0d1a (deep blue-purple)
- Ambient: 0x1a1a2e (cool blue-purple), intensity 2.0–3.0
- Fill light: 0x334466 (blue), intensity 0.5–0.8
- Fog: FogExp2, density 0.015–0.022

### Overcast Day
- Sun colour: 0xccccdd (cool white)
- Sky: 0x8899aa
- Ambient: 0x9999aa, intensity 3.0
- No hard shadows (reduce shadow map or disable)
- Fog: FogExp2, density 0.008–0.012

### Night
- Sky: 0x000005
- Ambient: 0x050510, intensity 1.0
- Moon: DirectionalLight 0x334466, intensity 0.3
- Lamp posts: PointLight 0xffeecc, distance 15, decay 2
