# Combat-Space Matrix

File: blockout/blockout-full-v1.json

| Space | Zone | Cover anchors | Lanes (exposure) | Drone lanes | Retreats | Kill zones | Vertical |
|---|---|---|---|---|---|---|---|
| g-gate-square | zone_courtyard | cv-gate-w,cv-gate-e | route_rear_alley | air-courtyard,air-spawn-apron | route_maintenance_loop, | - | - |
| g-yrd-rear | zone_courtyard | cv-gate-e,cv-pressure-w | route_main_surface,route_rear_alley | air-pressure-yard,air-courtyard,air-spawn-apron | route_maintenance_loop, | - | - |
| g-yrd-pressure | zone_courtyard | cv-pressure-w,cv-pressure-e | route_main_surface,route_rear_alley,route_north_ring | air-pressure-yard | - | - | - |
| g-yrd-hub | zone_courtyard | cv-mix-1,cv-mix-2,cv-mix-3 | route_main_surface,route_south_retreat | air-pressure-yard,air-courtyard,air-roof-reentry | route_covered,route_maintenance_loop, | - | incline_plant |
| g-yrd-west | zone_warehouse | cv-mix-1,cv-maint-n | - | air-courtyard,air-roof-reentry | route_covered,route_maintenance_loop, | - | stair_maint,hole_roof_reentry |
| g-yrd-checkpoint-n | zone_core | cv-corridor-1 | route_main_surface,route_south_retreat | air-roof-reentry | route_covered, | kz-court | stair_sec_threshold,incline_plant,stair_security,tunnel_below_grade |
| g-yrd-e | zone_plant | cv-pressure-e,cv-plant-spur,cv-east-1,cv-east-2,cv-east-3 | route_main_surface,route_north_ring,route_south_retreat,route_plant_spur | air-pressure-yard,air-roof-reentry | - | kz-plant | incline_plant,stair_tower,stair_catwalk_e |
| g-yrd-plant-s | zone_plant | cv-east-3,cv-corridor-1 | route_main_surface,route_north_ring,route_south_retreat | - | - | - | tunnel_below_grade |
| g-yrd-core-n | zone_core | cv-court-barr-1,cv-court-barr-2,cv-court-barr-3,cv-core-1,cv-core-2 | route_main_surface | route_tunnel | route_covered,route_flank_backdoor, | kz-core,kz-court | stair_sec_threshold,stair_core,stair_security,tunnel_below_grade |
| g-yrd-east-ridge | zone_core | cv-annex-e,cv-core-2 | route_south_retreat | route_tunnel | route_flank_backdoor, | - | - |
| g-mix-courts | zone_courtyard | cv-mix-1,cv-mix-2,cv-mix-3 | - | air-courtyard | - | - | - |

## Intended decisions

- **g-gate-square**: first contact: commit through the gate line or rotate to the rear lane; gatehouse facade blocks the north sightline
- **g-yrd-rear**: flank vein: choose the loading bay roll-down gates (trappable) or continue east; dock canopy closes the UAV line
- **g-yrd-pressure**: OPEN SKY: cross in 4 chunks between the two full-height bunkers, or hold the pressure-store facade; fixed-wing strafe box overhead
- **g-yrd-hub**: hub decision: take the covered route (bomber-denied), the incline to the plant, or the checkpoint corridor; mix-court crates give partial cover in the open
- **g-yrd-west**: service yard: enter maintenance (air re-entry above), push the deployment bays (sealed chokepoint), or slip south to the checkpoint corridor
- **g-yrd-checkpoint-n**: approach corridor: channeled by court walls into the barricade line; threshold stair offers the raised security-hall bypass
- **g-yrd-e**: east yard: container rows break the ring sightlines; catwalk stair + incline door are the vertical options; substation facade anchors the NE
- **g-yrd-plant-s**: plant south band: tank farm breaks the ridge sightline; cover at the tunnel portal yard; processing south door is the killPlant trap
- **g-yrd-core-n**: last cover before the objective: shelter + approach cover; commit through the main door or flank via the service wing
- **g-yrd-east-ridge**: flank origin: tunnel portal (X-ray interior) or the ridge surface route; annex cover blocks dog pursuit from the mouth
- **g-mix-courts**: open yard crossing: crate ladder gives jump-over + partial cover; bomber line overhead keeps it a paced crossing, not a hold

## Warnings
- none
