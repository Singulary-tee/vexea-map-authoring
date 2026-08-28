# Calibration Fixture (from repository truth — the 1.8 m player)

Fixed constants used by every blockout/gate. Derived from ARCHITECTURE/GAMEPLAY truth.
Do NOT duplicate as literals in plans; load from here programmatically.

## Player reference
- Capsule height: **1.8 m** (player capsule; eye ~1.7 m above ground).
- Capsule radius: **0.4 m**; capsule-radius ring for pinch/clearance checks.
- Movement: all presets share base speed; stairs the capsule must climb ≤ ~0.3 m rise/step.
- Objective proximity radius, fall-damage thresholds etc: see GAMEMODE_CONFIG (not geometry).

## Measure gates
- 1 m grid / 10 m majors (fixture reads like blueprint + the segment snap grid).
- Door gauge: ≥ 1.0 m wide, ≥ 2.0 m tall clear (must admit capsule).
- Stair/ramp gauge: step rise ≤ 0.18 m, tread ≥ 0.28 m, ramp grade ≤ 1:12 (practical climb).
- Cover-height bands: low (0.3–0.6 m, crouch), mid (0.9–1.4 m, standing partial),
  full (≥ 1.7 m, full body). Threat elevation: ground / air(both) for cover validity.
- Vehicle/machinery board: real-world unit + world box vs fixture; one uniform scale in
  Blender prep, never ad-hoc scene stretch.

## Blockout snap grid
Pick ONE grid for the pass: **10 m majors / 1 m minors**. Every segment's position and major
dimension snaps to it. Junction (entrance↔stair↔floor↔tunnel) must not contradict the capsule.

## World / coordinates (map_1_facility truth — CONTEXT, geometry rebuilt)
- World 768×768 (X, Z). Blueprint X→Three X; Blueprint Y→Three Z; Elevation→Three Y.
- Z=0 ground. Tunnels ~Y −20. Rooftops Y +25…+35. Zones: spawn/courtyard/warehouse/bridge/
  plant/tunnels/core as in the semantic contract.