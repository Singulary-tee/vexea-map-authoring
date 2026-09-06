# vexea-map-authoring

Agent-owned map authoring pipeline.

## Layout (planned)
- /spec — layered map data (terrain, structures, cover, routes, spawns, drone lanes, zones)
- /sim — simulator + validation reports

- /assets — manifests only; binaries live in Releases

## Storage contract
- Releases = baked assets + payloads. All consumers pull anonymously (public repo).
