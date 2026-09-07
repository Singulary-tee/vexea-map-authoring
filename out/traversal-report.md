# Full-Map Blockout — Traversal Report

File: blockout/blockout-full-v1.json  |  Fixture: spec/calibration.md (1.8m capsule, door >=1x2m, stair rise<=0.18m, incline<=1:12, tunnel 6hx10w)

## Spawn -> Objective paths

**path-surface-main** — main surface: spawn -> gate/rear yards -> pressure yard -> core yard -> core hall main door — PASS
- `g-spawn-apron` -> `g-yrd-rear` (ground)
- `g-yrd-rear` -> `g-yrd-pressure` (ground)
- `g-yrd-pressure` -> `g-yrd-e` (ground)
- `g-yrd-e` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `bld-core-ops-hall` (ground)

**path-covered-logistics** — covered/logistics: rear alley -> loading hall interior -> hub -> covered corridor -> security hall -> checkpoint court -> core — PASS
- `g-spawn-apron` -> `g-yrd-rear` (ground)
- `g-yrd-rear` -> `e-loading-n-2` (door) — e-loading-n-2 w8m h4.5m vs capsule 1.8m PASS
- `e-loading-n-2` -> `bld-loading-hall` (door) — e-loading-n-2 w8m h4.5m vs capsule 1.8m PASS
- `bld-loading-hall` -> `e-loading-s` (door) — e-loading-s w8m h4.5m vs capsule 1.8m PASS
- `e-loading-s` -> `g-yrd-hub` (door) — e-loading-s w8m h4.5m vs capsule 1.8m PASS
- `g-yrd-hub` -> `g-yrd-checkpoint-n` (ground)
- `g-yrd-checkpoint-n` -> `s-sec-threshold` (stair) — s-sec-threshold rise0.17m tread0.3m width6m PASS
- `s-sec-threshold` -> `e-sec-s` (door) — e-sec-s w6m h2.4m vs capsule 1.8m PASS
- `e-sec-s` -> `bld-security-hall` (door) — e-sec-s w6m h2.4m vs capsule 1.8m PASS
- `bld-security-hall` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `kz-court` (ground)
- `kz-court` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `e-core-n` (door) — e-core-n w4m h2.6m vs capsule 1.8m PASS
- `e-core-n` -> `bld-core-ops-hall` (door) — e-core-n w4m h2.6m vs capsule 1.8m PASS

**path-east-flank** — east flank: east yard -> ridge -> core service wing -> walkway -> core hall — PASS
- `g-spawn-apron` -> `g-yrd-rear` (ground)
- `g-yrd-rear` -> `g-yrd-pressure` (ground)
- `g-yrd-pressure` -> `g-yrd-e` (ground)
- `g-yrd-e` -> `g-yrd-east-ridge` (ground)
- `g-yrd-east-ridge` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `e-wing-n` (door) — e-wing-n w8m h2.4m vs capsule 1.8m PASS
- `e-wing-n` -> `bld-core-service-wing` (door) — e-wing-n w8m h2.4m vs capsule 1.8m PASS
- `bld-core-service-wing` -> `bld-core-walkway` (interior-link)
- `bld-core-walkway` -> `bld-core-ops-hall` (interior-link)

**path-tunnel-alternate** — tunnel alternate: checkpoint mouth -> below grade -> east ridge portal -> core yard -> walkway door -> hall — PASS
- `g-spawn-apron` -> `g-yrd-rear` (ground)
- `g-yrd-rear` -> `g-yrd-pressure` (ground)
- `g-yrd-pressure` -> `g-yrd-e` (ground)
- `g-yrd-e` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `tp-west` (tunnel) — tp-west h6m w8m clearance PASS xray
- `tp-west` -> `tun-a` (tunnel) — tp-west h6m w8m clearance PASS xray
- `tun-a` -> `tun-b` (tunnel) — tun-a h6m w10m clearance PASS xray
- `tun-b` -> `tun-c` (tunnel) — tun-b h6m w10m clearance PASS xray
- `tun-c` -> `tp-east` (tunnel) — tun-c h6m w10m clearance PASS xray
- `tp-east` -> `g-yrd-east-ridge` (tunnel) — tp-east h6m w8m clearance PASS xray
- `g-yrd-east-ridge` -> `g-yrd-core-n` (ground)
- `g-yrd-core-n` -> `e-walkway-w` (door) — e-walkway-w w2m h2.4m vs capsule 1.8m PASS
- `e-walkway-w` -> `bld-core-walkway` (door) — e-walkway-w w2m h2.4m vs capsule 1.8m PASS
- `bld-core-walkway` -> `bld-core-ops-hall` (interior-link)

Pacing: core-approach surface roads ~1126m (sum main surface + covered route).

## Path interiors (door -> floor -> objective continuity)

**path-surface-main**:
- bld-core-ops-hall (objective, 6F, objective on floor 2)

**path-covered-logistics**:
- bld-loading-hall (drive-through, 1F)
- bld-security-hall (corridor, 2F)
- bld-core-ops-hall (objective, 6F, objective on floor 2)

**path-east-flank**:
- bld-core-service-wing (open, 1F)
- bld-core-walkway (corridor, 1F)
- bld-core-ops-hall (objective, 6F, objective on floor 2)

**path-tunnel-alternate**:
- bld-core-walkway (corridor, 1F)
- bld-core-ops-hall (objective, 6F, objective on floor 2)

## Cover placement (vs named interrupts)

- cv-gate-w: 15m both/full OK
- cv-gate-e: 6m both/full OK
- cv-pressure-w: 18m both/full OK
- cv-pressure-e: 12m both/full OK
- cv-mix-1: 16m ground/low OK
- cv-mix-2: 3m ground/mid OK
- cv-mix-3: 6m ground/mid OK
- cv-court-barr-1: 16m ground/full OK
- cv-court-barr-2: 4m ground/full OK
- cv-court-barr-3: 22m ground/full OK
- cv-plant-spur: 5m ground/full OK
- cv-annex-e: 12m ground/mid OK
- cv-maint-n: 2m both/full OK
- cv-spawn-1: 7m ground/low OK
- cv-spawn-2: 12m ground/low OK
- cv-spawn-3: 5m ground/low OK
- cv-east-1: 5m ground/mid OK
- cv-east-2: 9m both/full OK
- cv-east-3: 2m ground/full OK
- cv-core-1: 8m both/full OK
- cv-core-2: 6m ground/mid OK
- cv-corridor-1: 16m both/full OK

## Kill-zone closures

- kz-core: covers=[cv-core-1] buildings=[bld-core-ops-hall,bld-core-walkway] tunnel=[] CLOSED
- kz-plant: covers=[cv-plant-spur,cv-east-1] buildings=[bld-processing-hall] tunnel=[] CLOSED
- kz-court: covers=[cv-court-barr-1,cv-court-barr-2,cv-court-barr-3] buildings=[bld-security-hall,bld-core-walkway] tunnel=[tp-west,tun-a] CLOSED

## Vertical transitions

- stair_sec_threshold (stair, host s-sec-threshold): checkpoint court -> security hall threshold (+1.5m) — capsule-OK
- incline_plant (ramp, host in-plant): hub/east yard -> processing hall floor 1 (+6m raised base, 72m run) — capsule-OK
- stair_tower (stair, host bld-service-tower): 5 floors + catwalk exit east — capsule-OK
- stair_core (stair, host bld-core-ops-hall): 6 floors; objective on floor 2 — capsule-OK
- stair_maint (stair, host bld-maintenance): 2 floors — capsule-OK
- stair_security (stair, host bld-security-hall): 2 floors — capsule-OK
- stair_catwalk_e (stair, host st-catwalk-e): catwalk (+6m) -> east yard — capsule-OK
- hole_roof_reentry (hole-drone-entry, host hd-roof-opening): air -> maintenance service yard (drone-only) — capsule-OK
- tunnel_below_grade (belowGrade, host tun-a/tun-b/tun-c): checkpoint court mouth <-> east ridge portal; X-ray interior visibility required; >=60m from core — capsule-OK

## Drone traversal (differs from player)

- air air-pressure-yard: 0,140 -> 120,140 -> 120,100 -> 0,100 — fixed-wing strafe box over open-sky pressure yard
- air air-courtyard: -240,120 -> -120,40 -> -60,10 -> 60,0 — bomber/rotary line over courtyard yards (GAMEPLAY: fixed-wing primary target zone_courtyard)
- air air-spawn-apron: -420,240 -> -320,200 -> -240,190 — recon approach over spawn apron
- air air-roof-reentry: 258,48 -> 150,-40 -> -150,-100 — tower -> maintenance air re-entry opening (drone-only)
- drone holes: hd-roof-opening
- open sky: Pressure Yard — open sky / fixed-wing yard
- tunnel X-ray: yes (interior visible to players only via toggle)
- cameras (destructible surveillance): camGatehouse, camServiceTower, camSurveillanceW, camSurveillanceE, camSecurity

## Warnings
- none
