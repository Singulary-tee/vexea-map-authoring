# PvE Reports

File: blockout/blockout-full-v1.json

## Cover bindings (22)

| Cover | Zone | Class | Threat | Direction | Breaks |
|---|---|---|---|---|---|
| cv-gate-w | zone_courtyard | full | both | directional | route_main_surface, air-spawn-apron |
| cv-gate-e | zone_courtyard | full | both | directional | route_main_surface, air-spawn-apron |
| cv-pressure-w | zone_courtyard | full | both | directional | air-pressure-yard, route_main_surface |
| cv-pressure-e | zone_courtyard | full | both | directional | air-pressure-yard, route_north_ring |
| cv-mix-1 | zone_courtyard | low | ground | freestanding | air-courtyard |
| cv-mix-2 | zone_courtyard | mid | ground | directional | route_covered, air-courtyard |
| cv-mix-3 | zone_courtyard | mid | ground | directional | air-courtyard, route_covered |
| cv-court-barr-1 | zone_core | full | ground | directional | route_covered |
| cv-court-barr-2 | zone_core | full | ground | directional | route_covered |
| cv-court-barr-3 | zone_core | full | ground | directional | route_covered |
| cv-plant-spur | zone_plant | full | ground | directional | route_plant_spur |
| cv-annex-e | zone_plant | mid | ground | directional | route_tunnel, route_south_retreat |
| cv-maint-n | zone_warehouse | full | both | directional | air-courtyard, route_maintenance_loop |
| cv-spawn-1 | zone_spawn | low | ground | directional | air-spawn-apron |
| cv-spawn-2 | zone_spawn | low | ground | directional | air-spawn-apron |
| cv-spawn-3 | zone_spawn | low | ground | directional | air-spawn-apron |
| cv-east-1 | zone_plant | mid | ground | directional | route_north_ring |
| cv-east-2 | zone_plant | full | both | directional | route_north_ring, air-courtyard |
| cv-east-3 | zone_plant | full | ground | directional | route_south_retreat |
| cv-core-1 | zone_core | full | both | directional | route_main_surface |
| cv-core-2 | zone_core | mid | ground | directional | route_flank_backdoor |
| cv-corridor-1 | zone_core | full | both | directional | route_main_surface, air-courtyard |

## Vertical transitions (9)

| Id | Kind | Host | Connects | Gauge | Capsule |
|---|---|---|---|---|---|
| stair_sec_threshold | stair | s-sec-threshold | checkpoint court -> security hall threshold (+1.5m) | {"rise":0.17,"tread":0.3,"width":6} | OK |
| incline_plant | ramp | in-plant | hub/east yard -> processing hall floor 1 (+6m raised base, 72m run) | {"grade":"1:12","width":8} | OK |
| stair_tower | stair | bld-service-tower | 5 floors + catwalk exit east | {"rise":0.18,"tread":0.28,"width":1.2} | OK |
| stair_core | stair | bld-core-ops-hall | 6 floors; objective on floor 2 | {"rise":0.18,"tread":0.28,"width":1.6} | OK |
| stair_maint | stair | bld-maintenance | 2 floors | {"rise":0.18,"tread":0.28,"width":1.4} | OK |
| stair_security | stair | bld-security-hall | 2 floors | {"rise":0.18,"tread":0.28,"width":1.4} | OK |
| stair_catwalk_e | stair | st-catwalk-e | catwalk (+6m) -> east yard | {"rise":0.17,"tread":0.3,"width":4} | OK |
| hole_roof_reentry | hole-drone-entry | hd-roof-opening | air -> maintenance service yard (drone-only) | {"clearWidth":2.4,"drop":12} | OK |
| tunnel_below_grade | belowGrade | tun-a/tun-b/tun-c | checkpoint court mouth <-> east ridge portal; X-ray interior visibility required; >=60m from core | {"clearHeight":6,"clearWidth":10} | OK |

## Clearance registry (22)

| Kind | Id | Size | Capsule |
|---|---|---|---|
| door | e-loading-n-1 | 8w4.5h | OK |
| door | e-loading-n-2 | 8w4.5h | OK |
| door | e-loading-n-3 | 8w4.5h | OK |
| door | e-loading-s | 8w4.5h | OK |
| door | e-maint-s | 4w2.4h | OK |
| door | e-deploy-e | 8w4.5h | OK |
| door | e-sec-s | 6w2.4h | OK |
| door | e-core-n | 4w2.6h | OK |
| door | e-wing-n | 8w2.4h | OK |
| door | e-walkway-w | 2w2.4h | OK |
| door | e-plant-w | 4w2.4h | OK |
| door | e-plant-s | 4w2.4h | OK |
| door | e-tower-s | 4w2.4h | OK |
| stair | s-sec-threshold | 6w0.17r | OK |
| incline | in-plant | 8w1:12 | OK |
| stair | st-catwalk-e | 4w0.17r | OK |
| tunnel | tp-west | 8w6h | OK |
| tunnel | tp-east | 8w6h | OK |
| tunnel | tun-a | 10w6h | OK |
| tunnel | tun-b | 10w6h | OK |
| tunnel | tun-c | 10w6h | OK |
| drone-hole | hd-roof-opening | 2.4cw | OK |

## Warnings
- none
