# vexea-map-authoring

Agent-owned map authoring pipeline (Ox Alpha).

## Layout (planned)
- /spec — layered map data (terrain, structures, cover, routes, spawns, drone lanes, zones)
- /sim — simulator + validation reports
- /bake — Kaggle bake kernels
- /editor — web editor (GitHub Pages later)
- /assets — manifests only; binaries live in Releases

## Storage contract
- Releases = baked assets + payloads. All consumers pull anonymously (public repo).
- Large uploads also mirrored to Filebase S3 (agent-managed).
- Master PAT never touches consumers.
