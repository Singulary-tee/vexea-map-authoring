# MAP-AUTHORING RUNBOOK (things that were slow to discover — do not rediscover)

## GitHub push from VM (auth)
- gh auth token exists but plain extraheader fails. USE:
  git push "https://x-access-token:$(gh auth token)@github.com/Singulary-tee/vexea-map-authoring.git" main
- Repo is PUBLIC (anon pull OK). Commit identity: git -c user.email=oxalpha@localhost -c user.name='Ox Alpha'
  (or set git config once per clone).

## Codespace (supreme-space-train-7vr496j4wwxxfx5p7)
- No 'start' subcommand; it auto-starts on connect: gh cs ssh -c <slug> -- '<cmd>'
- ESM import of 'three' resolves ONLY via node_modules walk-up. Game repo has three at
  /workspaces/vexea-international/node_modules. FIX: ln -sfn /workspaces/vexea-international/node_modules /workspaces/node_modules
  (create before run, rm -f after). NODE_PATH does NOT work for ESM.
- three r184: import('three') returns NAMESPACE (named exports), NOT .default.
- Long jobs: nohup ... > /tmp/x.log 2>&1 & then poll the log (local run_commands caps ~30s).
- VM is 896MB RAM: heavy builds ONLY on codespace; VM = small edits + git + node one-liners.

## Notion MCP flows
- Create page: notion-create-pages (parent omitted = workspace standalone private page).
- IMAGE on page: create-file-upload -> POST file to upload_url via curl with Bearer from
  upload_headers (form field 'file') -> then update-page insert_content with
  <image src="file-upload://<id>"></image>. Uploads EXPIRE FAST (hours) — use immediately.
- create-attachment with content= works for small text/SVG too (returns markdown_source).
- USER MENTION in comment: markdown <mention-user> tag = 500 ERROR. USE rich_text array:
  [{type:'text',text:{content:'...'}},
   {type:'mention',mention:{type:'user',user:{id:'<uuid>',object:'user'}}},
   {type:'text',text:{content:'...'}}]
- My user id: 2c6d872b-594c-8192-8a4d-0002504df8be. Workspace: Alt MMD.
- Mission Control page id: 3cacb9a2-be0b-8145-a5ac-e546402b8ec6

## Releases (storage)
- gh release list/view/download -R Singulary-tee/vexea-map-authoring
- User posts targets/prompts there; 3 redundant copies = same image diff color filters.
- Download pattern: gh release download <tag> -R <repo> -p '<glob>'

## Image ingestion discipline
- ONE image at a time, never bulk. webp preferred (small). file(1) to verify RIFF/WebP first.
- Destroy any >2-3MB raster that has a webp twin in Releases.

## Validator/editor loop
- node tools/blockout-validate.mjs blockout/<file>.json  (exit 0 = green)
- node tools/check-editor-html.mjs (editor sanity)
- node tools/gen-blockout-svg.mjs [blockout.json] [out.svg] (top-down visual for Notion)
- node tools/combine-blockouts.mjs (merge slice+campus -> map-full)
## Render gate / micro-variation session (2026-09-06) — do not re-derive
- **Serve from repo ROOT, port 8124, URL `/editor/viewer.html`.** Rooting http.server at `editor/` makes the
  `/node_modules/...` importmap 404 → blank frame. Recipe: `( nohup python3 -m http.server 8124 & ); sleep 1;`
  then `node tools/capture_viewer.mjs URL /tmp/shot.png`. Codespace `/tmp` is WIPED on restart.
- **TSL-vs-texture DECISION (evidence-backed):** keep the tuned `WebGLRenderer` scene + baked procedural textures.
  TSL (`MeshStandardNodeMaterial`) compiles+runs headless under `WebGPURenderer { WebGL2 fallback }` (`backend
  webgl2-fallback`) BUT node materials light WRONG (probe ground ~luma 5 unlit under the working sun). Adopting
  WebGPURenderer would discard the 7-iteration lighting tune. `MeshStandardNodeMaterial` lives on the
  **`three/webgpu`** namespace (not `three/tsl`); `mx_noise_float`/color/float come from `three/tsl`. Probe:
  `editor/tsl-probe.html` (committed, capability record).
- **Multiply-map bake rule (the v1 trap):** `MeshStandardMaterial.map` (multiply) texels are ≤1.0 and encoding
  noise around mean 1.0 clamps every value >1 → 255, i.e. the whole bright half quantizes to white → **0% visible
  delta**. FIX: encode noise around **mean 0.75 ± amp** (no clamp) and divide the material color by 0.75 so the
  mean albedo is preserved; leave the `CanvasTexture` **linear** (no sRGB tag) to keep the mean math exact. For
  KB micro-variation: amp ≤0.05 (terrain/rock) / ≤0.02 (finished concrete); the yard = compacted earth/asphalt.
  Roughness map: mean 0.9 ±0.04 with material.roughness 1.0 → 0.86–0.94. Determinism proven by bit-identical
  capture pairs.
- **Deterministic render/regen:** the same viewer+GLB reproduce byte-identical frames (MD5). After any codespace
  `/tmp` wipe, just re-capture — never trust exit-0 alone; assert the md5.
- **CODESPACE transport:** concurrent `gh cs ssh` bursts CRASH the codespace RPC and force a restart (wipes /tmp).
  Fetch artifacts SEQUENTIALLY, chaining chunked `base64 -w0 | cut -c` fetches in ONE command line. Base64 chunks
  ~39k chars each; last range unbounded. Assemble `>>` in order → `base64 -d` → `md5sum`.
- **GLB in Releases (`artifacts/*.glb` is gitignored):** push current GLB via `gh release create <tag> 'glb'`
  (e.g. `v0.1-ground-pass` holds `facility-v3-final.glb` md5 `ad715bc4` + `cw-slice.glb` + gate shots).
  `gh release download <tag> -R <repo> -p '<glob>' -D dir --clobber`; verify md5 round-trip.
- **KB files:** live in repo `kb/` (8 .md decision/knowledge files from Camber stash) — committed (`a966fcd`).
